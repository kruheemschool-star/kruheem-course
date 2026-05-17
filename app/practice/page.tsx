"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import Link from "next/link";
import { Search, BookOpen, Loader2, ArrowRight, Tag } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Curated, student-friendly Thai topics. Each string is a REAL high-count
// value found in question `tags` in the data, so it works as both the pill
// label AND the exact match key (q.tags.includes) and the /exam/practice?q=
// substring search — no mapping needed. Edit/reorder freely (curriculum).
const PRACTICE_TOPICS: string[] = [
    "จำนวนนับ", "จำนวนเต็ม", "เศษส่วน", "ทศนิยม",
    "ตัวประกอบ", "ห.ร.ม.", "ค.ร.น.", "เลขยกกำลัง",
    "อัตราส่วน", "ร้อยละ", "ส่วนลด กำไร ขาดทุน",
    "สมการ", "อสมการ", "พีชคณิต", "ลำดับและอนุกรม",
    "เรขาคณิต", "มุม", "เส้นขนาน", "รูปสามเหลี่ยม",
    "รูปสี่เหลี่ยม", "วงกลม", "พื้นที่", "ปริมาตร",
    "ความน่าจะเป็น",
];

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

    // Curated Thai topics, kept only if they actually exist in the loaded
    // data (so no pill is a dead end). Value === a real q.tags string →
    // exact-match click + the /exam/practice?q= substring both still work.
    const topicSet = new Set(availableTopics);
    const visibleTopics = PRACTICE_TOPICS.filter(t => topicSet.has(t));

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans flex flex-col transition-colors">
            <Navbar />

            {/* Header — minimal clean, matches the /exam bottom banner */}
            <div className="pt-32 pb-16 px-6 bg-gradient-to-b from-slate-50 dark:from-slate-950 to-white dark:to-slate-950 transition-colors">
                <div className="max-w-4xl mx-auto rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-12 md:px-16 md:py-16 text-center shadow-[0_10px_50px_-20px_rgba(15,23,42,0.15)]">
                    <div className="inline-flex items-center gap-2 mb-5 text-[11px] font-bold uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        ฝึกตามหัวข้อ
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.15] text-slate-900 dark:text-white mb-5">
                        ฝึกฝน <span className="text-amber-500">เฉพาะจุด</span> 🎯
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
                        เจาะลึกเฉพาะเรื่องที่คุณต้องการ ระบบจะดึงโจทย์จากคลังข้อสอบทั้งหมดมารวมเป็นชุดพิเศษให้คุณทันที
                    </p>

                    {/* Search Bar */}
                    <div className="relative max-w-xl mx-auto group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <Search className="h-6 w-6 text-slate-400 dark:text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="พิมพ์หัวข้อที่อยากฝึก เช่น เศษส่วน, เลขยกกำลัง..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setSelectedTopic(null); }}
                            className="w-full pl-14 pr-6 py-4 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm text-lg font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-4 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition-all"
                        />
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-6 py-12 max-w-6xl">

                {/* Popular Topics Pill Cloud */}
                {visibleTopics.length > 0 && !searchQuery && !selectedTopic && (
                    <div className="mb-12 text-center">
                        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase mb-4 tracking-wider">หัวข้อแนะนำ</h3>
                        <div className="flex flex-wrap gap-3 justify-center">
                            {visibleTopics.map(topic => (
                                <button
                                    key={topic}
                                    onClick={() => setSelectedTopic(topic)}
                                    className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 text-slate-600 dark:text-slate-300 font-bold transition-colors flex items-center gap-2"
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
