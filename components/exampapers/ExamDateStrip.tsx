"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { daysUntil, type ExamCountdown } from "@/lib/examCountdown";

// วันที่แบบไทย พ.ศ. — ตรึงโซนเวลาไทยไว้ ไม่งั้นเครื่องที่ตั้งโซนอื่นจะเห็นคนละวัน
const thaiDate = (ms: number) =>
    new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
        day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok",
    }).format(new Date(ms));

/**
 * แถบวันสอบบนหน้าร้าน PDF — ใช้วันสอบชุดเดียวกับการ์ดหน้าแรกที่ครูฮีมตั้งเอง
 *
 * ตั้งใจทำให้บางและเงียบ: บอกแค่ว่าเหลือกี่วันกับวันสอบคือวันไหน ไม่มีแถบ
 * "เตรียมตัวมาแล้ว X%" ไม่มีตัวเลือกสนาม ไม่มีนาฬิกาวินาที — ของหนักแบบนั้น
 * เคยอยู่บนหน้า /exam แล้วครูฮีมสั่งถอดออกทั้งใบเมื่อ ก.ค. 69 อย่าเอากลับมา
 */
export default function ExamDateStrip({ countdown }: { countdown: ExamCountdown | null }) {
    // เซิร์ฟเวอร์เรนเดอร์ตัวเลขมาก่อน (ให้ Google เห็นและไม่เกิดจอกระตุก) แล้ว
    // ค่อยคำนวณใหม่หลัง hydrate เผื่อหน้าถูกแคชไว้ข้ามวัน
    const [days, setDays] = useState(countdown?.daysLeft ?? 0);
    useEffect(() => {
        if (!countdown) return;
        setDays(daysUntil(countdown.targetMs));
    }, [countdown]);

    if (!countdown) return null;

    return (
        <div className="rounded-2xl border border-amber-200/70 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 px-5 py-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center">
            <CalendarDays size={17} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-[15px] text-slate-700 dark:text-slate-200">
                เหลืออีก{" "}
                <span className="font-black text-amber-700 dark:text-amber-300">{days.toLocaleString()} วัน</span>
                {" "}ก่อน{countdown.examName}
            </span>
            <span className="text-[13px] text-slate-500 dark:text-slate-400">
                (สอบ {thaiDate(countdown.targetMs)})
            </span>
        </div>
    );
}
