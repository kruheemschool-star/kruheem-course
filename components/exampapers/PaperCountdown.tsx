"use client";

import { useEffect, useState } from "react";
import { parseThai } from "@/lib/examCountdown";
import type { ExamScheduleItem } from "@/types";

// นับถอยหลังวันสอบของแต่ละชุด — คำสั่งครูฮีมทั้งหมด 2026-10-03 (ดูของจริงแล้วสั่งแก้ทีละรอบ):
// 1. "เล็กๆ สวยงาม แต่ MINIMAL"
// 2. "อยากให้มีตัวเลขวินาทีด้วย เพื่อให้เห็นการเคลื่อนไหวของเวลา" → เดินทุกวินาที
//    (คำสั่งนี้แทนข้อห้ามวินาทีวิ่งเดิม เฉพาะตัวนับนี้)
// 3. แถบทับปกการ์ด "ดูไม่สวย" → แถบบางใต้ปก ห้ามทับรูปปก
// 4. "ตัวเลขโผล่มาเฉยๆ คนไม่รู้ว่าคืออะไร" → ต้องอ่านเป็นประโยค "เหลือเวลาอีก … ก่อน…"
// 5. ชุดที่ใช้ได้หลายสนาม (สาธิต) ห้ามผูกกับสนามเดียว → examSchedule: นับถึงสนามที่ใกล้ที่สุด
//    + ตารางทุกสนามในหน้าขาย (สนามที่ยังไม่ประกาศบอก "รอประกาศ")
// เลยเวลาสอบแล้ว = ไม่แสดง จะได้ไม่มีคำเร่งที่หมดอายุค้างอยู่บนหน้าขาย

const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");

const thaiDay = (ms: number, withYear: boolean) =>
    new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
        weekday: "short", day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}),
        timeZone: "Asia/Bangkok",
    }).format(new Date(ms));
const thaiTime = (ms: number) =>
    new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" })
        .format(new Date(ms))
        .replace(":", ".");

function useNow() {
    // ค่าเริ่มเท่ากันทั้งเซิร์ฟเวอร์และเครื่องผู้ใช้ไม่ได้ (หน้าเป็น ISR แคชไว้ได้ 5 นาที)
    // → ตัวเลขใส่ suppressHydrationWarning แล้วตั้งเวลาจริงทันทีหลัง mount
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const first = setTimeout(() => setNow(Date.now()), 0); // ทับตัวเลขที่ค้างมาจาก HTML ของเซิร์ฟเวอร์
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => { clearTimeout(first); clearInterval(t); };
    }, []);
    return now;
}

type Props = { examDate?: string; examName?: string; examSchedule?: ExamScheduleItem[] };

// วันอย่างเดียว ("2026-10-18" — สนามที่ประกาศแค่วัน ไม่บอกเวลา) = นับถึงต้นวันนั้น และไม่โชว์เวลา ห้ามเดาเวลาเอง
const dateOnly = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
const toMs = (s?: string) => (s && s.trim() ? parseThai(dateOnly(s) ? `${s.trim()}T00:00` : s.trim()) : NaN);
const when = (t: number, hasTime: boolean) => `สอบ ${thaiDay(t, true)}${hasTime ? ` เวลา ${thaiTime(t)} น.` : ""}`;

// "ก่อนสอบเข้า ม.1 …" / "ก่อน Pre-Test …" — ชื่อที่ขึ้นต้นด้วยคำไทยต่อติดกัน อย่างอื่นเว้นวรรค
const beforeExam = (name?: string) => {
    const n = (name || "").trim();
    if (!n) return "ก่อนถึงวันสอบ";
    return /^[฀-๿]/.test(n) ? `ก่อน${n}` : `ก่อน ${n}`;
};

/** เป้าหมายของตัวนับ: สนามที่ใกล้ที่สุดที่ยังไม่ถึง (ถ้ามีตารางหลายสนาม) ไม่งั้นใช้ examDate */
function resolve({ examDate, examName, examSchedule }: Props, now: number) {
    const sched = (examSchedule || []).filter((x) => x && x.name);
    if (sched.length) {
        const next = sched
            .map((x) => ({ name: x.name, t: toMs(x.date), hasTime: !dateOnly(x.date) }))
            .filter((x) => Number.isFinite(x.t) && x.t > now)
            .sort((a, b) => a.t - b.t)[0];
        return next ? { t: next.t, hasTime: next.hasTime, label: `ก่อนสนามที่ใกล้ที่สุด: ${next.name}`, multi: true } : null;
    }
    const t = toMs(examDate);
    return Number.isFinite(t) && t > now ? { t, hasTime: !dateOnly(examDate), label: beforeExam(examName), multi: false } : null;
}

