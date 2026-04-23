type AvatarCategory = "kids" | "male" | "female" | "animals" | "monsters";

type AvatarSeed = {
    emoji: string;
    start: string;
    end: string;
    accent: string;
};

const AVATAR_SEEDS: Record<AvatarCategory, AvatarSeed[]> = {
    kids: [
        { emoji: "🧒", start: "#fde68a", end: "#fb923c", accent: "#fff7ed" },
        { emoji: "👦", start: "#bfdbfe", end: "#60a5fa", accent: "#eff6ff" },
        { emoji: "👧", start: "#fbcfe8", end: "#f472b6", accent: "#fdf2f8" },
        { emoji: "🧒", start: "#c7d2fe", end: "#818cf8", accent: "#eef2ff" },
        { emoji: "👦", start: "#a7f3d0", end: "#34d399", accent: "#ecfdf5" },
        { emoji: "👧", start: "#fecaca", end: "#f87171", accent: "#fef2f2" },
        { emoji: "🧒", start: "#ddd6fe", end: "#8b5cf6", accent: "#f5f3ff" },
        { emoji: "👦", start: "#bae6fd", end: "#38bdf8", accent: "#f0f9ff" },
    ],
    male: [
        { emoji: "👦", start: "#bfdbfe", end: "#2563eb", accent: "#eff6ff" },
        { emoji: "🧑", start: "#93c5fd", end: "#1d4ed8", accent: "#dbeafe" },
        { emoji: "👨", start: "#a7f3d0", end: "#059669", accent: "#ecfdf5" },
        { emoji: "👦", start: "#fde68a", end: "#d97706", accent: "#fffbeb" },
        { emoji: "🧑", start: "#c7d2fe", end: "#6366f1", accent: "#eef2ff" },
        { emoji: "👨", start: "#fbcfe8", end: "#db2777", accent: "#fdf2f8" },
        { emoji: "👦", start: "#fdba74", end: "#ea580c", accent: "#fff7ed" },
        { emoji: "🧑", start: "#99f6e4", end: "#0f766e", accent: "#f0fdfa" },
    ],
    female: [
        { emoji: "👧", start: "#fbcfe8", end: "#ec4899", accent: "#fdf2f8" },
        { emoji: "👩", start: "#fecdd3", end: "#e11d48", accent: "#fff1f2" },
        { emoji: "👱‍♀️", start: "#fde68a", end: "#f59e0b", accent: "#fffbeb" },
        { emoji: "👧", start: "#ddd6fe", end: "#8b5cf6", accent: "#f5f3ff" },
        { emoji: "👩", start: "#bfdbfe", end: "#3b82f6", accent: "#eff6ff" },
        { emoji: "👩‍🦰", start: "#fdba74", end: "#f97316", accent: "#fff7ed" },
        { emoji: "👧", start: "#a7f3d0", end: "#10b981", accent: "#ecfdf5" },
        { emoji: "👩", start: "#f9a8d4", end: "#db2777", accent: "#fdf2f8" },
    ],
    animals: [
        { emoji: "🐶", start: "#fde68a", end: "#f59e0b", accent: "#fffbeb" },
        { emoji: "🐱", start: "#fdba74", end: "#f97316", accent: "#fff7ed" },
        { emoji: "🐼", start: "#d1d5db", end: "#6b7280", accent: "#f9fafb" },
        { emoji: "🦊", start: "#fdba74", end: "#ea580c", accent: "#fff7ed" },
        { emoji: "🐯", start: "#fde68a", end: "#d97706", accent: "#fffbeb" },
        { emoji: "🐻", start: "#d6d3d1", end: "#8b5e3c", accent: "#fafaf9" },
        { emoji: "🐨", start: "#c7d2fe", end: "#6366f1", accent: "#eef2ff" },
        { emoji: "🦁", start: "#fcd34d", end: "#f59e0b", accent: "#fffbeb" },
    ],
    monsters: [
        { emoji: "👾", start: "#c4b5fd", end: "#7c3aed", accent: "#f5f3ff" },
        { emoji: "👹", start: "#fda4af", end: "#e11d48", accent: "#fff1f2" },
        { emoji: "👻", start: "#e5e7eb", end: "#9ca3af", accent: "#ffffff" },
        { emoji: "🤖", start: "#93c5fd", end: "#0ea5e9", accent: "#f0f9ff" },
        { emoji: "🐲", start: "#86efac", end: "#16a34a", accent: "#f0fdf4" },
        { emoji: "👺", start: "#fdba74", end: "#dc2626", accent: "#fff7ed" },
        { emoji: "🧟", start: "#bef264", end: "#65a30d", accent: "#f7fee7" },
        { emoji: "🛸", start: "#a5b4fc", end: "#4f46e5", accent: "#eef2ff" },
    ],
};

function createAvatarDataUrl(seed: AvatarSeed, label: string) {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
            <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${seed.start}" />
                    <stop offset="100%" stop-color="${seed.end}" />
                </linearGradient>
            </defs>
            <rect width="128" height="128" rx="32" fill="url(#bg)" />
            <circle cx="64" cy="64" r="42" fill="${seed.accent}" opacity="0.92" />
            <circle cx="24" cy="26" r="10" fill="white" opacity="0.28" />
            <circle cx="102" cy="96" r="12" fill="white" opacity="0.18" />
            <text x="64" y="78" font-size="46" text-anchor="middle" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${seed.emoji}</text>
            <text x="64" y="112" font-size="10" text-anchor="middle" fill="rgba(15,23,42,0.72)" font-family="Arial,sans-serif">${label}</text>
        </svg>
    `.trim();

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const LOCAL_AVATAR_FALLBACKS: Record<AvatarCategory, string[]> = {
    kids: AVATAR_SEEDS.kids.map((seed, index) => createAvatarDataUrl(seed, `Kid ${index + 1}`)),
    male: AVATAR_SEEDS.male.map((seed, index) => createAvatarDataUrl(seed, `Male ${index + 1}`)),
    female: AVATAR_SEEDS.female.map((seed, index) => createAvatarDataUrl(seed, `Female ${index + 1}`)),
    animals: AVATAR_SEEDS.animals.map((seed, index) => createAvatarDataUrl(seed, `Animal ${index + 1}`)),
    monsters: AVATAR_SEEDS.monsters.map((seed, index) => createAvatarDataUrl(seed, `Monster ${index + 1}`)),
};
