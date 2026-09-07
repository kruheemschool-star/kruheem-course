"use client";

import { BarChart3 } from "lucide-react";
import type { ExamPaperAnalysis } from "@/types";

// "วิเคราะห์แนวข้อสอบ" — the star sales section. Shows which chapters appear
// most (from analysing past papers) as bars, plus how much of that this set
// covers. Renders nothing unless there are chapter rows to show.
export default function ExamAnalysisSection({ analysis }: { analysis?: ExamPaperAnalysis }) {
    const chapters = (analysis?.chapters || []).filter((c) => c.name?.trim()).slice(0, 10);
    if (chapters.length === 0) return null;

    const max = Math.max(...chapters.map((c) => c.percent || 0), 1);
    // Teal shades by rank so the biggest bars read strongest.
    const shade = (i: number) => (i === 0 ? "#0D9488" : i === 1 ? "#0D9488" : i < 4 ? "#14B8A6" : "#5EDCC4");

    return (
        <section className="mt-12 rounded-3xl border border-teal-100 dark:border-teal-900 bg-teal-50/40 dark:bg-teal-950/30 p-6 md:p-8">
            <div className="text-center mb-7">
                <div className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-teal-600 dark:text-teal-400">
                    <BarChart3 size={15} />
                    วิเคราะห์จากข้อสอบจริง{analysis?.years ? ` ${analysis.years} ปีล่าสุด` : ""}
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mt-2 leading-tight">
                    {analysis?.headline || "บทไหนออกบ่อยที่สุด?"}
                </h2>
                {(analysis?.totalQuestions || analysis?.years) && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                        {analysis?.totalQuestions ? `นับจากข้อสอบจริง รวม ${analysis.totalQuestions.toLocaleString()} ข้อ — ` : ""}เก็งจากข้อมูล ไม่ใช่เดา
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-3 max-w-2xl mx-auto">
                {chapters.map((c, i) => (
                    <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-semibold text-slate-800 dark:text-slate-100">{c.name}</span>
                            <span className="font-bold text-teal-700 dark:text-teal-300 tabular-nums">{Math.round(c.percent)}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-white dark:bg-slate-800 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(4, (c.percent / max) * 100)}%`, background: shade(i) }} />
                        </div>
                    </div>
                ))}
            </div>

            {typeof analysis?.coverage === "number" && analysis.coverage > 0 && (
                <div className="max-w-2xl mx-auto mt-7 flex items-center gap-4 rounded-2xl border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 px-5 py-4">
                    <div className="text-4xl font-black text-teal-700 dark:text-teal-300 leading-none tabular-nums shrink-0">{Math.round(analysis.coverage)}%</div>
                    <div>
                        <div className="font-bold text-slate-900 dark:text-white">ชุดเก็งนี้ครอบคลุมแนวที่ออกบ่อย {Math.round(analysis.coverage)}%</div>
                        <div className="text-sm text-teal-700 dark:text-teal-400 mt-0.5">{analysis?.note || "ออกโจทย์ให้ตรงกับบทที่สถิติบอกว่าออกจริง — ฝึกตรงจุด ไม่เสียเวลา"}</div>
                    </div>
                </div>
            )}
        </section>
    );
}
