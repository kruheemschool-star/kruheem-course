'use client';

import { BadgeInfo, BadgeRank, UserGamificationProgress } from '@/types/gamification';
import { Lock } from 'lucide-react';

interface BadgeDisplayProps {
    badges: BadgeInfo[];
    gamificationData: UserGamificationProgress;
}

export default function BadgeDisplay({ badges, gamificationData }: BadgeDisplayProps) {
    const { currentRank, completedCourses } = gamificationData;

    const isUnlocked = (badge: BadgeInfo) => {
        return completedCourses >= badge.minCourses;
    };

    const isCurrent = (badge: BadgeInfo) => {
        return badge.rank === currentRank;
    };

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🏆</span>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">ตราสัญลักษณ์</h3>
            </div>

            {/* Badges Grid */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                {badges.map((badge) => {
                    const unlocked = isUnlocked(badge);
                    const current = isCurrent(badge);

                    return (
                        <div
                            key={badge.rank}
                            className="relative group"
                            title={unlocked
                                ? `${badge.thaiLabel} - ปลดล็อกแล้ว!`
                                : `${badge.thaiLabel} - ${badge.description}`
                            }
                        >
                            {/* Badge Container */}
                            <div
                                className={`
                  relative w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center
                  transition-all duration-500 cursor-pointer
                  ${unlocked
                                        ? `bg-gradient-to-br ${badge.bgGradient} shadow-lg hover:scale-110 hover:shadow-xl`
                                        : 'bg-slate-200 dark:bg-slate-700'
                                    }
                  ${current ? 'ring-4 ring-amber-400 ring-offset-2 dark:ring-offset-slate-900 scale-105' : ''}
                `}
                            >
                                {/* Badge Icon or Lock */}
                                {unlocked ? (
                                    <span className="text-3xl md:text-4xl drop-shadow filter drop-shadow-lg">
                                        {badge.icon}
                                    </span>
                                ) : (
                                    <div className="relative">
                                        {/* Silhouette of badge icon */}
                                        <span className="text-3xl md:text-4xl opacity-20 filter blur-[1px]">
                                            {badge.icon}
                                        </span>
                                        {/* Lock overlay */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                        </div>
                                    </div>
                                )}

                                {/* Current badge glow effect */}
                                {current && unlocked && (
                                    <div className="absolute inset-0 rounded-2xl animate-pulse bg-amber-400/20" />
                                )}
                            </div>

                            {/* Badge Label */}
                            <div className="mt-2 text-center">
                                <p className={`text-xs font-bold ${unlocked ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                                    {badge.thaiLabel}
                                </p>
                                <p className={`text-[10px] ${unlocked ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300 dark:text-slate-600'}`}>
                                    {badge.minCourses} คอร์ส
                                </p>
                            </div>

                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                <div className="bg-slate-800 dark:bg-slate-700 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                                    <p className="font-bold">{badge.thaiLabel}</p>
                                    <p className="text-slate-300">{badge.description}</p>
                                    {!unlocked && (
                                        <p className="text-amber-400 mt-1">
                                            อีก {badge.minCourses - completedCourses} คอร์ส!
                                        </p>
                                    )}
                                </div>
                                {/* Arrow */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
