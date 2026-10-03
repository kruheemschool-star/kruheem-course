"use client";

import { useEffect, useState } from "react";
import { parseThai } from "@/lib/examCountdown";

// นับถอยหลังวันสอบของแต่ละชุด
// - 2026-10-03 ครูฮีมขอ "เล็กๆ สวยงาม แต่ MINIMAL" → รอบแรกทำแค่ วัน/ชั่วโมง/นาที (เลี่ยงของขยับตลอด)
// - 2026-10-03 ครูฮีมสั่งเพิ่มเอง "อยากให้มีตัวเลขวินาทีด้วย เพื่อให้เห็นการเคลื่อนไหวของเวลา"
//   ทั้งบนปกการ์ดหน้าร้านและในหน้าขาย → เดินทุกวินาที (คำสั่งนี้แทนข้อห้ามวินาทีวิ่งเดิมเฉพาะตัวนับนี้)
// เลยเวลาสอบแล้ว = ไม่แสดงอะไรเลย จะได้ไม่มีคำเร่งที่หมดอายุค้างอยู่บนหน้าขาย

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

type Props = { examDate?: string; examName?: string };

const target = (examDate?: string) => (examDate ? parseThai(examDate.trim()) : NaN);

function split(left: number) {
    return {
        d: Math.floor(left / DAY),
        h: Math.floor((left % DAY) / 3_600_000),
        m: Math.floor((left % 3_600_000) / 60_000),
        s: Math.floor((left % 60_000) / 1000),
    };
}

/** แถบบางบรรทัดเดียวใต้รูปปกของการ์ดหน้าร้าน: ● ชื่อสนาม ........ 56 วัน 17:01:52
 *  ครูฮีมดูของจริงแล้วบอกว่าแถบทับปกไม่สวย (2026-10-03) → ต่อท้ายขอบล่างของปก ไม่ทับรูป
 *  ใส่ชื่อสนามเสมอ — บางชุดนับถึง Pre-Test ไม่ใช่สนามจริง ห้ามให้อ่านเป็น "วันสอบ" เฉยๆ */
export function PaperCountdownStrip({ examDate, examName }: Props) {
    const now = useNow();
    const t = target(examDate);
    if (!Number.isFinite(t) || t <= now) return null;
    const { d, h, m, s } = split(t - now);
    return (
        <div
            className="flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-4 py-2 text-[12px]"
            title={`สอบ ${thaiDay(t, true)} เวลา ${thaiTime(t)} น.`}
        >
            <span className="flex min-w-0 items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden />
                <span className="truncate">{examName || "นับถอยหลังวันสอบ"}</span>
            </span>
            <span suppressHydrationWarning className="shrink-0 tabular-nums text-slate-600 dark:text-slate-300" aria-label={`เหลืออีก ${d} วัน ${h} ชั่วโมง ${m} นาที`}>
                <span className="font-bold text-slate-900 dark:text-white">{d}</span> วัน{" "}
                <span className="font-semibold">{pad(h)}:{pad(m)}:</span>
                <span className="font-semibold text-rose-500 dark:text-rose-400">{pad(s)}</span>
            </span>
        </div>
    );
}

/** กล่องบนหน้าขาย: ชื่อสนาม · วัน ชั่วโมง นาที วินาที · วันและเวลาสอบ */
export default function PaperCountdown({ examDate, examName }: Props) {
    const now = useNow();
    const t = target(examDate);
    if (!Number.isFinite(t) || t <= now) return null;

    const { d, h, m, s } = split(t - now);
    const cells: [string, string, boolean][] = [[String(d), "วัน", false], [pad(h), "ชั่วโมง", false], [pad(m), "นาที", false], [pad(s), "วินาที", true]];

    return (
        <div className="mt-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-4 py-3.5">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden />
                <span className="truncate">นับถอยหลัง{examName ? ` ${examName}` : "ถึงวันสอบ"}</span>
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
                สอบ {thaiDay(t, true)} เวลา {thaiTime(t)} น.
            </div>
        </div>
    );
}
