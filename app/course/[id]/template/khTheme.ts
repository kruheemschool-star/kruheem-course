// ============================================================
// Sales Page Theme System (--kh-* design tokens)
// 9 palettes per the KruHeem Sales Page Design spec.
// Every visual in the template binds to these tokens. The palette
// is chosen per-course by the admin (salesPage.theme.id) and applied
// by KhThemeChrome — visitors cannot change it.
// ============================================================

export interface KhTheme {
    id: string;
    label: string;
    emoji: string;
    /** Core palette — สี 1 Primary, สี 2 Secondary, สี 3 CTA pop, สี 4 Accent */
    p: string;   // primary
    p2: string;  // primary bright (gradients/highlights)
    s: string;   // secondary
    cta1: string; // CTA gradient start
    cta2: string; // CTA gradient end
    ctaText: string; // text on CTA buttons (dark for yellow CTAs, white otherwise)
    acc: string; // accent (badges: Gifted / HD / Advanced)
    /** Dark drama panel gradient stops (price stack / pain-solution) */
    d1: string;
    d2: string;
    d3: string;
    /** Urgency family (countdown / promo) */
    urg: string;
    /** Neutrals */
    ink: string;   // headings
    body: string;  // body text
    mut: string;   // muted text
    paper: string; // page background
}

// ---------- color math (hex in, hex/rgba out) ----------
function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "");
    const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
}
function toHex(r: number, g: number, b: number): string {
    const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return `#${c(r)}${c(g)}${c(b)}`;
}
/** mix a→b by t (0..1) */
function mix(a: string, b: string, t: number): string {
    const [ar, ag, ab] = hexToRgb(a);
    const [br, bg, bb] = hexToRgb(b);
    return toHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}
export const khLighten = (c: string, t: number) => mix(c, "#ffffff", t);
export const khDarken = (c: string, t: number) => mix(c, "#000000", t);
function alpha(hex: string, a: number): string {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
}

/** Build the full ~45-token CSS variable map for a theme. */
export function buildThemeVars(t: KhTheme): Record<string, string> {
    return {
        // สี 1 — Primary
        "--kh-p": t.p,
        "--kh-p2": t.p2,
        "--kh-pT": khLighten(t.p, 0.90),       // soft tint bg
        "--kh-pT2": khLighten(t.p, 0.80),      // stronger tint
        "--kh-pText": khDarken(t.p, 0.42),     // readable text on tint
        "--kh-pLine": khLighten(t.p, 0.62),    // tinted border
        // สี 2 — Secondary
        "--kh-s": t.s,
        "--kh-sT": khLighten(t.s, 0.88),
        "--kh-sText": khDarken(t.s, 0.40),
        // สี 3 — CTA pop
        "--kh-cta1": t.cta1,
        "--kh-cta2": t.cta2,
        "--kh-ctaText": t.ctaText,
        "--kh-ctaT": khLighten(t.cta1, 0.88),
        "--kh-ctaDeep": khDarken(t.cta1, 0.22), // big price text on light bg
        // สี 4 — Accent
        "--kh-acc": t.acc,
        "--kh-accBg": khLighten(t.acc, 0.87),
        "--kh-accText": khDarken(t.acc, 0.40),
        // Dark drama panels
        "--kh-d1": t.d1,
        "--kh-d2": t.d2,
        "--kh-d3": t.d3,
        "--kh-onD": "#ffffff",
        "--kh-onDmut": "rgba(255,255,255,.72)",
        "--kh-onDline": "rgba(255,255,255,.16)",
        // Urgency
        "--kh-urg": t.urg,
        "--kh-urgBg": khLighten(t.urg, 0.90),
        "--kh-urgText": khDarken(t.urg, 0.32),
        // Fixed semantic green (guarantee / "ประหยัด")
        "--kh-good": "#22c55e",
        "--kh-goodBg": "#dcfce7",
        "--kh-goodText": "#15803d",
        // Neutrals / surfaces
        "--kh-paper": t.paper,
        "--kh-tint": khLighten(t.p, 0.94),
        "--kh-ink": t.ink,
        "--kh-body": t.body,
        "--kh-mut": t.mut,
        "--kh-card": "#ffffff",
        "--kh-line": mix(t.ink, "#ffffff", 0.88),
        // Graph-paper grid (derived from primary)
        "--kh-grid": alpha(t.p, 0.055),
        "--kh-grid2": alpha(t.p, 0.10),
        // Soft far shadows (premium feel)
        "--kh-shadow": `0 22px 44px -30px ${alpha(khDarken(t.p, 0.3), 0.45)}`,
        "--kh-shadow-sm": `0 12px 26px -18px ${alpha(khDarken(t.p, 0.3), 0.40)}`,
        "--kh-ctaShadow": `0 16px 34px -16px ${alpha(t.cta1, 0.55)}`,
    };
}

