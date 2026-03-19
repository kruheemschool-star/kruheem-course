"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ChevronRight, ArrowRight, FileText, Hash, Sparkles, Lightbulb, Loader2, SlidersHorizontal, X, ArrowUpDown, ChevronDown, Tag, Zap, BookOpen, BarChart3 } from "lucide-react";

interface ExamListClientProps {
    initialExams: any[];
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

export default function ExamListClient({ initialExams }: ExamListClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");

    // Advanced Filters
    const [showFilters, setShowFilters] = useState(false);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ทั้งหมด");
    const [selectedLevel, setSelectedLevel] = useState<string>("ทั้งหมด");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<string>("default");
    const [showFreeOnly, setShowFreeOnly] = useState(false);

    // Lazy load search state
    const [searchData, setSearchData] = useState<any[] | null>(null);
    const [isLoadingSearch, setIsLoadingSearch] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);

    const categories = ["ทั้งหมด", "ประถม", "ม.ต้น", "ม.ปลาย", "สอบเข้า"];
    const difficulties = ["ทั้งหมด", "Easy", "Medium", "Hard"];
    const difficultyLabels: Record<string, string> = { "ทั้งหมด": "ทั้งหมด", "Easy": "ง่าย", "Medium": "ปานกลาง", "Hard": "ยาก" };
    const difficultyColors: Record<string, string> = { "Easy": "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-800", "Medium": "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800", "Hard": "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-900/30 dark:border-rose-800" };
    const sortOptions = [
        { value: "default", label: "ค่าเริ่มต้น" },
        { value: "newest", label: "ใหม่ล่าสุด" },
        { value: "oldest", label: "เก่าสุด" },
        { value: "most-questions", label: "ข้อมากสุด" },
        { value: "least-questions", label: "ข้อน้อยสุด" },
        { value: "name-asc", label: "ชื่อ ก-ฮ" },
    ];

    // Extract unique levels and tags from exams for filter options
    const availableLevels = useMemo(() => {
        const levels = [...new Set(initialExams.map(e => e.level).filter(Boolean))];
        return ["ทั้งหมด", ...levels.sort()];
    }, [initialExams]);

