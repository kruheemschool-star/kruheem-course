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
    { key: "entrance", title: "ข้อสอบเข้า", icon: "🏫", href: "/exam/entrance", accent: "text-indigo-400" },
    { key: "practice", title: "แบบฝึกหัด", icon: "📝", href: "/exam/practice", accent: "text-emerald-400" },
    { key: "chapter", title: "แนวข้อสอบรายบท", icon: "📖", href: "/exam/chapter", accent: "text-violet-400" },
    { key: "free", title: "ข้อสอบฟรี", icon: "🎁", href: "/exam/free", accent: "text-teal-400" },
];

const cardThemes: Record<string, { color: string; bg: string }> = {
    'Amber': { color: 'text-amber-400', bg: 'bg-amber-500' },
    'Rose': { color: 'text-rose-400', bg: 'bg-rose-500' },
    'Violet': { color: 'text-violet-400', bg: 'bg-violet-500' },
    'Emerald': { color: 'text-emerald-400', bg: 'bg-emerald-500' },
    'Sky': { color: 'text-sky-400', bg: 'bg-sky-500' },
    'Indigo': { color: 'text-indigo-400', bg: 'bg-indigo-500' },
    'Blue': { color: 'text-blue-400', bg: 'bg-blue-500' },
    'Teal': { color: 'text-teal-400', bg: 'bg-teal-500' },
    'Orange': { color: 'text-orange-400', bg: 'bg-orange-500' },
    'Red': { color: 'text-red-400', bg: 'bg-red-500' },
    'Pink': { color: 'text-pink-400', bg: 'bg-pink-500' },
    'Cyan': { color: 'text-cyan-400', bg: 'bg-cyan-500' },
    'Fuchsia': { color: 'text-fuchsia-400', bg: 'bg-fuchsia-500' },
    'Lime': { color: 'text-lime-400', bg: 'bg-lime-500' },
    'Green': { color: 'text-green-400', bg: 'bg-green-500' },
};
const getTheme = (color: string, idx: number) => cardThemes[color] || Object.values(cardThemes)[idx % Object.values(cardThemes).length];

