"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ChevronRight, ArrowRight, FileText, Hash, Sparkles, Lightbulb, Loader2, SlidersHorizontal, X, ArrowUpDown, ChevronDown, Tag, Zap, BookOpen, BarChart3, Heart, Users, Flame, LibraryBig, ClipboardList } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useBookmarks } from "@/hooks/useBookmarks";

interface ExamListClientProps {
    initialExams: any[];
    enrollmentCount?: number;
}

interface SearchMatch {
    examId: string;
    examTitle: string;
    examLevel: string;
    examCoverImage: string;
    examThemeColor: string;
    isFree: boolean;
    questionMatches: { index: number; preview: string }[];
}

export default function ExamListClient({ initialExams, enrollmentCount = 0 }: ExamListClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");

    // Bookmarks
    const { bookmarkedIds, isBookmarked, toggleBookmark, isLoggedIn } = useBookmarks();

    // Stats
    const [activeUsers, setActiveUsers] = useState(0);
    const totalExamSets = initialExams.length;
    const totalQuestions = useMemo(() => initialExams.reduce((sum: number, e: any) => sum + (e.questionCount || 0), 0), [initialExams]);

    // Fetch active users count (client-side, real-time feel)
    useEffect(() => {
        const fetchActiveUsers = async () => {
            try {
                const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
                const snap = await getDocs(query(collection(db, "users"), where("lastActive", ">", tenMinutesAgo)));
                setActiveUsers(snap.size);
            } catch { setActiveUsers(0); }
        };
        fetchActiveUsers();
        const interval = setInterval(fetchActiveUsers, 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Lazy load search state
    const [searchData, setSearchData] = useState<any[] | null>(null);
    const [isLoadingSearch, setIsLoadingSearch] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);

    const [categories, setCategories] = useState<string[]>(["ทั้งหมด"]);

    // Fetch categories from Firestore
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const snap = await getDocs(collection(db, "examCategories"));
                const cats = snap.docs.map(d => d.data().name as string);
                cats.sort();
                setCategories(["ทั้งหมด", ...cats]);
            } catch (e) {
                console.error('Error fetching categories:', e);
                setCategories(["ทั้งหมด", "ประถม", "ม.ต้น", "ม.ปลาย", "สอบเข้า"]);
            }
        };
        fetchCategories();
    }, []);


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

    // Lazy load questions data when user starts searching
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        // Debounce: wait 300ms before fetching
        const timeout = setTimeout(async () => {
            // If we haven't loaded search data yet, fetch it
            if (!searchData) {
                setIsLoadingSearch(true);
                try {
                    const res = await fetch('/api/exam-search');
                    const data = await res.json();
                    setSearchData(data.exams || []);
                    // Perform search after loading
                    performSearch(data.exams || [], searchQuery, selectedCategory);
                } catch (error) {
                    console.error('Error loading search data:', error);
                    // Fallback: search in initialExams (metadata only)
                    performSearch(initialExams, searchQuery, selectedCategory);
                } finally {
                    setIsLoadingSearch(false);
                }
            } else {
                // Already have data, just search
                performSearch(searchData, searchQuery, selectedCategory);
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery, selectedCategory, searchData, initialExams]);

    // Perform search on data
    const performSearch = (exams: any[], query: string, category: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        const queryLower = query.toLowerCase().trim();
        const results: SearchMatch[] = [];

        exams.forEach(exam => {
            // Filter by category
            if (category !== "ทั้งหมด" && exam.category !== category) {
                return;
            }

            const questionMatches: { index: number; preview: string }[] = [];

            // Search in exam title and description
            const titleMatch = String(exam.title || "").toLowerCase().includes(queryLower);
            const descMatch = String(exam.description || "").toLowerCase().includes(queryLower);
            const tagsMatch = (exam.tags || []).some((t: string) =>
                String(t).toLowerCase().includes(queryLower)
            );

            // Search in each question (if available)
            if (exam.questions && Array.isArray(exam.questions)) {
                exam.questions.forEach((q: any) => {
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
                        let preview = cleanText(q.question || "");
                        if (!preview) preview = cleanText((q.options || [])[0] || "");
                        questionMatches.push({ index: q.index || questionMatches.length + 1, preview });
                    }
                });
            }

            if (titleMatch || descMatch || tagsMatch || questionMatches.length > 0) {
                results.push({
                    examId: exam.id,
                    examTitle: exam.title,
                    examLevel: exam.level,
                    examCoverImage: exam.coverImage,
                    examThemeColor: exam.themeColor,
                    isFree: exam.isFree || false,
                    questionMatches
                });
            }
        });

        setSearchResults(results);
    };

    // Regular filtering for non-search mode
    const filteredExams = useMemo(() => {
        if (selectedCategory === "ทั้งหมด") {
            return initialExams;
        }
        return initialExams.filter(e => e.category === selectedCategory);
    }, [initialExams, selectedCategory]);

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
        <div className="bg-white dark:bg-slate-950 relative z-10 pb-12 transition-colors">
            {/* Search & Filter Section */}
            <div className="px-6 py-8 relative">
                <div className="max-w-4xl mx-auto text-center mb-8">
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center justify-center gap-2">
                        <span className="text-amber-600 dark:text-amber-400">คลังข้อสอบ</span> ออนไลน์ 📚
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">ค้นหาข้อสอบที่ต้องการฝึกฝน หรือเลือกตามหมวดหมู่ด้านล่าง</p>
                    {isLoggedIn && (
                        <Link
                            href="/exam/dashboard"
                            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all duration-300"
                        >
                            <BarChart3 size={18} />
                            ดูสถิติของฉัน
                        </Link>
                    )}

                    {/* Stats Banner */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 max-w-4xl mx-auto">
                        {/* Card 1: ชุดข้อสอบพร้อมฝึก - Indigo glow */}
                        <div className="group bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-5 py-5 text-center transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-800/50 cursor-default">
                            <span className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{totalExamSets}</span>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium">ชุดข้อสอบพร้อมฝึก</p>
                        </div>
                        {/* Card 2: โจทย์ให้ตะลุย - Amber glow */}
                        <div className="group bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-5 py-5 text-center transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/10 hover:border-amber-200 dark:hover:border-amber-800/50 cursor-default">
                            <span className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">{totalQuestions.toLocaleString()}<span className="text-amber-500">+</span></span>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium">โจทย์ให้ตะลุย</p>
                        </div>
                        {/* Card 3: คนที่เรียนคอร์สนี้แล้ว - Emerald glow */}
                        <div className="group bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-5 py-5 text-center transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-200 dark:hover:border-emerald-800/50 cursor-default">
                            <span className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{enrollmentCount > 0 ? enrollmentCount.toLocaleString() : '—'}<span className="text-amber-500">+</span></span>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium">คนที่เรียนคอร์สนี้แล้ว</p>
                        </div>
                        {/* Card 4: กำลังลุยข้อสอบอยู่ตอนนี้ - Rose glow */}
                        <div className="group bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-5 py-5 text-center transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:shadow-rose-500/10 hover:border-rose-200 dark:hover:border-rose-800/50 cursor-default">
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 transition-colors group-hover:text-rose-600 dark:group-hover:text-rose-400">{activeUsers}</span>
                                {activeUsers > 0 && (
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium">กำลังลุยข้อสอบอยู่ตอนนี้</p>
                        </div>
                    </div>
                </div>

                {/* Grand Search Bar */}
                <div className="max-w-2xl mx-auto relative group z-20 text-left mb-6">
                    <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                    <div className="relative flex items-center bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700">
                        <div className="pl-6 text-slate-400 dark:text-slate-500">
                            <Search className="w-6 h-6" />
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="ค้นหาโจทย์, สูตร, หรือเนื้อหาที่ต้องการ... (กด / เพื่อค้นหา)"
                            className="w-full py-4 px-4 bg-transparent text-lg font-medium text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-500"
                        />
                        {searchQuery ? (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="mr-4 px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-500 dark:text-slate-300 text-sm font-bold transition-colors flex items-center gap-1"
                            >
                                <span>ESC</span>
                            </button>
                        ) : (
                            <div className="mr-4 px-2 py-1 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500 text-xs font-mono">
                                /
                            </div>
                        )}
                    </div>
                </div>

                {/* Category Tags - Simple Style */}
                <div className="max-w-3xl mx-auto mb-8">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span className="text-slate-400 dark:text-slate-500 text-sm flex items-center gap-1">
                            <BookOpen size={14} />
                            หมวดหมู่:
                        </span>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                                    selectedCategory === cat
                                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 font-bold shadow-md'
                                        : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Results count */}
                {!isSearchMode && selectedCategory !== "ทั้งหมด" && (
                    <div className="max-w-4xl mx-auto mb-4 text-center">
                        <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                            พบ {filteredExams.length} ชุดข้อสอบ {initialExams.length > filteredExams.length && <span className="text-slate-300 dark:text-slate-600">(from {initialExams.length})</span>}
                        </p>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <main className="container mx-auto px-6 max-w-7xl">

                {/* Search Results Mode */}
                {isSearchMode ? (
                    <div className="space-y-6">
                        {/* Search Summary */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                                        {isLoadingSearch ? (
                                            <Loader2 size={24} className="animate-spin" />
                                        ) : (
                                            <Search size={24} />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100">
                                            {isLoadingSearch ? 'กำลังค้นหา...' : `ผลการค้นหา: "${searchQuery}"`}
                                        </h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                                            {isLoadingSearch ? 'กำลังโหลดข้อมูลข้อสอบ...' : `พบ ${searchResults.length} ชุดข้อสอบ`}
                                            {totalQuestionMatches > 0 && `, ${totalQuestionMatches} ข้อที่ตรงกัน`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium text-sm"
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
                                            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
                                        >
                                            {/* Exam Header */}
                                            <Link
                                                ref={idx === 0 ? firstResultRef : undefined}
                                                href={`/exam/${result.examId}`}
                                                className="flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                            >
                                                {/* Cover Image or Placeholder */}
                                                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800">
                                                    {result.examCoverImage ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <Image
                                                            src={result.examCoverImage}
                                                            alt={result.examTitle}
                                                            fill
                                                            sizes="64px"
                                                            className="object-cover"
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
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg truncate">
                                                            {highlightText(result.examTitle, searchQuery)}
                                                        </h4>
                                                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                                            {result.examLevel}
                                                        </span>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${result.isFree ? 'text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-900/30' : 'text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800'}`}>
                                                            {result.isFree ? '🔓 เปิดให้ทำฟรี' : '🔒 เฉพาะสมาชิก'}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
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
                                                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
                                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-3">
                                                        <FileText size={14} />
                                                        <span className="font-medium">ข้อที่พบ:</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {result.questionMatches.slice(0, 10).map((match) => (
                                                            <Link
                                                                key={match.index}
                                                                href={`/exam/${result.examId}?q=${match.index - 1}`}
                                                                className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-all text-sm group"
                                                            >
                                                                <span className={`w-6 h-6 rounded-full ${theme.bg} text-white text-xs font-bold flex items-center justify-center`}>
                                                                    {match.index}
                                                                </span>
                                                                <span className="text-slate-600 dark:text-slate-300 truncate max-w-[150px] group-hover:text-amber-700 dark:group-hover:text-amber-400">
                                                                    {highlightText(match.preview || `ข้อ ${match.index}`, searchQuery)}
                                                                </span>
                                                            </Link>
                                                        ))}
                                                        {result.questionMatches.length > 10 && (
                                                            <span className="text-slate-400 dark:text-slate-500 text-sm px-3 py-2">
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
                            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700">
                                <div className="text-5xl mb-4">🔍</div>
                                <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-2">ไม่พบ "{searchQuery}"</h3>
                                <p className="text-slate-400 dark:text-slate-500 mb-6">ลองค้นหาด้วยคำอื่นดูนะครับ</p>

                                {/* Suggested Keywords */}
                                <div className="max-w-md mx-auto mb-6">
                                    <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-3">
                                        <Lightbulb size={16} />
                                        <span>ลองค้นหาคำเหล่านี้:</span>
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {suggestedKeywords.map(keyword => (
                                            <button
                                                key={keyword}
                                                onClick={() => setSearchQuery(keyword)}
                                                className="px-4 py-2 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors border border-amber-200 dark:border-amber-800"
                                            >
                                                {keyword}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => { setSelectedCategory("ทั้งหมด"); setSearchQuery(""); }}
                                    className="px-6 py-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
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
                                            <Image
                                                src="/logo.png"
                                                alt="Math School Logo"
                                                width={40}
                                                height={40}
                                                className="w-10 h-10 object-contain filter drop-shadow-md"
                                            />
                                        </div>

                                        {/* FREEMIUM Badge */}
                                        {exam.isFree && (
                                            <div className="absolute top-4 right-16 z-30 animate-pulse">
                                                <div className="px-3 py-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-amber-500/50 tracking-wider">
                                                    FREEMIUM
                                                </div>
                                            </div>
                                        )}

                                        {/* Bookmark Button */}
                                        {isLoggedIn && (
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark(exam.id); }}
                                                className={`absolute top-4 right-4 z-30 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-sm ${
                                                    isBookmarked(exam.id)
                                                        ? 'bg-rose-500/90 text-white shadow-lg shadow-rose-500/30 scale-110'
                                                        : 'bg-black/30 text-white/70 hover:bg-black/50 hover:text-white opacity-0 group-hover:opacity-100'
                                                }`}
                                                title={isBookmarked(exam.id) ? 'ยกเลิกบันทึก' : 'บันทึกข้อสอบนี้'}
                                            >
                                                <Heart size={18} className={isBookmarked(exam.id) ? 'fill-current' : ''} />
                                            </button>
                                        )}

                                        {/* Cover Image */}
                                        <div className="absolute inset-0 z-0 bg-slate-800 overflow-hidden">
                                            {exam.coverImage ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <Image
                                                    src={exam.coverImage}
                                                    alt={exam.title}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                                                    className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:blur-sm"
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
                                            <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75 mb-auto pt-16 opacity-0 group-hover:opacity-100 flex gap-2 items-center flex-wrap">
                                                <span className="text-xs font-black px-3 py-1 rounded-full bg-white text-slate-900 uppercase tracking-widest shadow-lg">
                                                    {exam.level}
                                                </span>
                                                <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg ${exam.isFree ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-300 border border-slate-600'}`}>
                                                    {exam.isFree ? '🔓 ดูฟรี' : '🔒 สมาชิก'}
                                                </span>
                                            </div>

                                            <div className="transform translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                                                <div className="mb-3 opacity-100 group-hover:opacity-0 transition-opacity duration-300 absolute -top-8 left-0 flex gap-2 items-center flex-wrap">
                                                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider border border-slate-600 px-2 py-0.5 rounded">
                                                        {exam.level}
                                                    </span>
                                                    <span className={`text-xs font-bold uppercase tracking-wider border px-2 py-0.5 rounded ${exam.isFree ? 'text-teal-300 border-teal-600/50 bg-teal-900/30' : 'text-slate-400 border-slate-700 bg-slate-800/50'}`}>
                                                        {exam.isFree ? '🔓 ดูฟรี' : '🔒 สมาชิก'}
                                                    </span>
                                                </div>

                                                <h3 className={`font-black text-2xl md:text-3xl leading-[1.1] mb-3 line-clamp-3 ${theme.color} drop-shadow-2xl tracking-tight transition-colors duration-300 whitespace-pre-line`}>
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
