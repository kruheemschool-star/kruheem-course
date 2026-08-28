"use client";

// ปุ่มสั่งซื้อคลังข้อสอบในห้องสอบ — สำหรับ "คนที่ยังไม่ได้เป็นสมาชิก"
// (ยังไม่ล็อกอิน / ล็อกอินแล้วแต่ยังไม่ได้ซื้อ / เคยซื้อแล้วหมดอายุ)
//
// ทำไมต้องมี: เดิมปุ่มสมัครโผล่แค่ 2 จังหวะ คือการ์ดล็อกข้อ 6 กับป้ายหลังทำเสร็จ
// ในโหมดทดลอง — แปลว่าคนที่เข้ามาทำ "ชุดฟรี" (isFree = ประตูหน้าของคลัง)
// ทำจนจบทั้งชุดโดยไม่เคยเห็นปุ่มซื้อเลยสักครั้ง. คอมโพเนนต์นี้ทำให้ปุ่มซื้อ
// ตามติดคนที่ยังไม่ได้ซื้อทุกหน้าจอในห้องสอบ โดยไม่ไปกวนสมาชิกที่จ่ายแล้ว.
//
// 3 ทรง (วางคนละตำแหน่ง ใช้ข้อความ/ราคาชุดเดียวกัน):
//   start — การ์ดใหญ่บนหน้าเริ่มทำข้อสอบ (ใต้การ์ดเลือกโหมด = จุดที่สายตาไปต่อ)
//   rail  — แผงเล็กในไซด์บาร์เดสก์ท็อป ติดหนึบไปกับแผนที่ข้อสอบตอนเลื่อนทำโจทย์
//   bar   — แถบล่างจอมือถือ ปิดได้ (sticky ไม่ทับปุ่มถัดไปตอนเลื่อนสุดหน้า)
//
// ทุกทรงนับสถิติแยกคีย์ (buy_start / buy_rail / buy_bar) เพื่อดูใน /admin/exam-stats
// ว่าตำแหน่งไหนคนกดจริง

import React, { useState } from "react";
import Link from "next/link";
import { Lock, Check, X, Sparkles } from "lucide-react";
import { bumpExamStat } from "@/lib/examStats";
import { EXAM_BANK_PRICE, EXAM_BANK_DISCOUNT_PERCENT, EXAM_BANK_BUY_HREF } from "@/lib/constants";

export type ExamBuyCtaVariant = "start" | "rail" | "bar";

const STAT_KEY: Record<ExamBuyCtaVariant, string> = {
    start: "buy_start",
    rail: "buy_rail",
    bar: "buy_bar",
};

const baht = (n: number) => `฿${n.toLocaleString("en-US")}`;

/** สิ่งที่ได้เมื่อสมัคร — เขียนแบบไม่ผูกกับตัวเลขที่โตทุกเดือน (จำนวนชุด/จำนวนข้อ)
 *  จะได้ไม่กลายเป็นข้อความเก่าค้างเว็บเวลาคลังโตขึ้น */
const PERKS = [
    "ข้อสอบครบทุกชุด ทุกชั้น ป.4 ถึง ม.6",
    "เฉลยละเอียดทีละขั้น อธิบายเหมือนครูนั่งข้างๆ",
    "วิเคราะห์จุดอ่อนรายบทให้อัตโนมัติทุกครั้งที่ส่ง",
    "พิมพ์เป็น PDF ไปทำบนกระดาษได้ทั้งชุด",
];

interface Props {
    variant: ExamBuyCtaVariant;
    examId?: string;
    /** ข้อความหัวเรื่อง — ปรับตามบริบทได้ (เช่น หลังทดลองครบ 5 ข้อ) */
    heading?: string;
    className?: string;
}

