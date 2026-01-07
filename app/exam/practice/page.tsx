"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import { ExamSystem } from "@/components/exam/ExamSystem";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

// Wrapper for Suspense (Required for useSearchParams)
export default function PracticeRoomPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
            <PracticeRoomContent />
        </Suspense>
    );
}

function PracticeRoomContent() {
    const searchParams = useSearchParams();
    const queryTerm = searchParams.get("q") || "";

    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAndFilterQuestions = async () => {
            if (!queryTerm) return;

            try {
                // Fetch ALL exams (In a real scalable app, we should use Algolia or Firebase Filtering)
                // For now, client-side filtering is okay for < 1000 questions
                const q = query(collection(db, "exams"));
                const snapshot = await getDocs(q);

                let results: any[] = [];
                const termLower = queryTerm.toLowerCase();

                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const examQuestions = data.questions || [];

                    const filtered = examQuestions.filter((q: any) => {
                        const inQuestion = q.question.toLowerCase().includes(termLower);
                        const inTags = q.tags?.some((t: string) => t.toLowerCase().includes(termLower));
                        return inQuestion || inTags;
                    });

                    results = [...results, ...filtered];
                });

                // Shuffle Questions slightly so it feels fresh
                results = results.sort(() => Math.random() - 0.5);

                setQuestions(results);
            } catch (error) {
                console.error("Error loading practice questions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAndFilterQuestions();
    }, [queryTerm]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium animate-pulse">กำลังรวบรวมโจทย์เรื่อง "{queryTerm}"...</p>
            </div>
        );
    }

    if (!questions.length) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="text-center max-w-md bg-white p-8 rounded-[2rem] shadow-xl">
                    <div className="text-5xl mb-4">🤔</div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                        ไม่พบโจทย์
                    </h2>
                    <p className="text-slate-500 mb-6">อาจเกิดข้อผิดพลาด หรือไม่มีโจทย์ในหัวข้อนี้</p>
                    <Link href="/practice" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-full font-bold hover:bg-slate-700 transition-colors">
                        <ArrowLeft size={20} />
                        กลับไปค้นหาใหม่
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFCF8]">
            <div className="bg-white border-b border-slate-100 py-4 px-6 fixed top-0 w-full z-10 shadow-sm flex items-center justify-between">
                <Link href="/practice" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors">
                    <ArrowLeft size={20} />
                    <span className="hidden md:inline">ออกจากการฝึกฝน</span>
                </Link>
                <div className="font-bold text-slate-800 truncate max-w-xs md:max-w-md">
                    แบบฝึกหัด: {queryTerm}
                </div>
                <div className="w-8"></div>
            </div>

            <main className="pt-24 pb-12 container mx-auto px-4">
                <ExamSystem
                    examData={questions}
                    examTitle={`ฝึกฝนเรื่อง: ${queryTerm}`}
                />
            </main>
        </div>
    );
}
