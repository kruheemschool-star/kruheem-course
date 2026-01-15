"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import Link from "next/link";
import { Search, BookOpen, Loader2, ArrowRight, Tag } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PracticeModePage() {
    const [allQuestions, setAllQuestions] = useState<any[]>([]); // Store ALL questions from ALL exams
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

    // Derived States
    const [availableTopics, setAvailableTopics] = useState<string[]>([]);
    const [filteredQuestions, setFilteredQuestions] = useState<any[]>([]);

    useEffect(() => {
        const fetchAllExams = async () => {
            try {
                const q = query(collection(db, "exams"));
                const snapshot = await getDocs(q);

                let loadedQuestions: any[] = [];
                let topicsSet = new Set<string>();

                snapshot.docs.forEach(doc => {
                    const examData = doc.data();
                    const questions = examData.questions || [];

                    // Attach Exam Info to each question for context
                    const enhancedQuestions = questions.map((q: any) => ({
                        ...q,
                        examId: doc.id,
                        examTitle: examData.title,
                        tags: q.tags || []
                    }));

                    // Extract Topics
                    enhancedQuestions.forEach((q: any) => {
                        // 1. Tags Array
                        if (q.tags && Array.isArray(q.tags)) {
                            q.tags.forEach((tag: string) => topicsSet.add(tag));
                        }
                        // 2. Keywords String
                        if (q.keywords && typeof q.keywords === 'string') {
                            q.keywords.split(',').forEach((k: string) => topicsSet.add(k.trim()));
                        }
                    });

                    loadedQuestions = [...loadedQuestions, ...enhancedQuestions];
                });

                setAllQuestions(loadedQuestions);
                setAvailableTopics(Array.from(topicsSet).sort());
            } catch (error) {
                console.error("Error fetching exams:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllExams();
    }, []);

    useEffect(() => {
        if (!searchQuery && !selectedTopic) {
            setFilteredQuestions([]);
            return;
        }

        const queryLower = searchQuery.toLowerCase();

        const results = allQuestions.filter(q => {
            // Check Topic Filter
            if (selectedTopic) {
                const hasTag = q.tags?.includes(selectedTopic);
                const hasKeyword = q.keywords && typeof q.keywords === 'string' && q.keywords.includes(selectedTopic);
                if (!hasTag && !hasKeyword) return false;
            }

            // Check Search Query
            if (searchQuery) {
                const inQuestion = q.question.toLowerCase().includes(queryLower);
                const inTags = q.tags?.some((t: string) => t.toLowerCase().includes(queryLower));
                const inKeywords = q.keywords && typeof q.keywords === 'string' && q.keywords.toLowerCase().includes(queryLower);

                return inQuestion || inTags || inKeywords;
            }

            return true;
        });

        setFilteredQuestions(results);
    }, [searchQuery, selectedTopic, allQuestions]);


    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans flex flex-col transition-colors">
            <Navbar />

            {/* Header */}
            <div className="bg-slate-900 pt-32 pb-16 px-6 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                <div className="max-w-4xl mx-auto relative z-10">
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-6">
                        ฝึกฝน <span className="text-amber-500">เฉพาะจุด</span> 🎯
                    </h1>
                    <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
                        เจาะลึกเฉพาะเรื่องที่คุณต้องการ ระบบจะดึงโจทย์จากคลังข้อสอบทั้งหมดมารวมเป็นชุดพิเศษให้คุณทันที
                    </p>

                    {/* Search Bar */}
                    <div className="relative max-w-xl mx-auto group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <Search className="h-6 w-6 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="พิมพ์หัวข้อที่อยากฝึก เช่น แคลคูลัส, จำนวนจริง..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setSelectedTopic(null); }}
                            className="w-full pl-14 pr-6 py-4 bg-white rounded-full shadow-2xl text-lg font-bold text-slate-800 placeholder:text-slate-400 focus:ring-4 focus:ring-amber-500/30 outline-none transition-all"
                        />
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-6 py-12 max-w-6xl">

                {/* Popular Topics Pill Cloud */}
                {availableTopics.length > 0 && !searchQuery && !selectedTopic && (
                    <div className="mb-12 text-center">
                        <h3 className="text-slate-400 text-sm font-bold uppercase mb-4 tracking-wider">หัวข้อแนะนำ</h3>
                        <div className="flex flex-wrap gap-3 justify-center">
                            {availableTopics.slice(0, 30).map(topic => (
                                <button
                                    key={topic}
                                    onClick={() => setSelectedTopic(topic)}
                                    className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-colors flex items-center gap-2"
                                >
                                    <Tag size={14} /> {topic}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Results Area */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
                        <p className="text-slate-400">กำลังสแกนคลังข้อสอบ...</p>
                    </div>
                ) : (searchQuery || selectedTopic) ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                <span>ผลการค้นหา:</span>
                                <span className="text-amber-600 bg-amber-50 px-3 py-1 rounded-lg">
                                    {selectedTopic || searchQuery}
                                </span>
                            </h2>
                            <span className="text-slate-500 font-bold">{filteredQuestions.length} ข้อที่พบ</span>
                        </div>

                        {filteredQuestions.length > 0 ? (
                            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-slate-100 text-center">
                                <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg">
                                    <BookOpen size={40} />
                                </div>
                                <h3 className="text-3xl font-black text-slate-800 mb-4">พร้อมลุยไหม?</h3>
                                <p className="text-slate-500 text-lg mb-8 max-w-lg mx-auto">
                                    เราเจาะจงโจทย์เรื่อง <strong className="text-slate-800">"{selectedTopic || searchQuery}"</strong> มาให้คุณแล้วจำนวน {filteredQuestions.length} ข้อ
                                </p>

                                <Link
                                    href={`/exam/practice?q=${encodeURIComponent(searchQuery || selectedTopic || "")}`}
                                    className="inline-flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-full font-bold text-lg hover:bg-black hover:scale-105 transition-all shadow-xl shadow-slate-200"
                                >
                                    เริ่มทำแบบฝึกหัดชุดนี้
                                    <ArrowRight />
                                </Link>
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <span className="text-4xl block mb-4 opacity-50">🙈</span>
                                <h3 className="text-xl font-bold text-slate-400">ยังไม่พบโจทย์ในหัวข้อนี้</h3>
                                <p className="text-slate-400 mt-2">อาจจะต้องรอครูพี่ฮีมเพิ่ม Tag ในข้อสอบก่อนนะครับ</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-20 opacity-30">
                        <div className="text-6xl mb-4">👆</div>
                        <p className="font-bold text-xl">พิมพ์ค้นหาด้านบนเพื่อเริ่มฝึกฝน</p>
                    </div>
                )}

            </main>

            <Footer />
        </div>
    );
}
