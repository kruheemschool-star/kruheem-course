// Badge rank definitions for gamification system
export type BadgeRank = 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary';

export interface BadgeInfo {
    rank: BadgeRank;
    label: string;
    thaiLabel: string;
    description: string;
    icon: string;
    color: string;
    bgGradient: string;
    minCourses: number;
}

export interface UserGamificationProgress {
    completedCourses: number;
    totalCourses: number;
    currentRank: BadgeRank;
    nextRank: BadgeRank | null;
    progressToNext: number; // 0-100%
    coursesNeededForNext: number;
    completedCourseIds: string[];
}

// Badge configuration - dynamic based on total courses
export const BADGE_RANKS: BadgeInfo[] = [
    {
        rank: 'bronze',
        label: 'Beginner',
        thaiLabel: 'ผู้เริ่มต้น',
        description: 'เริ่มต้นการเดินทาง',
        icon: '🥉',
        color: '#CD7F32',
        bgGradient: 'from-amber-600 to-amber-800',
        minCourses: 0,
    },
    {
        rank: 'silver',
        label: 'Effort',
        thaiLabel: 'ผู้มีความพยายาม',
        description: 'เรียนจบ 1-2 คอร์ส',
        icon: '🥈',
        color: '#C0C0C0',
        bgGradient: 'from-slate-400 to-slate-600',
        minCourses: 1,
    },
    {
        rank: 'gold',
        label: 'Expert',
        thaiLabel: 'ผู้ชำนาญ',
        description: 'เรียนจบครึ่งทาง',
        icon: '🥇',
        color: '#FFD700',
        bgGradient: 'from-yellow-400 to-amber-500',
        minCourses: 3, // Will be dynamic: Math.ceil(total/2)
    },
    {
        rank: 'diamond',
        label: 'Master',
        thaiLabel: 'ยอดฝีมือ',
        description: 'เรียนเกือบครบ',
        icon: '💎',
        color: '#B9F2FF',
        bgGradient: 'from-cyan-300 to-blue-500',
        minCourses: 6, // Will be dynamic: Math.ceil(total * 0.8)
    },
    {
        rank: 'legendary',
        label: 'Legendary',
        thaiLabel: 'ตำนาน',
        description: 'เทพเจ้า - เรียนครบทุกคอร์ส',
        icon: '🌈',
        color: '#FF69B4',
        bgGradient: 'from-purple-500 via-pink-500 to-orange-400',
        minCourses: 10, // Will be dynamic: total
    },
];

// Helper to get dynamic thresholds based on total courses
export function getDynamicBadgeThresholds(totalCourses: number): BadgeInfo[] {
    const halfwayPoint = Math.ceil(totalCourses / 2);
    const almostComplete = Math.ceil(totalCourses * 0.8);

    return BADGE_RANKS.map(badge => {
        switch (badge.rank) {
            case 'bronze':
                return { ...badge, minCourses: 0, description: 'เริ่มต้นการเดินทาง' };
            case 'silver':
                return { ...badge, minCourses: 1, description: 'เรียนจบ 1-2 คอร์ส' };
            case 'gold':
                return { ...badge, minCourses: halfwayPoint, description: `เรียนจบ ${halfwayPoint} คอร์ส (ครึ่งทาง)` };
            case 'diamond':
                return { ...badge, minCourses: almostComplete, description: `เรียนจบ ${almostComplete} คอร์ส (เกือบครบ)` };
            case 'legendary':
                return { ...badge, minCourses: totalCourses, description: `เทพเจ้า - เรียนครบ ${totalCourses} คอร์ส` };
            default:
                return badge;
        }
    });
}
