"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase"; // Ensure this path is correct
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { BookOpen, Search, Filter, GraduationCap, ChevronRight, Clock, Award, ArrowRight, Target, Tag } from "lucide-react";
import Navbar from "@/components/Navbar"; // Assume you have a Navbar component
import Footer from "@/components/Footer"; // Assume you have a Footer component

export default function ExamHubPage() {
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
    const [searchQuery, setSearchQuery] = useState("");

    const categories = ["ทั้งหมด", "ประถม", "ม.ต้น", "ม.ปลาย", "สอบเข้า"];

    useEffect(() => {
        const fetchExams = async () => {
            try {
                // Fetch exams from Firestore
                const q = query(collection(db, "exams"), orderBy("createdAt", "desc"));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    setExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                } else {
                    // Fallback Mock Data if DB is empty
                    setExams([
                        {
                            id: "math-m1-algebra",
                            title: "แบบทดสอบพีชคณิตพื้นฐาน ม.1",
                            description: "ทบทวนเรื่องสมการ ตัวแปร และการแก้โจทย์ปัญหาเบื้องต้น",
                            category: "ม.ต้น",
                            level: "ม.1",
                            questionCount: 10,
                            timeLimit: 20,
                            difficulty: "Easy",
                        }
                    ]);
                }
            } catch (error) {
                console.error("Error fetching exams:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchExams();
    }, []);

    // Advanced Deep Search Logic (With Deep Linking)
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];

        const queryLower = searchQuery.toLowerCase().trim();
        const results: any[] = [];

        exams.forEach(exam => {
            let matchReason = null;
            let matchDetail = "";
            let matchedIndex = -1; // -1 means no specific question match (or metadata match)

            // 1. Metadata Match Check
            const title = String(exam.title || "").toLowerCase();
            const desc = String(exam.description || "").toLowerCase();
            const category = String(exam.category || "").toLowerCase();

            // Exam Level Tags
            const examTags = Array.isArray(exam.tags) ? exam.tags : (typeof exam.tags === 'string' ? exam.tags.split(',') : []);
            const matchedExamTag = examTags.find((t: any) => String(t).toLowerCase().includes(queryLower));

            if (title.includes(queryLower)) matchReason = "ชื่อแบบทดสอบ";
            else if (desc.includes(queryLower)) matchReason = "คำอธิบาย";
            else if (category.includes(queryLower)) matchReason = "หมวดหมู่";
            else if (matchedExamTag) {
                matchReason = "แท็กของชุด";
                matchDetail = String(matchedExamTag);
            }

            // 2. Deep Content Match (Scan Questions)
            // Only scan if metadata didn't match (Prioritize starting exan from beginning if title matches)
            if (!matchReason) {
                let questions: any[] = [];
                try {
                    if (typeof exam.questions === 'string') {
                        questions = JSON.parse(exam.questions);
                    } else if (Array.isArray(exam.questions)) {
                        questions = exam.questions;
                    }
                } catch (e) { }

                questions.some((q, idx) => {
                    const qText = String(q.question || "").toLowerCase();
                    const qTags = Array.isArray(q.tags) ? q.tags : [];
                    const qKeywords = String(q.keywords || "").toLowerCase();

                    let found = false;

                    if (qText.includes(queryLower)) {
                        matchReason = `เจอในโจทย์ข้อ ${idx + 1}`;
                        found = true;
                    } else {
                        const foundTag = qTags.find((t: any) => String(t).toLowerCase().includes(queryLower));
                        if (foundTag) {
                            matchReason = `เจอแท็ก "${foundTag}" ในข้อ ${idx + 1}`;
                            found = true;
                        } else if (qKeywords.includes(queryLower)) {
                            matchReason = `เจอคีย์เวิร์ดในข้อ ${idx + 1}`;
                            found = true;
                        }
                    }

                    if (found) {
                        matchedIndex = idx; // Capture index for Deep Linking
                        return true; // Break loop
                    }
                    return false;
                });
            }

            if (matchReason) {
                results.push({
                    type: 'exam',
                    exam,
                    matchReason,
                    matchDetail,
                    matchedIndex
                });
            }
        });

        return results;
    }, [exams, searchQuery]);

    const filteredExams = useMemo(() => {
        return exams.filter(exam => {
            const matchesCategory = selectedCategory === "ทั้งหมด" || exam.category === selectedCategory;
            return matchesCategory;
        });
    }, [exams, selectedCategory]);

    return (
        <div className="min-h-screen bg-[#FDFCF8] font-sans flex flex-col">
            <Navbar />

            {/* Netflix-style Hero Banner for Practice Mode */}
            <div className="pt-24 pb-8 px-4 md:px-8 bg-gradient-to-b from-white to-[#FDFCF8]">
                <div className="relative w-full max-w-7xl mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-900 text-white min-h-[400px] flex items-center group transition-all duration-500 hover:shadow-indigo-500/20">
                    {/* Background Art */}
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900"></div>
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=3270&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay transition-transform duration-1000 group-hover:scale-105"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent"></div>

                    {/* Content */}
                    <div className="relative z-10 p-8 md:p-16 max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-6 backdrop-blur-sm">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                            New Feature
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight drop-shadow-2xl">
                            โหมดฝึกฝนรายบท <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                                (Practice Mode)
                            </span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-xl leading-relaxed drop-shadow-md">
                            เจาะลึกทุกบทเรียน อัพสกิลคณิตศาสตร์ให้เก่งเวอร์! ฝึกฝนจุดอ่อน เสริมจุดแข็ง ด้วยระบบวิเคราะห์อัจฉริยะ 🧠✨
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                href="/practice"
                                className="px-8 py-4 bg-white text-slate-900 rounded-xl font-black text-lg flex items-center justify-center gap-3 hover:bg-amber-400 transition-colors shadow-lg hover:shadow-amber-400/50 hover:-translate-y-1 transform duration-200"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center">
                                    <Target size={18} fill="currentColor" />
                                </div>
                                เริ่มฝึกฝนทันที
                            </Link>
                            <button className="px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-white/20 transition-colors border border-white/10 hover:border-white/30">
                                <Award size={20} />
                                ดูสถิติของฉัน
                            </button>
                        </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute right-0 bottom-0 p-12 opacity-10 hidden md:block">
                        <div className="text-[12rem] font-black text-white leading-none select-none tracking-tighter">MATH</div>
                    </div>
                </div>
            </div>

            {/* Search & Filter Section */}
            <div className="px-6 py-8 relative z-10">
                <div className="max-w-4xl mx-auto text-center mb-8">
                    <h2 className="text-3xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-2">
                        <span className="text-amber-600">คลังข้อสอบ</span> ออนไลน์ 📚
                    </h2>
                    <p className="text-slate-500">ค้นหาข้อสอบที่ต้องการฝึกฝน หรือเลือกตามหมวดหมู่ด้านล่าง</p>
                </div>

                {/* Grand Search Bar */}
                <div className="max-w-2xl mx-auto relative group z-20 text-left mb-4">
                    <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                    <div className="relative flex items-center bg-white rounded-2xl shadow-xl border border-slate-100">
                        <div className="pl-6 text-slate-400">
                            <Search className="w-6 h-6" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="ค้นหาโจทย์, สูตร, หรือเนื้อหาที่ต้องการ..."
                            className="w-full py-4 px-4 bg-transparent text-lg font-medium text-slate-700 outline-none placeholder:text-slate-300"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="mr-2 p-2 hover:bg-slate-100 rounded-full text-slate-400"
                            >
                                <span className="text-xs font-bold">ESC</span>
                            </button>
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {searchQuery && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden divide-y divide-slate-50 max-h-[60vh] overflow-y-auto z-50">
                            <div className="p-3 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                                <span>ผลการค้นหา ({searchResults.length})</span>
                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">Deep Search Enabled</span>
                            </div>
                            {searchResults.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <div className="text-3xl mb-2">🤔</div>
                                    ไม่พบข้อมูลที่ตรงกับ "{searchQuery}"
                                    <br /><span className="text-sm">ลองค้นหาด้วย ชื่อวิชา, ระดับชั้น, หรือคำสำคัญ</span>
                                </div>
                            ) : (
                                searchResults.map((result, idx) => (
                                    <Link
                                        href={result.matchedIndex > -1 ? `/exam/${result.exam.id}?q=${result.matchedIndex}` : `/exam/${result.exam.id}`}
                                        key={`res-${idx}`}
                                        className="block p-4 hover:bg-amber-50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-16 bg-slate-200 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-xl shadow-sm relative">
                                                {result.exam.coverImage ? (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img src={result.exam.coverImage} alt="" className="w-full h-full object-cover" />
                                                ) : <span className="text-2xl">📝</span>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-800 text-lg group-hover:text-amber-600 transition-colors truncate">
                                                    {result.exam.title}
                                                </h4>

                                                {/* Show Match Reason if it's a deep match or specific tag match */}
                                                {result.matchReason ? (
                                                    <div className="mt-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-amber-100 mb-1">
                                                        <span>🎯 {result.matchReason}</span>
                                                        {result.matchDetail && <span className="text-amber-800">"{result.matchDetail}"</span>}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-500 line-clamp-1">
                                                        {result.exam.description || "คลิกเพื่อดูรายละเอียดเพิ่มเติม"}
                                                    </p>
                                                )}

                                                <div className="flex gap-2 mt-1">
                                                    {result.exam.level && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium border border-slate-200">
                                                            {result.exam.level}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500 font-medium border border-indigo-100">
                                                        {result.exam.category || "ทั่วไป"}
                                                    </span>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-300 group-hover:text-amber-500 transition-transform group-hover:translate-x-1" />
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-grow container mx-auto px-6 py-12 max-w-7xl">

                {/* Regular Category Filters (Only show if not searching or handled above) */}
                <div className="flex flex-wrap gap-2 mb-10 justify-center">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 border-2 ${selectedCategory === cat
                                ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-amber-400 hover:text-amber-600'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Exams Grid (Netflix Style) */}
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="aspect-[3/4] bg-slate-200 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredExams.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredExams.map((exam) => (
                            <Link href={`/exam/${exam.id}`} key={exam.id} className="group relative flex flex-col bg-white rounded-xl shadow-sm hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 overflow-hidden aspect-[3/4] hover:-translate-y-2">

                                {/* Logo Badge (Top Left) */}
                                <div className="absolute top-3 left-3 z-20 drop-shadow-lg">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src="/logo.png"
                                        alt="Math School Logo"
                                        className="w-12 h-12 object-contain filter drop-shadow-lg"
                                    />
                                </div>

                                {/* Cover Image Area */}
                                <div className="absolute inset-0 bg-slate-100">
                                    {exam.coverImage ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={exam.coverImage} alt={exam.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    ) : (
                                        <div className={`w-full h-full bg-gradient-to-br ${exam.category === 'ม.ต้น' ? 'from-blue-500 to-indigo-600' :
                                            exam.category === 'ประถม' ? 'from-pink-400 to-rose-500' :
                                                exam.category === 'สอบเข้า' ? 'from-amber-400 to-orange-500' :
                                                    'from-slate-700 to-slate-900'
                                            } flex items-center justify-center p-6 text-center group-hover:scale-110 transition-transform duration-700`}>
                                            <div>
                                                <div className="text-5xl mb-2 opacity-50">📝</div>
                                                <h3 className="text-white font-bold leading-tight drop-shadow-md line-clamp-3">
                                                    {exam.title}
                                                </h3>
                                            </div>
                                        </div>
                                    )}

                                    {/* Gradient Overlay (Always visible at bottom) */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90"></div>
                                </div>

                                {/* Content Overlay */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-10 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold px-2.5 py-1 rounded bg-white/20 backdrop-blur-md border border-white/10 uppercase tracking-wider">
                                            {exam.level}
                                        </span>
                                        {exam.questionCount > 0 && (
                                            <span className="text-xs text-slate-300 flex items-center gap-1">
                                                <Clock size={12} /> {exam.timeLimit} น.
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-black text-3xl leading-none mb-3 line-clamp-3 text-white drop-shadow-lg group-hover:text-amber-400 transition-colors">
                                        {exam.title}
                                    </h3>
                                    <p className="text-sm text-slate-300 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                                        {exam.description}
                                    </p>

                                    {/* Play Button (Appears on Hover) */}
                                    <div className="mt-4 flex items-center gap-2 text-sm font-bold text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-4 group-hover:translate-y-0">
                                        <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center">
                                            <ArrowRight size={16} />
                                        </div>
                                        เริ่มทำข้อสอบ
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100">
                        <div className="text-4xl mb-4 opacity-50">🔍</div>
                        <h3 className="text-xl font-bold text-slate-600">ไม่พบข้อสอบที่ค้นหา</h3>
                        <button
                            onClick={() => { setSelectedCategory("ทั้งหมด"); }}
                            className="mt-6 px-6 py-2 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                        >
                            ดูทั้งหมด
                        </button>
                    </div>
                )}

            </main>

            <Footer />
        </div>
    );
}
