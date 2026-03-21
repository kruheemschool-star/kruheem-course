"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BarChart3, Heart, Sparkles } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";

interface ExamHubClientProps {
    counts: Record<string, number>;
    latestExams: any[];
    totalExams: number;
}

const categories = [
    {
        key: "entrance",
        title: "ข้อสอบเข้า",
        description: "สอบเข้า ม.1, ม.4 และโรงเรียนดัง",
        icon: "🏫",
        href: "/exam/entrance",
        gradient: "from-indigo-600 to-indigo-800",
        hoverShadow: "hover:shadow-indigo-500/40",
        accent: "bg-indigo-500",
        badge: "text-indigo-200 bg-indigo-700/50",
    },
    {
        key: "practice",
        title: "แบบฝึกหัด",
        description: "เตรียมตัวสอบ ฝึกทำโจทย์หลากหลาย",
        icon: "📝",
        href: "/exam/practice",
        gradient: "from-emerald-600 to-emerald-800",
        hoverShadow: "hover:shadow-emerald-500/40",
        accent: "bg-emerald-500",
        badge: "text-emerald-200 bg-emerald-700/50",
    },
    {
        key: "chapter",
        title: "แนวข้อสอบรายบท",
        description: "สมการ จำนวนจริง เลขยกกำลัง แยกตามบท",
        icon: "📖",
        href: "/exam/chapter",
        gradient: "from-violet-600 to-violet-800",
        hoverShadow: "hover:shadow-violet-500/40",
        accent: "bg-violet-500",
        badge: "text-violet-200 bg-violet-700/50",
    },
    {
        key: "free",
        title: "ข้อสอบฟรี",
        description: "โปรโมชั่นพิเศษ ทำได้เลยไม่ต้องสมัคร",
        icon: "🎁",
        href: "/exam/free",
        gradient: "from-teal-600 to-teal-800",
        hoverShadow: "hover:shadow-teal-500/40",
        accent: "bg-teal-500",
        badge: "text-teal-200 bg-teal-700/50",
    },
];

