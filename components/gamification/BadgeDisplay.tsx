'use client';

import { BadgeInfo, BadgeRank, UserGamificationProgress } from '@/types/gamification';
import { Lock } from 'lucide-react';
import BadgeIcon from './BadgeIcon';

interface BadgeDisplayProps {
    badges: BadgeInfo[];
    gamificationData: UserGamificationProgress;
}

export default function BadgeDisplay({ badges, gamificationData }: BadgeDisplayProps) {
    const { currentRank, completedCourses, totalCourses } = gamificationData;

    const isUnlocked = (badge: BadgeInfo) => completedCourses >= badge.minCourses;
    const isCurrent = (badge: BadgeInfo) => badge.rank === currentRank;

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-2">
                    🏆 Achievement Level
                </h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                    {completedCourses} of {totalCourses} courses completed
                </span>
            </div>

            {/* Badges Row with Progress Line */}
            <div className="relative">
                {/* Progress Line Background */}
                <div className="absolute top-8 left-8 right-8 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />

                {/* Progress Line Fill */}
                <div
                    className="absolute top-8 left-8 h-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                    style={{
                        width: totalCourses > 0
                            ? `calc(${Math.min(100, (completedCourses / totalCourses) * 100)}% - 4rem)`
                            : '0%'
                    }}
                />

                {/* Badges */}
                <div className="relative flex items-start justify-between">
                    {badges.map((badge) => {
                        const unlocked = isUnlocked(badge);
                        const current = isCurrent(badge);

                        return (
                            <div
                                key={badge.rank}
                                className="flex flex-col items-center group relative z-10"
                            >
                                {/* Badge Container with Glow */}
                                <div
                                    className={`
                    relative w-16 h-16 flex items-center justify-center rounded-full
                    transition-all duration-500 cursor-pointer
                    ${unlocked
                                            ? 'bg-white dark:bg-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-1'
                                            : 'bg-slate-100 dark:bg-slate-800'
                                        }
                    ${current ? 'ring-4 ring-emerald-400/50 ring-offset-2 dark:ring-offset-slate-900' : ''}
                  `}
                                >
                                    {/* Glow Effect for Unlocked */}
                                    {unlocked && (
                                        <div className={`
                      absolute inset-0 rounded-full 
                      ${current ? 'animate-pulse bg-emerald-400/20' : ''}
                      ${badge.rank === 'legendary' && unlocked ? 'animate-glow-rainbow' : ''}
                    `} />
                                    )}

                                    {/* Icon */}
                                    <BadgeIcon
                                        rank={badge.rank}
                                        isUnlocked={unlocked}
                                        isCurrent={current}
                                        size={40}
                                    />

                                    {/* Lock Overlay */}
                                    {!unlocked && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 dark:bg-slate-800/80 rounded-full">
                                            <Lock size={16} className="text-slate-400" />
                                        </div>
                                    )}

                                    {/* Current Checkmark */}
                                    {current && unlocked && (
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900">
                                            <span className="text-[10px] text-white font-bold">✓</span>
                                        </div>
                                    )}
                                </div>

                                {/* Label */}
                                <div className="mt-3 text-center">
                                    <p className={`text-xs font-bold ${unlocked ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                                        {badge.label}
                                    </p>
                                    <p className={`text-[10px] ${unlocked ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300 dark:text-slate-600'}`}>
                                        {badge.minCourses === 0 ? 'Start' : `${badge.minCourses} ${badge.minCourses === 1 ? 'course' : 'courses'}`}
                                    </p>
                                </div>

                                {/* Hover Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20 scale-95 group-hover:scale-100">
                                    <div className="bg-slate-800 dark:bg-slate-700 text-white text-xs px-4 py-3 rounded-xl shadow-xl whitespace-nowrap min-w-[140px]">
                                        <p className="font-bold text-sm mb-1">{badge.label}</p>
                                        <p className="text-slate-300 text-[11px]">{badge.description}</p>

                                        {unlocked ? (
                                            <div className="mt-2 pt-2 border-t border-slate-600">
                                                <span className="text-emerald-400 text-[10px] font-semibold">✓ Unlocked!</span>
                                            </div>
                                        ) : (
                                            <div className="mt-2 pt-2 border-t border-slate-600">
                                                <span className="text-amber-400 text-[10px]">
                                                    🔒 {badge.minCourses - completedCourses} more to unlock
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {/* Arrow */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-slate-800 dark:border-t-slate-700" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Custom Animations */}
            <style jsx global>{`
        @keyframes glow-rainbow {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(251, 191, 36, 0.4), 0 0 40px rgba(251, 191, 36, 0.2);
          }
          25% { 
            box-shadow: 0 0 20px rgba(244, 114, 182, 0.4), 0 0 40px rgba(244, 114, 182, 0.2);
          }
          50% { 
            box-shadow: 0 0 20px rgba(96, 165, 250, 0.4), 0 0 40px rgba(96, 165, 250, 0.2);
          }
          75% { 
            box-shadow: 0 0 20px rgba(52, 211, 153, 0.4), 0 0 40px rgba(52, 211, 153, 0.2);
          }
        }
        .animate-glow-rainbow {
          animation: glow-rainbow 4s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
}
