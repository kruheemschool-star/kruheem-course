"use client";

import Navbar from '@/components/Navbar';
import { BookOpen } from 'lucide-react';

// Skeleton component for summary cards
function SummaryCardSkeleton() {
    return (
        <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-pulse">
            {/* Number skeleton */}
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700" />

            {/* Content skeleton */}
            <div className="flex-1 min-w-0 py-1 space-y-3">
                {/* Category badge skeleton */}
                <div className="w-12 h-4 bg-slate-200 dark:bg-slate-700 rounded-full" />

                {/* Title skeleton */}
                <div className="w-3/4 h-5 bg-slate-200 dark:bg-slate-700 rounded-lg" />

                {/* Excerpt skeleton */}
                <div className="w-full h-4 bg-slate-100 dark:bg-slate-700 rounded-lg" />
            </div>

            {/* Meta skeleton */}
            <div className="flex-shrink-0 hidden sm:flex items-center gap-3">
                <div className="w-16 h-4 bg-slate-100 dark:bg-slate-700 rounded-lg" />
            </div>

            {/* Arrow skeleton */}
            <div className="flex-shrink-0 w-4 h-4 bg-slate-100 dark:bg-slate-700 rounded" />
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

                        {/* Category Filter skeleton */}
                        <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className="w-16 h-9 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse"
                                    style={{ animationDelay: `${i * 100}ms` }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Loading indicator */}
                    <div className="flex items-center justify-center gap-2 text-slate-500 mb-4">
                        <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        <span className="text-sm font-medium">กำลังโหลดบทสรุป...</span>
                    </div>

                    {/* Card Grid skeleton */}
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div
                                key={i}
                                style={{ animationDelay: `${i * 50}ms` }}
                            >
                                <SummaryCardSkeleton />
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