export default function ExamHubClient({ counts, latestExams, totalExams }: ExamHubClientProps) {
    const { isBookmarked, toggleBookmark, isLoggedIn } = useBookmarks();

    // Card theme colors for latest exams
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

    const examTypeLabels: Record<string, string> = {
        entrance: "ข้อสอบเข้า",
        practice: "แบบฝึกหัด",
        chapter: "รายบท",
        free: "ฟรี",
    };

    return (
        <div className="bg-white dark:bg-slate-950 transition-colors">
            {/* Hero Section */}
            <div className="px-6 py-10 text-center">
                <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-slate-100 mb-3 tracking-tight">
                    คลังข้อสอบ <span className="text-amber-500">ออนไลน์</span> 📚
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                    เลือกประเภทข้อสอบที่ต้องการ เริ่มฝึกฝนได้ทันที
                </p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                    รวม {totalExams} ชุดข้อสอบ
                </p>

                {isLoggedIn && (
                    <Link
                        href="/exam/dashboard"
                        className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all duration-300"
                    >
                        <BarChart3 size={18} />
                        ดูสถิติของฉัน
                    </Link>
                )}
            </div>

            {/* 4 Category Cards */}
            <div className="container mx-auto px-6 max-w-5xl pb-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {categories.map((cat, idx) => (
                        <Link
                            key={cat.key}
                            href={cat.href}
                            className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${cat.gradient} text-white p-8 min-h-[200px] flex flex-col justify-between transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] shadow-xl ${cat.hoverShadow}`}
                        >
                            {/* Background Pattern */}
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/20"></div>
                                <div className="absolute -left-4 -bottom-4 w-32 h-32 rounded-full bg-white/10"></div>
                            </div>

                            {/* Content */}
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{cat.icon}</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-black ${cat.badge}`}>
                                        {counts[cat.key] || 0} ชุด
                                    </span>
                                </div>
                                <h2 className="text-2xl font-black mb-1.5 tracking-tight">{cat.title}</h2>
                                <p className="text-white/70 text-sm leading-relaxed">{cat.description}</p>
                            </div>

                            {/* CTA Arrow */}
                            <div className="relative z-10 flex items-center gap-2 mt-6 text-sm font-bold text-white/80 group-hover:text-white transition-colors">
                                <span>ดูข้อสอบทั้งหมด</span>
                                <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Latest Exams Section */}
            {latestExams.length > 0 && (
                <div className="container mx-auto px-6 max-w-7xl pb-16">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Sparkles size={20} className="text-amber-500" />
                            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">ข้อสอบล่าสุด</h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                        {latestExams.map((exam, index) => {
                            const ct = getCardTheme(exam.themeColor, index);
                            const dispTitle = (exam.title || "").replace(/<br\s*\/?>/gi, '\n');

                            return (
                                <Link
                                    href={`/exam/${exam.id}`}
                                    key={exam.id}
                                    className={`group relative flex flex-col bg-slate-900 rounded-2xl overflow-hidden aspect-[3/4] transition-all duration-500 hover:-translate-y-3 hover:scale-[1.02] border border-transparent ${ct.border} ${ct.shadow} shadow-xl`}
                                >
                                    {/* Logo */}
                                    <div className="absolute top-3 left-3 z-30 drop-shadow-lg opacity-80 group-hover:opacity-100 transition-opacity">
                                        <Image src="/logo.png" alt="Logo" width={32} height={32} className="w-8 h-8 object-contain" />
                                    </div>

                                    {/* Bookmark */}
                                    {isLoggedIn && (
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark(exam.id); }}
                                            className={`absolute top-3 right-3 z-30 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-sm ${
                                                isBookmarked(exam.id)
                                                    ? 'bg-rose-500/90 text-white shadow-lg shadow-rose-500/30 scale-110'
                                                    : 'bg-black/30 text-white/70 hover:bg-black/50 hover:text-white opacity-0 group-hover:opacity-100'
                                            }`}
                                        >
                                            <Heart size={14} className={isBookmarked(exam.id) ? 'fill-current' : ''} />
                                        </button>
                                    )}

                                    {/* Cover Image */}
                                    <div className="absolute inset-0 z-0 bg-slate-800 overflow-hidden">
                                        {exam.coverImage ? (
                                            <Image src={exam.coverImage} alt={exam.title} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:blur-sm" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-800 flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:blur-sm">
                                                <div className="text-5xl opacity-30">📚</div>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-90 group-hover:opacity-0 transition-opacity duration-500"></div>
                                    </div>

                                    {/* Glassmorphism Overlay */}
                                    <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-500"></div>

                                    {/* Content */}
                                    <div className="absolute bottom-0 left-0 right-0 p-5 z-20 flex flex-col justify-end h-full">
                                        {/* Exam Type Badge */}
                                        <div className="mb-auto pt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex gap-1.5 flex-wrap">
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white text-slate-900 uppercase tracking-widest shadow-lg">
                                                {exam.level}
                                            </span>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg ${exam.isFree ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-300 border border-slate-600'}`}>
                                                {exam.isFree ? '🔓 ฟรี' : '🔒'}
                                            </span>
                                            {exam.examType && (
                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                                                    {examTypeLabels[exam.examType] || exam.examType}
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            {/* Non-hover badges */}
                                            <div className="mb-2 opacity-100 group-hover:opacity-0 transition-opacity duration-300 flex gap-1.5 flex-wrap">
                                                <span className="text-[10px] font-bold text-slate-300 border border-slate-600 px-1.5 py-0.5 rounded">{exam.level}</span>
                                                <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded ${exam.isFree ? 'text-teal-300 border-teal-600/50' : 'text-slate-400 border-slate-700'}`}>
                                                    {exam.isFree ? '🔓 ฟรี' : '🔒'}
                                                </span>
                                            </div>

                                            <h3 className={`font-black text-xl leading-[1.1] mb-2 line-clamp-3 ${ct.color} drop-shadow-2xl tracking-tight whitespace-pre-line`}>
                                                {dispTitle}
                                            </h3>

                                            <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500 ease-out">
                                                <div className="overflow-hidden">
                                                    <p className="text-sm text-slate-100/90 font-medium leading-relaxed mb-4 line-clamp-2">
                                                        {exam.description}
                                                    </p>
                                                    <div className={`flex items-center gap-2 text-sm font-bold ${ct.color}`}>
                                                        <span>เริ่มทำข้อสอบ</span>
                                                        <div className={`w-7 h-7 rounded-full ${ct.bg} text-white flex items-center justify-center shadow-lg`}>
                                                            <ArrowRight size={14} />
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
                </div>
            )}
        </div>
    );
}
