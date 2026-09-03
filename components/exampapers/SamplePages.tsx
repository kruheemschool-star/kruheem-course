"use client";

import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import type { ExamPaperSample } from "@/types";

/**
 * "เปิดดูข้างในเล่ม" — ภาพหน้ากระดาษจริงจากไฟล์ที่ขาย
 *
 * จุดขายหลักของทุกชุดคือ "เฉลยละเอียด" แต่เดิมมันมองไม่เห็นเลยจนกว่าจะกดปุ่ม
 * ดูตัวอย่าง (ซึ่งเปิด PDF อีกแท็บ และเงียบไปเลยใน webview ของ FB/LINE)
 * ตรงนี้เลยเอาหน้าจริงมาแปะให้เห็นคาหน้าขาย กดขยายอ่านได้โดยไม่ต้องออกจากหน้า
 */
export default function SamplePages({ samples }: { samples?: ExamPaperSample[] }) {
    const items = (samples || []).filter((s) => s?.url);
    const [open, setOpen] = useState<number | null>(null);

    const close = useCallback(() => setOpen(null), []);
    const step = useCallback(
        (dir: number) => setOpen((i) => (i === null ? null : (i + dir + items.length) % items.length)),
        [items.length],
    );

    // คีย์บอร์ดสำหรับคนที่เปิดบนคอม + ล็อกการเลื่อนหน้าหลังตอนเปิดภาพเต็ม
    useEffect(() => {
        if (open === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
            else if (e.key === "ArrowRight") step(1);
            else if (e.key === "ArrowLeft") step(-1);
        };
        window.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, close, step]);

    if (items.length === 0) return null;

    return (
        <div className="mt-14">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">เปิดดูข้างในเล่มก่อนตัดสินใจ</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                หน้าจริงจากไฟล์ที่ได้รับ กดที่ภาพเพื่อขยายอ่าน
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
                {items.map((s, i) => (
                    <button
                        key={s.url}
                        onClick={() => setOpen(i)}
                        className="group text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:shadow-[0_16px_40px_-24px_rgba(15,23,42,0.4)] hover:-translate-y-0.5 transition"
                    >
                        <div className="relative bg-slate-50 dark:bg-slate-800 aspect-[3/4] overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={s.url}
                                alt={s.caption || "ตัวอย่างหน้าในเล่ม"}
                                loading="lazy"
                                className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition"
                            />
                            <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition flex items-center justify-center">
                                <ZoomIn size={22} className="text-white opacity-0 group-hover:opacity-100 transition drop-shadow" />
                            </span>
                        </div>
                        {s.caption && (
                            <div className="px-3 py-2.5 text-[12.5px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">
                                {s.caption}
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {open !== null && items[open] && (
                <div
                    className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-sm flex flex-col"
                    role="dialog"
                    aria-modal="true"
                    aria-label={items[open].caption || "ตัวอย่างหน้าในเล่ม"}
                    onClick={close}
                >
                    <div className="flex items-center justify-between gap-3 px-4 py-3 text-white shrink-0">
                        <span className="text-sm font-semibold truncate">
                            {items[open].caption || "ตัวอย่างหน้าในเล่ม"}
                            <span className="text-white/50 font-normal"> · {open + 1}/{items.length}</span>
                        </span>
                        <button
                            onClick={close}
                            aria-label="ปิด"
                            className="rounded-full bg-white/10 hover:bg-white/20 p-2 transition shrink-0"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 min-h-0 flex items-center gap-2 px-2 pb-4">
                        {items.length > 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); step(-1); }}
                                aria-label="หน้าก่อนหน้า"
                                className="rounded-full bg-white/10 hover:bg-white/20 text-white p-2.5 transition shrink-0"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={items[open].url}
                            alt={items[open].caption || "ตัวอย่างหน้าในเล่ม"}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 min-w-0 max-h-full object-contain rounded-lg bg-white"
                        />
                        {items.length > 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); step(1); }}
                                aria-label="หน้าถัดไป"
                                className="rounded-full bg-white/10 hover:bg-white/20 text-white p-2.5 transition shrink-0"
                            >
                                <ChevronRight size={20} />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
