"use client";

import React, { useState } from 'react';
import { ExamQuestion } from '@/types/exam';
import MathRenderer from './MathRenderer';
import { X, CheckCircle2, XCircle, HelpCircle, Bookmark } from 'lucide-react';

interface SingleQuestionModalProps {
    question: ExamQuestion;
    examTitle: string;
    questionIndex: number;
    onClose: () => void;
    onUnsave?: () => void;
}

const formatExplanation = (text: string): string => {
    if (!text || typeof text !== 'string') return text;
    return text;
};

export default function SingleQuestionModal({
    question,
    examTitle,
    questionIndex,
    onClose,
    onUnsave,
}: SingleQuestionModalProps) {
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showAnswer, setShowAnswer] = useState(false);

    const correctIndex = question.correctIndex;
    const hasAnswered = selectedOption !== null;
    const isCorrect = hasAnswered && selectedOption === correctIndex;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-700 dark:to-slate-700 px-6 py-4 border-b border-orange-100 dark:border-slate-600 flex items-center justify-between rounded-t-2xl z-10">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-slate-600 text-amber-600 dark:text-amber-400 font-black shadow-sm border border-amber-100 dark:border-slate-500 text-sm">
                            {questionIndex + 1}
                        </span>
                        <div>
                            <span className="text-stone-500 dark:text-slate-400 font-medium text-xs block">{examTitle}</span>
                            <span className="text-stone-700 dark:text-slate-300 font-bold text-sm">ข้อที่ {questionIndex + 1}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onUnsave && (
                            <button
                                onClick={onUnsave}
                                className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all"
                                title="ลบออกจากรายการบันทึก"
                            >
                                <Bookmark size={18} className="fill-current" />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-stone-400 hover:text-stone-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Question Body */}
                <div className="p-6 md:p-8">
                    <div className="mb-5 text-lg md:text-xl font-medium text-stone-800 dark:text-slate-200 leading-relaxed">
                        <MathRenderer text={question.question.replace(/\n{3,}/g, '\n\n')} />
                    </div>

                    {/* SVG */}
                    {question.svg && typeof question.svg === 'string' && question.svg.trim().startsWith('<svg') && (
                        <div className="my-6 flex justify-center w-full">
                            <div className="relative rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-600 shadow-sm bg-white dark:bg-slate-700 p-3" style={{ width: '70%', maxWidth: '520px' }}>
                                <div
                                    style={{ maxWidth: '100%' }}
                                    dangerouslySetInnerHTML={{ __html: question.svg.replace(/<svg\s/, '<svg style="width:100%;height:auto;" ') }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Image */}
                    {question.image && (
                        <div className="my-6 flex justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={question.image} alt="Question" className="max-w-full h-auto max-h-[300px] object-contain rounded-lg border" />
                        </div>
                    )}

                    {/* Options */}
                    {question.options && question.options.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {question.options.map((option, index) => {
                                let containerClass = "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group flex items-start gap-3";
                                let indicatorClass = "w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all";

                                const isSelectedOption = index === selectedOption;
                                const isCorrectOption = index === correctIndex;

                                if (showAnswer) {
                                    if (isCorrectOption) {
                                        containerClass += " bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 dark:border-emerald-600";
                                        indicatorClass += " bg-emerald-500 border-emerald-500 text-white";
                                    } else if (isSelectedOption) {
                                        containerClass += " bg-rose-50 dark:bg-rose-900/30 border-rose-300 dark:border-rose-600";
                                        indicatorClass += " bg-rose-500 border-rose-500 text-white";
                                    } else {
                                        containerClass += " border-stone-100 dark:border-slate-700 opacity-60";
                                        indicatorClass += " border-stone-200 dark:border-slate-600 text-stone-400 dark:text-slate-500";
                                    }
                                } else {
                                    if (isSelectedOption) {
                                        containerClass += " bg-amber-50 dark:bg-amber-900/30 border-amber-400 dark:border-amber-600 shadow-md";
                                        indicatorClass += " bg-amber-500 border-amber-500 text-white";
                                    } else {
                                        containerClass += " bg-white dark:bg-slate-700/50 border-stone-100 dark:border-slate-600 hover:border-amber-200 dark:hover:border-amber-600 hover:bg-stone-50 dark:hover:bg-slate-700";
                                        indicatorClass += " border-stone-200 dark:border-slate-500 text-stone-400 dark:text-slate-400 group-hover:border-amber-300 group-hover:text-amber-500";
                                    }
                                }

                                return (
                                    <div
                                        key={index}
                                        className={containerClass}
                                        onClick={() => !showAnswer && setSelectedOption(index)}
                                    >
                                        <div className={indicatorClass}>
                                            {showAnswer && isCorrectOption ? <CheckCircle2 size={14} /> : showAnswer && isSelectedOption ? <XCircle size={14} /> : index + 1}
                                        </div>
                                        <div className="text-stone-700 dark:text-slate-300 font-medium pt-0.5 text-base w-full break-words min-w-0">
                                            <MathRenderer text={option.replace(/^\s*(?:[1-4][\.\)]\s*|[กขคง][\.\)\s]\s*)/, '')} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Show Answer Button */}
                    {!showAnswer && (
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={() => setShowAnswer(true)}
                                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20"
                            >
                                ดูเฉลย
                            </button>
                        </div>
                    )}

                    {/* Result + Explanation */}
                    {showAnswer && (
                        <div className="mt-6 space-y-4 animate-in slide-in-from-top-4 fade-in duration-300">
                            {/* Result badge */}
                            {hasAnswered && (
                                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                                    isCorrect
                                        ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700'
                                        : 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700'
                                }`}>
                                    {isCorrect ? <CheckCircle2 size={20} className="text-emerald-500" /> : <XCircle size={20} className="text-rose-500" />}
                                    <span className={`font-bold ${isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                        {isCorrect ? 'ตอบถูก!' : `ตอบผิด — คำตอบที่ถูกต้องคือข้อ ${correctIndex + 1}`}
                                    </span>
                                </div>
                            )}
                            {!hasAnswered && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700">
                                    <HelpCircle size={20} className="text-amber-500" />
                                    <span className="font-bold text-amber-700 dark:text-amber-300">คำตอบที่ถูกต้องคือข้อ {correctIndex + 1}</span>
                                </div>
                            )}

                            {/* Explanation */}
                            {question.explanation && (
                                <div className="bg-indigo-50/50 dark:bg-indigo-900/30 rounded-xl p-5 border border-indigo-100 dark:border-indigo-800">
                                    <h4 className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-300 mb-3 text-base">
                                        <HelpCircle size={16} className="text-indigo-500" />
                                        เฉลยละเอียด
                                    </h4>
                                    <div className="text-stone-700 dark:text-slate-300 leading-relaxed text-sm space-y-2">
                                        <MathRenderer text={formatExplanation(question.explanation)} />
                                    </div>
                                </div>
                            )}

                            {/* Reset Button */}
                            <div className="flex justify-center pt-2">
                                <button
                                    onClick={() => { setSelectedOption(null); setShowAnswer(false); }}
                                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-all"
                                >
                                    ทำใหม่อีกครั้ง
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
