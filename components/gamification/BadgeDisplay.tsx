'use client';

import { BadgeInfo, BadgeRank, UserGamificationProgress } from '@/types/gamification';
import { Lock, Shield, Award, Trophy, Star, Crown } from 'lucide-react';

interface BadgeDisplayProps {
    badges: BadgeInfo[];
    gamificationData: UserGamificationProgress;
}

// Professional shield/medal icons for each rank
const RankIcon = ({ rank, isUnlocked, size = 24 }: { rank: BadgeRank; isUnlocked: boolean; size?: number }) => {
    const baseClass = `transition-all duration-300`;

    const iconProps = {
        size,
        strokeWidth: 1.5,
        className: baseClass,
    };

    if (!isUnlocked) {
        return <Shield {...iconProps} className={`${baseClass} text-slate-300`} />;
    }

    switch (rank) {
        case 'bronze':
            return <Shield {...iconProps} className={`${baseClass} text-amber-600`} />;
        case 'silver':
            return <Award {...iconProps} className={`${baseClass} text-slate-500`} />;
        case 'gold':
            return <Trophy {...iconProps} className={`${baseClass} text-yellow-500`} />;
        case 'diamond':
            return <Star {...iconProps} className={`${baseClass} text-blue-500`} />;
        case 'legendary':
            return <Crown {...iconProps} className={`${baseClass} text-purple-500`} />;
        default:
            return <Shield {...iconProps} />;
    }
};

export default function BadgeDisplay({ badges, gamificationData }: BadgeDisplayProps) {
    const { currentRank, completedCourses } = gamificationData;

    const isUnlocked = (badge: BadgeInfo) => completedCourses >= badge.minCourses;
    const isCurrent = (badge: BadgeInfo) => badge.rank === currentRank;

    return (
        <div className="w-full">
            {/* Minimal Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                    <Trophy size={16} className="text-amber-500" />
                    Achievement Level
                </h3>
                <span className="text-xs text-slate-400">
                    {completedCourses} courses completed
                </span>
            </div>

            {/* Clean Badge Row */}
            <div className="flex items-center justify-between gap-2">
                {badges.map((badge, index) => {
                    const unlocked = isUnlocked(badge);
                    const current = isCurrent(badge);

                    return (
                        <div key={badge.rank} className="flex-1 flex flex-col items-center group relative">
                            {/* Connector Line */}
                            {index > 0 && (
                                <div
                                    className={`absolute left-0 top-6 w-full h-0.5 -translate-x-1/2 ${isUnlocked(badges[index - 1]) ? 'bg-emerald-300' : 'bg-slate-200'
                                        }`}
                                    style={{ width: '100%', left: '-50%' }}
                                />
                            )}

                            {/* Badge Circle */}
                            <div
                                className={`
                  relative z-10 w-12 h-12 rounded-full flex items-center justify-center
                  transition-all duration-300 cursor-pointer
                  ${unlocked
                                        ? `bg-white border-2 ${badge.borderColor} shadow-sm hover:shadow-md hover:scale-110`
                                        : 'bg-slate-100 border-2 border-slate-200'
                                    }
                  ${current ? 'ring-2 ring-offset-2 ring-emerald-400 scale-110' : ''}
                `}
                            >
                                {unlocked ? (
                                    <RankIcon rank={badge.rank} isUnlocked={true} size={22} />
                                ) : (
                                    <Lock size={16} className="text-slate-300" />
                                )}

                                {/* Current indicator */}
                                {current && unlocked && (
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                        <span className="text-[8px] text-white font-bold">✓</span>
                                    </div>
                                )}
                            </div>

                            {/* Label */}
                            <div className="mt-2 text-center">
                                <p className={`text-xs font-semibold ${unlocked ? 'text-slate-700' : 'text-slate-400'}`}>
                                    {badge.label}
                                </p>
                                <p className={`text-[10px] ${unlocked ? 'text-slate-500' : 'text-slate-300'}`}>
                                    {badge.minCourses === 0 ? 'Start' : `${badge.minCourses} ${badge.minCourses === 1 ? 'course' : 'courses'}`}
                                </p>
                            </div>

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                <div className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                                    <p className="font-semibold">{badge.label}</p>
                                    <p className="text-slate-300 text-[10px]">{badge.description}</p>
                                    {!unlocked && (
                                        <p className="text-amber-400 mt-1 text-[10px]">
                                            Need {badge.minCourses - completedCourses} more
                                        </p>
                                    )}
                                </div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
