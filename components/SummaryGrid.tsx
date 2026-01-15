"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Clock, Eye, Search, BookOpen } from 'lucide-react';

interface Summary {
    id: string;
    title: string;
    slug: string;
    order: number;
    status?: string;
    excerpt?: string;
    meta_description?: string;
    category?: string;
    readingTime?: number;
    viewCount?: number;
}

// Category colors for badges
const categoryStyles: Record<string, string> = {
    'ม.1': 'bg-emerald-100 text-emerald-700',
    'ม.2': 'bg-blue-100 text-blue-700',
    'ม.3': 'bg-purple-100 text-purple-700',
    'Gifted': 'bg-amber-100 text-amber-700',
    'default': 'bg-slate-100 text-slate-600'
};

const categories = ['ทั้งหมด', 'ม.1', 'ม.2', 'ม.3', 'Gifted'];

export default function SummaryGrid({ summaries }: { summaries: Summary[] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');

    // Filter summaries based on search and category
    const filteredSummaries = summaries.filter(summary => {
        const matchesSearch = searchQuery === '' ||
            summary.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            summary.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            summary.meta_description?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = selectedCategory === 'ทั้งหมด' ||
            summary.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6">
            {/* Search & Filter Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ค้นหาบทสรุป..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-500 text-slate-700 dark:text-slate-200 font-medium transition"
                    />
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${selectedCategory === cat
                                ? 'bg-slate-800 text-white dark:bg-slate-600'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Count */}
            {(searchQuery || selectedCategory !== 'ทั้งหมด') && (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                    พบ {filteredSummaries.length} รายการ
                    {searchQuery && <span> สำหรับ &quot;{searchQuery}&quot;</span>}
                    {selectedCategory !== 'ทั้งหมด' && <span> ในหมวด {selectedCategory}</span>}
                </div>
            )}

            {/* Card Grid - Simple horizontal cards without cover images */}
            {filteredSummaries.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
                    <div className="text-5xl mb-4">🔍</div>
                    <p className="text-slate-500 dark:text-slate-400">ไม่พบบทสรุปที่ตรงกับการค้นหา</p>
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setSelectedCategory('ทั้งหมด');
                        }}
                        className="mt-4 text-slate-600 dark:text-slate-300 underline hover:text-slate-800"
                    >
                        ล้างการค้นหา
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredSummaries.map((summary, index) => (
                        <Link
                            key={summary.id}
                            href={`/summary/${summary.slug}`}
                            className="group flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 dark:border-slate-700"
                        >
                            {/* Number/Icon */}
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-lg group-hover:bg-slate-800 group-hover:text-white dark:group-hover:bg-slate-600 transition">
                                {index + 1}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 py-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                    {/* Category Badge */}
                                    {summary.category && (
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${categoryStyles[summary.category] || categoryStyles.default}`}>
                                            {summary.category}
                                        </span>
                                    )}
                                </div>

                                {(() => {
                                    // Helper to split title to get just the main title
                                    const getMainTitle = (text: string) => {
                                        const separators = [' ฉบับ', ' แบบ', ' โดย', ' พื้นฐาน', ' พร้อม', ' ('];
                                        for (const sep of separators) {
                                            const idx = text.indexOf(sep);
                                            if (idx !== -1 && idx >= 5) {
                                                return text.substring(0, idx);
                                            }
                                        }
                                        return text;
                                    };

                                    const mainTitle = getMainTitle(summary.title);

                                    return (
                                        <div className="flex flex-col">
                                            <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg group-hover:text-slate-900 dark:group-hover:text-white transition leading-tight mb-1">
                                                {mainTitle}
                                            </h3>
                                            {(summary.excerpt || summary.meta_description) && (
                                                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed line-clamp-2">
                                                    {summary.excerpt || summary.meta_description}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Meta Info */}
                            <div className="flex-shrink-0 hidden sm:flex items-center gap-3 text-xs text-slate-400">
                                {summary.readingTime && (
                                    <div className="flex items-center gap-1">
                                        <Clock size={14} />
                                        <span>{summary.readingTime} นาที</span>
                                    </div>
                                )}
                                {summary.viewCount !== undefined && (
                                    <div className="flex items-center gap-1">
                                        <Eye size={14} />
                                        <span>{summary.viewCount} views</span>
                                    </div>
                                )}
                            </div>

                            {/* Arrow */}
                            <div className="flex-shrink-0 text-slate-300 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-300 group-hover:translate-x-1 transition">
                                →
                            </div>
                        </Link>
                    ))}
                </div >
            )}
        </div >
    );
}
