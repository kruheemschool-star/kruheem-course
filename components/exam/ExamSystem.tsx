"use client";

import React, { useState } from 'react';
import { ExamQuestion } from '@/types/exam';
import { QuestionCard } from './QuestionCard';
import { ChevronLeft, ChevronRight, CheckCircle, RotateCcw, Trophy, Award } from 'lucide-react';

interface ExamSystemProps {
    examData: ExamQuestion[];
    examTitle: string;
    initialQuestionIndex?: number;
    onComplete?: (score: number, total: number) => void;
}

// Helper removed: getCorrectIndex (Logic cleanup)

export const ExamSystem: React.FC<ExamSystemProps> = ({ examData, examTitle, initialQuestionIndex = 0, onComplete }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialQuestionIndex);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [checkedQuestions, setCheckedQuestions] = useState<Record<number, boolean>>({});
    const [isFinished, setIsFinished] = useState(false); // Restore finish state
    const [showGrid, setShowGrid] = useState(false);

    // Sanitize Data: Smart Normalization
    // Detect if data is 1-based (Human) or 0-based (Tech)
    const sanitizedExamData = React.useMemo(() => {
        // First pass: Parse all to numbers
        let rawIndices: number[] = [];
        const parsed = examData.map(q => {
            const val = q.correctIndex as any;
            // Parse strictly
            if (val === undefined || val === null || val === "") return { ...q, correctIndex: -1 };
            const num = Number(val);
            if (!isNaN(num)) rawIndices.push(num);
            return { ...q, correctIndex: isNaN(num) ? -1 : num };
        });

        // Heuristic: If we have indices, check existence of 0
        const hasZero = rawIndices.includes(0);
        const allPositive = rawIndices.every(i => i > 0);

        // Decision: If NO zero exists and ALL are positive, assume 1-based.
        // e.g. [1, 2, 3, 4] -> Shift to [0, 1, 2, 3]
        // e.g. [0, 1, 2, 3] -> Keep as is
        const shouldShift = !hasZero && allPositive && rawIndices.length > 0;

        return parsed.map(q => ({
            ...q,
            correctIndex: (q.correctIndex !== -1 && shouldShift) ? q.correctIndex - 1 : q.correctIndex
        }));
    }, [examData]);

    const currentQuestion = sanitizedExamData[currentQuestionIndex];
    const totalQuestions = sanitizedExamData.length;

    // ... (Keep handleSelectOption, handleCheckAnswer, handlePrev, handleNext)

    const handleSelectOption = (optionIndex: number) => {
        if (checkedQuestions[currentQuestionIndex]) return;
        setAnswers({ ...answers, [currentQuestionIndex]: optionIndex });
    };

    const handleCheckAnswer = () => {
        setCheckedQuestions({ ...checkedQuestions, [currentQuestionIndex]: true });
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1);
    };

    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) setCurrentQuestionIndex(prev => prev + 1);
    };

    const handleFinishExam = () => {
        const unansweredCount = totalQuestions - Object.keys(answers).length;
        if (unansweredCount > 0) {
            if (!confirm(`คุณยังทำข้อสอบไม่ครบ ${unansweredCount} ข้อ\nต้องการส่งคำตอบเลยหรือไม่?`)) return;
        } else if (!confirm("ยืนยันการส่งคำตอบ?")) {
            return;
        }

        // Calculate Score with NEW Clean Logic
        let score = 0;
        sanitizedExamData.forEach((q, index) => {
            if (answers[index] === q.correctIndex) score++;
        });

        // Reveal all answers
        const allChecked: Record<number, boolean> = {};
        for (let i = 0; i < totalQuestions; i++) allChecked[i] = true;
        setCheckedQuestions(allChecked);

        setIsFinished(true);

        if (onComplete) onComplete(score, totalQuestions);
    };

    const handleRestart = () => {
        setCurrentQuestionIndex(0);
        setAnswers({});
        setCheckedQuestions({});
        setIsFinished(false);
    };

    if (isFinished) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-6">
                <div className="bg-white rounded-[3rem] shadow-xl p-12 text-center border border-stone-100 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-amber-50 to-transparent -z-10"></div>
                    <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg animate-bounce">
                        <Trophy size={48} />
                    </div>
                    <h2 className="text-4xl font-black text-slate-800 mb-2">สิ้นสุดการฝึกฝน</h2>
                    <p className="text-stone-500 mb-8 font-medium">ชุดข้อสอบ: {examTitle}</p>
                    <p className="text-xl text-stone-600 mb-12">คุณได้ทำแบบฝึกหัดเสร็จสิ้นแล้ว 🎉</p>

                    <div className="flex justify-center gap-4">
                        <button
                            onClick={handleRestart}
                            className="px-8 py-4 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
                        >
                            <RotateCcw size={20} />
                            ทำข้อสอบใหม่
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ... (rest) ...

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 font-sans flex flex-col lg:flex-row gap-8 items-start">

            {/* Sidebar: Question Grid (Desktop) */}
            <div className="hidden lg:block w-72 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sticky top-24">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center justify-between">
                    <span>แผนที่ข้อสอบ</span>
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">{currentQuestionIndex + 1}/{totalQuestions}</span>
                </h3>
                <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: totalQuestions }).map((_, idx) => {
                        const isAnswered = answers[idx] !== undefined;
                        const isCurrent = currentQuestionIndex === idx;
                        const isChecked = checkedQuestions[idx]; // Check if the question has been reviewed/checked

                        let btnClass = "bg-slate-50 text-slate-400 hover:bg-slate-100"; // Default
                        if (isAnswered) btnClass = "bg-blue-100 text-blue-600 font-bold border-blue-200";
                        if (isChecked) btnClass = "bg-amber-100 text-amber-600 font-bold border-amber-200"; // Just indicate reviewed status
                        if (isCurrent) btnClass += " ring-2 ring-amber-400 ring-offset-2 z-10";

                        return (
                            <button
                                key={idx}
                                onClick={() => setCurrentQuestionIndex(idx)}
                                className={`aspect-square rounded-lg text-sm flex items-center justify-center transition-all border ${btnClass}`}
                            >
                                {idx + 1}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 w-full max-w-4xl">
                {/* Top Bar: Progress & Title (Mobile Only Grid Toggle) */}
                <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <Award className="text-amber-500" />
                            {examTitle}
                        </h1>
                        <p className="text-stone-500 text-sm mt-1 pl-1">ทดสอบวัดระดับความรู้คณิตศาสตร์</p>
                    </div>

                    {/* Mobile Progress & Grid Toggle */}
                    <div className="w-full md:w-48 lg:hidden">
                        <div className="flex justify-between text-xs font-bold text-stone-400 mb-2">
                            <span>ความคืบหน้า</span>
                            <span>{Math.round((Object.keys(answers).length / totalQuestions) * 100)}%</span>
                        </div>
                        <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden mb-2">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500 ease-out"
                                style={{ width: `${(Object.keys(answers).length / totalQuestions) * 100}%` }}
                            ></div>
                        </div>
                        <button onClick={() => setShowGrid(!showGrid)} className="text-xs text-indigo-500 font-bold w-full text-right">
                            {showGrid ? "ซ่อนแผนที่ข้อสอบ" : "ดูแผนที่ข้อสอบ"}
                        </button>
                    </div>
                </div>

                {/* Mobile Grid Dropdown */}
                {showGrid && (
                    <div className="lg:hidden mb-6 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                            {Array.from({ length: totalQuestions }).map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => { setCurrentQuestionIndex(idx); setShowGrid(false); }}
                                    className={`aspect-square rounded-lg text-xs font-bold flex items-center justify-center border
                                        ${currentQuestionIndex === idx ? 'ring-2 ring-amber-400 ring-offset-2 z-10 border-transparent' : ''}
                                        ${answers[idx] !== undefined ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100'}
                                    `}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[400px]">
                    <QuestionCard
                        key={currentQuestion.id}
                        question={currentQuestion}
                        questionNumber={currentQuestionIndex + 1}
                        totalQuestions={totalQuestions}
                        selectedOption={answers[currentQuestionIndex] ?? null}
                        onSelectOption={handleSelectOption}
                        isSubmitted={!!checkedQuestions[currentQuestionIndex]}
                    />
                </div>

                {/* Control Bar */}
                <div className="mt-8 flex items-center justify-between">
                    <button
                        onClick={handlePrev}
                        disabled={currentQuestionIndex === 0}
                        className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all ${currentQuestionIndex === 0
                            ? 'opacity-0 pointer-events-none'
                            : 'text-stone-500 hover:bg-stone-100'
                            }`}
                    >
                        <ChevronLeft size={20} />
                        <span className="hidden sm:inline">ข้อก่อนหน้า</span>
                    </button>

                    <div className="flex gap-3">
                        {/* Check Answer Button (Restored) */}
                        {!checkedQuestions[currentQuestionIndex] && (
                            <button
                                onClick={handleCheckAnswer}
                                className={`px-4 sm:px-6 py-3 rounded-full font-bold text-sm sm:text-base border-2 transition-all ${answers[currentQuestionIndex] !== undefined
                                    ? 'border-indigo-100 text-indigo-600 hover:bg-indigo-50'
                                    : 'border-amber-100 text-amber-600 hover:bg-amber-50'
                                    }`}
                            >
                                {answers[currentQuestionIndex] !== undefined ? "ตรวจข้อนี้" : "ดูเฉลย"}
                            </button>
                        )}

                        {/* Next / Finish Button */}
                        {currentQuestionIndex < totalQuestions - 1 ? (
                            <button
                                onClick={handleNext}
                                className="px-6 sm:px-8 py-3 rounded-full font-bold text-white bg-slate-800 shadow-lg hover:bg-slate-900 hover:shadow-xl hover:-translate-y-1 transition-all transform active:scale-95 flex items-center gap-2"
                            >
                                <span className="hidden sm:inline">ข้อถัดไป</span>
                                <span className="sm:hidden">ถัดไป</span>
                                <ChevronRight size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={handleFinishExam}
                                className="px-6 sm:px-8 py-3 rounded-full font-bold text-white bg-green-600 shadow-lg hover:bg-green-700 hover:shadow-xl hover:-translate-y-1 transition-all transform active:scale-95 flex items-center gap-2"
                            >
                                <CheckCircle size={20} />
                                <span className="hidden sm:inline">ส่งคำตอบ</span>
                                <span className="sm:hidden">ส่ง</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
