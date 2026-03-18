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

// Convert Thai letter references (ก ข ค ง) to numbers (1 2 3 4) in explanation text
// Note: \b doesn't work with Thai Unicode, so we use explicit character patterns
const convertThaiLettersToNumbers = (text: string): string => {
    if (!text) return text;
    return text
        // "ข้อ ก" → "ข้อ 1" (followed by punctuation, space, or end)
        .replace(/ข้อ\s*ก(?=[.\s,;:\)]|$)/g, 'ข้อ 1')
        .replace(/ข้อ\s*ข(?=[.\s,;:\)]|$)/g, 'ข้อ 2')
        .replace(/ข้อ\s*ค(?=[.\s,;:\)]|$)/g, 'ข้อ 3')
        .replace(/ข้อ\s*ง(?=[.\s,;:\)]|$)/g, 'ข้อ 4')
        // "ก." → "1." (preceded by start, space, or punctuation)
        .replace(/(^|[\s:,;(])ก\./gm, '$11.')
        .replace(/(^|[\s:,;(])ข\./gm, '$12.')
        .replace(/(^|[\s:,;(])ค\./gm, '$13.')
        .replace(/(^|[\s:,;(])ง\./gm, '$14.');
};

// Auto-format explanation text: insert line breaks before Thai transition phrases
// so that step-by-step solutions display as readable paragraphs instead of a wall of text.
//
// CRITICAL: All LaTeX blocks ($...$, $$...$$, \(...\), \[...\]) are extracted and
// replaced with placeholders BEFORE any formatting is applied. This prevents patterns
// like "- " (list items) from matching subtraction operators inside math expressions,
// which would insert \n inside $...$ and break the MathRenderer regex.
const formatExplanation = (text: string): string => {
    if (!text || typeof text !== 'string') return text;

    // ═══ STEP 1: PROTECT LaTeX blocks from modification ═══
    const latexBlocks: string[] = [];
    let result = text.replace(
        /\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\\\([\s\S]*?\\\)|\$[^$]+\$/g,
        (match) => {
            latexBlocks.push(match);
            return `\x00L${latexBlocks.length - 1}\x00`;
        }
    );

    // ═══ STEP 2: PARAGRAPH BREAKS (\n\n) — Major section transitions ═══

    // Before bold section headers like **วิธีทำ:**, **ดักทางคนพลาด:**, etc.
    result = result.replace(/ (\*\*(?:วิธีทำ|ดักทาง|หลักการ|ข้อควรระวัง|สรุป|ทำไม|เฉลย|คำเตือน|จุดพลาด|ข้อสังเกต|เหตุผลที่ตัวเลือกอื่นผิด|ทำไมตัวเลือกอื่นผิด|ทำไมข้ออื่นผิด|จุดที่ควรระวัง|จุดที่ผิดบ่อย))/g, '\n\n$1');

    // Non-bold major section headers → auto-wrap in bold + paragraph break
    ['เหตุผลที่ตัวเลือกอื่นผิด:', 'ทำไมตัวเลือกอื่นผิด:', 'ทำไมข้ออื่นผิด:', 'จุดที่ควรระวัง:', 'จุดที่ผิดบ่อย:'].forEach(p => {
        const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (!result.includes(`**${p}`) && result.includes(p)) {
            result = result.replace(new RegExp(` (${escaped})`, 'g'), '\n\n**$1**');
        }
    });

    // Non-bold "วิธีทำ:" → auto-wrap in bold
    if (!result.includes('**วิธีทำ') && result.includes('วิธีทำ:')) {
        result = result.replace(/ (วิธีทำ:)/g, '\n**$1**');
    }

    // Warning / pitfall / reminder section keywords
    ['สำหรับ', 'น่าเสียดาย', 'จำไว้', 'ใครที่ตอบ', 'หากใครตอบ', 'ทำไมข้ออื่น'].forEach(p => {
        result = result.replace(new RegExp(` (${p})`, 'g'), '\n\n$1');
    });

    // ═══ STEP 3: LINE BREAKS (\n) — Step-by-step transitions ═══

    // Step number markers: "ขั้นที่ 1:", "ขั้นตอนที่ 2:"
    result = result.replace(/ (ขั้นที่ \d)/g, '\n$1');
    result = result.replace(/ (ขั้นตอนที่ \d)/g, '\n$1');

    // Thai ordinal step markers (non-bold): "ขั้นแรก", "ขั้นที่สอง", "ชั้นแรก", etc.
    result = result.replace(/ ((?:ขั้น|ชั้น)(?:แรก|ที่สอง|ที่สาม|ที่สี่|ที่ห้า|สุดท้าย))/g, '\n$1');

    // Bold step markers: "**ขั้นแรก**", "**ขั้นที่สอง**", etc.
    result = result.replace(/ (\*\*(?:ขั้น|ชั้น)(?:แรก|ที่สอง|ที่สาม|ที่สี่|ที่ห้า|สุดท้าย))/g, '\n$1');

    // Distractor explanation patterns: "XXX ผิดเพราะ"
    // Thai descriptive answers (longer match first): "เพิ่มขึ้น 10% ผิดเพราะ", "ลดลง 8% ผิดเพราะ"
    result = result.replace(/ ((?:เพิ่มขึ้น|ลดลง|มากกว่า|น้อยกว่า|เป็นบวก|เป็นลบ) (?:\*\*)?[\d,]+(?:\.\d+)?%?(?:\*\*)? ผิดเพราะ)/g, '\n$1');
    // Numeric answers: "750 บาท ผิดเพราะ", "56% ผิดเพราะ", "240 คะแนน ผิดเพราะ"
    result = result.replace(/ ((?:\*\*)?[\d,]+(?:\.\d+)?(?:%| บาท| คะแนน| หน่วย| ตัว| คน| ตารางหน่วย)?(?:\*\*)? ผิดเพราะ)/g, '\n$1');
    // Reference-based: "ตัวเลือก 1 ผิดเพราะ", "ข้อ 2 ผิดเพราะ"
    result = result.replace(/ ((?:ตัวเลือก(?:ที่)?|ข้อ) \d\.? ผิดเพราะ)/g, '\n$1');

    // List items starting with "- " (safe now — LaTeX subtraction is protected)
    result = result.replace(/([^\n\x00]) (- )/g, '$1\n$2');

    // Thai transition phrases (comprehensive list)
    [
        'เริ่มจาก', 'ต่อมา', 'จากนั้น', 'ตอนนี้',
        'นำไปแทนค่า', 'นำมาบวก', 'นำผลลัพธ์', 'แล้วนำ', 'แล้วค่อย',
        'จัดการทีมซ้าย', 'จัดการทีมขวา', 'จัดการวงเล็บ',
        'เคลียร์ชั้นบน', 'เคลียร์ชั้นล่าง',
        'ประกอบร่าง', 'โจทย์ถามหา', 'โจทย์ต้องการ',
        'สุดท้าย',
        'ถ้านักเรียนตอบ', 'ถ้าตอบ', 'และถ้าตอบ',
        'ส่วนข้อ', 'ส่วนถ้า',
        'เขยิบออกมา', 'ทำต่อใน', 'นำมาลบ', 'นำมาคูณ', 'นำมาหาร',
        'นำไปลบ', 'นำไปคูณ', 'นำไปหาร', 'นำไปบวก',
        'ในวงเล็บเหลี่ยม', 'ในวงเล็บปีกกา', 'ในวงเล็บใหญ่',
        'ดังนั้น',
        // Exam-style explanation phrases
        'สมมติให้', 'สมมติว่า',
        'สรุปแล้ว', 'สรุปได้ว่า', 'สรุปคือ',
        'เมื่อเทียบกับ', 'เมื่อเปรียบเทียบ',
        'กลุ่มที่',
    ].forEach(p => {
        const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(` (${escaped})`, 'g'), '\n$1');
    });

    // ═══ STEP 4: RESTORE LaTeX blocks ═══
    result = result.replace(/\x00L(\d+)\x00/g, (_, idx) => latexBlocks[parseInt(idx)]);

    return result;
};

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
        <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl shadow-stone-200/50 dark:shadow-slate-900/50 overflow-hidden border border-stone-100 dark:border-slate-700 transition-all duration-300">

            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-700 dark:to-slate-700 px-8 py-6 border-b border-orange-100 dark:border-slate-600 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-600 text-amber-600 dark:text-amber-400 font-black shadow-sm border border-amber-100 dark:border-slate-500 text-lg">
                        {questionNumber}
                    </span>
                    <span className="text-stone-500 dark:text-slate-400 font-medium text-sm uppercase tracking-wider">
                        คำถามที่ {questionNumber} จาก {totalQuestions}
                    </span>
                </div>

                {/* Result Badge - Show when submitted */}
                {isSubmitted && hasAnswered && (
                    <div className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 animate-in slide-in-from-right duration-300 ${isCorrect
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700'
                        : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-700'
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
                    <div className="px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                        <HelpCircle size={18} />
                        <span>ไม่ได้ตอบ</span>
                    </div>
                )}
            </div>

            {/* Question Body */}
            <div className="p-8 md:p-10">
                <div className="mb-6 text-xl md:text-2xl font-medium text-stone-800 dark:text-slate-200 leading-relaxed">
                    <MathRenderer text={question.question.replace(/\n{3,}/g, '\n\n')} />
                </div>

                {/* Question Image (Standard Display only - No Zoom) */}
                {question.image && (
                    <div className="my-8 flex justify-center w-full">
                        <div className="relative inline-block rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-600 shadow-sm bg-white dark:bg-slate-700 p-1 sm:p-2">
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
                                    containerClass += " bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 dark:border-emerald-600 shadow-sm";
                                    indicatorClass += " bg-emerald-500 border-emerald-500 text-white";
                                } else if (isWrongSelection) {
                                    // ข้อที่เลือกแต่ผิด - Show in RED
                                    containerClass += " bg-rose-50 dark:bg-rose-900/30 border-rose-400 dark:border-rose-600 shadow-sm";
                                    indicatorClass += " bg-rose-500 border-rose-500 text-white";
                                } else {
                                    // ข้ออื่นๆ
                                    containerClass += " opacity-40 border-stone-100 dark:border-slate-700 grayscale";
                                    indicatorClass += " border-stone-200 dark:border-slate-600 text-stone-400 dark:text-slate-500";
                                }
                            } else {
                                // ยังไม่เฉลย (ให้เลือก)
                                if (isSelectedOption) {
                                    containerClass += " bg-amber-50 dark:bg-amber-900/30 border-amber-400 dark:border-amber-600 shadow-md transform scale-[1.01]";
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
                                    onClick={() => !isSubmitted && onSelectOption(index)}
                                >
                                    <div className={indicatorClass}>
                                        {index + 1}
                                    </div>
                                    <div className="text-stone-700 dark:text-slate-300 font-medium pt-1 text-lg w-full break-words min-w-0">
                                        <MathRenderer text={option.replace(/^\s*(?:\d+|[กขคง])[\.\.\)\s]\s*/, '')} />
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
                    <div className="bg-stone-50 dark:bg-slate-700/50 rounded-2xl p-8 text-center border-2 border-dashed border-stone-200 dark:border-slate-600">
                        <div className="max-w-md mx-auto">
                            {!isSubmitted ? (
                                <>
                                    <div className="w-16 h-16 bg-white dark:bg-slate-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">
                                        ✍️
                                    </div>
                                    <h3 className="text-lg font-bold text-stone-700 dark:text-slate-300 mb-2">ข้อสอบอัตนัย (แสดงวิธีทำ)</h3>
                                    <p className="text-stone-500 dark:text-slate-400 mb-6">
                                        ข้อนี้ให้ทดเลขหรือเขียนวิธีทำลงในกระดาษของตัวเอง <br />
                                        เมื่อเสร็จแล้วให้กดปุ่ม <strong>"ดูเฉลย"</strong> ด้านล่างเพื่อตรวจสอบความถูกต้อง
                                    </p>
                                    <textarea
                                        className="w-full p-4 rounded-xl border border-stone-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-stone-600 dark:text-slate-300"
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
                        <div className="bg-indigo-50/50 dark:bg-indigo-900/30 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-800">
                            <h4 className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-300 mb-4 text-lg">
                                <HelpCircle className="text-indigo-500" />
                                เฉลยละเอียด / แนวคิด
                            </h4>
                            <div className="text-stone-700 dark:text-slate-300 leading-relaxed text-base space-y-2">
                                <MathRenderer text={formatExplanation(convertThaiLettersToNumbers(question.explanation))} />
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
