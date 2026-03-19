import React, { useState, useEffect } from 'react';
import { QuestionCard } from "@/components/exam/QuestionCard";

interface ExamRunnerProps {
    questions: any[];
    onComplete: () => void;
}

export const ExamRunner: React.FC<ExamRunnerProps> = ({ questions, onComplete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [revealed, setRevealed] = useState<Record<number, boolean>>({}); // ✅ Track revealed questions

    // 📜 Auto-scroll (Story Path Effect)
    useEffect(() => {
        const el = document.getElementById(`story-node-${currentIndex}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, [currentIndex]);

    const currentQ = questions[currentIndex];
    const isAnswered = answers[currentIndex] !== undefined;
    const isRevealed = revealed[currentIndex] || isSubmitted; // Show if individually revealed OR exam submitted

    const handleSelect = (idx: number) => {
        if (isSubmitted || isRevealed) return; // Lock if submitted or revealed
        setAnswers({ ...answers, [currentIndex]: idx });
    };

    const toggleReveal = () => {
        setRevealed(prev => ({ ...prev, [currentIndex]: true }));
    };

    // Extract stated correct answer from explanation text (returns 0-based index or null)
    const extractAnswerFromExplanation = (explanation: string): number | null => {
        if (!explanation || typeof explanation !== 'string') return null;
        const clean = explanation
            .replace(/\\\[[\s\S]*?\\\]/g, '').replace(/\$\$[\s\S]*?\$\$/g, '')
            .replace(/\\\([\s\S]*?\\\)/g, '').replace(/\$[^$]+\$/g, '').replace(/\*\*/g, '');
        const patterns = [
            /คำตอบ\s*:?\s*ข้อ\s*(\d)/, /คำตอบคือ\s*ข้อ\s*(\d)/,
            /คำตอบที่ถูกต้อง\s*(?:คือ)?\s*:?\s*ข้อ\s*(\d)/,
            /เฉลย\s*:?\s*ข้อ\s*(\d)/, /ตอบ\s*ข้อ\s*(\d)/,
            /ดังนั้น\s*ข้อ\s*(\d)/, /ตอบข้อ\s*(\d)/,
        ];
        for (const p of patterns) {
            const m = clean.match(p);
            if (m) { const n = parseInt(m[1]); if (n >= 1 && n <= 4) return n - 1; }
        }
        // Thai letter patterns — avoid capturing ข in ข้อ
        const thaiMap: Record<string, number> = { 'ก': 0, 'ข': 1, 'ค': 2, 'ง': 3 };
        const thaiPats = [
            /คำตอบ\s*:?\s*ข้อ\s*([กคง])/, /เฉลย\s*:?\s*ข้อ\s*([กคง])/,
            /คำตอบ\s*:?\s*([กขคง])(?!้)/, /เฉลย\s*:?\s*([กขคง])(?!้)/,
        ];
        for (const p of thaiPats) {
            const m = clean.match(p);
            if (m && thaiMap[m[1]] !== undefined) return thaiMap[m[1]];
        }
        return null;
    };

    // Resolve correct index per question (same logic as ExamSystem)
    const getCorrectIndex = (q: any) => {
        const raw = q.answerIndex ?? q.correctIndex ?? q.correctAnswer ?? 0;

        // Thai letter parsing: ก→0, ข→1, ค→2, ง→3
        let idx: number;
        if (typeof raw === 'string') {
            const map: Record<string, number> = { '\u0e01': 0, '\u0e02': 1, '\u0e04': 2, '\u0e07': 3 };
            const m = raw.trim().match(/([\u0e01\u0e02\u0e04\u0e07])/);
            if (m && map[m[1]] !== undefined) {
                idx = map[m[1]];
            } else {
                idx = Number(raw);
                if (isNaN(idx)) idx = 0;
            }
        } else {
            idx = Number(raw);
            if (isNaN(idx)) idx = 0;
        }

        const optLen = Array.isArray(q.options) ? q.options.length : 4;
        if (idx >= optLen && idx > 0) idx = idx - 1;
        if (idx < 0 || idx >= optLen) idx = 0;

        // Cross-check with explanation — trust explanation over stored index
        const explAnswer = extractAnswerFromExplanation(q.explanation || q.solution || '');
        if (explAnswer !== null && explAnswer !== idx && explAnswer >= 0 && explAnswer < optLen) {
            idx = explAnswer;
        }
        return idx;
    };

    const handleSubmit = () => {
        if (!confirm("ยืนยันส่งคำตอบหรือไม่?")) return;
        let s = 0;
        questions.forEach((q, i) => {
            if (answers[i] === getCorrectIndex(q)) s++;
        });
        setScore(s);
        setIsSubmitted(true);
        onComplete();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="w-full min-h-full flex flex-col items-center py-8 px-4 bg-slate-50 dark:bg-slate-900">
            <div className="w-full max-w-4xl space-y-6">

                {/* 🧭 Top Navigation Bar (Progress & Map Toggle) */}
                {/* 🗺️ Top Exam Map (Always Visible) */}
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            🗺️ แผนที่ข้อสอบ <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg font-bold">ทั้งหมด {questions.length} ข้อ</span>
                        </h3>
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500">
                            ข้อที่ {currentIndex + 1}
                        </div>
                    </div>

                    <div className="grid grid-cols-5 md:grid-cols-10 xl:grid-cols-[repeat(15,minmax(0,1fr))] gap-2">
                        {questions.map((_, idx) => {
                            const isCurrent = idx === currentIndex;
                            const isDone = answers[idx] !== undefined;
                            const isCorrect = isSubmitted && isDone && answers[idx] === getCorrectIndex(questions[idx]);
                            const isWrong = isSubmitted && isDone && !isCorrect;

                            let btnStyle = "bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 hover:text-slate-600 dark:hover:text-slate-300 border border-transparent"; // Default

                            if (isCurrent) btnStyle = "bg-yellow-400 text-yellow-900 font-black shadow-lg shadow-yellow-200 dark:shadow-yellow-900/30 scale-110 z-10 ring-2 ring-white dark:ring-slate-800"; // Active
                            else if (isCorrect) btnStyle = "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-bold border-emerald-200 dark:border-emerald-700";
                            else if (isWrong) btnStyle = "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-bold border-rose-200 dark:border-rose-700";
                            else if (isDone) btnStyle = "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold border-indigo-100 dark:border-indigo-700";

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`aspect-square rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-200 ${btnStyle}`}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Score Header (Shown after submit) */}
                {isSubmitted && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border-2 border-emerald-100 dark:border-emerald-800 shadow-xl flex flex-col items-center gap-4 animate-in zoom-in slide-in-from-top-4">
                        <div className="text-6xl">🏆</div>
                        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100">ผลการทดสอบ</h2>
                        <div className="flex items-end gap-2 text-emerald-600">
                            <span className="text-6xl font-black">{score}</span>
                            <span className="text-2xl font-bold mb-2">/ {questions.length} คะแนน</span>
                        </div>
                    </div>
                )}

                {/* 📝 Question Card (Powered by Exam Hub Engine) */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <QuestionCard
                        question={{
                            id: currentIndex,
                            question: currentQ.question,
                            options: currentQ.options,
                            correctIndex: getCorrectIndex(currentQ),
                            explanation: currentQ.explanation,
                            image: currentQ.image
                        }}
                        questionNumber={currentIndex + 1}
                        totalQuestions={questions.length}
                        selectedOption={answers[currentIndex] ?? null}
                        onSelectOption={handleSelect}
                        isSubmitted={isSubmitted || isRevealed}
                    />
                </div>

                {/* Footer Controls */}
                <div className="flex flex-col-reverse md:flex-row justify-between items-center gap-4 pt-6 pb-20">
                    <button
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className="px-6 py-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                        <span>←</span> ข้อก่อนหน้า
                    </button>

                    {/* 💡 Peek Button (Restored) */}
                    {!isRevealed && !isSubmitted && (
                        <button
                            onClick={toggleReveal}
                            className="px-6 py-3 rounded-xl font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition flex items-center gap-2 w-full md:w-auto justify-center"
                        >
                            <span>💡 ดูเฉลยข้อนี้</span>
                        </button>
                    )}

                    {currentIndex === questions.length - 1 ? (
                        !isSubmitted && (
                            <button
                                onClick={handleSubmit}
                                className="px-8 py-3 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 hover:scale-105 transition"
                            >
                                ✨ ส่งคำตอบทั้งหมด
                            </button>
                        )
                    ) : (
                        <button
                            onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                            className="px-6 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg transition flex items-center gap-2"
                        >
                            ข้อต่อไป <span>→</span>
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};
