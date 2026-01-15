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

    const handleSubmit = () => {
        if (!confirm("ยืนยันส่งคำตอบหรือไม่?")) return;
        let s = 0;
        questions.forEach((q, i) => {
            if (answers[i] === (q.answerIndex || 0)) s++;
        });
        setScore(s);
        setIsSubmitted(true);
        onComplete();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="w-full min-h-full flex flex-col items-center py-8 px-4 bg-slate-50">
            <div className="w-full max-w-4xl space-y-6">

                {/* 🧭 Top Navigation Bar (Progress & Map Toggle) */}
                {/* 🗺️ Top Exam Map (Always Visible) */}
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-slate-700 flex items-center gap-2">
                            🗺️ แผนที่ข้อสอบ <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-lg font-bold">ทั้งหมด {questions.length} ข้อ</span>
                        </h3>
                        <div className="text-xs font-bold text-slate-400">
                            ข้อที่ {currentIndex + 1}
                        </div>
                    </div>

                    <div className="grid grid-cols-5 md:grid-cols-10 xl:grid-cols-[repeat(15,minmax(0,1fr))] gap-2">
                        {questions.map((_, idx) => {
                            const isCurrent = idx === currentIndex;
                            const isDone = answers[idx] !== undefined;
                            const isCorrect = isSubmitted && isDone && answers[idx] === (questions[idx].answerIndex ?? questions[idx].correctAnswer ?? 0);
                            const isWrong = isSubmitted && isDone && !isCorrect;

                            let btnStyle = "bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-transparent"; // Default

                            if (isCurrent) btnStyle = "bg-yellow-400 text-yellow-900 font-black shadow-lg shadow-yellow-200 scale-110 z-10 ring-2 ring-white"; // Active
                            else if (isCorrect) btnStyle = "bg-emerald-100 text-emerald-600 font-bold border-emerald-200";
                            else if (isWrong) btnStyle = "bg-rose-100 text-rose-600 font-bold border-rose-200";
                            else if (isDone) btnStyle = "bg-indigo-50 text-indigo-600 font-bold border-indigo-100";

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
                    <div className="bg-white rounded-3xl p-8 border-2 border-emerald-100 shadow-xl flex flex-col items-center gap-4 animate-in zoom-in slide-in-from-top-4">
                        <div className="text-6xl">🏆</div>
                        <h2 className="text-3xl font-black text-slate-800">ผลการทดสอบ</h2>
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
                            correctIndex: currentQ.answerIndex ?? currentQ.correctAnswer ?? 0,
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
                        className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                        <span>←</span> ข้อก่อนหน้า
                    </button>

                    {/* 💡 Peek Button (Restored) */}
                    {!isRevealed && !isSubmitted && (
                        <button
                            onClick={toggleReveal}
                            className="px-6 py-3 rounded-xl font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition flex items-center gap-2 w-full md:w-auto justify-center"
                        >
                            <span>💡 ดูเฉลยข้อนี้</span>
                        </button>
                    )}

                    {currentIndex === questions.length - 1 ? (
                        !isSubmitted && (
                            <button
                                onClick={handleSubmit}
                                className="px-8 py-3 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-200 hover:scale-105 transition"
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
