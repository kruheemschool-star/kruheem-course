"use client";

import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Question {
    id: number | string;
    question: string;
    image?: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    tags?: string[];
}

interface ExamData {
    id: string;
    title: string;
    category: string;
    level: string;
    isFree: boolean;
    questions: Question[];
}

export default function PrintPageClient({ exam, mode }: { exam: ExamData; mode: 'exam' | 'answer' }) {

    const optionLabels = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ'];

    return (
        <>
            {/* Print Controls - hidden when printing */}
            <div className="print:hidden sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href={`/exam/${exam.id}`} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors">
                        <ArrowLeft size={20} />
                        <span>กลับไปหน้าข้อสอบ</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/exam/${exam.id}/print?mode=${mode === 'exam' ? 'answer' : 'exam'}`}
                            className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                        >
                            {mode === 'exam' ? 'ดูเฉลย' : 'ดูข้อสอบเปล่า'}
                        </Link>
                        <button
                            onClick={() => window.print()}
                            className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
                        >
                            <Printer size={18} />
                            พิมพ์ / Save PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Printable Content */}
            <div className="max-w-4xl mx-auto px-6 py-8 print:px-0 print:py-0 print:max-w-none">
                {/* Header */}
                <div className="text-center mb-8 print:mb-6 border-b-2 border-slate-800 pb-6 print:pb-4">
                    <h1 className="text-2xl print:text-xl font-black text-slate-800 mb-1">
                        {mode === 'exam' ? '📝' : '📋'} {exam.title}
                    </h1>
                    <div className="flex items-center justify-center gap-4 text-sm text-slate-500 mt-2">
                        {exam.category && <span>{exam.category}</span>}
                        {exam.level && <span>{exam.level}</span>}
                        <span>จำนวน {exam.questions.length} ข้อ</span>
                    </div>
                    {mode === 'exam' && (
                        <div className="mt-3 text-sm text-slate-400 font-medium">
                            ชื่อ: _________________________ ชั้น: _________ เลขที่: _________
                        </div>
                    )}
                    {mode === 'answer' && (
                        <div className="mt-3 inline-block bg-amber-50 text-amber-700 px-4 py-1.5 rounded-lg text-sm font-bold print:bg-transparent print:border print:border-amber-400">
                            เฉลยพร้อมคำอธิบาย
                        </div>
                    )}
                </div>

                {/* Quick Answer Key (answer mode only) */}
                {mode === 'answer' && (
                    <div className="mb-8 print:mb-6 bg-slate-50 print:bg-transparent border border-slate-200 rounded-xl p-4 print:rounded-none">
                        <h2 className="font-bold text-slate-700 mb-3 text-sm">เฉลยเร็ว</h2>
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 text-center text-sm">
                            {exam.questions.map((q, idx) => (
                                <div key={idx} className="border border-slate-200 rounded-lg py-1.5 print:border-slate-400">
                                    <div className="text-[10px] text-slate-400 leading-none">{idx + 1}</div>
                                    <div className="font-black text-slate-700">{optionLabels[q.correctIndex] || (q.correctIndex + 1)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Questions */}
                <div className="space-y-6 print:space-y-4">
                    {exam.questions.map((q, idx) => (
                        <div key={idx} className="print:break-inside-avoid border-b border-slate-100 print:border-slate-300 pb-5 print:pb-3 last:border-b-0">
                            {/* Question */}
                            <div className="flex gap-3 mb-3">
                                <span className="font-black text-slate-500 text-sm shrink-0 w-8 h-8 bg-slate-100 print:bg-transparent print:border print:border-slate-400 rounded-lg flex items-center justify-center">
                                    {idx + 1}
                                </span>
                                <div className="flex-1">
                                    <div className="font-bold text-slate-800 leading-relaxed whitespace-pre-wrap text-[15px] print:text-sm" dangerouslySetInnerHTML={{ __html: formatMath(q.question) }} />
                                    {q.image && (
                                        <div className="mt-2 print:max-w-xs">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={q.image} alt={`รูปประกอบข้อ ${idx + 1}`} className="max-h-40 print:max-h-32 rounded-lg border" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Options */}
                            <div className="ml-11 grid grid-cols-1 sm:grid-cols-2 gap-1.5 print:gap-1">
                                {q.options.map((opt, optIdx) => {
                                    const isCorrect = mode === 'answer' && optIdx === q.correctIndex;
                                    return (
                                        <div
                                            key={optIdx}
                                            className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm print:text-xs print:rounded-none print:px-2 print:py-1 ${
                                                isCorrect
                                                    ? 'bg-emerald-50 print:bg-transparent font-bold text-emerald-700 print:text-black border border-emerald-300 print:border-emerald-500'
                                                    : 'text-slate-600 print:text-black'
                                            }`}
                                        >
                                            <span className={`font-bold shrink-0 ${isCorrect ? 'text-emerald-600 print:text-black' : 'text-slate-400 print:text-black'}`}>
                                                {optionLabels[optIdx]}.
                                            </span>
                                            <span dangerouslySetInnerHTML={{ __html: formatMath(opt) }} />
                                            {isCorrect && <span className="ml-auto text-emerald-500 print:text-black font-black">✓</span>}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Answer line for exam mode */}
                            {mode === 'exam' && (
                                <div className="ml-11 mt-2 text-sm text-slate-400 print:text-slate-600">
                                    คำตอบ: _______
                                </div>
                            )}

                            {/* Explanation for answer mode */}
                            {mode === 'answer' && q.explanation && (
                                <div className="ml-11 mt-2 bg-blue-50 print:bg-transparent border border-blue-100 print:border-blue-300 rounded-lg p-3 print:p-2 print:rounded-none">
                                    <div className="text-xs font-bold text-blue-600 print:text-black mb-1">💡 คำอธิบาย</div>
                                    <div className="text-sm print:text-xs text-slate-700 print:text-black whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: formatMath(q.explanation) }} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-8 print:mt-6 border-t-2 border-slate-800 pt-4 text-center text-xs text-slate-400 print:text-slate-600">
                    <p>📖 {exam.title} • {exam.questions.length} ข้อ • KruHeem Math School</p>
                    <p className="print:hidden mt-1">สร้างจาก kruheemmath.com</p>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 1.5cm 1.5cm;
                    }
                    body {
                        font-size: 12px !important;
                        color: #000 !important;
                        background: #fff !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .print\\:break-inside-avoid {
                        break-inside: avoid;
                    }
                }
            `}</style>
        </>
    );
}

// Simple LaTeX-to-HTML formatter (basic)
function formatMath(text: string): string {
    if (!text) return '';
    // Replace \( ... \) with inline math styling
    let result = text
        .replace(/\\\((.*?)\\\)/g, '<code class="font-mono text-indigo-700 print:text-black bg-indigo-50 print:bg-transparent px-1 rounded text-sm">$1</code>')
        .replace(/\$\$(.*?)\$\$/g, '<div class="font-mono text-indigo-700 print:text-black bg-indigo-50 print:bg-transparent px-2 py-1 rounded my-1 text-center">$1</div>')
        .replace(/\$(.*?)\$/g, '<code class="font-mono text-indigo-700 print:text-black bg-indigo-50 print:bg-transparent px-1 rounded text-sm">$1</code>')
        .replace(/\n/g, '<br/>');
    return result;
}
