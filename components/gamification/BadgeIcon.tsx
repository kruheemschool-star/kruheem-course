'use client';

import { BadgeRank } from '@/types/gamification';

interface BadgeIconProps {
    rank: BadgeRank;
    isUnlocked: boolean;
    isCurrent?: boolean;
    size?: number;
}

// Bronze Medal - Shield with ribbon
const BronzeMedal = ({ size, isUnlocked }: { size: number; isUnlocked: boolean }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Ribbon */}
        <path d="M22 8L20 24H26L24 8H22Z" fill={isUnlocked ? "#F87171" : "#CBD5E1"} />
        <path d="M40 8L42 24H36L38 8H40Z" fill={isUnlocked ? "#F87171" : "#CBD5E1"} />
        {/* Shield body */}
        <path d="M32 56L12 40V20C12 18 14 16 16 16H48C50 16 52 18 52 20V40L32 56Z"
            fill={isUnlocked ? "url(#bronze-gradient)" : "#E2E8F0"}
            stroke={isUnlocked ? "#B45309" : "#94A3B8"}
            strokeWidth="2" />
        {/* Star center */}
        <path d="M32 26L34.5 33H42L36 38L38.5 45L32 40L25.5 45L28 38L22 33H29.5L32 26Z"
            fill={isUnlocked ? "#FCD34D" : "#CBD5E1"} />
        <defs>
            <linearGradient id="bronze-gradient" x1="32" y1="16" x2="32" y2="56" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F59E0B" />
                <stop offset="1" stopColor="#B45309" />
            </linearGradient>
        </defs>
    </svg>
);

// Silver Medal - Circle medal with ribbon
const SilverMedal = ({ size, isUnlocked }: { size: number; isUnlocked: boolean }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Ribbon */}
        <path d="M20 4L26 20H22L16 4H20Z" fill={isUnlocked ? "#60A5FA" : "#CBD5E1"} />
        <path d="M44 4L38 20H42L48 4H44Z" fill={isUnlocked ? "#60A5FA" : "#CBD5E1"} />
        <path d="M26 4H38V10L32 16L26 10V4Z" fill={isUnlocked ? "#3B82F6" : "#94A3B8"} />
        {/* Circle medal */}
        <circle cx="32" cy="38" r="20" fill={isUnlocked ? "url(#silver-gradient)" : "#E2E8F0"}
            stroke={isUnlocked ? "#64748B" : "#94A3B8"} strokeWidth="2" />
        <circle cx="32" cy="38" r="14" fill={isUnlocked ? "#F8FAFC" : "#F1F5F9"}
            stroke={isUnlocked ? "#94A3B8" : "#CBD5E1"} strokeWidth="1" />
        {/* Star */}
        <path d="M32 28L34 34H40L35 38L37 44L32 40L27 44L29 38L24 34H30L32 28Z"
            fill={isUnlocked ? "#64748B" : "#CBD5E1"} />
        <defs>
            <linearGradient id="silver-gradient" x1="32" y1="18" x2="32" y2="58" gradientUnits="userSpaceOnUse">
                <stop stopColor="#E2E8F0" />
                <stop offset="1" stopColor="#94A3B8" />
            </linearGradient>
        </defs>
    </svg>
);

// Gold Trophy - Crown with wings
const GoldTrophy = ({ size, isUnlocked }: { size: number; isUnlocked: boolean }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Wings */}
        <path d="M8 28C8 28 4 32 4 38C4 44 10 48 14 46C18 44 18 38 16 34L8 28Z"
            fill={isUnlocked ? "#FCD34D" : "#E2E8F0"} />
        <path d="M56 28C56 28 60 32 60 38C60 44 54 48 50 46C46 44 46 38 48 34L56 28Z"
            fill={isUnlocked ? "#FCD34D" : "#E2E8F0"} />
        {/* Crown/Trophy body */}
        <path d="M18 24L14 16L24 22L32 12L40 22L50 16L46 24H18Z"
            fill={isUnlocked ? "url(#gold-gradient)" : "#E2E8F0"}
            stroke={isUnlocked ? "#B45309" : "#94A3B8"} strokeWidth="1.5" />
        <path d="M18 24V40C18 44 24 48 32 48C40 48 46 44 46 40V24H18Z"
            fill={isUnlocked ? "url(#gold-gradient)" : "#E2E8F0"}
            stroke={isUnlocked ? "#B45309" : "#94A3B8"} strokeWidth="1.5" />
        {/* Base */}
        <path d="M22 48L20 52H44L42 48H22Z" fill={isUnlocked ? "#B45309" : "#94A3B8"} />
        <path d="M20 52L18 56H46L44 52H20Z" fill={isUnlocked ? "#92400E" : "#64748B"} />
        {/* Star */}
        <path d="M32 28L34 33H39L35 36L37 41L32 38L27 41L29 36L25 33H30L32 28Z"
            fill={isUnlocked ? "#FEF3C7" : "#F1F5F9"} />
        <defs>
            <linearGradient id="gold-gradient" x1="32" y1="12" x2="32" y2="48" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FCD34D" />
                <stop offset="1" stopColor="#F59E0B" />
            </linearGradient>
        </defs>
    </svg>
);

