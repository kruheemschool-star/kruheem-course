"use client";

import React, { useState } from 'react';
import { ExamQuestion } from '@/types/exam';
import { QuestionCard } from './QuestionCard';
import { ChevronLeft, ChevronRight, CheckCircle, RotateCcw, Trophy, Award, Lock } from 'lucide-react';

interface ExamSystemProps {
    examData: ExamQuestion[];
    examTitle: string;
    initialQuestionIndex?: number;
    onComplete?: (score: number, total: number) => void;
    isTrial?: boolean;
}

// Grade Calculation Helper
interface FinalScore {
    score: number;
    total: number;
    percent: number;
    grade: string;
    label: string;
    gradeColor: string;
    bgColor: string;
}

const getGradeFromPercent = (percent: number): { grade: string; label: string; gradeColor: string; bgColor: string } => {
    if (percent >= 80) return { grade: 'A', label: 'ยอดเยี่ยม! 🏆', gradeColor: 'text-emerald-600', bgColor: 'bg-emerald-500' };
    if (percent >= 60) return { grade: 'B', label: 'ดี 👍', gradeColor: 'text-blue-600', bgColor: 'bg-blue-500' };
    if (percent >= 40) return { grade: 'C', label: 'พอใช้ 📚', gradeColor: 'text-amber-600', bgColor: 'bg-amber-500' };
    return { grade: 'D', label: 'ต้องปรับปรุง 💪', gradeColor: 'text-rose-600', bgColor: 'bg-rose-500' };
};

// Helper removed: getCorrectIndex (Logic cleanup)

