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

    // Dropdown State
    const [showDropdown, setShowDropdown] = useState(false);

    // ✨ Smart Dropdown Logic
    const dropdownResults = useMemo(() => {
        if (!searchQuery.trim()) return { exams: [], questions: [] };

        const queryLower = searchQuery.toLowerCase().trim();
        const MAX_SNIPPET_LENGTH = 60;

        const matchedExams: any[] = [];
        const matchedQuestions: any[] = [];

        initialExams.forEach(exam => {
            // Check Exam Title Match
            if ((exam.title || "").toLowerCase().includes(queryLower)) {
                matchedExams.push(exam);
            }

            // Check Questions Match (Refined: Focus on Keywords/Tags first)
            if (Array.isArray(exam.questions)) {
                exam.questions.forEach((q: any, idx: number) => {
                    const qKeywords = (q.keywords || "");
                    const qText = (q.question || "");

                    // Priority Check: Search in Keywords first!
                    const matchInKeywords = qKeywords.toLowerCase().includes(queryLower);

                    // Secondary Check: Search in Question Text (only if short enough or very specific)
                    const matchInText = qText.toLowerCase().includes(queryLower);

                    if (matchInKeywords || matchInText) {
                        // Extract Snippet
                        // If found in text, grab around it. If in keywords, show question start.
                        let snippet = "";

                        if (matchInText) {
                            const matchIndex = qText.toLowerCase().indexOf(queryLower);
                            let start = Math.max(0, matchIndex - 20);
                            let end = Math.min(qText.length, matchIndex + queryLower.length + 40);
                            snippet = qText.substring(start, end);
                        } else {
                            // Matched via Keyword -> Show beginning of question
                            snippet = qText.substring(0, 60);
                        }

                        // Highlight
                        const highlightRegex = new RegExp(`(${queryLower})`, 'gi');
                        snippet = snippet.replace(highlightRegex, '<mark class="bg-amber-200 text-amber-900 rounded px-0.5">$1</mark>');

                        matchedQuestions.push({
                            examId: exam.id,
                            examTitle: exam.title,
                            index: idx,
                            snippet: "..." + snippet + "..."
                        });
                    }
                });
            }
        });

        return { exams: matchedExams, questions: matchedQuestions };
    }, [searchQuery, initialExams]);

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
                // Check 1: Cloud Index (searchKeywords)
                const matchIndex = Array.isArray(exam.searchKeywords) &&
                    exam.searchKeywords.some((k: string) => k.includes(queryLower) || queryLower.includes(k));

                // Check 2: Direct Content Search (Title, Description, Tags)
                const title = String(exam.title || "").toLowerCase();
                const desc = String(exam.description || "").toLowerCase();
                const tags = Array.isArray(exam.tags) ? exam.tags : [];

                const matchMeta = title.includes(queryLower)
                    || desc.includes(queryLower)
                    || tags.some((t: any) => String(t).toLowerCase().includes(queryLower));

                // Check 3: Deep Question Search (Iterate through questions)
                const matchQuestions = Array.isArray(exam.questions) && exam.questions.some((q: any) => {
                    const qText = String(q.question || "").toLowerCase();
                    const qKeywords = String(q.keywords || "").toLowerCase();
                    // Support searching for part of the question text
                    return qText.includes(queryLower) || qKeywords.includes(queryLower);
                });

                // Return TRUE if ANY check passes
                return matchIndex || matchMeta || matchQuestions;
            });
        }

        return result;
    }, [initialExams, selectedCategory, searchQuery]);

    return (
        <div className="bg-[#FDFCF8] relative z-10 pb-12">
            {/* Search & Filter Section */}
            <div className="px-6 py-8 relative z-50">
                <div className="max-w-4xl mx-auto text-center mb-8">
                    <h2 className="text-3xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-2">
                        <span className="text-amber-600">คลังข้อสอบ</span> ออนไลน์ 📚
                    </h2>
                    <p className="text-slate-500">ค้นหาข้อสอบที่ต้องการฝึกฝน หรือเลือกตามหมวดหมู่ด้านล่าง</p>
                </div>

                {/* Grand Search Bar (Restored & Optimized) */}
                <div className="max-w-2xl mx-auto relative group z-50 text-left mb-8">
                    <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                    <div className="relative flex items-center bg-white rounded-2xl shadow-xl border border-slate-100 placeholder-shown:shadow-sm focus-within:shadow-xl focus-within:ring-4 focus-within:ring-amber-100 transition-all">
                        <div className="pl-6 text-slate-400">
                            <Search className="w-6 h-6" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                            onFocus={() => setShowDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)} // Delay for click to register
                            placeholder="ค้นหาโจทย์... (ระบบจะค้นหาลึกถึงเนื้อหาข้างใน)"
                            className="w-full py-4 px-4 bg-transparent text-lg font-medium text-slate-700 outline-none placeholder:text-slate-300"
                            autoComplete="off"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => { setSearchQuery(""); }}
                                className="mr-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition"
                            >
                                <span className="text-xs font-bold">ESC</span>
                            </button>
                        )}
                    </div>

                    {/* ✨ Smart Dropdown Results */}
                    {showDropdown && searchQuery && (dropdownResults.exams.length > 0 || dropdownResults.questions.length > 0) && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 max-h-[60vh] overflow-y-auto custom-scrollbar">

                            {/* Section 1: Exams Found */}
                            {dropdownResults.exams.length > 0 && (
                                <div className="p-2">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-2 bg-slate-50/50 rounded-lg mb-1 flex items-center gap-2">
                                        <span>📚</span> เจอในชื่อชุดข้อสอบ ({dropdownResults.exams.length})
                                    </div>
                                    {dropdownResults.exams.slice(0, 3).map((exam: any) => (
                                        <Link
                                            href={`/exam/${exam.id}`}
                                            key={exam.id}
                                            className="block p-3 rounded-xl hover:bg-slate-50 transition flex items-center gap-4 group"
                                        >
                                            <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden">
                                                {exam.coverImage ? (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img src={exam.coverImage} className="w-full h-full object-cover" alt="" />
                                                ) : <div className="w-full h-full flex items-center justify-center text-xl">📘</div>}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-700 group-hover:text-amber-600 transition">{exam.title}</h4>
                                                <p className="text-xs text-slate-400 line-clamp-1">{exam.description}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {dropdownResults.exams.length > 0 && dropdownResults.questions.length > 0 && (
                                <div className="h-px bg-slate-100 my-1 mx-4"></div>
                            )}

                            {/* Section 2: Questions Found */}
                            {dropdownResults.questions.length > 0 && (
                                <div className="p-2">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-2 bg-slate-50/50 rounded-lg mb-1 flex items-center gap-2">
                                        <span>📝</span> เจอในเนื้อหาโจทย์ ({dropdownResults.questions.length})
                                    </div>
                                    {dropdownResults.questions.slice(0, 5).map((item: any, idx: number) => (
                                        <Link
                                            href={`/exam/${item.examId}?q=${item.index}`}
                                            key={`${item.examId}-${item.index}-${idx}`}
                                            className="block p-3 rounded-xl hover:bg-amber-50/50 transition group border border-transparent hover:border-amber-100"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 mt-1">
                                                    <span className="text-[10px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">ข้อ {item.index + 1}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h5 className="text-xs font-bold text-slate-500 mb-0.5 flex items-center gap-1">
                                                        ในชุด: <span className="text-slate-700">{item.examTitle}</span>
                                                    </h5>
                                                    <p className="text-sm text-slate-700 font-medium leading-relaxed bg-white/50 p-2 rounded-lg border border-slate-100"
                                                        dangerouslySetInnerHTML={{ __html: item.snippet }}
                                                    />
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Regular Category Filters */}

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
                            // 1. Define Unique Color Themes (Match with Admin)
                            const themes = {
                                // Primary & Basic
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
                                'Blue': { name: 'Blue', color: 'text-blue-400', bg: 'bg-blue-600', border: 'hover:border-blue-400', shadow: 'hover:shadow-blue-500/30' },
                                'Green': { name: 'Green', color: 'text-green-400', bg: 'bg-green-500', border: 'hover:border-green-400', shadow: 'hover:shadow-green-500/30' },
                                'Yellow': { name: 'Yellow', color: 'text-yellow-300', bg: 'bg-yellow-400', border: 'hover:border-yellow-300', shadow: 'hover:shadow-yellow-400/30' },
                                'White': { name: 'White', color: 'text-slate-100', bg: 'bg-white text-slate-900', border: 'hover:border-white', shadow: 'hover:shadow-white/20' },
                                'Black': { name: 'Black', color: 'text-slate-400', bg: 'bg-slate-800', border: 'hover:border-slate-700', shadow: 'hover:shadow-slate-900/50' },

                                // Specials & Gradients
                                'Gold': { name: 'Gold', color: 'text-yellow-200', bg: 'bg-[#FFD700]', border: 'hover:border-yellow-200', shadow: 'hover:shadow-yellow-500/40' },
                                'Sunrise': { name: 'Sunrise', color: 'text-rose-300', bg: 'bg-gradient-to-br from-orange-400 to-rose-500', border: 'hover:border-rose-400', shadow: 'hover:shadow-rose-500/40' },
                                'Ocean': { name: 'Ocean', color: 'text-cyan-300', bg: 'bg-gradient-to-br from-cyan-400 to-blue-600', border: 'hover:border-cyan-400', shadow: 'hover:shadow-cyan-500/40' },
                                'Forest': { name: 'Forest', color: 'text-emerald-300', bg: 'bg-gradient-to-br from-emerald-400 to-green-600', border: 'hover:border-emerald-400', shadow: 'hover:shadow-emerald-500/40' },
                                'Twilight': { name: 'Twilight', color: 'text-violet-300', bg: 'bg-gradient-to-br from-violet-500 to-purple-600', border: 'hover:border-violet-400', shadow: 'hover:shadow-violet-500/40' },
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
                                    className={`group relative flex flex-col bg-slate-900 rounded-2xl overflow-hidden aspect-[3/4] transition-all duration-500 hover:-translate-y-3 hover:scale-[1.02] border border-transparent ${theme.border} ${theme.shadow} shadow-xl`
                                    }
                                >

                                    {/* Logo Badge (Top Left) */}
                                    < div className="absolute top-4 left-4 z-30 drop-shadow-lg opacity-80 group-hover:opacity-100 transition-opacity" >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        < img
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
                )
                }
            </main >
        </div >
    );
}