// ─── Horizontal Scroll Row ───
function ScrollRow({ title, icon, href, accent, exams }: { title: string; icon: string; href: string; accent: string; exams: any[] }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { isBookmarked, toggleBookmark, isLoggedIn } = useBookmarks();

    const scroll = (dir: number) => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' });
    };

    if (exams.length === 0) return null;

    return (
        <section className="mb-10">
            {/* Row Header */}
            <div className="flex items-center justify-between mb-5 px-6 md:px-12">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <h2 className={`text-xl md:text-2xl font-black text-white tracking-tight`}>{title}</h2>
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
                    className="absolute left-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-r from-slate-950 to-transparent flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
                >
                    <ChevronLeft size={28} className="text-white drop-shadow-lg" />
                </button>
                {/* Right Arrow */}
                <button
                    onClick={() => scroll(1)}
                    className="absolute right-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-l from-slate-950 to-transparent flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
                >
                    <ChevronRight size={28} className="text-white drop-shadow-lg" />
                </button>

                <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto scroll-smooth px-6 md:px-12 pb-4 no-scrollbar"
                    style={{ scrollSnapType: 'x mandatory' }}
                >
                    {exams.map((exam: any, idx: number) => {
                        const ct = getTheme(exam.themeColor, idx);
                        const dispTitle = (exam.title || "").replace(/<br\s*\/?>/gi, '\n');

                        return (
                            <Link
                                href={`/exam/${exam.id}`}
                                key={exam.id}
                                className="group/card relative flex-shrink-0 w-[180px] sm:w-[200px] md:w-[220px] aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 border border-slate-700/50 hover:border-white/30 transition-all duration-300 hover:scale-105 hover:z-10 shadow-lg hover:shadow-2xl"
                                style={{ scrollSnapAlign: 'start' }}
                            >
                                {/* Cover */}
                                <div className="absolute inset-0">
                                    {exam.coverImage ? (
                                        <Image src={exam.coverImage} alt={exam.title} fill sizes="220px" className="object-cover transition-transform duration-500 group-hover/card:scale-110" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                                            <span className="text-4xl opacity-30">📚</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                                </div>

                                {/* Bookmark */}
                                {isLoggedIn && (
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark(exam.id); }}
                                        className={`absolute top-2 right-2 z-30 w-7 h-7 rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${
                                            isBookmarked(exam.id)
                                                ? 'bg-rose-500/90 text-white scale-110'
                                                : 'bg-black/40 text-white/60 hover:text-white opacity-0 group-hover/card:opacity-100'
                                        }`}
                                    >
                                        <Heart size={12} className={isBookmarked(exam.id) ? 'fill-current' : ''} />
                                    </button>
                                )}

                                {/* Content */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                                    <div className="flex gap-1.5 mb-2 flex-wrap">
                                        <span className="text-[9px] font-bold text-white/70 bg-white/10 backdrop-blur-sm px-1.5 py-0.5 rounded">{exam.level}</span>
                                        {exam.isFree && (
                                            <span className="text-[9px] font-bold text-teal-300 bg-teal-500/20 backdrop-blur-sm px-1.5 py-0.5 rounded">ฟรี</span>
                                        )}
                                    </div>
                                    <h3 className={`font-black text-sm leading-tight line-clamp-2 ${ct.color} drop-shadow-lg whitespace-pre-line`}>
                                        {dispTitle}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{exam.questionCount || 0} ข้อ</p>
                                </div>

                                {/* Hover overlay */}
                                <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className={`w-14 h-14 rounded-full ${ct.bg} text-white flex items-center justify-center mx-auto mb-3 shadow-xl`}>
                                            <Play size={24} className="ml-1" fill="currentColor" />
                                        </div>
                                        <span className="text-white font-bold text-sm">ทำข้อสอบ</span>
                                    </div>
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

    const currentExam = featuredExams[currentSlide] || featuredExams[0];

    return (
        <div className="bg-slate-950 min-h-screen">
            {/* ═══ HERO SLIDER ═══ */}
            {featuredExams.length > 0 && (
                <div
                    className="relative w-full h-[70vh] min-h-[480px] max-h-[700px] overflow-hidden"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    {/* Slides */}
                    {featuredExams.map((exam: any, idx: number) => (
                        <div
                            key={exam.id}
                            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                                idx === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                            }`}
                        >
                            {/* Background Image */}
                            <div className="absolute inset-0">
                                {exam.coverImage ? (
                                    <Image
                                        src={exam.coverImage}
                                        alt={exam.title}
                                        fill
                                        sizes="100vw"
                                        className="object-cover"
                                        priority={idx === 0}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950" />
                                )}
                                {/* Gradient overlays */}
                                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/30" />
                            </div>

                            {/* Content */}
                            <div className="relative z-10 h-full flex items-end pb-20 px-6 md:px-12 max-w-4xl">
                                <div className={`transition-all duration-700 delay-200 ${idx === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                                    {/* Badges */}
                                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                                        {exam.isFree && (
                                            <span className="px-3 py-1 bg-teal-500 text-white text-xs font-black rounded-md uppercase tracking-wider">ดูฟรี</span>
                                        )}
                                        <span className="px-3 py-1 bg-white/10 backdrop-blur-sm text-white/80 text-xs font-bold rounded-md">{exam.level}</span>
                                        <span className="px-3 py-1 bg-white/10 backdrop-blur-sm text-white/80 text-xs font-bold rounded-md">{exam.questionCount || 0} ข้อ</span>
                                    </div>

                                    {/* Title */}
                                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 leading-tight tracking-tight drop-shadow-2xl whitespace-pre-line">
                                        {(exam.title || "").replace(/<br\s*\/?>/gi, '\n')}
                                    </h1>

                                    {/* Description */}
                                    <p className="text-base md:text-lg text-slate-300 mb-6 max-w-xl leading-relaxed line-clamp-2 drop-shadow-md">
                                        {exam.description}
                                    </p>

                                    {/* CTA Buttons */}
                                    <div className="flex items-center gap-4">
                                        <Link
                                            href={`/exam/${exam.id}`}
                                            className="px-8 py-3.5 bg-white text-slate-900 rounded-lg font-black text-base flex items-center gap-3 hover:bg-amber-400 transition-all shadow-xl hover:shadow-amber-400/30 hover:-translate-y-0.5"
                                        >
                                            <Play size={20} fill="currentColor" />
                                            ทำข้อสอบเลย
                                        </Link>
                                        {isLoggedIn && (
                                            <Link
                                                href="/exam/dashboard"
                                                className="px-6 py-3.5 bg-white/10 backdrop-blur-md text-white rounded-lg font-bold text-base flex items-center gap-2 hover:bg-white/20 transition-all border border-white/10"
                                            >
                                                <BarChart3 size={18} />
                                                สถิติ
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Slider Controls */}
                    {slideCount > 1 && (
                        <>
                            {/* Left/Right arrows */}
                            <button
                                onClick={() => goToSlide(currentSlide - 1)}
                                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-all opacity-0 hover:opacity-100 focus:opacity-100"
                                style={{ opacity: undefined }}
                                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                            >
                                <ChevronLeft size={28} />
                            </button>
                            <button
                                onClick={() => goToSlide(currentSlide + 1)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-all opacity-0 hover:opacity-100 focus:opacity-100"
                                style={{ opacity: undefined }}
                                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                            >
                                <ChevronRight size={28} />
                            </button>

                            {/* Dots */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                                {featuredExams.map((_: any, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => goToSlide(idx)}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${
                                            idx === currentSlide ? 'w-8 bg-white' : 'w-3 bg-white/40 hover:bg-white/60'
                                        }`}
                                    />
                                ))}
                            </div>

                            {/* Progress bar */}
                            <div className="absolute bottom-0 left-0 right-0 z-20 h-0.5 bg-white/10">
                                <div
                                    className="h-full bg-white/60 transition-all"
                                    style={{
                                        width: `${((currentSlide + 1) / slideCount) * 100}%`,
                                        transition: 'width 0.5s ease'
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ═══ CATEGORY ROWS ═══ */}
            <div className="pt-8 pb-16">
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
            <div className="text-center pb-12 text-slate-500 text-sm">
                รวม {totalExams} ชุดข้อสอบ
            </div>
        </div>
    );
}
