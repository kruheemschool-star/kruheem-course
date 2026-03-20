"use client";

import { useState } from "react";
import { useUserAuth } from "@/context/AuthContext";
import { useSavedQuestions, SavedQuestion } from "@/hooks/useSavedQuestions";
import SingleQuestionModal from "@/components/exam/SingleQuestionModal";
import Navbar from "@/components/Navbar";
import MathRenderer from "@/components/exam/MathRenderer";
import Link from "next/link";
import {
    Bookmark, Search, Trash2, ArrowLeft, Loader2, LogIn,
    BookOpen, Tag, ChevronRight, RotateCcw, Filter, X
} from "lucide-react";

export default function SavedQuestionsPage() {
    const { user, loading: authLoading } = useUserAuth();
    const { savedQuestions, unsaveQuestion, loading } = useSavedQuestions();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
    const [activeQuestion, setActiveQuestion] = useState<SavedQuestion | null>(null);

    // Extract unique categories
    const categories = ["ทั้งหมด", ...Array.from(new Set(savedQuestions.map(q => q.category || "").filter(Boolean)))];

    // Filter questions
    const filtered = savedQuestions.filter(q => {
        if (selectedCategory !== "ทั้งหมด" && q.category !== selectedCategory) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchText = (q.questionText || "").toLowerCase().includes(query);
            const matchTitle = (q.examTitle || "").toLowerCase().includes(query);
            const matchTags = (q.tags || []).some(t => t.toLowerCase().includes(query));
            if (!matchText && !matchTitle && !matchTags) return false;
        }
        return true;
    });

    // Clean text for preview (strip LaTeX)
    const cleanPreview = (text: string) => {
        return text
            .replace(/\\\[[\s\S]*?\\\]/g, '[สมการ]')
            .replace(/\$\$[\s\S]*?\$\$/g, '[สมการ]')
            .replace(/\\\([\s\S]*?\\\)/g, '[สมการ]')
            .replace(/\$[^$]+\$/g, '[สมการ]')
            .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 120);
    };

    // Format date
    const formatDate = (timestamp: any) => {
        if (!timestamp?.seconds) return "";
        const d = new Date(timestamp.seconds * 1000);
        return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    };

    if (authLoading || loading) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 size={40} className="animate-spin text-amber-500 mx-auto mb-4" />
                        <p className="text-slate-500 dark:text-slate-400 font-medium">กำลังโหลด...</p>
                    </div>
                </div>
            </>
        );
    }

    if (!user) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 flex items-center justify-center">
                    <div className="text-center max-w-md mx-auto px-6">
                        <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-6">
                            <LogIn size={32} className="text-amber-500" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-3">เข้าสู่ระบบก่อนนะ</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">ต้องเข้าสู่ระบบก่อนจึงจะดูข้อสอบที่บันทึกไว้ได้</p>
                        <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all">
                            <LogIn size={18} /> เข้าสู่ระบบ
                        </Link>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-16">
                <div className="container mx-auto px-4 max-w-5xl">

                    {/* Header */}
                    <div className="mb-8">
                        <Link href="/exam" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-medium text-sm mb-4 transition-colors">
                            <ArrowLeft size={16} /> กลับไปหน้าข้อสอบ
                        </Link>
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                                        <Bookmark size={20} className="text-white fill-current" />
                                    </div>
                                    ข้อสอบที่บันทึกไว้
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                                    {savedQuestions.length > 0 ? `${savedQuestions.length} ข้อที่บันทึกไว้` : 'ยังไม่มีข้อที่บันทึก'}
                                </p>
                            </div>
                            {savedQuestions.length > 0 && (
                                <Link
                                    href="/exam/dashboard"
                                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                                >
                                    <BookOpen size={16} /> สถิติของฉัน
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Search & Filter Bar */}
                    {savedQuestions.length > 0 && (
                        <div className="mb-6 flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="ค้นหาโจทย์ที่บันทึก..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all text-slate-700 dark:text-slate-300"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            {categories.length > 2 && (
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                                                selectedCategory === cat
                                                    ? 'bg-amber-500 text-white border-amber-500'
                                                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Questions List */}
                    {filtered.length > 0 ? (
                        <div className="space-y-3">
                            {filtered.map((sq) => (
                                <div
                                    key={sq.id}
                                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 md:p-5 hover:border-amber-300 dark:hover:border-amber-600 transition-all group cursor-pointer"
                                    onClick={() => setActiveQuestion(sq)}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Question Number Badge */}
                                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-black text-sm border border-amber-100 dark:border-amber-800">
                                            {sq.questionIndex + 1}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{sq.examTitle}</span>
                                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                                <span className="text-xs text-slate-400 dark:text-slate-500">ข้อ {sq.questionIndex + 1}</span>
                                                {sq.category && (
                                                    <>
                                                        <span className="text-slate-300 dark:text-slate-600">•</span>
                                                        <span className="text-xs text-slate-400 dark:text-slate-500">{sq.category}</span>
                                                    </>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-2 font-medium">
                                                {cleanPreview(sq.questionText || sq.questionData?.question || "")}
                                            </p>
                                            {/* Tags */}
                                            {sq.tags && sq.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {sq.tags.slice(0, 4).map((tag, i) => (
                                                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] rounded-md font-bold">
                                                            <Tag size={9} /> {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:block">{formatDate(sq.savedAt)}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    unsaveQuestion(sq.examId, sq.questionIndex);
                                                }}
                                                className="p-2 text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="ลบออกจากรายการ"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : savedQuestions.length > 0 ? (
                        /* No results from search/filter */
                        <div className="text-center py-16">
                            <Search size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">ไม่พบข้อที่ค้นหา</h3>
                            <p className="text-sm text-slate-400 dark:text-slate-500">ลองเปลี่ยนคำค้นหาหรือหมวดหมู่</p>
                        </div>
                    ) : (
                        /* Empty state */
                        <div className="text-center py-20">
                            <div className="w-24 h-24 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-6">
                                <Bookmark size={40} className="text-amber-300 dark:text-amber-600" />
                            </div>
                            <h3 className="text-xl font-black text-slate-700 dark:text-slate-300 mb-3">ยังไม่มีข้อที่บันทึก</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto text-sm">
                                เวลาทำข้อสอบ กดปุ่ม <Bookmark size={14} className="inline -mt-0.5" /> ที่หัวข้อคำถาม เพื่อบันทึกข้อที่อยากทบทวนได้นะ
                            </p>
                            <Link
                                href="/exam"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20"
                            >
                                <BookOpen size={18} /> ไปทำข้อสอบ
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Single Question Modal */}
            {activeQuestion && activeQuestion.questionData && (
                <SingleQuestionModal
                    question={activeQuestion.questionData}
                    examTitle={activeQuestion.examTitle}
                    questionIndex={activeQuestion.questionIndex}
                    onClose={() => setActiveQuestion(null)}
                    onUnsave={() => {
                        unsaveQuestion(activeQuestion.examId, activeQuestion.questionIndex);
                        setActiveQuestion(null);
                    }}
                />
            )}
        </>
    );
}
