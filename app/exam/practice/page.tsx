"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ExamSystem } from "@/components/exam/ExamSystem";
import ExamAccessGuard from "@/components/exam/ExamAccessGuard";
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
                const termLower = queryTerm.toLowerCase();
                const matches = (q: any) => {
                    const inQuestion = ((q.question as string) || "").toLowerCase().includes(termLower);
                    const inTags = Array.isArray(q.tags) && q.tags.some((t: string) => t.toLowerCase().includes(termLower));
                    return inQuestion || inTags;
                };

                // ขั้นที่ 1: ถามดัชนีย่อ (cache ฝั่งเซิร์ฟเวอร์) ว่าชุดไหนมีโจทย์ตรงหัวข้อบ้าง
                // แทนการดึง exams ทั้งคลัง (67 reads, 17-60MB) มากรองเองแบบเดิม
                const res = await fetch("/api/practice-index");
                if (!res.ok) throw new Error(`practice-index ${res.status}`);
                const index = await res.json();
                const involvedIds: string[] = (index.exams || [])
                    .filter((exam: any) => (exam.questions || []).some(matches))
                    .map((exam: any) => exam.id);

                // ขั้นที่ 2: อ่านเฉพาะชุดที่เกี่ยว (ปกติไม่กี่ชุด) แล้วกรองด้วยเงื่อนไขเดิม
                let results: any[] = [];
                const snaps = await Promise.all(involvedIds.map((id) => getDoc(doc(db, "exams", id))));
                snaps.forEach((snap) => {
                    if (!snap.exists()) return;
                    const examQuestions = snap.data().questions || [];
                    results = [...results, ...examQuestions.filter(matches)];
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
        <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors">
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
                <ExamAccessGuard isFree={false}>
                    <ExamSystem
                        examData={questions}
                        examTitle={`ฝึกฝนเรื่อง: ${queryTerm}`}
                    />
                </ExamAccessGuard>
            </main>
        </div>
    );
}
