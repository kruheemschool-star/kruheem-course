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
                        {filteredExams.map((exam, index) => {
                            // 1. Define Unique Color Themes (Match with Admin)
                            const themes = {
                                'Amber': { name: 'Amber', color: 'text-amber-400', bg: 'bg-amber-500', border: 'hover:border-amber-400', shadow: 'hover:shadow-amber-500/30' },
                                'Rose': { name: 'Rose', color: 'text-rose-400', bg: 'bg-rose-500', border: 'hover:border-rose-400', shadow: 'hover:shadow-rose-500/30' },
                                'Violet': { name: 'Violet', color: 'text-violet-400', bg: 'bg-violet-500', border: 'hover:border-violet-400', shadow: 'hover:shadow-violet-500/30' },
                                'Emerald': { name: 'Emerald', color: 'text-emerald-400', bg: 'bg-emerald-500', border: 'hover:border-emerald-400', shadow: 'hover:shadow-emerald-500/30' },
                                'Sky': { name: 'Sky', color: 'text-sky-400', bg: 'bg-sky-500', border: 'hover:border-sky-400', shadow: 'hover:shadow-sky-500/30' },
                                'Red': { name: 'Red', color: 'text-red-400', bg: 'bg-red-500', border: 'hover:border-red-400', shadow: 'hover:shadow-red-500/30' },
                                'Indigo': { name: 'Indigo', color: 'text-indigo-400', bg: 'bg-indigo-500', border: 'hover:border-indigo-400', shadow: 'hover:shadow-indigo-500/30' },
                                'Pink': { name: 'Pink', color: 'text-pink-400', bg: 'bg-pink-500', border: 'hover:border-pink-400', shadow: 'hover:shadow-pink-500/30' },
                                'Teal': { name: 'Teal', color: 'text-teal-400', bg: 'bg-teal-500', border: 'hover:border-teal-400', shadow: 'hover:shadow-teal-500/30' },
                                'Cyan': { name: 'Cyan', color: 'text-cyan-400', bg: 'bg-cyan-500', border: 'hover:border-cyan-400', shadow: 'hover:shadow-cyan-500/30' },
                                'Fuchsia': { name: 'Fuchsia', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500', border: 'hover:border-fuchsia-400', shadow: 'hover:shadow-fuchsia-500/30' },
                                'Lime': { name: 'Lime', color: 'text-lime-400', bg: 'bg-lime-500', border: 'hover:border-lime-400', shadow: 'hover:shadow-lime-500/30' },
                                'Orange': { name: 'Orange', color: 'text-orange-400', bg: 'bg-orange-500', border: 'hover:border-orange-400', shadow: 'hover:shadow-orange-500/30' },
                                'Blue': { name: 'Blue', color: 'text-blue-400', bg: 'bg-blue-500', border: 'hover:border-blue-400', shadow: 'hover:shadow-blue-500/30' },
                                'Green': { name: 'Green', color: 'text-green-400', bg: 'bg-green-500', border: 'hover:border-green-400', shadow: 'hover:shadow-green-500/30' },
                            };

                            // Fallback list for index-based selection
                            const themeList = Object.values(themes);

                            // Select Theme: Prioritize Manual Selection -> Fallback to Modulus Index
                            // @ts-ignore
                            let theme = themes[exam.themeColor];
                            if (!theme) {
                                theme = themeList[index % themeList.length];
                            }

                            // Process Title for Manual Line Breaks (<br>)
                            const dispTitle = (exam.title || "").replace(/<br\s*\/?>/gi, '\n');

                            return (
                                <Link
                                    href={`/exam/${exam.id}`}
                                    key={exam.id}
                                    className={`group relative flex flex-col bg-slate-900 rounded-2xl overflow-hidden aspect-[3/4] transition-all duration-500 hover:-translate-y-3 hover:scale-[1.02] border border-transparent ${theme.border} ${theme.shadow} shadow-xl`}
                                >

                                    {/* Logo Badge (Top Left) */}
                                    <div className="absolute top-4 left-4 z-30 drop-shadow-lg opacity-80 group-hover:opacity-100 transition-opacity">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src="/logo.png"
                                            alt="Math School Logo"
                                            className="w-10 h-10 object-contain filter drop-shadow-md"
                                        />
                                    </div>

                                    {/* Cover Image Area */}
                                    <div className="absolute inset-0 z-0 bg-slate-800 overflow-hidden">
                                        {exam.coverImage ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={exam.coverImage}
                                                alt={exam.title}
                                                className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:blur-sm"
                                            />
                                        ) : (
                                            <div className={`w-full h-full bg-slate-800 flex items-center justify-center p-6 text-center transition-all duration-700 group-hover:scale-110 group-hover:blur-sm`}>
                                                <div>
                                                    <div className="text-6xl mb-4 opacity-30 grayscale group-hover:grayscale-0 transition-all duration-500">
                                                        📚
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Standard Gradient Overlay (Always visible initially) */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-90 group-hover:opacity-0 transition-opacity duration-500"></div>
                                    </div>


                                    {/* Glassmorphism Overlay (Appears on Hover) */}
                                    <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6">
                                        {/* This area is the "Glass" background that makes text readable */}
                                    </div>


                                    {/* Content Layer */}
                                    <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex flex-col justify-end h-full">

                                        {/* Top Meta (Level & Time) - Moves up slightly on hover */}
                                        <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75 mb-auto pt-16 opacity-0 group-hover:opacity-100">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-black px-3 py-1 rounded-full bg-white text-slate-900 uppercase tracking-widest shadow-lg`}>
                                                    {exam.level}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Main Title Area */}
                                        <div className="transform translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                                            {/* Category Badge (Visible initially, fades out or moves on hover) */}
                                            <div className="mb-3 opacity-100 group-hover:opacity-0 transition-opacity duration-300 absolute -top-8 left-0">
                                                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider border border-slate-600 px-2 py-0.5 rounded">
                                                    {exam.level}
                                                </span>
                                            </div>

                                            <h3 className={`font-black text-4xl md:text-5xl leading-[0.9] mb-4 line-clamp-3 ${theme.color} drop-shadow-2xl tracking-tighter transition-colors duration-300 whitespace-pre-line`}>
                                                {dispTitle}
                                            </h3>

                                            {/* Description & Action */}
                                            <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500 ease-out">
                                                <div className="overflow-hidden">
                                                    <p className="text-base text-slate-100/90 font-medium leading-relaxed mb-5 line-clamp-3 drop-shadow-md">
                                                        {exam.description}
                                                    </p>
                                                    <div className={`flex items-center gap-3 text-base font-bold ${theme.color}`}>
                                                        <span>เริ่มทำข้อสอบ</span>
                                                        <div className={`w-8 h-8 rounded-full ${theme.bg} text-white flex items-center justify-center shadow-lg transform group-hover:translate-x-2 transition-transform duration-300`}>
                                                            <ArrowRight size={16} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
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
