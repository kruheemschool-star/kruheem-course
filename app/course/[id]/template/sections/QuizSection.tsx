"use client";
import { useState } from "react";
import type { QuizData, QuizQuestion, QuizResultTier, SectionContext } from "../types";
import { RotateCcw, ChevronLeft, ClipboardCheck } from "lucide-react";

/* Pick the highest tier whose minScore is <= the total score. */
function pickResult(results: QuizResultTier[], total: number): QuizResultTier | null {
    const valid = (results || []).filter((r) => r.title?.trim());
    if (valid.length === 0) return null;
    const sorted = [...valid].sort((a, b) => (a.minScore ?? 0) - (b.minScore ?? 0));
    let chosen = sorted[0];
    for (const r of sorted) {
        if (total >= (r.minScore ?? 0)) chosen = r;
    }
    return chosen;
}

export default function QuizSection({ data, ctx }: { data: QuizData; ctx: SectionContext }) {
    const questions: QuizQuestion[] = (data.questions || []).filter(
        (q) => q.question?.trim() && (q.options || []).some((o) => o.text?.trim())
    );

    const [started, setStarted] = useState(false);
    const [current, setCurrent] = useState(0);
    const [picks, setPicks] = useState<number[]>([]); // score chosen per question
    const [finished, setFinished] = useState(false);

    if (questions.length === 0) return null;

    const total = questions.length;
    const answeredScore = picks.reduce((a, b) => a + b, 0);

    const choose = (optScore: number) => {
        const nextPicks = [...picks.slice(0, current), optScore];
        setPicks(nextPicks);
        if (current + 1 >= total) setFinished(true);
        else setCurrent(current + 1);
    };

    const back = () => {
        if (current > 0) setCurrent(current - 1);
    };

    const reset = () => {
        setStarted(false);
        setCurrent(0);
        setPicks([]);
        setFinished(false);
    };

    const result = finished ? pickResult(data.results || [], answeredScore) : null;
    const progress = finished ? 100 : Math.round((current / total) * 100);

    return (
        <section className="w-full py-16 md:py-24 bg-gradient-to-b from-indigo-50/40 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
            <div className="max-w-2xl mx-auto px-4 md:px-6">
                {/* Header */}
                <div className="text-center mb-8 md:mb-10">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                        {data.title || "แบบทดสอบประเมินความพร้อม"} <span className="text-indigo-600 dark:text-indigo-400">🧭</span>
                    </h2>
                    {data.subtitle && (
                        <p className="mt-3 text-slate-500 dark:text-slate-400 text-base md:text-lg max-w-xl mx-auto">{data.subtitle}</p>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none p-6 md:p-10">
                    {/* ── Intro ── */}
                    {!started && !finished && (
                        <div className="text-center py-6">
                            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
                                <ClipboardCheck size={40} />
                            </div>
                            <p className="mt-6 text-slate-600 dark:text-slate-300 font-medium">
                                {total} ข้อ · ใช้เวลาไม่ถึง 1 นาที · รู้ผลทันที
                            </p>
                            <button
                                onClick={() => setStarted(true)}
                                className="mt-6 inline-block px-10 py-4 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow-xl shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-transform"
                            >
                                {data.startButtonText || "เริ่มทำแบบทดสอบ"}
                            </button>
                        </div>
                    )}

                    {/* ── Question ── */}
                    {started && !finished && (
                        <div>
                            {/* Progress */}
                            <div className="flex items-center justify-between mb-2 text-sm font-bold text-slate-400">
                                <button
                                    onClick={back}
                                    disabled={current === 0}
                                    className="flex items-center gap-1 hover:text-indigo-600 disabled:opacity-0 transition"
                                >
                                    <ChevronLeft size={16} /> ย้อนกลับ
                                </button>
                                <span>ข้อ {current + 1} / {total}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-7">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.max(progress, 6)}%` }}
                                />
                            </div>

                            {/* Question */}
                            <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white text-center leading-snug mb-6 min-h-[3.5rem]">
                                {questions[current].question}
                            </h3>

                            {/* Options */}
                            <div className="space-y-3">
                                {(questions[current].options || [])
                                    .filter((o) => o.text?.trim())
                                    .map((opt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => choose(opt.score || 0)}
                                            className="group w-full flex items-center gap-3 text-left px-5 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 transition-all active:scale-[0.99]"
                                        >
                                            <span className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600 group-hover:border-indigo-500 flex-shrink-0 transition-colors" />
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{opt.text}</span>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* ── Result ── */}
                    {finished && (
                        <div className="text-center py-4">
                            {result ? (
                                <>
                                    <div className="text-6xl mb-3">{result.emoji || "🎯"}</div>
                                    <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white">{result.title}</h3>
                                    {result.desc && (
                                        <p className="mt-3 text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg mx-auto">{result.desc}</p>
                                    )}

                                    {result.ctaText?.trim() && (
                                        result.ctaUrl?.trim() ? (
                                            <a
                                                href={result.ctaUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-7 inline-block px-10 py-4 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow-xl shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-transform"
                                            >
                                                {result.ctaText}
                                            </a>
                                        ) : (
                                            <button
                                                onClick={() => ctx.onCTAClick()}
                                                className="mt-7 inline-block px-10 py-4 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow-xl shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-transform"
                                            >
                                                {result.ctaText}
                                            </button>
                                        )
                                    )}
                                </>
                            ) : (
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">ทำแบบทดสอบเสร็จแล้ว 🎉</h3>
                            )}

                            <div className="mt-6">
                                <button
                                    onClick={reset}
                                    className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-indigo-600 transition"
                                >
                                    <RotateCcw size={15} /> {data.retakeButtonText || "ทำใหม่อีกครั้ง"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
