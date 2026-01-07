"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ChevronRight, Clock, ArrowRight } from "lucide-react";

interface ExamListClientProps {
    initialExams: any[];
}

export default function ExamListClient({ initialExams }: ExamListClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");

    const categories = ["ทั้งหมด", "ประถม", "ม.ต้น", "ม.ปลาย", "สอบเข้า"];

    // Client-side filtering
    const filteredExams = useMemo(() => {
        let result = initialExams;

        // 1. Filter by Category
        if (selectedCategory !== "ทั้งหมด") {
            result = result.filter(exam => exam.category === selectedCategory);
        }

        // 2. Filter by Search Query
        if (searchQuery.trim()) {
            const queryLower = searchQuery.toLowerCase().trim();
            result = result.filter(exam => {
                const title = String(exam.title || "").toLowerCase();
                const desc = String(exam.description || "").toLowerCase();
                const tags = Array.isArray(exam.tags) ? exam.tags : [];
                return title.includes(queryLower) || desc.includes(queryLower) || tags.some((t: any) => String(t).toLowerCase().includes(queryLower));
            });
        }

        return result;
    }, [initialExams, selectedCategory, searchQuery]);

    return (
        <div className="bg-[#FDFCF8] relative z-10 pb-12">
            {/* Search & Filter Section */}
            <div className="px-6 py-8 relative">
                <div className="max-w-4xl mx-auto text-center mb-8">
                    <h2 className="text-3xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-2">
                        <span className="text-amber-600">คลังข้อสอบ</span> ออนไลน์ 📚
                    </h2>
                    <p className="text-slate-500">ค้นหาข้อสอบที่ต้องการฝึกฝน หรือเลือกตามหมวดหมู่ด้านล่าง</p>
                </div>

                {/* Grand Search Bar */}
                <div className="max-w-2xl mx-auto relative group z-20 text-left mb-8">
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
                </div>

                {/* Regular Category Filters */}
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
            </div>

            {/* Exams Grid */}
            <main className="container mx-auto px-6 max-w-7xl">
                {filteredExams.length > 0 ? (
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
                                        {/* Optional: Check if questionCount exists */}
                                        {(exam.questionCount || 0) > 0 && (
                                            <span className="text-xs text-slate-300 flex items-center gap-1">
                                                <Clock size={12} /> {exam.timeLimit || 0} น.
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
                            onClick={() => { setSelectedCategory("ทั้งหมด"); setSearchQuery(""); }}
                            className="mt-6 px-6 py-2 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                        >
                            ดูทั้งหมด
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
