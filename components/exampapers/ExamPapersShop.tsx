"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Download, Eye, ShoppingBag } from "lucide-react";
import type { ExamPaper } from "@/types";

export default function ExamPapersShop({ papers }: { papers: ExamPaper[] }) {
    const [level, setLevel] = useState<string>("ทั้งหมด");
    const [category, setCategory] = useState<string>("ทั้งหมด");

    const levels = useMemo(
        () => ["ทั้งหมด", ...Array.from(new Set(papers.map((p) => p.level).filter(Boolean) as string[]))],
        [papers],
    );
    const categories = useMemo(
        () => ["ทั้งหมด", ...Array.from(new Set(papers.map((p) => p.category).filter(Boolean) as string[]))],
        [papers],
    );

    const filtered = papers.filter(
        (p) => (level === "ทั้งหมด" || p.level === level) && (category === "ทั้งหมด" || p.category === category),
    );

    return (
        <div className="max-w-6xl mx-auto px-4 md:px-8 pb-16">
            {/* hero */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> ดาวน์โหลดได้เลย
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                    คลังข้อสอบ PDF พร้อมเฉลย
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-4 max-w-xl mx-auto">
                    ซื้อครั้งเดียว โหลดไฟล์เก็บไว้ได้ตลอด พร้อมเฉลยละเอียดทุกข้อ
                </p>
                <Link href="/my-courses" className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                    <Download size={15} /> ข้อสอบที่ฉันซื้อไว้
                </Link>
            </div>

            {/* filters */}
            {papers.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
                    {levels.map((l) => (
                        <button
                            key={l}
                            onClick={() => setLevel(l)}
                            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition ${
                                level === l
                                    ? "bg-teal-600 text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                        >
                            {l}
                        </button>
                    ))}
                    <span className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
                    {categories.map((c) => (
                        <button
                            key={c}
                            onClick={() => setCategory(c)}
                            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition ${
                                category === c
                                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            )}

            {/* grid */}
            {papers.length === 0 ? (
                <div className="text-center py-20">
                    <ShoppingBag className="mx-auto mb-4 text-slate-300 dark:text-slate-600" size={48} />
                    <p className="text-slate-500 dark:text-slate-400">เร็วๆ นี้ครูฮีมจะเปิดขายข้อสอบ PDF ที่นี่</p>
                </div>
            ) : filtered.length === 0 ? (
                <p className="text-center text-slate-500 dark:text-slate-400 py-16">ไม่พบข้อสอบตามที่เลือก ลองเปลี่ยนตัวกรอง</p>
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((p) => (
                        <Link
                            key={p.id}
                            href={`/exam-papers/${p.id}`}
                            className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:shadow-[0_16px_40px_-24px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 transition"
                        >
                            <div className="relative aspect-[4/3] bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                {p.coverUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={p.coverUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition" />
                                ) : (
                                    <FileText size={44} className="text-slate-300 dark:text-slate-600" />
                                )}
                                {p.previewUrl && (
                                    <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 dark:bg-slate-900/95 px-2 py-1 text-[11px] font-bold text-teal-700 dark:text-teal-300 shadow-sm">
                                        <Eye size={12} /> ดูตัวอย่างได้
                                    </span>
                                )}
                            </div>
                            <div className="p-4">
                                <div className="flex items-center gap-1.5 mb-2">
                                    {p.level && <span className="rounded-full bg-teal-50 dark:bg-teal-950 px-2 py-0.5 text-[11px] font-bold text-teal-700 dark:text-teal-300">{p.level}</span>}
                                    {p.category && <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">{p.category}</span>}
                                </div>
                                <h3 className="font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">{p.title}</h3>
                                {p.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{p.description}</p>}
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <span className="text-lg font-black text-teal-600 dark:text-teal-400">฿{Number(p.price || 0).toLocaleString()}</span>
                                    {p.pageCount ? <span className="text-xs text-slate-400">{p.pageCount} หน้า</span> : null}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
