"use client";

import React, { useState } from 'react';
import { ExamQuestion } from '@/types/exam';
import MathRenderer from './MathRenderer';
import { CheckCircle2, XCircle, HelpCircle, ZoomIn, X, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuestionCardProps {
    question: ExamQuestion;
    questionNumber: number;
    totalQuestions: number;
    selectedOption: number | null;
    onSelectOption: (optionIndex: number) => void;
    isSubmitted: boolean; // ถ้า true จะแสดงเฉลย
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
    question,
    questionNumber,
    totalQuestions,
    selectedOption,
    onSelectOption,
    isSubmitted
}) => {
    // Calculate result for badge
    const isCorrect = selectedOption === question.correctIndex;
    const hasAnswered = selectedOption !== null;

    return (
        <div className="w-full max-w-4xl mx-auto bg-white rounded-[2rem] shadow-xl shadow-stone-200/50 overflow-hidden border border-stone-100 transition-all duration-300">

            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-8 py-6 border-b border-orange-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-amber-600 font-black shadow-sm border border-amber-100 text-lg">
                        {questionNumber}
                    </span>
                    <span className="text-stone-500 font-medium text-sm uppercase tracking-wider">
                        คำถามที่ {questionNumber} จาก {totalQuestions}
                    </span>
                </div>

                {/* Result Badge - Show when submitted */}
                {isSubmitted && hasAnswered && (
                    <div className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 animate-in slide-in-from-right duration-300 ${isCorrect
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}>
                        {isCorrect ? (
                            <>
                                <CheckCircle2 size={18} />
                                <span>ตอบถูก!</span>
                            </>
                        ) : (
                            <>
                                <XCircle size={18} />
                                <span>ตอบผิด</span>
                            </>
                        )}
                    </div>
                )}
                {isSubmitted && !hasAnswered && (
                    <div className="px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 bg-slate-100 text-slate-500 border border-slate-200">
                        <HelpCircle size={18} />
                        <span>ไม่ได้ตอบ</span>
                    </div>
                )}
            </div>

            {/* Question Body */}
            <div className="p-8 md:p-10">
                <div className="mb-6 text-xl md:text-2xl font-medium text-stone-800 leading-relaxed">
                    <MathRenderer text={question.question} />
                </div>

                {/* Question Image (Standard Display only - No Zoom) */}
                {question.image && (
                    <div className="my-8 flex justify-center w-full">
                        <div className="relative inline-block rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm bg-white p-1 sm:p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={question.image}
                                alt="Question Diagram"
                                className="max-w-full h-auto max-h-[500px] object-contain rounded-lg mx-auto"
                            />
                        </div>
                    </div>
                )}

                {/* Content Area: Options or Subjective */}
                {question.options && question.options.length > 0 ? (
                    /* Multiple Choice Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {question.options.map((option, index) => {
                            // Determine styling based on state
                            let containerClass = "relative p-4 md:p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 group flex items-start gap-4 hover:shadow-md";
                            let indicatorClass = "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all";

                            const actualCorrectIndex = question.correctIndex;
                            const isCorrectOption = index === actualCorrectIndex;
                            const isSelectedOption = index === selectedOption;
                            const isWrongSelection = isSelectedOption && !isCorrectOption;

                            if (isSubmitted) {
                                // เฉลยแล้ว (Show Solution Mode)
                                if (isCorrectOption) {
                                    // ข้อที่ถูก (สีเขียวเสมอ) - Always show correct answer in green
                                    containerClass += " bg-emerald-50 border-emerald-400 shadow-sm";
                                    indicatorClass += " bg-emerald-500 border-emerald-500 text-white";
                                } else if (isWrongSelection) {
                                    // ข้อที่เลือกแต่ผิด - Show in RED
                                    containerClass += " bg-rose-50 border-rose-400 shadow-sm";
                                    indicatorClass += " bg-rose-500 border-rose-500 text-white";
                                } else {
                                    // ข้ออื่นๆ
                                    containerClass += " opacity-40 border-stone-100 grayscale";
                                    indicatorClass += " border-stone-200 text-stone-400";
                                }
                            } else {
                                // ยังไม่เฉลย (ให้เลือก)
                                if (isSelectedOption) {
                                    containerClass += " bg-amber-50 border-amber-400 shadow-md transform scale-[1.01]";
                                    indicatorClass += " bg-amber-500 border-amber-500 text-white";
                                } else {
                                    containerClass += " bg-white border-stone-100 hover:border-amber-200 hover:bg-stone-50";
                                    indicatorClass += " border-stone-200 text-stone-400 group-hover:border-amber-300 group-hover:text-amber-500";
                                }
                            }

                            return (
                                <div
                                    key={index}
                                    className={containerClass}
                                    onClick={() => !isSubmitted && onSelectOption(index)}
                                >
                                    <div className={indicatorClass}>
                                        {index + 1}
                                    </div>
                                    <div className="text-stone-700 font-medium pt-1 text-lg w-full break-words min-w-0">
                                        <MathRenderer text={option.replace(/^\s*\d+[\.\\)]\s*/, '')} />
                                    </div>

                                    {/* Feedback Icons on Result */}
                                    {isSubmitted && isCorrectOption && (
                                        <div className="absolute top-4 right-4 text-emerald-500 animate-in zoom-in duration-300">
                                            <CheckCircle2 size={24} />
                                        </div>
                                    )}
                                    {isSubmitted && isWrongSelection && (
                                        <div className="absolute top-4 right-4 text-rose-500 animate-in zoom-in duration-300">
                                            <XCircle size={24} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Subjective / Text Input Mode */
                    <div className="bg-stone-50 rounded-2xl p-8 text-center border-2 border-dashed border-stone-200">
                        <div className="max-w-md mx-auto">
                            {!isSubmitted ? (
                                <>
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">
                                        ✍️
                                    </div>
                                    <h3 className="text-lg font-bold text-stone-700 mb-2">ข้อสอบอัตนัย (แสดงวิธีทำ)</h3>
                                    <p className="text-stone-500 mb-6">
                                        ข้อนี้ให้ทดเลขหรือเขียนวิธีทำลงในกระดาษของตัวเอง <br />
                                        เมื่อเสร็จแล้วให้กดปุ่ม <strong>"ดูเฉลย"</strong> ด้านล่างเพื่อตรวจสอบความถูกต้อง
                                    </p>
                                    <textarea
                                        className="w-full p-4 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all text-stone-600"
                                        rows={4}
                                        placeholder="พิมพ์คำตอบหรือโน้ตไว้กันลืมตรงนี้ได้ครับ... (ระบบจะไม่ตรวจอัตโนมัติ)"
                                    ></textarea>
                                </>
                            ) : (
                                <div className="text-emerald-600 font-bold flex flex-col items-center animate-in zoom-in duration-300">
                                    <CheckCircle2 size={48} className="mb-2" />
                                    <span>ตรวจสอบคำตอบจากเฉลยด้านล่าง</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}


                {/* Explanation Section */}
                {isSubmitted && (
                    <div className="mt-10 animate-in slide-in-from-top-4 fade-in duration-500">
                        <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100">
                            <h4 className="flex items-center gap-2 font-bold text-indigo-900 mb-4 text-lg">
                                <HelpCircle className="text-indigo-500" />
                                เฉลยละเอียด / แนวคิด
                            </h4>
                            <div className="text-stone-700 leading-relaxed text-base space-y-2">
                                <MathRenderer text={question.explanation} />
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
