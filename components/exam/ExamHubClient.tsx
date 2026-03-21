"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight, Heart, BarChart3, Play } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";

interface ExamHubClientProps {
    featuredExams: any[];
    groupedExams: Record<string, any[]>;
    totalExams: number;
}

const categoryConfig = [
    { key: "entrance", title: "ข้อสอบเข้า", icon: "🏫", href: "/exam/entrance", accent: "text-indigo-600", accentBg: "bg-indigo-50", accentBorder: "border-indigo-100" },
    { key: "practice", title: "แบบฝึกหัด", icon: "📝", href: "/exam/practice", accent: "text-emerald-600", accentBg: "bg-emerald-50", accentBorder: "border-emerald-100" },
    { key: "chapter", title: "แนวข้อสอบรายบท", icon: "📖", href: "/exam/chapter", accent: "text-violet-600", accentBg: "bg-violet-50", accentBorder: "border-violet-100" },
    { key: "free", title: "ข้อสอบฟรี", icon: "🎁", href: "/exam/free", accent: "text-teal-600", accentBg: "bg-teal-50", accentBorder: "border-teal-100" },
];

const cardThemes: Record<string, { color: string; bg: string; light: string }> = {
    'Amber': { color: 'text-amber-700', bg: 'bg-amber-500', light: 'bg-amber-50' },
    'Rose': { color: 'text-rose-700', bg: 'bg-rose-500', light: 'bg-rose-50' },
    'Violet': { color: 'text-violet-700', bg: 'bg-violet-500', light: 'bg-violet-50' },
    'Emerald': { color: 'text-emerald-700', bg: 'bg-emerald-500', light: 'bg-emerald-50' },
    'Sky': { color: 'text-sky-700', bg: 'bg-sky-500', light: 'bg-sky-50' },
    'Indigo': { color: 'text-indigo-700', bg: 'bg-indigo-500', light: 'bg-indigo-50' },
    'Blue': { color: 'text-blue-700', bg: 'bg-blue-500', light: 'bg-blue-50' },
    'Teal': { color: 'text-teal-700', bg: 'bg-teal-500', light: 'bg-teal-50' },
    'Orange': { color: 'text-orange-700', bg: 'bg-orange-500', light: 'bg-orange-50' },
    'Red': { color: 'text-red-700', bg: 'bg-red-500', light: 'bg-red-50' },
    'Pink': { color: 'text-pink-700', bg: 'bg-pink-500', light: 'bg-pink-50' },
    'Cyan': { color: 'text-cyan-700', bg: 'bg-cyan-500', light: 'bg-cyan-50' },
    'Fuchsia': { color: 'text-fuchsia-700', bg: 'bg-fuchsia-500', light: 'bg-fuchsia-50' },
    'Lime': { color: 'text-lime-700', bg: 'bg-lime-500', light: 'bg-lime-50' },
    'Green': { color: 'text-green-700', bg: 'bg-green-500', light: 'bg-green-50' },
};
const getTheme = (color: string, idx: number) => cardThemes[color] || Object.values(cardThemes)[idx % Object.values(cardThemes).length];

