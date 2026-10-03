"use client";

import { useEffect, useState } from "react";
import { parseThai } from "@/lib/examCountdown";

// นับถอยหลังวันสอบของแต่ละชุด (ครูฮีมขอ 2026-10-03 "เล็กๆ สวยงาม แต่ MINIMAL")
//
// ตั้งใจให้เงียบ: วัน · ชั่วโมง · นาที ขยับทีละนาที ไม่มีวินาทีวิ่ง ไม่มีแถบเปอร์เซ็นต์
// (ของที่ขยับตลอดเวลาครูฮีมเคยสั่งถอดออกเพราะตาลาย — ดู ExamDateStrip เดิม / ก.ค. 69)
// เลยเวลาสอบแล้ว = ไม่แสดงอะไรเลย จะได้ไม่มีคำเร่งที่หมดอายุค้างอยู่บนหน้าขาย

const DAY = 86_400_000;

const thaiDay = (ms: number, withYear: boolean) =>
    new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
        weekday: "short", day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}),
        timeZone: "Asia/Bangkok",
    }).format(new Date(ms));

function useNow() {
    // ค่าเริ่มเท่ากันทั้งเซิร์ฟเวอร์และเครื่องผู้ใช้ไม่ได้ (หน้าเป็น ISR แคชไว้ได้ 5 นาที)
    // → ตัวเลขใส่ suppressHydrationWarning แล้วตั้งเวลาจริงทันทีหลัง mount
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const first = setTimeout(() => setNow(Date.now()), 0); // ทับตัวเลขที่ค้างมาจาก HTML ของเซิร์ฟเวอร์
        const t = setInterval(() => setNow(Date.now()), 30_000);
        return () => { clearTimeout(first); clearInterval(t); };
    }, []);
    return now;
}

type Props = { examDate?: string; examName?: string };

const target = (examDate?: string) => {
    if (!examDate) return NaN;
    return parseThai(examDate.trim());
};

/** บรรทัดเดียวบนการ์ดชั้นวาง: "อีก 36 วัน · สอบเข้า ม.1 จุฬาภรณฯ รอบแรก" (วันที่อยู่ใน tooltip)
 *  ใส่ชื่อสนามเสมอ — บางชุดนับถึง Pre-Test ไม่ใช่สนามจริง ห้ามให้อ่านเป็น "วันสอบ" เฉยๆ */
export function PaperCountdownLine({ examDate, examName }: Props) {
    const now = useNow();
    const t = target(examDate);
    if (!Number.isFinite(t) || t <= now) return null;
    const days = Math.floor((t - now) / DAY);
    return (
        <p className="mt-2.5 flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400" title={`สอบ ${thaiDay(t, true)}`}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden />
            <span suppressHydrationWarning className="shrink-0">
                {days > 0 ? (
                    <>อีก <span className="font-bold text-slate-800 dark:text-slate-100">{days} วัน</span></>
                ) : (
                    <span className="font-bold text-rose-600 dark:text-rose-400">ไม่ถึง 1 วัน</span>
                )}
            </span>
            <span className="truncate">· {examName || `สอบ ${thaiDay(t, false)}`}</span>
        </p>
    );
}

/** กล่องบนหน้าขาย: วัน / ชั่วโมง / นาที + ชื่อสนามและวันสอบ */
export default function PaperCountdown({ examDate, examName }: Props) {
    const now = useNow();
    const t = target(examDate);
    if (!Number.isFinite(t) || t <= now) return null;

    const left = t - now;
    const d = Math.floor(left / DAY);
    const h = Math.floor((left % DAY) / 3_600_000);
    const m = Math.floor((left % 3_600_000) / 60_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const cells: [string, string][] = [[String(d), "วัน"], [pad(h), "ชั่วโมง"], [pad(m), "นาที"]];

    return (
        <div className="mt-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-4 py-3.5">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden />
                <span className="truncate">นับถอยหลัง{examName ? ` ${examName}` : "ถึงวันสอบ"}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-1.5">
                <div className="flex items-baseline gap-3 sm:gap-4" aria-label={`เหลืออีก ${d} วัน ${h} ชั่วโมง ${m} นาที`}>
                    {cells.map(([n, unit], i) => (
                        <span key={unit} className="flex items-baseline gap-1">
                            <span
                                suppressHydrationWarning
                                className={`text-[26px] leading-none font-black tabular-nums ${
                                    i === 0 ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-200"
                                }`}
                            >
                                {n}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">{unit}</span>
                        </span>
                    ))}
                </div>
                <span className="text-[12px] text-slate-500 dark:text-slate-400">
                    สอบ {thaiDay(t, true)}
                </span>
            </div>
        </div>
    );
}
