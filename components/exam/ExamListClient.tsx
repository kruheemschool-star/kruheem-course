"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, ChevronRight, ArrowRight, FileText, Hash, Sparkles, Lightbulb } from "lucide-react";

interface ExamListClientProps {
    initialExams: any[];
}

interface SearchMatch {
    examId: string;
    examTitle: string;
    examLevel: string;
    examCoverImage: string;
    examThemeColor: string;
    questionMatches: { index: number; preview: string }[];
}

export default function ExamListClient({ initialExams }: ExamListClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");

    const categories = ["ทั้งหมด", "ประถม", "ม.ต้น", "ม.ปลาย", "สอบเข้า"];

    // Helper: Strip LaTeX and clean text for display
    const cleanText = (text: string): string => {
        if (!text) return "";
        return text
            .replace(/\\\(|\\\)|\$\$?/g, "") // Remove LaTeX delimiters
            .replace(/\\[a-zA-Z]+\{[^}]*\}/g, "") // Remove LaTeX commands
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 80);
    };

    // Advanced Search: Search in questions, options, explanation, tags
    const searchResults = useMemo((): SearchMatch[] => {
        if (!searchQuery.trim()) return [];

        const queryLower = searchQuery.toLowerCase().trim();
        const results: SearchMatch[] = [];

        initialExams.forEach(exam => {
            // Filter by category first
            if (selectedCategory !== "ทั้งหมด" && exam.category !== selectedCategory) {
                return;
            }

            const questionMatches: { index: number; preview: string }[] = [];

            // Search in exam title and description
            const titleMatch = String(exam.title || "").toLowerCase().includes(queryLower);
            const descMatch = String(exam.description || "").toLowerCase().includes(queryLower);
            const tagsMatch = (exam.tags || []).some((t: string) =>
                String(t).toLowerCase().includes(queryLower)
            );

            // Search in each question
            if (exam.questions && Array.isArray(exam.questions)) {
                exam.questions.forEach((q: any, index: number) => {
                    const questionText = String(q.question || "").toLowerCase();
                    const explanationText = String(q.explanation || "").toLowerCase();
                    const optionsText = (q.options || []).map((o: string) => String(o).toLowerCase()).join(" ");
                    const questionTags = (q.tags || []).map((t: string) => String(t).toLowerCase()).join(" ");

                    if (
                        questionText.includes(queryLower) ||
                        explanationText.includes(queryLower) ||
                        optionsText.includes(queryLower) ||
                        questionTags.includes(queryLower)
                    ) {
                        // Create a preview of the match
                        let preview = cleanText(q.question || "");
                        if (!preview) preview = cleanText((q.options || [])[0] || "");

                        questionMatches.push({ index: index + 1, preview });
                    }
                });
            }

            // If there are any matches, add to results
            if (titleMatch || descMatch || tagsMatch || questionMatches.length > 0) {
                results.push({
                    examId: exam.id,
                    examTitle: exam.title,
                    examLevel: exam.level,
                    examCoverImage: exam.coverImage,
                    examThemeColor: exam.themeColor,
                    questionMatches
                });
            }
        });

        return results;
    }, [initialExams, searchQuery, selectedCategory]);

    // Regular filtering for non-search mode
    const filteredExams = useMemo(() => {
        if (searchQuery.trim()) return []; // Use searchResults instead

        let result = initialExams;

        // Filter by Category
        if (selectedCategory !== "ทั้งหมด") {
            result = result.filter(exam => exam.category === selectedCategory);
        }

        return result;
    }, [initialExams, selectedCategory, searchQuery]);

    const isSearchMode = searchQuery.trim().length > 0;
    const totalQuestionMatches = searchResults.reduce((sum, r) => sum + r.questionMatches.length, 0);

    // Theme colors mapping
    const themes: Record<string, { color: string; bg: string; border: string; shadow: string }> = {
        'Amber': { color: 'text-amber-400', bg: 'bg-amber-500', border: 'hover:border-amber-400', shadow: 'hover:shadow-amber-500/30' },
        'Rose': { color: 'text-rose-400', bg: 'bg-rose-500', border: 'hover:border-rose-400', shadow: 'hover:shadow-rose-500/30' },
        'Violet': { color: 'text-violet-400', bg: 'bg-violet-500', border: 'hover:border-violet-400', shadow: 'hover:shadow-violet-500/30' },
        'Emerald': { color: 'text-emerald-400', bg: 'bg-emerald-500', border: 'hover:border-emerald-400', shadow: 'hover:shadow-emerald-500/30' },
        'Sky': { color: 'text-sky-400', bg: 'bg-sky-500', border: 'hover:border-sky-400', shadow: 'hover:shadow-sky-500/30' },
        'Red': { color: 'text-red-400', bg: 'bg-red-500', border: 'hover:border-red-400', shadow: 'hover:shadow-red-500/30' },
        'Indigo': { color: 'text-indigo-400', bg: 'bg-indigo-500', border: 'hover:border-indigo-400', shadow: 'hover:shadow-indigo-500/30' },
        'Pink': { color: 'text-pink-400', bg: 'bg-pink-500', border: 'hover:border-pink-400', shadow: 'hover:shadow-pink-500/30' },
        'Teal': { color: 'text-teal-400', bg: 'bg-teal-500', border: 'hover:border-teal-400', shadow: 'hover:shadow-teal-500/30' },
        'Cyan': { color: 'text-cyan-400', bg: 'bg-cyan-500', border: 'hover:border-cyan-400', shadow: 'hover:shadow-cyan-500/30' },
        'Fuchsia': { color: 'text-fuchsia-400', bg: 'bg-fuchsia-500', border: 'hover:border-fuchsia-400', shadow: 'hover:shadow-fuchsia-500/30' },
        'Lime': { color: 'text-lime-400', bg: 'bg-lime-500', border: 'hover:border-lime-400', shadow: 'hover:shadow-lime-500/30' },
        'Orange': { color: 'text-orange-400', bg: 'bg-orange-500', border: 'hover:border-orange-400', shadow: 'hover:shadow-orange-500/30' },
        'Blue': { color: 'text-blue-400', bg: 'bg-blue-500', border: 'hover:border-blue-400', shadow: 'hover:shadow-blue-500/30' },
        'Green': { color: 'text-green-400', bg: 'bg-green-500', border: 'hover:border-green-400', shadow: 'hover:shadow-green-500/30' },
    };

    const getTheme = (themeColor: string, index: number) => {
        return themes[themeColor] || Object.values(themes)[index % Object.values(themes).length];
    };

    // ========== UX Enhancements ==========

    // Popular tags for quick search
    const popularTags = ["เศษส่วน", "ทศนิยม", "สมการ", "พื้นที่", "ปริมาตร", "ร้อยละ", "เปรียบเทียบ", "บวก ลบ คูณ หาร"];

    // Suggested keywords when no results
    const suggestedKeywords = ["จำนวนเต็ม", "อัตราส่วน", "เลขยกกำลัง", "รูปเรขาคณิต", "สถิติ", "ความน่าจะเป็น"];

    // Ref for search input
    const searchInputRef = useRef<HTMLInputElement>(null);
    const firstResultRef = useRef<HTMLAnchorElement>(null);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // ESC = Clear search
            if (e.key === 'Escape') {
                setSearchQuery("");
                searchInputRef.current?.blur();
            }
            // Enter = Focus first result (if in search mode)
            if (e.key === 'Enter' && isSearchMode && searchResults.length > 0) {
                firstResultRef.current?.click();
            }
            // "/" = Focus search bar
            if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSearchMode, searchResults]);

    // Highlight matched text helper
    const highlightText = (text: string, query: string): React.ReactNode => {
        if (!query.trim() || !text) return text;

        const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

        return parts.map((part, i) =>
            part.toLowerCase() === query.toLowerCase()
                ? <mark key={i} className="bg-amber-200 text-amber-900 px-0.5 rounded">{part}</mark>
                : part
        );
    };

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
                <div className="max-w-2xl mx-auto relative group z-20 text-left mb-6">
                    <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                    <div className="relative flex items-center bg-white rounded-2xl shadow-xl border border-slate-100">
                        <div className="pl-6 text-slate-400">
                            <Search className="w-6 h-6" />
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="ค้นหาโจทย์, สูตร, หรือเนื้อหาที่ต้องการ... (กด / เพื่อค้นหา)"
                            className="w-full py-4 px-4 bg-transparent text-lg font-medium text-slate-700 outline-none placeholder:text-slate-300"
                        />
                        {searchQuery ? (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="mr-4 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 text-sm font-bold transition-colors flex items-center gap-1"
                            >
                                <span>ESC</span>
                            </button>
                        ) : (
                            <div className="mr-4 px-2 py-1 bg-slate-50 rounded-lg text-slate-400 text-xs font-mono">
                                /
                            </div>
                        )}
                    </div>
                </div>

                {/* Popular Tags */}
                <div className="max-w-2xl mx-auto mb-8">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span className="text-slate-400 text-sm flex items-center gap-1">
                            <Sparkles size={14} />
                            ค้นหายอดนิยม:
                        </span>
                        {popularTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setSearchQuery(tag)}
                                className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium hover:bg-amber-100 transition-colors border border-amber-100"
                            >
                                {tag}
                            </button>
                        ))}
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

            {/* Main Content */}
            <main className="container mx-auto px-6 max-w-7xl">

                {/* Search Results Mode */}
                {isSearchMode ? (
                    <div className="space-y-6">
                        {/* Search Summary */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                                        <Search size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">
                                            ผลการค้นหา: "{searchQuery}"
                                        </h3>
                                        <p className="text-slate-500 text-sm">
                                            พบ {searchResults.length} ชุดข้อสอบ
                                            {totalQuestionMatches > 0 && `, ${totalQuestionMatches} ข้อที่ตรงกัน`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="text-slate-500 hover:text-slate-700 font-medium text-sm"
                                >
                                    ดูทั้งหมด →
                                </button>
                            </div>
                        </div>

                        {/* Search Results List */}
                        {searchResults.length > 0 ? (
                            <div className="space-y-4">
                                {searchResults.map((result, idx) => {
                                    const theme = getTheme(result.examThemeColor, idx);

                                    return (
                                        <div
                                            key={result.examId}
                                            className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
                                        >
                                            {/* Exam Header */}
                                            <Link
                                                ref={idx === 0 ? firstResultRef : undefined}
                                                href={`/exam/${result.examId}`}
                                                className="flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors"
                                            >
                                                {/* Cover Image or Placeholder */}
                                                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800">
                                                    {result.examCoverImage ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img
                                                            src={result.examCoverImage}
                                                            alt={result.examTitle}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className={`w-full h-full ${theme.bg} flex items-center justify-center text-white text-2xl`}>
                                                            📚
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Exam Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-bold text-slate-800 text-lg truncate">
                                                            {highlightText(result.examTitle, searchQuery)}
                                                        </h4>
                                                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                                            {result.examLevel}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-500 text-sm mt-1">
                                                        {result.questionMatches.length > 0
                                                            ? `พบใน ${result.questionMatches.length} ข้อ`
                                                            : 'พบในชื่อ/คำอธิบาย'}
                                                    </p>
                                                </div>

                                                {/* Arrow */}
                                                <div className={`w-10 h-10 rounded-full ${theme.bg} text-white flex items-center justify-center flex-shrink-0`}>
                                                    <ArrowRight size={18} />
                                                </div>
                                            </Link>

                                            {/* Question Matches (if any) */}
                                            {result.questionMatches.length > 0 && (
                                                <div className="border-t border-slate-100 bg-slate-50 p-4">
                                                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-3">
                                                        <FileText size={14} />
                                                        <span className="font-medium">ข้อที่พบ:</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {result.questionMatches.slice(0, 10).map((match) => (
                                                            <Link
                                                                key={match.index}
                                                                href={`/exam/${result.examId}?q=${match.index - 1}`}
                                                                className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-all text-sm group"
                                                            >
                                                                <span className={`w-6 h-6 rounded-full ${theme.bg} text-white text-xs font-bold flex items-center justify-center`}>
                                                                    {match.index}
                                                                </span>
                                                                <span className="text-slate-600 truncate max-w-[150px] group-hover:text-amber-700">
                                                                    {highlightText(match.preview || `ข้อ ${match.index}`, searchQuery)}
                                                                </span>
                                                            </Link>
                                                        ))}
                                                        {result.questionMatches.length > 10 && (
                                                            <span className="text-slate-400 text-sm px-3 py-2">
                                                                +{result.questionMatches.length - 10} ข้ออื่นๆ
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-white rounded-[3rem] border border-slate-100">
                                <div className="text-5xl mb-4">🔍</div>
                                <h3 className="text-xl font-bold text-slate-600 mb-2">ไม่พบ "{searchQuery}"</h3>
                                <p className="text-slate-400 mb-6">ลองค้นหาด้วยคำอื่นดูนะครับ</p>
                                
                                {/* Suggested Keywords */}
                                <div className="max-w-md mx-auto mb-6">
                                    <div className="flex items-center justify-center gap-2 text-slate-500 text-sm mb-3">
                                        <Lightbulb size={16} />
                                        <span>ลองค้นหาคำเหล่านี้:</span>
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {suggestedKeywords.map(keyword => (
                                            <button
                                                key={keyword}
                                                onClick={() => setSearchQuery(keyword)}
                                                className="px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm font-medium hover:bg-amber-100 transition-colors border border-amber-200"
                                            >
                                                {keyword}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <button
                                    onClick={() => { setSelectedCategory("ทั้งหมด"); setSearchQuery(""); }}
                                    className="px-6 py-2 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                                >
                                    ดูข้อสอบทั้งหมด
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Normal Grid Mode (No Search Query) */
                    filteredExams.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {filteredExams.map((exam, index) => {
                                const theme = getTheme(exam.themeColor, index);
                                const dispTitle = (exam.title || "").replace(/<br\s*\/?>/gi, '\n');

                                return (
                                    <Link
                                        href={`/exam/${exam.id}`}
                                        key={exam.id}
                                        className={`group relative flex flex-col bg-slate-900 rounded-2xl overflow-hidden aspect-[3/4] transition-all duration-500 hover:-translate-y-3 hover:scale-[1.02] border border-transparent ${theme.border} ${theme.shadow} shadow-xl`}
                                    >
                                        {/* Logo Badge */}
                                        <div className="absolute top-4 left-4 z-30 drop-shadow-lg opacity-80 group-hover:opacity-100 transition-opacity">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src="/logo.png"
                                                alt="Math School Logo"
                                                className="w-10 h-10 object-contain filter drop-shadow-md"
                                            />
                                        </div>

                                        {/* Cover Image */}
                                        <div className="absolute inset-0 z-0 bg-slate-800 overflow-hidden">
                                            {exam.coverImage ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img
                                                    src={exam.coverImage}
                                                    alt={exam.title}
                                                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:blur-sm"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-slate-800 flex items-center justify-center p-6 text-center transition-all duration-700 group-hover:scale-110 group-hover:blur-sm">
                                                    <div className="text-6xl mb-4 opacity-30 grayscale group-hover:grayscale-0 transition-all duration-500">📚</div>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-90 group-hover:opacity-0 transition-opacity duration-500"></div>
                                        </div>

                                        {/* Glassmorphism Overlay */}
                                        <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-500"></div>

                                        {/* Content */}
                                        <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex flex-col justify-end h-full">
                                            <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75 mb-auto pt-16 opacity-0 group-hover:opacity-100">
                                                <span className="text-xs font-black px-3 py-1 rounded-full bg-white text-slate-900 uppercase tracking-widest shadow-lg">
                                                    {exam.level}
                                                </span>
                                            </div>

                                            <div className="transform translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                                                <div className="mb-3 opacity-100 group-hover:opacity-0 transition-opacity duration-300 absolute -top-8 left-0">
                                                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider border border-slate-600 px-2 py-0.5 rounded">
                                                        {exam.level}
                                                    </span>
                                                </div>

                                                <h3 className={`font-black text-4xl md:text-5xl leading-[0.9] mb-4 line-clamp-3 ${theme.color} drop-shadow-2xl tracking-tighter transition-colors duration-300 whitespace-pre-line`}>
                                                    {dispTitle}
                                                </h3>

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
                            <div className="text-4xl mb-4 opacity-50">📚</div>
                            <h3 className="text-xl font-bold text-slate-600">ไม่พบข้อสอบในหมวดนี้</h3>
                            <button
                                onClick={() => setSelectedCategory("ทั้งหมด")}
                                className="mt-6 px-6 py-2 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                            >
                                ดูทั้งหมด
                            </button>
                        </div>
                    )
                )}
            </main>
        </div>
    );
}