// ---------- the 9 palettes (spec §3.2) ----------
export const KH_THEMES: KhTheme[] = [
    {
        id: "mint", label: "มิ้นต์ครูฮีม", emoji: "🟢",
        p: "#0d9488", p2: "#2dd4bf", s: "#22c55e",
        cta1: "#f59e0b", cta2: "#fbbf24", ctaText: "#422006",
        acc: "#f43f5e",
        d1: "#03332e", d2: "#075e54", d3: "#0a4a42",
        urg: "#e11d48",
        ink: "#0f2a26", body: "#33433f", mut: "#6b7d78", paper: "#f6faf8",
    },
    {
        id: "ocean", label: "ฟ้าโอเชียน", emoji: "🔵",
        p: "#2563eb", p2: "#38bdf8", s: "#0ea5e9",
        cta1: "#f59e0b", cta2: "#fbbf24", ctaText: "#422006",
        acc: "#06b6d4",
        d1: "#0b2a5b", d2: "#16418c", d3: "#10336e",
        urg: "#ef4444",
        ink: "#122a4d", body: "#3a4a63", mut: "#71809a", paper: "#f6f9fd",
    },
    {
        id: "sunny", label: "เหลืองซันนี่", emoji: "🟡",
        p: "#d97706", p2: "#fbbf24", s: "#475569",
        cta1: "#f97316", cta2: "#fb923c", ctaText: "#ffffff",
        acc: "#4f46e5",
        d1: "#431407", d2: "#7c2d12", d3: "#5a1f0c",
        urg: "#dc2626",
        ink: "#3a2a14", body: "#57452c", mut: "#8a7a5e", paper: "#fdfaf3",
    },
    {
        id: "sakura", label: "ชมพูซากุระ", emoji: "🌸",
        p: "#db2777", p2: "#f472b6", s: "#a855f7",
        cta1: "#f59e0b", cta2: "#fbbf24", ctaText: "#432004",
        acc: "#0ea5e9",
        d1: "#4a0f2d", d2: "#701a44", d3: "#591536",
        urg: "#e11d48",
        ink: "#3d1228", body: "#5d3a4c", mut: "#94707f", paper: "#fdf6f9",
    },
    {
        id: "ruby", label: "แดงรูบี้", emoji: "🔴",
        p: "#dc2626", p2: "#f87171", s: "#f43f5e",
        cta1: "#f59e0b", cta2: "#facc15", ctaText: "#422006",
        acc: "#8b5cf6",
        d1: "#450a0a", d2: "#7f1d1d", d3: "#5f1414",
        urg: "#ea580c",
        ink: "#3b1212", body: "#5c3a3a", mut: "#927070", paper: "#fdf6f6",
    },
    {
        id: "royal", label: "ม่วงรอยัล", emoji: "🟣",
        p: "#7c3aed", p2: "#a78bfa", s: "#8b5cf6",
        cta1: "#f59e0b", cta2: "#fbbf24", ctaText: "#3a2404",
        acc: "#06b6d4",
        d1: "#2e1065", d2: "#4c1d95", d3: "#3b1378",
        urg: "#e11d48",
        ink: "#251347", body: "#483a66", mut: "#7e7397", paper: "#faf8fd",
    },
    {
        id: "candy", label: "ลูกอมพาสเทล", emoji: "🍬",
        p: "#3b82f6", p2: "#60a5fa", s: "#ec4899",
        cta1: "#facc15", cta2: "#fde047", ctaText: "#422006",
        acc: "#34d399",
        d1: "#1e3a8a", d2: "#2a4fc0", d3: "#22409c",
        urg: "#f43f5e",
        ink: "#1e2a4a", body: "#44506b", mut: "#7c87a0", paper: "#f4f8ff",
    },
    {
        id: "tropical", label: "ทรอปิคอล", emoji: "🌴",
        p: "#0891b2", p2: "#22d3ee", s: "#84cc16",
        cta1: "#fb923c", cta2: "#fdba74", ctaText: "#4a2008",
        acc: "#ec4899",
        d1: "#083344", d2: "#11586e", d3: "#0c4759",
        urg: "#ef4444",
        ink: "#0e2e38", body: "#3a525c", mut: "#6e8791", paper: "#f3fafb",
    },
    {
        id: "berry", label: "เบอร์รี่ป็อป", emoji: "🫐",
        p: "#9333ea", p2: "#c084fc", s: "#db2777",
        cta1: "#06b6d4", cta2: "#22d3ee", ctaText: "#083344",
        acc: "#facc15",
        d1: "#3b0764", d2: "#5d1d96", d3: "#4a1278",
        urg: "#f43f5e",
        ink: "#2e1145", body: "#523f6b", mut: "#84789c", paper: "#faf6fe",
    },
];

export const KH_DEFAULT_THEME_ID = "mint";

export function getKhTheme(id?: string | null): KhTheme {
    return KH_THEMES.find((t) => t.id === id) || KH_THEMES[0];
}