    const availableTags = useMemo(() => {
        const tagSet = new Set<string>();
        initialExams.forEach(e => {
            (e.tags || []).forEach((t: string) => tagSet.add(t));
        });
        return [...tagSet].sort();
    }, [initialExams]);

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedDifficulty !== "ทั้งหมด") count++;
        if (selectedLevel !== "ทั้งหมด") count++;
        if (selectedTags.length > 0) count++;
        if (showFreeOnly) count++;
        if (sortBy !== "default") count++;
        return count;
    }, [selectedDifficulty, selectedLevel, selectedTags, showFreeOnly, sortBy]);

    const clearAllFilters = () => {
        setSelectedCategory("ทั้งหมด");
        setSelectedDifficulty("ทั้งหมด");
        setSelectedLevel("ทั้งหมด");
        setSelectedTags([]);
        setSortBy("default");
        setShowFreeOnly(false);
    };

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

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
        if (searchQuery.trim()) return []; // Use searchResults instead

        let result = initialExams;

        // Filter by Category
        if (selectedCategory !== "ทั้งหมด") {
            result = result.filter(exam => exam.category === selectedCategory);
        }

        // Filter by Difficulty
        if (selectedDifficulty !== "ทั้งหมด") {
            result = result.filter(exam => exam.difficulty === selectedDifficulty);
        }

        // Filter by Level
        if (selectedLevel !== "ทั้งหมด") {
            result = result.filter(exam => exam.level === selectedLevel);
        }

        // Filter by Tags (exam must have ALL selected tags)
        if (selectedTags.length > 0) {
            result = result.filter(exam =>
                selectedTags.every(tag => (exam.tags || []).includes(tag))
            );
        }

        // Filter free only
        if (showFreeOnly) {
            result = result.filter(exam => exam.isFree);
        }

        // Sort
        if (sortBy !== "default") {
            result = [...result].sort((a, b) => {
                switch (sortBy) {
                    case "newest":
                        return (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                    case "oldest":
                        return (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                    case "most-questions":
                        return (b.questionCount || 0) - (a.questionCount || 0);
                    case "least-questions":
                        return (a.questionCount || 0) - (b.questionCount || 0);
                    case "name-asc":
                        return (a.title || "").localeCompare(b.title || "", "th");
                    default:
                        return 0;
                }
            });
        }

        return result;
    }, [initialExams, selectedCategory, selectedDifficulty, selectedLevel, selectedTags, showFreeOnly, sortBy, searchQuery]);

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
        <div className="bg-white dark:bg-slate-950 relative z-10 pb-12 transition-colors">
            {/* Search & Filter Section */}
            <div className="px-6 py-8 relative">
                <div className="max-w-4xl mx-auto text-center mb-8">
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center justify-center gap-2">
                        <span className="text-amber-600 dark:text-amber-400">คลังข้อสอบ</span> ออนไลน์ 📚
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">ค้นหาข้อสอบที่ต้องการฝึกฝน หรือเลือกตามหมวดหมู่ด้านล่าง</p>
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

                {/* Popular Tags */}
                <div className="max-w-2xl mx-auto mb-8">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span className="text-slate-400 dark:text-slate-500 text-sm flex items-center gap-1">
                            <Sparkles size={14} />
                            ค้นหายอดนิยม:
                        </span>
                        {popularTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setSearchQuery(tag)}
                                className="px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors border border-amber-100 dark:border-amber-800"
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Category + Advanced Filter Row */}
                <div className="flex flex-wrap items-center gap-2 mb-4 justify-center">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 border-2 ${selectedCategory === cat
                                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-lg scale-105'
                                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}

                    {/* Filter Toggle Button */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 border-2 flex items-center gap-1.5 ${
                            showFilters || activeFilterCount > 0
                                ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 shadow-lg shadow-indigo-500/20'
                                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400'
                        }`}
                    >
                        <SlidersHorizontal size={14} />
                        ตัวกรอง
                        {activeFilterCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-white text-indigo-600 text-xs font-black flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Advanced Filter Panel */}
                {showFilters && (
                    <div className="max-w-4xl mx-auto mb-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden animate-in slide-in-from-top-2 duration-300">
                        <div className="p-5 space-y-5">
                            {/* Row 1: Difficulty + Level + Sort */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Difficulty */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Zap size={12} /> ระดับความยาก
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {difficulties.map(d => (
                                            <button
                                                key={d}
                                                onClick={() => setSelectedDifficulty(d)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                    selectedDifficulty === d
                                                        ? d === "ทั้งหมด" ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100' : (difficultyColors[d] || '') + ' border-current font-black ring-1 ring-current'
                                                        : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                                                }`}
                                            >
                                                {difficultyLabels[d] || d}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Level */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <BookOpen size={12} /> ระดับชั้น
                                    </label>
                                    <select
                                        value={selectedLevel}
                                        onChange={(e) => setSelectedLevel(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                                    >
                                        {availableLevels.map(level => (
                                            <option key={level} value={level}>{level}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Sort */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <ArrowUpDown size={12} /> เรียงตาม
                                    </label>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                                    >
                                        {sortOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Row 2: Free Only Toggle */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowFreeOnly(!showFreeOnly)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border flex items-center gap-2 ${
                                        showFreeOnly
                                            ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-300 dark:border-teal-700 ring-1 ring-teal-300 dark:ring-teal-700'
                                            : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    {showFreeOnly ? '🔓' : '🔒'}
                                    เฉพาะข้อสอบฟรี
                                </button>
                            </div>

                            {/* Row 3: Tags */}
                            {availableTags.length > 0 && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Tag size={12} /> กรองตามหัวข้อ (เลือกได้หลายรายการ)
                                    </label>
                                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                        {availableTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => toggleTag(tag)}
                                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                                                    selectedTags.includes(tag)
                                                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 ring-1 ring-indigo-300 dark:ring-indigo-700'
                                                        : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                                                }`}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Active Filters Summary + Clear */}
                            {activeFilterCount > 0 && (
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">ตัวกรองที่ใช้:</span>
                                        {selectedDifficulty !== "ทั้งหมด" && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300">
                                                {difficultyLabels[selectedDifficulty]}
                                                <button onClick={() => setSelectedDifficulty("ทั้งหมด")} className="hover:text-rose-500"><X size={12} /></button>
                                            </span>
                                        )}
                                        {selectedLevel !== "ทั้งหมด" && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300">
                                                {selectedLevel}
                                                <button onClick={() => setSelectedLevel("ทั้งหมด")} className="hover:text-rose-500"><X size={12} /></button>
                                            </span>
                                        )}
                                        {selectedTags.map(tag => (
                                            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                {tag}
                                                <button onClick={() => toggleTag(tag)} className="hover:text-rose-500"><X size={12} /></button>
                                            </span>
                                        ))}
                                        {showFreeOnly && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 dark:bg-teal-900/30 rounded-full text-xs font-bold text-teal-600 dark:text-teal-400">
                                                ฟรีเท่านั้น
                                                <button onClick={() => setShowFreeOnly(false)} className="hover:text-rose-500"><X size={12} /></button>
                                            </span>
                                        )}
                                        {sortBy !== "default" && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300">
                                                {sortOptions.find(o => o.value === sortBy)?.label}
                                                <button onClick={() => setSortBy("default")} className="hover:text-rose-500"><X size={12} /></button>
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={clearAllFilters}
                                        className="text-xs font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors flex items-center gap-1"
                                    >
                                        <X size={14} />
                                        ล้างทั้งหมด
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Results count */}
                {!isSearchMode && (activeFilterCount > 0 || selectedCategory !== "ทั้งหมด") && (
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
