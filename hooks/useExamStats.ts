"use client";
// ฮุกข้อมูลหน้า /admin/exam-stats — รวม 3 แหล่งในโหลดเดียว:
//  1. stats/exam_YYYY-MM-DD (ตัวนับ ดู/เริ่ม/ส่ง/ซื้อ รายชุดรายวัน) — client SDK
//     อ่านเป็นช่วงด้วย documentId() query เดียว (rules: อ่านได้เฉพาะแอดมิน)
//  2. /api/exam-toc — ชื่อชุด/ชั้น/หมวด/ฟรี (ฉบับเบา ไม่ลาก questions)
//  3. /api/exam-averages — จำนวนสมาชิกที่ทำจริง + คะแนนเฉลี่ยรายชุด (Admin SDK ฝั่งเซิร์ฟเวอร์)
import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, documentId, endAt, getDocs, orderBy, query, startAt } from "firebase/firestore";
import { bangkokDateKey } from "@/lib/examStats";

/** วันที่เริ่มมีตัวนับจริงในระบบ — ใช้เป็นขอบล่างของช่วง "ทั้งหมด" */
export const EXAM_STATS_EPOCH = "2026-07-24";

export type ExamStatsPeriod = 7 | 30 | "all";

export interface ExamTocItem {
    id: string;
    title: string;
    level: string;
    category: string;
    questionCount: number;
    isFree: boolean;
}

export interface PerExamAverages {
    count: number; // จำนวนสมาชิกที่มีผลบันทึก (คน)
    avgPercent: number;
    attempts: number; // จำนวนครั้งส่งสะสมของสมาชิก
    buckets: number[];
}

/** ตัวนับของ 1 วัน: { examId: { v, vp, s_member, ..., src_facebook } } */
export interface ExamDayDoc {
    date: string; // YYYY-MM-DD
    sets: Record<string, Record<string, number>>;
}

export interface ExamStatsFixture {
    days: ExamDayDoc[];
    prevDays: ExamDayDoc[];
    toc: ExamTocItem[];
    averages: Record<string, PerExamAverages>;
}

interface UseExamStatsResult {
    loading: boolean;
    error: string | null;
    days: ExamDayDoc[]; // ช่วงที่เลือก เรียงวันเก่า → ใหม่
    prevDays: ExamDayDoc[]; // ช่วงก่อนหน้า (ยาวเท่ากัน) ไว้เทียบ ↑↓ — ว่างเมื่อเลือก "ทั้งหมด"
    toc: ExamTocItem[];
    averages: Record<string, PerExamAverages>;
    refresh: () => void;
}

function dateKeyDaysAgo(n: number): string {
    return bangkokDateKey(new Date(Date.now() - n * 24 * 60 * 60 * 1000));
}

async function fetchDayRange(fromDate: string, toDate: string): Promise<ExamDayDoc[]> {
    const snap = await getDocs(
        query(
            collection(db, "stats"),
            orderBy(documentId()),
            startAt(`exam_${fromDate}`),
            endAt(`exam_${toDate}`)
        )
    );
    const out: ExamDayDoc[] = [];
    snap.docs.forEach((d) => {
        const m = d.id.match(/^exam_(\d{4}-\d{2}-\d{2})$/);
        if (!m) return; // กันเอกสารชื่ออื่นในช่วง id (ไม่มีในทางปฏิบัติ แต่กันไว้)
        const raw = d.data() as Record<string, unknown>;
        const sets: Record<string, Record<string, number>> = {};
        Object.entries(raw).forEach(([examId, counters]) => {
            if (counters && typeof counters === "object" && !Array.isArray(counters)) {
                const clean: Record<string, number> = {};
                Object.entries(counters as Record<string, unknown>).forEach(([k, v]) => {
                    if (typeof v === "number") clean[k] = v;
                });
                sets[examId] = clean;
            }
        });
        out.push({ date: m[1], sets });
    });
    out.sort((a, b) => (a.date < b.date ? -1 : 1));
    return out;
}

export function useExamStats(period: ExamStatsPeriod, fixture?: ExamStatsFixture): UseExamStatsResult {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [days, setDays] = useState<ExamDayDoc[]>([]);
    const [prevDays, setPrevDays] = useState<ExamDayDoc[]>([]);
    const [toc, setToc] = useState<ExamTocItem[]>([]);
    const [averages, setAverages] = useState<Record<string, PerExamAverages>>({});
    const [reloadKey, setReloadKey] = useState(0);

    const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

    useEffect(() => {
        let cancelled = false;

        // โหมดพรีวิว/ทดสอบ UI: ป้อนข้อมูลตรงๆ ไม่ยิงเน็ตเวิร์ก
        if (fixture) {
            setDays(fixture.days);
            setPrevDays(fixture.prevDays);
            setToc(fixture.toc);
            setAverages(fixture.averages);
            setLoading(false);
            setError(null);
            return;
        }

        (async () => {
            setLoading(true);
            setError(null);
            try {
                const today = bangkokDateKey();
                const counterPromise =
                    period === "all"
                        ? fetchDayRange(EXAM_STATS_EPOCH, today).then((cur) => ({ cur, prev: [] as ExamDayDoc[] }))
                        : // ดึงยาว 2 เท่าในคำขอเดียว แล้วผ่าเป็นช่วงปัจจุบัน/ช่วงก่อนหน้า
                          fetchDayRange(dateKeyDaysAgo(period * 2 - 1), today).then((all) => {
                              const splitFrom = dateKeyDaysAgo(period - 1);
                              return {
                                  cur: all.filter((d) => d.date >= splitFrom),
                                  prev: all.filter((d) => d.date < splitFrom),
                              };
                          });

                const tocPromise = fetch("/api/exam-toc")
                    .then((r) => (r.ok ? r.json() : { exams: [] }))
                    .catch(() => ({ exams: [] }));
                const avgPromise = fetch("/api/exam-averages")
                    .then((r) => (r.ok ? r.json() : { perExam: {} }))
                    .catch(() => ({ perExam: {} }));

                const [counters, tocJson, avgJson] = await Promise.all([counterPromise, tocPromise, avgPromise]);
                if (cancelled) return;

                setDays(counters.cur);
                setPrevDays(counters.prev);
                setToc(Array.isArray(tocJson?.exams) ? tocJson.exams : []);
                const perExam = avgJson?.perExam && typeof avgJson.perExam === "object" ? avgJson.perExam : {};
                const cleanAvg: Record<string, PerExamAverages> = {};
                Object.entries(perExam as Record<string, Partial<PerExamAverages>>).forEach(([eid, d]) => {
                    cleanAvg[eid] = {
                        count: typeof d?.count === "number" ? d.count : 0,
                        avgPercent: typeof d?.avgPercent === "number" ? d.avgPercent : 0,
                        attempts: typeof d?.attempts === "number" ? d.attempts : 0,
                        buckets: Array.isArray(d?.buckets) ? (d.buckets as number[]) : [],
                    };
                });
                setAverages(cleanAvg);
            } catch (e) {
                console.error("[useExamStats] load failed:", e);
                if (!cancelled) setError("โหลดข้อมูลสถิติไม่สำเร็จ — ลองรีเฟรชอีกครั้ง");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [period, fixture, reloadKey]);

    return { loading, error, days, prevDays, toc, averages, refresh };
}
