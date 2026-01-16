'use client';

import { BadgeInfo, BadgeRank, UserGamificationProgress } from '@/types/gamification';

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

    // Already legendary
    if (!nextBadge) {
        return (
            <div className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 rounded-2xl p-4 text-white">
                <div className="flex items-center gap-3">
                    <span className="text-3xl animate-pulse">🌈</span>
                    <div>
                        <p className="font-bold text-lg">ตำนาน! ยอดเยี่ยมมาก!</p>
                        <p className="text-white/80 text-sm">คุณเรียนจบครบทุกคอร์สแล้ว ({completedCourses}/{totalCourses})</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            {/* Progress info */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{currentBadge?.icon || '🥉'}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                        {currentBadge?.thaiLabel}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                        {nextBadge.thaiLabel}
                    </span>
                    <span className="text-xl">{nextBadge.icon}</span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                    className={`absolute left-0 top-0 h-full bg-gradient-to-r ${nextBadge.bgGradient} transition-all duration-1000 ease-out rounded-full`}
                    style={{ width: `${progressToNext}%` }}
                >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
            </div>

            {/* Message */}
            <div className="mt-3 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    {coursesNeededForNext === 1 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            อีกแค่ 1 คอร์ส จะได้เลื่อนยศเป็น {nextBadge.thaiLabel} แล้ว! 🔥
                        </span>
                    ) : (
                        <>
                            อีก <span className="font-bold text-indigo-600 dark:text-indigo-400">{coursesNeededForNext} คอร์ส</span>
                            {' '}จะได้เลื่อนยศเป็น{' '}
                            <span className="font-bold">{nextBadge.thaiLabel}</span> {nextBadge.icon}
                        </>
                    )}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    เรียนจบแล้ว {completedCourses} จาก {totalCourses} คอร์ส
                </p>
            </div>
        </div>
    );
}