export const ExamBuyCta: React.FC<Props> = ({ variant, examId, heading, className = "" }) => {
    const [dismissed, setDismissed] = useState(false);
    const track = () => bumpExamStat(examId, { [STAT_KEY[variant]]: 1 });

    const priceRow = (
        <span className="flex items-baseline gap-2">
            <span className="text-slate-400 dark:text-slate-500 line-through font-bold">{baht(EXAM_BANK_PRICE.full)}</span>
            <span className="text-2xl font-black bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
                {baht(EXAM_BANK_PRICE.sale)}
            </span>
        </span>
    );

    // ── แถบล่างจอมือถือ ────────────────────────────────────────────────
    if (variant === "bar") {
        if (dismissed) return null;
        return (
            <div className={`lg:hidden sticky bottom-3 z-30 mt-6 ${className}`}>
                <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 dark:border-amber-700/60 bg-white/95 dark:bg-slate-800/95 backdrop-blur px-3 py-2.5 shadow-[0_18px_40px_-18px_rgba(234,88,12,.55)]">
                    {/* ไม่มีไอคอนก้อนใหญ่ตรงนี้ตั้งใจ — จอ 375px แคบมาก ทุกพิกเซล
                        ต้องเหลือให้ข้อความกับปุ่ม ไม่งั้นชื่อโดนตัดเป็น "ปลดล็อกทั้งค..." */}
                    <span className="min-w-0 flex-1 leading-tight">
                        <span className="flex items-center gap-1 text-[13px] font-black text-slate-800 dark:text-slate-100">
                            <Lock size={12} className="flex-shrink-0 text-amber-500" />
                            <span className="truncate">ปลดล็อกทั้งคลัง</span>
                        </span>
                        <span className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 truncate">
                            {baht(EXAM_BANK_PRICE.sale)} <span className="text-slate-400 dark:text-slate-500 line-through">{baht(EXAM_BANK_PRICE.full)}</span> · 5 ปี
                        </span>
                    </span>
                    <Link
                        href={EXAM_BANK_BUY_HREF}
                        onClick={track}
                        className="flex-shrink-0 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-[13px] font-black text-white shadow-lg active:scale-95 transition-transform"
                    >
                        สมัครเลย
                    </Link>
                    <button
                        onClick={() => setDismissed(true)}
                        aria-label="ปิดแถบชวนสมัคร"
                        className="flex-shrink-0 -mr-1 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        );
    }

    // ── แผงในไซด์บาร์เดสก์ท็อป ────────────────────────────────────────
    if (variant === "rail") {
        return (
            <div className={`rounded-2xl border border-amber-200 dark:border-amber-700/60 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/25 dark:to-orange-900/10 p-4 text-center ${className}`}>
                <span className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-300/60 dark:shadow-amber-900/50">
                    <Lock size={20} />
                </span>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100 leading-snug">
                    {heading ?? "ยังไม่ได้เป็นสมาชิกคลังข้อสอบ"}
                </p>
                <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                    สมัครครั้งเดียว ปลดล็อกข้อสอบทุกชุด ป.4–ม.6 พร้อมเฉลยละเอียดทุกข้อ
                </p>
                <div className="my-3 flex items-center justify-center gap-2">{priceRow}</div>
                <Link
                    href={EXAM_BANK_BUY_HREF}
                    onClick={track}
                    className="block w-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-black text-white shadow-lg shadow-amber-300/60 dark:shadow-amber-900/50 transition-all hover:scale-[1.03] hover:from-amber-600 hover:to-orange-600 active:scale-95"
                >
                    สมัครสมาชิกคลังข้อสอบ
                </Link>
                <p className="mt-2 text-[10px] font-bold text-amber-600/80 dark:text-amber-500/80">
                    จ่ายครั้งเดียว ใช้ได้ 5 ปี · ไม่มีรายเดือน
                </p>
            </div>
        );
    }

    // ── การ์ดใหญ่บนหน้าเริ่มทำข้อสอบ ──────────────────────────────────
    return (
        <div
            className={`relative overflow-hidden rounded-[22px] border border-amber-200 dark:border-amber-700/60 bg-gradient-to-br from-amber-50 via-orange-50 to-white dark:from-amber-900/25 dark:via-orange-900/15 dark:to-slate-900/60 p-6 md:p-7 shadow-[0_24px_44px_-30px_rgba(234,88,12,.75)] ${className}`}
        >
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-amber-200/40 dark:bg-amber-500/10 blur-3xl" />
            <div className="absolute right-0 top-0 rounded-bl-2xl bg-rose-500 px-3 py-1 text-[11px] font-black text-white">
                ลด {EXAM_BANK_DISCOUNT_PERCENT}%
            </div>

            <div className="relative flex items-start gap-4">
                <span className="hidden sm:flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-white shadow-lg shadow-amber-300/70 dark:shadow-amber-900/60">
                    <Lock size={26} strokeWidth={1.9} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 text-[11px] font-black text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/60">
                        <Sparkles size={12} /> สำหรับคนที่ยังไม่ได้สมัคร
                    </p>
                    <h3 className="mt-2 text-[19px] md:text-xl font-black leading-snug text-slate-800 dark:text-slate-100">
                        {heading ?? "ชุดนี้เป็นแค่ 1 ชุด — สมาชิกได้ทั้งคลัง"}
                    </h3>
                    <ul className="mt-3 space-y-1.5">
                        {PERKS.map((perk) => (
                            <li key={perk} className="flex items-start gap-2 text-[13px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                                <Check size={15} className="mt-0.5 flex-shrink-0 text-emerald-500" strokeWidth={3} />
                                <span>{perk}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="leading-tight">
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">ราคาสมาชิกตอนนี้</p>
                            {priceRow}
                        </div>
                        <Link
                            href={EXAM_BANK_BUY_HREF}
                            onClick={track}
                            className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-7 py-3.5 text-[15px] font-black text-white shadow-xl shadow-amber-300/70 dark:shadow-amber-900/60 transition-all hover:-translate-y-0.5 hover:scale-[1.03] hover:from-amber-600 hover:to-orange-600 active:scale-95"
                        >
                            สมัครสมาชิกคลังข้อสอบ
                        </Link>
                    </div>
                    <p className="mt-2.5 text-[11px] font-bold text-amber-600/90 dark:text-amber-500/90">
                        จ่ายครั้งเดียว ใช้ได้ 5 ปี · ไม่มีรายเดือน · ข้อสอบใหม่เพิ่มให้ฟรีตลอด
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ExamBuyCta;