// Diamond - Gem with sparkles
const DiamondGem = ({ size, isUnlocked }: { size: number; isUnlocked: boolean }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Sparkles */}
        <path d="M12 12L14 16L12 20L10 16L12 12Z" fill={isUnlocked ? "#60A5FA" : "#CBD5E1"} />
        <path d="M52 8L54 12L52 16L50 12L52 8Z" fill={isUnlocked ? "#60A5FA" : "#CBD5E1"} />
        <path d="M8 32L10 34L8 36L6 34L8 32Z" fill={isUnlocked ? "#93C5FD" : "#E2E8F0"} />
        {/* Diamond top */}
        <path d="M20 20H44L50 30H14L20 20Z"
            fill={isUnlocked ? "url(#diamond-gradient-top)" : "#E2E8F0"}
            stroke={isUnlocked ? "#1D4ED8" : "#94A3B8"} strokeWidth="1.5" />
        {/* Diamond bottom */}
        <path d="M14 30L32 54L50 30H14Z"
            fill={isUnlocked ? "url(#diamond-gradient)" : "#F1F5F9"}
            stroke={isUnlocked ? "#1D4ED8" : "#94A3B8"} strokeWidth="1.5" />
        {/* Facets */}
        <path d="M26 30L32 54L38 30H26Z" fill={isUnlocked ? "#BFDBFE" : "#E2E8F0"} opacity="0.7" />
        <path d="M32 20V30" stroke={isUnlocked ? "#60A5FA" : "#CBD5E1"} strokeWidth="1" />
        <defs>
            <linearGradient id="diamond-gradient" x1="32" y1="30" x2="32" y2="54" gradientUnits="userSpaceOnUse">
                <stop stopColor="#93C5FD" />
                <stop offset="1" stopColor="#3B82F6" />
            </linearGradient>
            <linearGradient id="diamond-gradient-top" x1="32" y1="20" x2="32" y2="30" gradientUnits="userSpaceOnUse">
                <stop stopColor="#DBEAFE" />
                <stop offset="1" stopColor="#93C5FD" />
            </linearGradient>
        </defs>
    </svg>
);

// Legendary Crown - Golden crown with gems
const LegendaryCrown = ({ size, isUnlocked }: { size: number; isUnlocked: boolean }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Glow effect for unlocked */}
        {isUnlocked && (
            <circle cx="32" cy="32" r="28" fill="url(#legendary-glow)" opacity="0.3" />
        )}
        {/* Crown points */}
        <path d="M8 44L12 20L22 32L32 16L42 32L52 20L56 44H8Z"
            fill={isUnlocked ? "url(#crown-gradient)" : "#E2E8F0"}
            stroke={isUnlocked ? "#B45309" : "#94A3B8"} strokeWidth="2" />
        {/* Crown base */}
        <path d="M8 44H56V50C56 52 54 54 52 54H12C10 54 8 52 8 50V44Z"
            fill={isUnlocked ? "#B45309" : "#94A3B8"} />
        {/* Gems */}
        <circle cx="32" cy="24" r="4" fill={isUnlocked ? "#EF4444" : "#CBD5E1"} />
        <circle cx="20" cy="34" r="3" fill={isUnlocked ? "#8B5CF6" : "#CBD5E1"} />
        <circle cx="44" cy="34" r="3" fill={isUnlocked ? "#10B981" : "#CBD5E1"} />
        {/* Star gems on points */}
        <circle cx="12" cy="22" r="2" fill={isUnlocked ? "#FEF3C7" : "#E2E8F0"} />
        <circle cx="32" cy="18" r="2" fill={isUnlocked ? "#FEF3C7" : "#E2E8F0"} />
        <circle cx="52" cy="22" r="2" fill={isUnlocked ? "#FEF3C7" : "#E2E8F0"} />
        <defs>
            <linearGradient id="crown-gradient" x1="32" y1="16" x2="32" y2="44" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FCD34D" />
                <stop offset="1" stopColor="#F59E0B" />
            </linearGradient>
            <radialGradient id="legendary-glow" cx="32" cy="32" r="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FCD34D" />
                <stop offset="1" stopColor="#FCD34D" stopOpacity="0" />
            </radialGradient>
        </defs>
    </svg>
);

// Main Badge Icon Component
export default function BadgeIcon({ rank, isUnlocked, isCurrent, size = 48 }: BadgeIconProps) {
    const IconComponent = {
        bronze: BronzeMedal,
        silver: SilverMedal,
        gold: GoldTrophy,
        diamond: DiamondGem,
        legendary: LegendaryCrown,
    }[rank];

    return (
        <div
            className={`
        relative transition-transform duration-300
        ${isUnlocked ? 'hover:scale-110' : 'opacity-50 grayscale'}
        ${isCurrent ? 'animate-pulse-subtle' : ''}
      `}
        >
            <IconComponent size={size} isUnlocked={isUnlocked} />

            {/* Glow effect for current badge */}
            {isCurrent && isUnlocked && (
                <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-md animate-glow" />
            )}
        </div>
    );
}
