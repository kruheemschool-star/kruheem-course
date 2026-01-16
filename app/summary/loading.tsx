"use client";

import Navbar from '@/components/Navbar';
import { BookOpen } from 'lucide-react';

// Skeleton component for category group
function CategoryGroupSkeleton({ itemCount = 3 }: { itemCount?: number }) {
    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-pulse">
            {/* Category Header Skeleton */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-100 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                    <div className="w-12 h-5 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                </div>
                <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>

            {/* Items Skeleton */}
            <div className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                {Array.from({ length: itemCount }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
                        <div className="flex-1 space-y-2">
                            <div className="w-3/4 h-5 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                            <div className="w-full h-4 bg-slate-100 dark:bg-slate-700 rounded-lg" />
                        </div>
                        <div className="w-16 h-4 bg-slate-100 dark:bg-slate-700 rounded-lg hidden sm:block" />
                        <div className="w-4 h-4 bg-slate-100 dark:bg-slate-700 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function SummaryLoading() {
    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans transition-colors">
            <Navbar />

            <main className="pt-28 pb-20 px-6">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-white text-slate-600 px-4 py-2 rounded-full text-sm font-bold mb-6 shadow-sm">
                            <BookOpen size={16} />
                            สรุปเนื้อหา
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-800 leading-tight mb-4">
                            📚 เลือกบทที่ต้องการอ่าน
                        </h1>
                        <p className="text-slate-500 text-lg max-w-xl mx-auto">
                            สรุปเนื้อหาคณิตศาสตร์แบบเข้าใจง่าย พร้อมสูตรและตัวอย่าง
                        </p>
                    </div>

                    {/* Search & Filter skeleton */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4 mb-6">
                        {/* Search Input skeleton */}
                        <div className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />

                        {/* Category Filter skeleton - expanded to 8 categories */}
                        <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <div
                                    key={i}
                                    className="w-16 h-9 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse"
                                    style={{ animationDelay: `${i * 50}ms` }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Loading indicator */}
                    <div className="flex items-center justify-center gap-2 text-slate-500 mb-6">
                        <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        <span className="text-sm font-medium">กำลังโหลดบทสรุป...</span>
                    </div>

                    {/* Category Groups skeleton */}
                    <div className="space-y-6">
                        <CategoryGroupSkeleton itemCount={4} />
                        <CategoryGroupSkeleton itemCount={3} />
                        <CategoryGroupSkeleton itemCount={2} />
                    </div>
                </div>
            </main>
        </div>
    );
}
