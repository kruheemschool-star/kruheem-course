"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Clock, Eye, Search, ChevronDown, ChevronRight } from 'lucide-react';

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

// Category colors for badges - expanded to ม.6
const categoryStyles: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    'ม.1': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '🌱' },
    'ม.2': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '📘' },
    'ม.3': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: '📚' },
    'ม.4': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: '🔥' },
    'ม.5': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', icon: '🚀' },
    'ม.6': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '🎯' },
    'Gifted': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '⭐' },
    'default': { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: '📖' }
};

// Category order for display
const categoryOrder = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6', 'Gifted'];
const filterCategories = ['ทั้งหมด', ...categoryOrder];

export default function SummaryGrid({ summaries }: { summaries: Summary[] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    // Filter summaries based on search
    const filteredSummaries = useMemo(() => {
        return summaries.filter(summary => {
            const matchesSearch = searchQuery === '' ||
                summary.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                summary.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                summary.meta_description?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory = selectedCategory === 'ทั้งหมด' ||
                summary.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [summaries, searchQuery, selectedCategory]);

    // Group summaries by category
    const groupedSummaries = useMemo(() => {
        const groups: Record<string, Summary[]> = {};

        filteredSummaries.forEach(summary => {
            const cat = summary.category || 'อื่นๆ';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(summary);
        });

        // Sort groups by category order
        const sortedGroups: { category: string; summaries: Summary[] }[] = [];

        categoryOrder.forEach(cat => {
            if (groups[cat]) {
                sortedGroups.push({ category: cat, summaries: groups[cat] });
                delete groups[cat];
            }
        });

        // Add remaining categories (like 'อื่นๆ')
        Object.entries(groups).forEach(([cat, sums]) => {
            sortedGroups.push({ category: cat, summaries: sums });
        });

        return sortedGroups;
    }, [filteredSummaries]);

    const toggleGroup = (category: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

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
                    {filterCategories.map((cat) => (
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

            {/* Empty State */}
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
                /* Grouped Content */
                <div className="space-y-6">
                    {groupedSummaries.map(({ category, summaries: groupSummaries }) => {
                        const style = categoryStyles[category] || categoryStyles.default;
                        const isCollapsed = collapsedGroups.has(category);

                        return (
                            <div key={category} className={`rounded-2xl border ${style.border} overflow-hidden`}>
                                {/* Category Header */}
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(category)}
                                    className={`w-full flex items-center justify-between px-5 py-4 ${style.bg} hover:brightness-95 transition`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{style.icon}</span>
                                        <h2 className={`text-lg font-black ${style.text}`}>
                                            {category}
                                        </h2>
                                        <span className={`text-sm font-bold ${style.text} opacity-60`}>
                                            ({groupSummaries.length} บท)
                                        </span>
                                    </div>
                                    <div className={`${style.text}`}>
                                        {isCollapsed ? <ChevronRight size={24} /> : <ChevronDown size={24} />}
                                    </div>
                                </button>

                                {/* Summaries List */}
                                {!isCollapsed && (
                                    <div className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                                        {groupSummaries.map((summary, index) => (
                                            <Link
                                                key={summary.id}
                                                href={`/summary/${summary.slug}`}
                                                className="group flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-200"
                                            >
                                                {/* Number */}
                                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-sm group-hover:bg-slate-800 group-hover:text-white dark:group-hover:bg-slate-600 transition">
                                                    {index + 1}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base group-hover:text-slate-900 dark:group-hover:text-white transition leading-snug">
                                                        {getMainTitle(summary.title)}
                                                    </h3>
                                                    {(summary.excerpt || summary.meta_description) && (
                                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed line-clamp-1 mt-0.5">
                                                            {summary.excerpt || summary.meta_description}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Meta Info */}
                                                <div className="flex-shrink-0 hidden sm:flex items-center gap-3 text-xs text-slate-400">
                                                    {summary.readingTime ? (
                                                        <div className="flex items-center gap-1">
                                                            <Clock size={14} />
                                                            <span>{summary.readingTime} นาที</span>
                                                        </div>
                                                    ) : null}
                                                    {summary.viewCount !== undefined && summary.viewCount > 0 ? (
                                                        <div className="flex items-center gap-1">
                                                            <Eye size={14} />
                                                            <span>{summary.viewCount}</span>
                                                        </div>
                                                    ) : null}
                                                </div>

                                                {/* Arrow */}
                                                <div className="flex-shrink-0 text-slate-300 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-300 group-hover:translate-x-1 transition">
                                                    →
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
