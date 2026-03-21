"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Search, Heart, SlidersHorizontal, X } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";

interface ExamCategoryPageProps {
    examType: string;
    title: string;
    description: string;
    icon: string;
    themeColor: string;
    initialExams: any[];
}

export default function ExamCategoryPage({
    examType,
    title,
    description,
    icon,
    themeColor,
    initialExams,
}: ExamCategoryPageProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLevel, setSelectedLevel] = useState("ทั้งหมด");
    const [selectedDifficulty, setSelectedDifficulty] = useState("ทั้งหมด");

    const { bookmarkedIds, isBookmarked, toggleBookmark, isLoggedIn } = useBookmarks();

    const themeMap: Record<string, { bg: string; text: string; border: string; gradientFrom: string; gradientTo: string; light: string }> = {
        indigo: { bg: "bg-indigo-600", text: "text-indigo-600", border: "border-indigo-200", gradientFrom: "from-indigo-600", gradientTo: "to-indigo-800", light: "bg-indigo-50" },
        emerald: { bg: "bg-emerald-600", text: "text-emerald-600", border: "border-emerald-200", gradientFrom: "from-emerald-600", gradientTo: "to-emerald-800", light: "bg-emerald-50" },
        violet: { bg: "bg-violet-600", text: "text-violet-600", border: "border-violet-200", gradientFrom: "from-violet-600", gradientTo: "to-violet-800", light: "bg-violet-50" },
        teal: { bg: "bg-teal-600", text: "text-teal-600", border: "border-teal-200", gradientFrom: "from-teal-600", gradientTo: "to-teal-800", light: "bg-teal-50" },
    };
    const theme = themeMap[themeColor] || themeMap.indigo;

    // Card theme colors
    const cardThemes: Record<string, { color: string; bg: string; border: string; shadow: string }> = {
        'Amber': { color: 'text-amber-400', bg: 'bg-amber-500', border: 'hover:border-amber-400', shadow: 'hover:shadow-amber-500/30' },
        'Rose': { color: 'text-rose-400', bg: 'bg-rose-500', border: 'hover:border-rose-400', shadow: 'hover:shadow-rose-500/30' },
        'Violet': { color: 'text-violet-400', bg: 'bg-violet-500', border: 'hover:border-violet-400', shadow: 'hover:shadow-violet-500/30' },
        'Emerald': { color: 'text-emerald-400', bg: 'bg-emerald-500', border: 'hover:border-emerald-400', shadow: 'hover:shadow-emerald-500/30' },
        'Sky': { color: 'text-sky-400', bg: 'bg-sky-500', border: 'hover:border-sky-400', shadow: 'hover:shadow-sky-500/30' },
        'Indigo': { color: 'text-indigo-400', bg: 'bg-indigo-500', border: 'hover:border-indigo-400', shadow: 'hover:shadow-indigo-500/30' },
        'Blue': { color: 'text-blue-400', bg: 'bg-blue-500', border: 'hover:border-blue-400', shadow: 'hover:shadow-blue-500/30' },
        'Teal': { color: 'text-teal-400', bg: 'bg-teal-500', border: 'hover:border-teal-400', shadow: 'hover:shadow-teal-500/30' },
        'Orange': { color: 'text-orange-400', bg: 'bg-orange-500', border: 'hover:border-orange-400', shadow: 'hover:shadow-orange-500/30' },
        'Red': { color: 'text-red-400', bg: 'bg-red-500', border: 'hover:border-red-400', shadow: 'hover:shadow-red-500/30' },
        'Pink': { color: 'text-pink-400', bg: 'bg-pink-500', border: 'hover:border-pink-400', shadow: 'hover:shadow-pink-500/30' },
        'Cyan': { color: 'text-cyan-400', bg: 'bg-cyan-500', border: 'hover:border-cyan-400', shadow: 'hover:shadow-cyan-500/30' },
        'Fuchsia': { color: 'text-fuchsia-400', bg: 'bg-fuchsia-500', border: 'hover:border-fuchsia-400', shadow: 'hover:shadow-fuchsia-500/30' },
        'Lime': { color: 'text-lime-400', bg: 'bg-lime-500', border: 'hover:border-lime-400', shadow: 'hover:shadow-lime-500/30' },
        'Green': { color: 'text-green-400', bg: 'bg-green-500', border: 'hover:border-green-400', shadow: 'hover:shadow-green-500/30' },
    };
    const getCardTheme = (color: string, idx: number) => cardThemes[color] || Object.values(cardThemes)[idx % Object.values(cardThemes).length];

    const availableLevels = useMemo(() => {
        const levels = [...new Set(initialExams.map(e => e.level).filter(Boolean))];
        return ["ทั้งหมด", ...levels.sort()];
    }, [initialExams]);

    const filteredExams = useMemo(() => {
        let result = initialExams;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(exam =>
                (exam.title || "").toLowerCase().includes(q) ||
                (exam.description || "").toLowerCase().includes(q)
            );
        }

        if (selectedLevel !== "ทั้งหมด") {
            result = result.filter(exam => exam.level === selectedLevel);
        }

        if (selectedDifficulty !== "ทั้งหมด") {
            result = result.filter(exam => exam.difficulty === selectedDifficulty);
        }

        return result;
    }, [initialExams, searchQuery, selectedLevel, selectedDifficulty]);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950">
            {/* Hero Header */}
            <div className={`bg-gradient-to-br ${theme.gradientFrom} ${theme.gradientTo} text-white`}>
                <div className="container mx-auto px-6 py-12 max-w-7xl">
                    {/* Breadcrumb */}
                    <Link
                        href="/exam"
                        className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium mb-6 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        คลังข้อสอบทั้งหมด
                    </Link>

                    <div className="flex items-center gap-4 mb-4">
                        <span className="text-5xl">{icon}</span>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight">{title}</h1>
                            <p className="text-white/80 text-lg mt-1">{description}</p>
                        </div>
                    </div>

                    <p className="text-white/60 text-sm">
                        {filteredExams.length} ชุดข้อสอบ {filteredExams.length !== initialExams.length && `(จาก ${initialExams.length})`}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="container mx-auto px-6 max-w-7xl -mt-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 p-5">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="ค้นหาข้อสอบ..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                            />
                        </div>

                        {/* Level Filter */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {availableLevels.map(level => (
                                <button
                                    key={level}
                                    onClick={() => setSelectedLevel(level)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                                        selectedLevel === level
                                            ? `${theme.bg} text-white border-transparent shadow-lg`
                                            : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>

                        {/* Difficulty */}
                        <select
                            value={selectedDifficulty}
                            onChange={(e) => setSelectedDifficulty(e.target.value)}
                            className="px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold outline-none"
                        >
                            <option value="ทั้งหมด">ทุกระดับ</option>
                            <option value="Easy">ง่าย</option>
                            <option value="Medium">ปานกลาง</option>
                            <option value="Hard">ยาก</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Exam Grid */}
            <div className="container mx-auto px-6 max-w-7xl py-10">
                {filteredExams.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredExams.map((exam, index) => {
                            const ct = getCardTheme(exam.themeColor, index);
                            const dispTitle = (exam.title || "").replace(/<br\s*\/?>/gi, '\n');

                            return (
                                <Link
                                    href={`/exam/${exam.id}`}
                                    key={exam.id}
                                    className={`group relative flex flex-col bg-slate-900 rounded-2xl overflow-hidden aspect-[3/4] transition-all duration-500 hover:-translate-y-3 hover:scale-[1.02] border border-transparent ${ct.border} ${ct.shadow} shadow-xl`}
                                >
                                    {/* Logo */}
                                    <div className="absolute top-4 left-4 z-30 drop-shadow-lg opacity-80 group-hover:opacity-100 transition-opacity">
                                        <Image src="/logo.png" alt="Logo" width={40} height={40} className="w-10 h-10 object-contain filter drop-shadow-md" />
                                    </div>

                                    {/* Bookmark */}
                                    {isLoggedIn && (
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark(exam.id); }}
                                            className={`absolute top-4 right-4 z-30 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-sm ${
                                                isBookmarked(exam.id)
                                                    ? 'bg-rose-500/90 text-white shadow-lg shadow-rose-500/30 scale-110'
                                                    : 'bg-black/30 text-white/70 hover:bg-black/50 hover:text-white opacity-0 group-hover:opacity-100'
                                            }`}
                                        >
                                            <Heart size={18} className={isBookmarked(exam.id) ? 'fill-current' : ''} />
                                        </button>
                                    )}

                                    {/* Cover Image */}
                                    <div className="absolute inset-0 z-0 bg-slate-800 overflow-hidden">
                                        {exam.coverImage ? (
                                            <Image src={exam.coverImage} alt={exam.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw" className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:blur-sm" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-800 flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:blur-sm">
                                                <div className="text-6xl opacity-30">📚</div>
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
                                                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider border border-slate-600 px-2 py-0.5 rounded">{exam.level}</span>
                                                <span className={`text-xs font-bold uppercase tracking-wider border px-2 py-0.5 rounded ${exam.isFree ? 'text-teal-300 border-teal-600/50 bg-teal-900/30' : 'text-slate-400 border-slate-700 bg-slate-800/50'}`}>
                                                    {exam.isFree ? '🔓 ดูฟรี' : '🔒 สมาชิก'}
                                                </span>
                                            </div>

                                            <h3 className={`font-black text-2xl md:text-3xl leading-[1.1] mb-3 line-clamp-3 ${ct.color} drop-shadow-2xl tracking-tight whitespace-pre-line`}>
                                                {dispTitle}
                                            </h3>

                                            <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500 ease-out">
                                                <div className="overflow-hidden">
                                                    <p className="text-base text-slate-100/90 font-medium leading-relaxed mb-5 line-clamp-3 drop-shadow-md">
                                                        {exam.description}
                                                    </p>
                                                    <div className={`flex items-center gap-3 text-base font-bold ${ct.color}`}>
                                                        <span>เริ่มทำข้อสอบ</span>
                                                        <div className={`w-8 h-8 rounded-full ${ct.bg} text-white flex items-center justify-center shadow-lg`}>
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
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                        <div className="text-5xl mb-4">📚</div>
                        <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-2">ไม่พบข้อสอบในหมวดนี้</h3>
                        <p className="text-slate-400 mb-6">ลองเปลี่ยนตัวกรองหรือค้นหาด้วยคำอื่น</p>
                        <Link href="/exam" className="px-6 py-2.5 rounded-full bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors inline-block">
                            กลับหน้าคลังข้อสอบ
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
