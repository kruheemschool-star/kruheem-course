// Badge rank definitions for gamification system
export type BadgeRank = 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary';

export interface BadgeInfo {
    rank: BadgeRank;
    label: string;        // English label
    description: string;
    color: string;
    bgColor: string;
    borderColor: string;
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

// Badge configuration - English labels, professional colors
export const BADGE_RANKS: BadgeInfo[] = [
    {
        rank: 'bronze',
        label: 'Bronze',
        description: 'Getting Started',
        color: '#CD7F32',
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-300',
        minCourses: 0,
    },
    {
        rank: 'silver',
        label: 'Silver',
        description: '1-2 courses completed',
        color: '#9CA3AF',
        bgColor: 'bg-slate-100',
        borderColor: 'border-slate-300',
        minCourses: 1,
    },
    {
        rank: 'gold',
        label: 'Gold',
        description: 'Halfway there',
        color: '#F59E0B',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-400',
        minCourses: 3,
    },
    {
        rank: 'diamond',
        label: 'Diamond',
        description: 'Almost complete',
        color: '#60A5FA',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-400',
        minCourses: 6,
    },
    {
        rank: 'legendary',
        label: 'Legendary',
        description: 'All courses completed',
        color: '#A855F7',
        bgColor: 'bg-gradient-to-br from-purple-100 to-pink-100',
        borderColor: 'border-purple-400',
        minCourses: 10,
    },
];

// Helper to get dynamic thresholds based on total courses
export function getDynamicBadgeThresholds(totalCourses: number): BadgeInfo[] {
    const halfwayPoint = Math.max(1, Math.ceil(totalCourses / 2));
    const almostComplete = Math.max(1, Math.ceil(totalCourses * 0.8));

    return BADGE_RANKS.map(badge => {
        switch (badge.rank) {
            case 'bronze':
                return { ...badge, minCourses: 0, description: 'Getting Started' };
            case 'silver':
                return { ...badge, minCourses: 1, description: '1-2 courses' };
            case 'gold':
                return { ...badge, minCourses: halfwayPoint, description: `${halfwayPoint} courses` };
            case 'diamond':
                return { ...badge, minCourses: almostComplete, description: `${almostComplete} courses` };
            case 'legendary':
                return { ...badge, minCourses: totalCourses, description: `All ${totalCourses} courses` };
            default:
                return badge;
        }
    });
}
