"use client";

import { useUserAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Printer, ArrowLeft, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import MathRenderer from "@/components/exam/MathRenderer";

interface Question {
    id: number | string;
    question: string;
    image?: string;
    svg?: string;
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
    const { user, loading: authLoading } = useUserAuth();
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [checkingAccess, setCheckingAccess] = useState(true);

    // Check access for paid exams
    useEffect(() => {
        if (exam.isFree) {
            setHasAccess(true);
            setCheckingAccess(false);
            return;
        }

        if (authLoading) return;

        if (!user) {
            setHasAccess(false);
            setCheckingAccess(false);
            return;
        }

        // Check enrollment
        (async () => {
            try {
                const q = query(
                    collection(db, "enrollments"),
                    where("userId", "==", user.uid),
                    where("status", "==", "approved")
                );
                const snap = await getDocs(q);
                setHasAccess(snap.docs.length > 0);
            } catch {
                setHasAccess(false);
            } finally {
                setCheckingAccess(false);
            }
        })();
    }, [user, authLoading, exam.isFree]);

    // Loading state
    if (authLoading || checkingAccess) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white">
                <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
                <p className="text-slate-400 font-medium">กำลังตรวจสอบสิทธิ์...</p>
            </div>
        );
    }

    // No access - not logged in or no enrollment
    if (!hasAccess) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-white">
                <Lock size={48} className="text-slate-300 mb-4" />
                <h1 className="text-2xl font-black text-slate-700 mb-2">
                    {!user ? 'กรุณาเข้าสู่ระบบก่อน' : 'สำหรับสมาชิกเท่านั้น'}
                </h1>
                <p className="text-slate-400 mb-6 max-w-md">
                    {!user
                        ? 'คุณต้องเข้าสู่ระบบก่อนจึงจะสามารถพิมพ์ข้อสอบได้'
                        : 'ฟีเจอร์การพิมพ์ข้อสอบสงวนไว้สำหรับสมาชิกที่ลงทะเบียนแล้วเท่านั้น'}
                </p>
                <div className="flex gap-3">
                    <Link href={`/exam/${exam.id}`} prefetch={false} className="px-6 py-3 border-2 border-slate-200 text-slate-600 rounded-full font-bold hover:bg-slate-50 transition-all">
                        กลับไปหน้าข้อสอบ
                    </Link>
                    {!user && (
                        <Link href="/login" className="px-6 py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition-all">
                            เข้าสู่ระบบ
                        </Link>
                    )}
                </div>
            </div>
        );
    }

    const optionLabels = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ'];

    return (
        <>
            {/* Print Controls - hidden when printing */}
            <div className="print:hidden sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href={`/exam/${exam.id}`} prefetch={false} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors">
                        <ArrowLeft size={20} />
                        <span>กลับไปหน้าข้อสอบ</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/exam/${exam.id}/print?mode=${mode === 'exam' ? 'answer' : 'exam'}`}
                            prefetch={false}
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
            <div className="max-w-4xl mx-auto px-6 py-8 print:px-0 print:py-0 print:max-w-none bg-white">
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
                        <div className="mt-3 text-sm text-slate-500 font-medium">
                            ชื่อ: _________________________ ชั้น: _________ เลขที่: _________
                        </div>
                    )}
                    {mode === 'answer' && (
                        <div className="mt-3 inline-block border-2 border-slate-800 text-slate-800 px-4 py-1.5 rounded-lg text-sm font-bold">
                            เฉลยพร้อมคำอธิบาย
                        </div>
                    )}
                </div>

                {/* Quick Answer Key (answer mode only) */}
                {mode === 'answer' && (
                    <div className="mb-8 print:mb-6 bg-white border-2 border-slate-300 rounded-xl p-4 print:rounded-none">
                        <h2 className="font-bold text-slate-700 mb-3 text-sm">เฉลยเร็ว</h2>
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 text-center text-sm">
                            {exam.questions.map((q, idx) => (
                                <div key={idx} className="border border-slate-300 rounded-lg py-1.5">
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
                        <div key={idx} className="print:break-inside-avoid border-b border-slate-200 pb-5 print:pb-3 last:border-b-0">
                            {/* Question */}
                            <div className="flex gap-3 mb-3">
                                <span className="font-black text-slate-600 text-sm shrink-0 w-8 h-8 border-2 border-slate-300 bg-white rounded-lg flex items-center justify-center">
                                    {idx + 1}
                                </span>
                                <div className="flex-1">
                                    <div className="font-bold text-slate-800 leading-relaxed text-[15px] print:text-sm">
                                        <MathRenderer text={q.question} />
                                    </div>
                                    {q.svg && typeof q.svg === 'string' && q.svg.trim().startsWith('<svg') && (
                                        <div className="mt-2 flex justify-center">
                                            <div
                                                style={{ maxWidth: '100%' }}
                                                className="border border-slate-200 rounded-lg p-2 bg-white"
                                                dangerouslySetInnerHTML={{ __html: q.svg }}
                                            />
                                        </div>
                                    )}
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
                                            className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm print:text-xs print:rounded-none print:px-2 print:py-1 bg-white ${
                                                isCorrect
                                                    ? 'font-bold text-black border-2 border-slate-800'
                                                    : 'text-slate-700 border border-slate-200'
                                            }`}
                                        >
                                            <span className="font-bold shrink-0 text-slate-600">
                                                {optionLabels[optIdx]}.
                                            </span>
                                            <span className="flex-1"><MathRenderer text={opt} /></span>
                                            {isCorrect && <span className="ml-auto font-black">✓</span>}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Answer line for exam mode */}
                            {mode === 'exam' && (
                                <div className="ml-11 mt-2 text-sm text-slate-500">
                                    คำตอบ: _______
                                </div>
                            )}

                            {/* Explanation for answer mode */}
                            {mode === 'answer' && q.explanation && (
                                <div className="ml-11 mt-2 bg-white border-2 border-slate-300 rounded-lg p-3 print:p-2 print:rounded-none">
                                    <div className="text-xs font-bold text-slate-600 mb-1">💡 คำอธิบาย</div>
                                    <div className="text-sm print:text-xs text-slate-700 leading-relaxed">
                                        <MathRenderer text={q.explanation} />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-8 print:mt-6 border-t-2 border-slate-800 pt-4 text-center text-xs text-slate-500">
                    <p>{exam.title} • {exam.questions.length} ข้อ • KruHeem Math School</p>
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
                    }
                    * {
                        background-color: transparent !important;
                        color: #000 !important;
                    }
                    .print\\:break-inside-avoid {
                        break-inside: avoid;
                    }
                    .katex {
                        color: #000 !important;
                    }
                }
            `}</style>
        </>
    );
}
