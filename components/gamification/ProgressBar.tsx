'use client';

import { BadgeInfo, UserGamificationProgress } from '@/types/gamification';
import { ChevronRight, Sparkles } from 'lucide-react';

interface ProgressBarProps {
    gamificationData: UserGamificationProgress;
    badges: BadgeInfo[];
}

export default function ProgressBar({ gamificationData, badges }: ProgressBarProps) {
    const {
        currentRank,
        nextRank,
        progressToNext,
        coursesNeededForNext,
        completedCourses,
        totalCourses
    } = gamificationData;

    const currentBadge = badges.find(b => b.rank === currentRank);
    const nextBadge = badges.find(b => b.rank === nextRank);

    // Legendary achieved
    if (!nextBadge) {
        return (
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                <Sparkles className="text-purple-500" size={20} />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-purple-700">Legendary Status Achieved!</p>
                    <p className="text-xs text-purple-500">All {completedCourses} courses completed</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4">
            {/* Current Level */}
            <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">{currentBadge?.label}</span>
            </div>

            {/* Progress Bar */}
            <div className="flex-1">
                <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700 ease-out rounded-full"
                        style={{ width: `${progressToNext}%` }}
                    />
                </div>
            </div>

            {/* Next Level */}
            <div className="flex items-center gap-2">
                <ChevronRight size={14} className="text-slate-400" />
                <span className="text-sm font-semibold text-slate-500">{nextBadge.label}</span>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {coursesNeededForNext} more
                </span>
            </div>
        </div>
    );
}