export const ExamSystem: React.FC<ExamSystemProps> = ({ examData, examTitle, initialQuestionIndex = 0, onComplete, isTrial = false }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialQuestionIndex);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [checkedQuestions, setCheckedQuestions] = useState<Record<number, boolean>>({});
    const [isFinished, setIsFinished] = useState(false); // Restore finish state
    const [showGrid, setShowGrid] = useState(false);
    const [finalScore, setFinalScore] = useState<FinalScore | null>(null);

    // Thai letter to 0-based index
    const thaiToIdx = (val: any): number | null => {
        if (typeof val !== 'string') return null;
        const map: Record<string, number> = { '\u0e01': 0, '\u0e02': 1, '\u0e04': 2, '\u0e07': 3 };
        const m = val.trim().match(/([\u0e01\u0e02\u0e04\u0e07])/);
        return m && map[m[1]] !== undefined ? map[m[1]] : null;
    };

    // Sanitize Data: Per-question bounds checking
    // Prioritize answerIndex over correctIndex, auto-fix 1-based if out of bounds
    const sanitizedExamData = React.useMemo(() => {
        const dataToProcess = examData;

        return dataToProcess.map((q: any) => {
            // Step 1: Resolve the correct answer index from available fields
            const raw = q.answerIndex ?? q.correctIndex ?? q.correctAnswer ?? 0;

            // Step 1b: Try Thai letter parsing first
            let idx: number;
            const thaiIdx = thaiToIdx(raw);
            if (thaiIdx !== null) {
                idx = thaiIdx;
            } else {
                idx = Number(raw);
                if (isNaN(idx)) idx = 0;
            }

            // Step 2: Per-question bounds check
            // If index >= options.length, it's clearly 1-based → subtract 1
            const optLen = Array.isArray(q.options) ? q.options.length : 4;
            if (idx >= optLen && idx > 0) {
                idx = idx - 1;
            }

            // Step 3: Clamp to valid range [0, optLen-1]
            if (idx < 0 || idx >= optLen) {
                idx = 0;
            }

            return { ...q, correctIndex: idx };
        });
    }, [examData, isTrial]);

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
        const answerableCount = isTrial ? Math.min(5, totalQuestions) : totalQuestions;
        const unansweredCount = answerableCount - Object.keys(answers).length;
        if (unansweredCount > 0) {
            if (!confirm(`คุณยังทำข้อสอบไม่ครบ ${unansweredCount} ข้อ\nต้องการส่งคำตอบเลยหรือไม่?`)) return;
        } else if (!confirm("ยืนยันการส่งคำตอบ?")) {
            return;
        }

        // Calculate Score with NEW Clean Logic
        let score = 0;
        sanitizedExamData.slice(0, answerableCount).forEach((q, index) => {
            if (answers[index] === q.correctIndex) score++;
        });

        // Calculate Grade
        const percent = answerableCount > 0 ? Math.round((score / answerableCount) * 100) : 0;
        const gradeInfo = getGradeFromPercent(percent);
        setFinalScore({
            score,
            total: answerableCount,
            percent,
            ...gradeInfo
        });

        // Reveal all answers
        const allChecked: Record<number, boolean> = {};
        for (let i = 0; i < answerableCount; i++) allChecked[i] = true;
        setCheckedQuestions(allChecked);

        setIsFinished(true);

        if (onComplete) onComplete(score, answerableCount);
    };

    // Find first wrong answer for review
    const handleReviewWrongAnswers = () => {
        const wrongIndex = sanitizedExamData.findIndex((q, idx) =>
            answers[idx] !== undefined && answers[idx] !== q.correctIndex
        );
        if (wrongIndex !== -1) {
            setCurrentQuestionIndex(wrongIndex);
            setIsFinished(false);
        }
    };

    const handleRestart = () => {
        setCurrentQuestionIndex(0);
        setAnswers({});
        setCheckedQuestions({});
        setIsFinished(false);
        setFinalScore(null);
    };

    if (isFinished && finalScore) {
        const wrongCount = totalQuestions - finalScore.score;

        return (
            <div className="max-w-4xl mx-auto py-12 px-6">
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-xl p-8 md:p-12 border border-stone-100 dark:border-slate-700 relative overflow-hidden">
                    {/* Background Gradient based on Grade */}
                    <div className={`absolute top-0 inset-x-0 h-60 bg-gradient-to-b ${finalScore.bgColor} opacity-10 -z-10`}></div>

                    {/* Trophy/Icon */}
                    <div className={`w-24 h-24 ${finalScore.bgColor} rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg`}>
                        <Trophy size={48} />
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 mb-2 text-center">ผลการทดสอบ</h2>
                    <p className="text-stone-500 dark:text-slate-400 mb-8 font-medium text-center">ชุดข้อสอบ: {examTitle}</p>

                    {/* Up-sell Banner (Trial Mode) */}
                    {isTrial && (
                        <div className="mb-10 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-900/40 dark:via-orange-900/20 dark:to-rose-900/10 border border-amber-200 dark:border-amber-700/50 rounded-3xl p-8 text-center shadow-lg animate-in zoom-in relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/30 rounded-full blur-3xl -mr-10 -mt-10"></div>
                            <h3 className="text-2xl font-black text-amber-800 dark:text-amber-400 mb-3">🏆 ปลดล็อกข้อสอบทั้งหมด แล้วเก่งขึ้นแบบก้าวกระโดด!</h3>
                            <div className="text-amber-700 dark:text-amber-500 mb-5 max-w-lg mx-auto space-y-2 text-left">
                                <p className="flex items-start gap-2"><span>✅</span><span>เข้าถึงข้อสอบ <strong>ทุกชุด ทุกระดับชั้น</strong> พร้อมเฉลยละเอียดทุกข้อ</span></p>
                                <p className="flex items-start gap-2"><span>✅</span><span>ข้อสอบจาก <strong>สนามสอบจริง</strong> ทั้ง O-NET, A-Level, สอบเข้า ม.1</span></p>
                                <p className="flex items-start gap-2"><span>✅</span><span>อัพเดทข้อสอบใหม่ <strong>ต่อเนื่องตลอด</strong> ไม่มีค่าใช้จ่ายเพิ่มเติม</span></p>
                                <p className="flex items-start gap-2"><span>✅</span><span>สมัครครั้งเดียว ใช้ได้ <strong>ยาว 5 ปี</strong> คุ้มค่าที่สุด!</span></p>
                            </div>
                            <a href="/payment" className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black py-4 px-10 rounded-full shadow-xl shadow-amber-200 transition-all hover:scale-105 hover:-translate-y-1 active:scale-95 text-lg">
                                🔓 ปลดล็อกคลังข้อสอบทั้งหมดเลย
                            </a>
                            <p className="text-xs text-amber-500/80 dark:text-amber-600 mt-3 font-medium">จ่ายครั้งเดียว ไม่มีรายเดือน • เริ่มทำได้ทันทีหลังชำระเงิน</p>
                        </div>
                    )}

                    {/* Score Display - Center */}
                    <div className="flex flex-col items-center mb-10">
                        {/* Circular Progress */}
                        <div className="relative w-48 h-48 mb-6">
                            <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                                {/* Background Circle */}
                                <circle
                                    cx="50" cy="50" r="45"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    className="text-slate-100 dark:text-slate-700"
                                />
                                {/* Progress Circle */}
                                <circle
                                    cx="50" cy="50" r="45"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={`${finalScore.percent * 2.83} 283`}
                                    className={finalScore.gradeColor.replace('text-', 'text-').replace('600', '500')}
                                    style={{ transition: 'stroke-dasharray 1s ease-out' }}
                                />
                            </svg>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-5xl font-black ${finalScore.gradeColor}`}>{finalScore.percent}%</span>
                                <span className="text-stone-400 dark:text-slate-500 text-sm font-bold">{finalScore.score}/{finalScore.total} ข้อ</span>
                            </div>
                        </div>

                        {/* Grade Badge */}
                        <div className={`px-8 py-3 rounded-2xl ${finalScore.bgColor} text-white font-black text-2xl shadow-lg mb-4`}>
                            Grade {finalScore.grade}
                        </div>
                        <p className={`text-xl font-bold ${finalScore.gradeColor}`}>{finalScore.label}</p>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4 mb-10 text-center">
                        <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl p-4">
                            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{finalScore.score}</div>
                            <div className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">ตอบถูก ✓</div>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-900/30 rounded-2xl p-4">
                            <div className="text-3xl font-black text-rose-600 dark:text-rose-400">{wrongCount}</div>
                            <div className="text-rose-600 dark:text-rose-400 text-sm font-medium">ตอบผิด ✗</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-4">
                            <div className="text-3xl font-black text-slate-600 dark:text-slate-300">{totalQuestions}</div>
                            <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">ข้อทั้งหมด</div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        {wrongCount > 0 && (
                            <button
                                onClick={handleReviewWrongAnswers}
                                className="px-8 py-4 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors flex items-center justify-center gap-2"
                            >
                                📝 ดูข้อที่ผิด ({wrongCount} ข้อ)
                            </button>
                        )}
                        <button
                            onClick={handleRestart}
                            className="px-8 py-4 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={20} />
                            ทำข้อสอบใหม่
                        </button>
                    </div>
                </div>

                {/* Question Map with Results */}
                <div className="mt-8 bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-6 border border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4">แผนที่ข้อสอบ - ผลลัพธ์</h3>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                        {sanitizedExamData.slice(0, finalScore.total).map((q, idx) => {
                            const userAnswer = answers[idx];
                            const isCorrect = userAnswer === q.correctIndex;
                            const isUnanswered = userAnswer === undefined;

                            let btnClass = "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600"; // Unanswered
                            if (!isUnanswered) {
                                btnClass = isCorrect
                                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
                                    : "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-700";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => { setCurrentQuestionIndex(idx); setIsFinished(false); }}
                                    className={`aspect-square rounded-lg text-sm font-bold flex items-center justify-center border transition-all hover:scale-105 ${btnClass}`}
                                    title={isUnanswered ? "ไม่ได้ตอบ" : isCorrect ? "ถูก" : "ผิด"}
                                >
                                    {isUnanswered ? idx + 1 : isCorrect ? "✓" : "✗"}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // ... (rest) ...

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 font-sans flex flex-col lg:flex-row gap-8 items-start">

            {/* Sidebar: Question Grid (Desktop) */}
            <div className="hidden lg:block w-72 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 sticky top-24">
                {isTrial && (
                    <div className="mb-4 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold px-3 py-2 rounded-xl text-center border border-amber-100 dark:border-amber-800 w-full animate-pulse">
                        โหมดให้ทดลองทำฟรี 5 ข้อ 🔓
                    </div>
                )}
                <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center justify-between">
                    <span>แผนที่ข้อสอบ</span>
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500 dark:text-slate-400">{currentQuestionIndex + 1}/{totalQuestions}</span>
                </h3>
                <div className="grid grid-cols-5 gap-2">
                    {sanitizedExamData.map((q, idx) => {
                        const isAnswered = answers[idx] !== undefined;
                        const isCurrent = currentQuestionIndex === idx;
                        const isChecked = checkedQuestions[idx];
                        const isCorrect = isChecked && answers[idx] === q.correctIndex;
                        const isWrong = isChecked && answers[idx] !== q.correctIndex && isAnswered;

                        let btnClass = "bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 border-transparent"; // Default
                        let content: React.ReactNode = idx + 1;

                        if (isChecked) {
                            if (isCorrect) {
                                btnClass = "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold border-emerald-300 dark:border-emerald-700";
                                content = "✓";
                            } else if (isWrong) {
                                btnClass = "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold border-rose-300 dark:border-rose-700";
                                content = "✗";
                            } else {
                                btnClass = "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold border-amber-200 dark:border-amber-700";
                            }
                        } else if (isAnswered) {
                            btnClass = "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold border-blue-200 dark:border-blue-700";
                        }

                        if (isCurrent) btnClass += " ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-slate-800 z-10";

                        return (
                            <button
                                key={idx}
                                onClick={() => setCurrentQuestionIndex(idx)}
                                className={`aspect-square rounded-lg text-sm flex items-center justify-center transition-all border ${btnClass}`}
                            >
                                {isTrial && idx >= 5 ? <Lock size={14} className="opacity-50" /> : content}
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
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                            <Award className="text-amber-500" />
                            {examTitle}
                        </h1>
                        <p className="text-stone-500 dark:text-slate-400 text-sm mt-1 pl-1 flex items-center gap-2">
                            ทดสอบวัดระดับความรู้คณิตศาสตร์
                            {isTrial && (
                                <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 px-2 py-0.5 rounded text-xs font-bold">
                                    ให้ลองทำฟรี 5 ข้อ
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Mobile Progress & Grid Toggle */}
                    <div className="w-full md:w-48 lg:hidden">
                        <div className="flex justify-between text-xs font-bold text-stone-400 dark:text-slate-500 mb-2">
                            <span>ความคืบหน้า</span>
                            <span>{Math.round((Object.keys(answers).length / totalQuestions) * 100)}%</span>
                        </div>
                        <div className="h-2 w-full bg-stone-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
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
                    <div className="lg:hidden mb-6 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                            {Array.from({ length: totalQuestions }).map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => { setCurrentQuestionIndex(idx); setShowGrid(false); }}
                                    className={`aspect-square rounded-lg text-xs font-bold flex items-center justify-center border
                                        ${currentQuestionIndex === idx ? 'ring-2 ring-amber-400 ring-offset-2 z-10 border-transparent' : ''}
                                        ${answers[idx] !== undefined ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-600'}
                                    `}
                                >
                                    {isTrial && idx >= 5 ? <Lock size={14} className="opacity-50" /> : idx + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[400px]">
                    {isTrial && currentQuestionIndex >= 5 ? (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-12 border-2 border-amber-200 dark:border-amber-900/50 shadow-xl flex flex-col items-center justify-center text-center h-full min-h-[400px] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"></div>
                            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-100/50 dark:bg-amber-900/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-amber-200 dark:shadow-amber-900/50">
                                <Lock size={36} />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 mb-4">อยากเก่งคณิตศาสตร์กว่านี้ไหมครับ? 🚀</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-3 max-w-lg font-medium leading-relaxed text-lg text-balance">
                                ข้อสอบชุดนี้มี <strong className="text-amber-600 dark:text-amber-400">{totalQuestions} ข้อ</strong> เป็นเพียงแค่ 1 ในหลายๆ ชุดจากคลังข้อสอบของเรา — คุณเพิ่งทดลองทำไปแค่ 5 ข้อเองครับ!
                            </p>
                            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-5 mb-6 max-w-md w-full text-left space-y-3">
                                <p className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300 font-medium"><span className="text-lg">📚</span><span>ข้อสอบหลากหลายชุดจาก <strong>สนามสอบจริง</strong> ทุกระดับชั้น</span></p>
                                <p className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300 font-medium"><span className="text-lg">📝</span><span><strong>เฉลยละเอียดทุกข้อ</strong> พร้อมวิธีคิดแบบ step-by-step</span></p>
                                <p className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300 font-medium"><span className="text-lg">⏰</span><span>สมัครครั้งเดียว ใช้ได้ <strong>5 ปีเต็ม</strong> ไม่มีค่ารายเดือน</span></p>
                                <p className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300 font-medium"><span className="text-lg">🆕</span><span>อัพเดทข้อสอบใหม่ <strong>ต่อเนื่อง</strong> ไม่มีค่าใช้จ่ายเพิ่ม</span></p>
                            </div>
                            <a href="/payment" className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black py-4 px-10 rounded-full shadow-xl shadow-amber-200/80 dark:shadow-amber-900/50 transition-all hover:scale-105 hover:-translate-y-1 active:scale-95 text-lg">
                                🔓 ปลดล็อกข้อสอบทั้งหมด
                            </a>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 font-medium">จ่ายครั้งเดียว • เริ่มทำได้ทันที • ดูเฉลยครบทุกข้อ</p>
                        </div>
                    ) : (
                        <QuestionCard
                            key={currentQuestion.id}
                            question={currentQuestion}
                            questionNumber={currentQuestionIndex + 1}
                            totalQuestions={totalQuestions}
                            selectedOption={answers[currentQuestionIndex] ?? null}
                            onSelectOption={handleSelectOption}
                            isSubmitted={!!checkedQuestions[currentQuestionIndex]}
                        />
                    )}
                </div>

                {/* Control Bar */}
                <div className="mt-8 flex items-center justify-between">
                    <button
                        onClick={handlePrev}
                        disabled={currentQuestionIndex === 0}
                        className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all ${currentQuestionIndex === 0
                            ? 'opacity-0 pointer-events-none'
                            : 'text-stone-500 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-700'
                            }`}
                    >
                        <ChevronLeft size={20} />
                        <span className="hidden sm:inline">ข้อก่อนหน้า</span>
                    </button>

                    <div className="flex gap-3">
                        {/* Check Answer Button (Restored) */}
                        {!checkedQuestions[currentQuestionIndex] && !(isTrial && currentQuestionIndex >= 5) && (
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
