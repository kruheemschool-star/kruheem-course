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
        <section className="kh-sec">
            {/* Header */}
            <div className="kh-sec-head">
                <h2 className="kh-h2">
                    {data.title || "แบบทดสอบประเมินความพร้อม"} <span>🧭</span>
                </h2>
                {data.subtitle && <p className="kh-sub mt-3 max-w-xl mx-auto">{data.subtitle}</p>}
            </div>

            <div className="kh-card mx-auto w-full max-w-[680px] p-6 md:p-10">
                {/* ── Intro ── */}
                {!started && !finished && (
                    <div className="text-center py-6">
                        <div
                            className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center"
                            style={{
                                background: "linear-gradient(135deg, var(--kh-p), var(--kh-p2))",
                                color: "var(--kh-onD)",
                                boxShadow: "var(--kh-shadow-sm)",
                            }}
                        >
                            <ClipboardCheck size={40} />
                        </div>
                        <p className="mt-6 font-medium" style={{ color: "var(--kh-body)" }}>
                            {total} ข้อ · ใช้เวลาไม่ถึง 1 นาที · รู้ผลทันที
                        </p>
                        <button
                            onClick={() => setStarted(true)}
                            className="kh-kanit mt-6 inline-block px-10 py-4 rounded-2xl font-bold text-lg transition-transform hover:scale-[1.03] active:scale-95"
                            style={{
                                background: "linear-gradient(135deg, var(--kh-p), var(--kh-p2))",
                                color: "var(--kh-onD)",
                                boxShadow: "var(--kh-shadow-sm)",
                            }}
                        >
                            {data.startButtonText || "เริ่มทำแบบทดสอบ"}
                        </button>
                    </div>
                )}

                {/* ── Question ── */}
                {started && !finished && (
                    <div>
                        {/* Progress */}
                        <div className="flex items-center justify-between mb-2 text-sm font-semibold" style={{ color: "var(--kh-mut)" }}>
                            <button
                                onClick={back}
                                disabled={current === 0}
                                className="flex items-center gap-1 hover:opacity-70 disabled:opacity-0 transition"
                            >
                                <ChevronLeft size={16} /> ย้อนกลับ
                            </button>
                            <span className="kh-num">ข้อ {current + 1} / {total}</span>
                        </div>
                        <div className="h-2 w-full rounded-full overflow-hidden mb-7" style={{ background: "var(--kh-pT)" }}>
                            <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(progress, 6)}%`, background: "var(--kh-p)" }}
                            />
                        </div>

                        {/* Question */}
                        <h3 className="kh-h3 text-center mb-6 min-h-[3.5rem]">
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
                                        className="group kh-card w-full flex items-center gap-3 text-left px-5 py-4 transition-all active:scale-[0.99] hover:border-[color:var(--kh-p)] hover:bg-[color:var(--kh-tint)]"
                                    >
                                        <span className="w-6 h-6 rounded-full border-2 border-[color:var(--kh-line)] group-hover:border-[color:var(--kh-p)] flex-shrink-0 transition-colors" />
                                        <span className="font-medium" style={{ color: "var(--kh-body)" }}>{opt.text}</span>
                                    </button>
                                ))}
                        </div>
                    </div>
                )}

                {/* ── Result ── */}
                {finished && (
                    <div className="text-center py-2">
                        <div className="kh-tintbox p-6 md:p-8">
                            {result ? (
                                <>
                                    <div className="text-6xl mb-3">{result.emoji || "🎯"}</div>
                                    <h3 className="kh-kanit text-2xl md:text-3xl font-extrabold" style={{ color: "var(--kh-ink)" }}>
                                        {result.title}
                                    </h3>
                                    {result.desc && (
                                        <p className="mt-3 leading-relaxed max-w-lg mx-auto" style={{ color: "var(--kh-body)" }}>
                                            {result.desc}
                                        </p>
                                    )}

                                    {result.ctaText?.trim() && (
                                        result.ctaUrl?.trim() ? (
                                            <a
                                                href={result.ctaUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="kh-cta-btn mt-7"
                                            >
                                                {result.ctaText}
                                            </a>
                                        ) : (
                                            <button onClick={() => ctx.onCTAClick()} className="kh-cta-btn mt-7">
                                                {result.ctaText}
                                            </button>
                                        )
                                    )}
                                </>
                            ) : (
                                <h3 className="kh-kanit text-2xl font-bold" style={{ color: "var(--kh-ink)" }}>
                                    ทำแบบทดสอบเสร็จแล้ว 🎉
                                </h3>
                            )}
                        </div>

                        <div className="mt-6">
                            <button onClick={reset} className="kh-ghost-btn text-sm">
                                <RotateCcw size={15} /> {data.retakeButtonText || "ทำใหม่อีกครั้ง"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