// ─── Horizontal Scroll Row ───
function ScrollRow({ title, icon, href, accent, exams }: { title: string; icon: string; href: string; accent: string; exams: any[] }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { isBookmarked, toggleBookmark, isLoggedIn } = useBookmarks();

    const scroll = (dir: number) => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollBy({ left: dir * 360, behavior: 'smooth' });
    };

    if (exams.length === 0) return null;

    return (
        <section className="mb-12">
            {/* Row Header */}
            <div className="flex items-center justify-between mb-6 px-6 md:px-12">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{icon}</span>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{title}</h2>
                </div>
                <Link href={href} className={`flex items-center gap-1.5 text-sm font-bold ${accent} hover:underline underline-offset-4`}>
                    ดูทั้งหมด <ArrowRight size={14} />
                </Link>
            </div>

            {/* Scroll Container */}
            <div className="relative group/row">
                {/* Left Arrow */}
                <button
                    onClick={() => scroll(-1)}
                    className="absolute left-0 top-0 bottom-0 z-20 w-14 bg-gradient-to-r from-white via-white/80 to-transparent flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
                >
                    <div className="w-10 h-10 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                        <ChevronLeft size={22} className="text-slate-600" />
                    </div>
                </button>
                {/* Right Arrow */}
                <button
                    onClick={() => scroll(1)}
                    className="absolute right-0 top-0 bottom-0 z-20 w-14 bg-gradient-to-l from-white via-white/80 to-transparent flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
                >
                    <div className="w-10 h-10 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                        <ChevronRight size={22} className="text-slate-600" />
                    </div>
                </button>

                <div
                    ref={scrollRef}
                    className="flex gap-5 overflow-x-auto scroll-smooth px-6 md:px-12 pb-4 no-scrollbar"
                    style={{ scrollSnapType: 'x mandatory' }}
                >
                    {exams.map((exam: any, idx: number) => {
                        const ct = getTheme(exam.themeColor, idx);
                        const dispTitle = (exam.title || "").replace(/<br\s*\/?>/gi, '\n');

                        return (
                            <Link
                                href={`/exam/${exam.id}`}
                                key={exam.id}
                                className="group/card relative flex-shrink-0 w-[220px] sm:w-[250px] md:w-[280px] aspect-[3/4] rounded-2xl overflow-hidden bg-white border border-slate-200 hover:border-slate-300 transition-all duration-300 hover:scale-[1.03] hover:z-10 shadow-sm hover:shadow-xl"
                                style={{ scrollSnapAlign: 'start' }}
                            >
                                {/* Cover Image */}
                                {exam.coverImage ? (
                                    <Image src={exam.coverImage} alt={exam.title} fill sizes="280px" className="object-cover transition-transform duration-500 group-hover/card:scale-110" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                        <span className="text-5xl opacity-30">📚</span>
                                    </div>
                                )}

                                {/* Gradient overlay for text readability */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                {/* Hover play button */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex items-center justify-center z-10">
                                    <div className={`w-14 h-14 rounded-full ${ct.bg} text-white flex items-center justify-center shadow-xl`}>
                                        <Play size={24} className="ml-1" fill="currentColor" />
                                    </div>
                                </div>

                                {/* Badges on image */}
                                <div className="absolute top-3 left-3 flex gap-1.5 z-20">
                                    {exam.isFree && (
                                        <span className="text-[10px] font-black text-white bg-teal-500 px-2 py-0.5 rounded-md shadow">ฟรี</span>
                                    )}
                                </div>

                                {/* Bookmark */}
                                {isLoggedIn && (
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark(exam.id); }}
                                        className={`absolute top-3 right-3 z-30 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                            isBookmarked(exam.id)
                                                ? 'bg-rose-500 text-white shadow-lg scale-110'
                                                : 'bg-white/80 backdrop-blur-sm text-slate-400 hover:text-rose-500 opacity-0 group-hover/card:opacity-100 shadow'
                                        }`}
                                    >
                                        <Heart size={14} className={isBookmarked(exam.id) ? 'fill-current' : ''} />
                                    </button>
                                )}

                                {/* Text Content - Slides up on hover */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 z-20 transform translate-y-full group-hover/card:translate-y-0 transition-transform duration-300">
                                    <div className="flex gap-1.5 mb-2 flex-wrap">
                                        <span className="text-[10px] font-bold text-white/90 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">{exam.level}</span>
                                        <span className="text-[10px] font-bold text-white/90 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">{exam.questionCount || 0} ข้อ</span>
                                    </div>
                                    <h3 className="font-bold text-base leading-snug line-clamp-2 text-white drop-shadow-lg whitespace-pre-line">
                                        {dispTitle}
                                    </h3>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// ─── Main Component ───
export default function ExamHubClient({ featuredExams, groupedExams, totalExams }: ExamHubClientProps) {
    const { isLoggedIn } = useBookmarks();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const slideCount = featuredExams.length;

    const goToSlide = useCallback((idx: number) => {
        setCurrentSlide(((idx % slideCount) + slideCount) % slideCount);
    }, [slideCount]);

    // Auto-play
    useEffect(() => {
        if (isPaused || slideCount <= 1) return;
        timerRef.current = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % slideCount);
        }, 5000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isPaused, slideCount]);

    return (
        <div className="bg-white min-h-screen">
            {/* ═══ HERO SLIDER ═══ */}
            {featuredExams.length > 0 && (
                <div
                    className="relative px-6 md:px-12 pt-8 pb-12"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    {/* Slide Cards */}
                    <div className="relative w-full max-w-6xl mx-auto">
                        {featuredExams.map((exam: any, idx: number) => (
                            <div
                                key={exam.id}
                                className={`transition-all duration-700 ease-in-out ${
                                    idx === currentSlide
                                        ? 'relative opacity-100 translate-x-0'
                                        : 'absolute inset-0 opacity-0 pointer-events-none translate-x-4'
                                }`}
                            >
                                <Link href={`/exam/${exam.id}`} className="group block">
                                    <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-xl shadow-slate-200/60 border border-slate-200/80">
                                        {/* Cover Image */}
                                        {exam.coverImage ? (
                                            <Image
                                                src={exam.coverImage}
                                                alt={exam.title}
                                                fill
                                                sizes="(max-width: 768px) 100vw, 600px"
                                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                priority={idx === 0}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-indigo-100 via-violet-50 to-blue-100" />
                                        )}

                                        {/* Gradient overlay for text readability */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                        {/* Content Overlay - Slides up on hover */}
                                        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                            <div>
                                                {/* Badges */}
                                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                                    {exam.isFree && (
                                                        <span className="px-3 py-1 bg-teal-500 text-white text-xs font-black rounded-lg uppercase tracking-wider shadow-md">ดูฟรี</span>
                                                    )}
                                                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-lg">{exam.level}</span>
                                                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-lg">{exam.questionCount || 0} ข้อ</span>
                                                </div>

                                                {/* Title */}
                                                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-2 leading-tight tracking-tight drop-shadow-lg whitespace-pre-line">
                                                    {(exam.title || "").replace(/<br\s*\/?>/gi, '\n')}
                                                </h1>

                                                {/* Description */}
                                                <p className="text-sm md:text-base text-white/90 mb-4 leading-relaxed line-clamp-2 drop-shadow">
                                                    {exam.description}
                                                </p>

                                                {/* CTA */}
                                                <div className="flex items-center gap-3">
                                                    <span className="px-5 py-2.5 bg-white text-slate-900 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg">
                                                        <Play size={16} fill="currentColor" />
                                                        ทำข้อสอบเลย
                                                    </span>
                                                    {isLoggedIn && (
                                                        <span className="px-4 py-2.5 bg-white/15 backdrop-blur-md text-white rounded-xl font-bold text-sm flex items-center gap-2 border border-white/20">
                                                            <BarChart3 size={14} />
                                                            สถิติ
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hover play overlay */}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                            <div className="w-16 h-16 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
                                                <Play size={28} className="text-white ml-1" fill="currentColor" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}

                        {/* Slider Controls */}
                        {slideCount > 1 && (
                            <>
                                {/* Left/Right arrows */}
                                <button
                                    onClick={() => goToSlide(currentSlide - 1)}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/90 shadow-lg border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-white hover:shadow-xl transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <ChevronLeft size={22} />
                                </button>
                                <button
                                    onClick={() => goToSlide(currentSlide + 1)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/90 shadow-lg border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-white hover:shadow-xl transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <ChevronRight size={22} />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Dots — below the card */}
                    {slideCount > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6">
                            {featuredExams.map((_: any, idx: number) => (
                                <button
                                    key={idx}
                                    onClick={() => goToSlide(idx)}
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        idx === currentSlide ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-300 hover:bg-slate-400'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ CATEGORY ROWS ═══ */}
            <div className="pt-4 pb-16">
                {categoryConfig.map(cat => (
                    <ScrollRow
                        key={cat.key}
                        title={cat.title}
                        icon={cat.icon}
                        href={cat.href}
                        accent={cat.accent}
                        exams={groupedExams[cat.key] || []}
                    />
                ))}
            </div>

            {/* Stats bar */}
            <div className="text-center pb-12 text-slate-400 text-sm">
                รวม {totalExams} ชุดข้อสอบ
            </div>
        </div>
    );
}