function split(left: number) {
    return {
        d: Math.floor(left / DAY),
        h: Math.floor((left % DAY) / 3_600_000),
        m: Math.floor((left % 3_600_000) / 60_000),
        s: Math.floor((left % 60_000) / 1000),
    };
}

/** แถบบางใต้รูปปกของการ์ดหน้าร้าน
 *    เหลือเวลาอีก 35 วัน 17 ชม. 23 นาที 51 วิ
 *    ก่อนสอบเข้า ม.1 จุฬาภรณฯ รอบแรก · อา. 8 พ.ย. */
export function PaperCountdownStrip(props: Props) {
    const now = useNow();
    const r = resolve(props, now);
    if (!r) return null;
    const { d, h, m, s } = split(r.t - now);
    const num = "font-bold tabular-nums text-slate-900 dark:text-white";
    return (
        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-4 py-2" title={`${r.label} · ${when(r.t, r.hasTime)}`}>
            <p suppressHydrationWarning className="flex items-center gap-1.5 text-[12.5px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden />
                <span>
                    เหลือเวลาอีก <span className={num}>{d}</span> วัน <span className={num}>{pad(h)}</span> ชม.{" "}
                    <span className={num}>{pad(m)}</span> นาที{" "}
                    <span className="font-bold tabular-nums text-rose-500 dark:text-rose-400">{pad(s)}</span> วิ
                </span>
            </p>
            <p className="mt-0.5 truncate pl-3 text-[11px] text-slate-400 dark:text-slate-500">
                {r.label} · {thaiDay(r.t, false)}
            </p>
        </div>
    );
}

/** กล่องบนหน้าขาย: เหลือเวลาอีก วัน/ชั่วโมง/นาที/วินาที + สนามและวันสอบ (+ ตารางทุกสนาม ถ้ามีหลายสนาม) */
export default function PaperCountdown(props: Props) {
    const now = useNow();
    const r = resolve(props, now);
    if (!r) return null;

    const { d, h, m, s } = split(r.t - now);
    const cells: [string, string, boolean][] = [[String(d), "วัน", false], [pad(h), "ชั่วโมง", false], [pad(m), "นาที", false], [pad(s), "วินาที", true]];

    // ตารางสนาม: สนามที่สอบไปแล้วตัดออก · เรียงสนามที่มีวันขึ้นก่อนตามวัน แล้วค่อยสนามที่ยังไม่ประกาศ
    const rows = r.multi
        ? (props.examSchedule || [])
              .filter((x) => x && x.name)
              .map((x) => ({ ...x, t: toMs(x.date) }))
              .filter((x) => !Number.isFinite(x.t) || x.t > now)
              .sort((a, b) => (Number.isFinite(a.t) ? a.t : Infinity) - (Number.isFinite(b.t) ? b.t : Infinity))
        : [];

    return (
        <div className="mt-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-4 py-3.5">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden />
                <span className="truncate">เหลือเวลาอีก</span>
            </div>
            <div className="mt-2.5 grid grid-cols-4 gap-2" aria-label={`เหลืออีก ${d} วัน ${h} ชั่วโมง ${m} นาที`}>
                {cells.map(([n, unit, sec]) => (
                    <div key={unit} className="rounded-xl bg-slate-50 dark:bg-slate-800/70 py-2 text-center">
                        <div
                            suppressHydrationWarning
                            className={`text-[24px] leading-none font-black tabular-nums ${
                                sec ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
                            }`}
                        >
                            {n}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{unit}</div>
                    </div>
                ))}
            </div>
            <div className="mt-2.5 text-[12px] text-slate-500 dark:text-slate-400">
                {r.label} · {when(r.t, r.hasTime)}
            </div>

            {rows.length > 1 && (
                <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="mb-1.5 text-[12px] font-semibold text-slate-500 dark:text-slate-400">กำหนดสอบแต่ละสนาม</div>
                    <ul className="space-y-1.5">
                        {rows.map((x) => {
                            const dated = Number.isFinite(x.t);
                            const next = dated && x.t === r.t;
                            return (
                                <li key={x.name + (x.date || "")} className="flex items-start justify-between gap-3 text-[12.5px]">
                                    <span className={`flex min-w-0 items-start gap-1.5 ${next ? "font-semibold text-slate-800 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"}`}>
                                        <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${next ? "bg-rose-500" : dated ? "bg-slate-300 dark:bg-slate-600" : "border border-slate-300 dark:border-slate-600"}`} aria-hidden />
                                        <span>{x.name}</span>
                                    </span>
                                    <span className={`shrink-0 text-right ${dated ? "tabular-nums text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"}`}>
                                        {dated ? thaiDay(x.t, true) : x.note || "รอประกาศ"}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
