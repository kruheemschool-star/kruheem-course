"use client";

import React from "react";

// Skeleton base component
const Skeleton = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg ${className}`} />
);

// Profile Card Skeleton
export const ProfileCardSkeleton = () => (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-6">
        <Skeleton className="w-28 h-28 rounded-full flex-shrink-0" />
        <div className="flex-1 text-center sm:text-left space-y-3 w-full">
            <Skeleton className="h-6 w-32 mx-auto sm:mx-0" />
            <Skeleton className="h-8 w-48 mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-64 mx-auto sm:mx-0" />
        </div>
    </div>
);

// Search Card Skeleton
export const SearchCardSkeleton = () => (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-14 w-full rounded-2xl" />
    </div>
);

// Notification Card Skeleton
export const NotificationCardSkeleton = () => (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-6 w-40" />
        </div>
        <div className="space-y-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                    <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// Support Card Skeleton
export const SupportCardSkeleton = () => (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-6 w-44" />
        </div>
        <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <div className="flex gap-2">
                <Skeleton className="h-10 flex-1 rounded-xl" />
                <Skeleton className="h-10 w-24 rounded-xl" />
            </div>
        </div>
    </div>
);

// Course Card Skeleton
export const CourseCardSkeleton = () => (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-100 dark:border-slate-800">
        <Skeleton className="aspect-video w-full rounded-none" />
        <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="pt-4">
                <Skeleton className="h-12 w-full rounded-xl" />
            </div>
        </div>
    </div>
);

// Full Page Skeleton
export const MyCoursesSkeleton = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ProfileCardSkeleton />
            <SearchCardSkeleton />
            <NotificationCardSkeleton />
            <SupportCardSkeleton />
        </div>

        {/* Course Section Header */}
        <div className="flex items-center gap-3 pt-8">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-8 w-48" />
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
                <CourseCardSkeleton key={i} />
            ))}
        </div>
    </div>
);

export default MyCoursesSkeleton;
