"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { logPromoClick } from "@/lib/promoTracking";

// SSR-safe "was this promo dismissed?" state, stored in localStorage per promo
// version. The server snapshot is always false so the server HTML and the first
// client render match (no hydration mismatch); React re-reads the client
// snapshot right after hydration.
const DISMISS_EVENT = "promo-dismiss";
function subscribeDismiss(cb: () => void) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener(DISMISS_EVENT, cb);
    window.addEventListener("storage", cb);
    return () => {
        window.removeEventListener(DISMISS_EVENT, cb);
        window.removeEventListener("storage", cb);
    };
}
function readDismissed(key?: string): boolean {
    if (!key || typeof window === "undefined") return false;
    try { return window.localStorage.getItem(key) === "true"; } catch { return false; }
}
function dismissPromo(key: string) {
    try { window.localStorage.setItem(key, "true"); } catch { /* ignore */ }
    window.dispatchEvent(new Event(DISMISS_EVENT));
}

export interface PromotionData {
    enabled?: boolean;
    imageUrl?: string;
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    theme?: string;
    badgeText?: string;
    startDate?: string; // ISO / YYYY-MM-DD; empty = no start bound
    endDate?: string;   // ISO / YYYY-MM-DD; empty = no end bound
    version?: string;   // promo updatedAt — used as the dismiss key
}

export interface PromoTheme {
    key: string;
    label: string;   // Thai label for the admin picker
    card: string;    // background gradient + border
    glow: string;    // decorative glow blob
    badge: string;   // small "โปรโมชันพิเศษ" pill
    title: string;   // title text colour
    subtitle: string;// subtitle text colour
    button: string;  // CTA button colours
    swatch: string;  // small gradient shown in the admin theme picker
}

// Background gradient presets. Each bundles the gradient with text/badge/button
// colours that read well on it, so the admin can pick a look without worrying
// about contrast. (Kept as literal class strings so Tailwind generates them.)
export const PROMO_THEMES: Record<string, PromoTheme> = {
    peach: {
        key: "peach", label: "ส้มพีช",
        card: "border-amber-200/70 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:border-amber-500/20 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-rose-950/30",
        glow: "bg-amber-300/30",
        badge: "bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
        title: "text-slate-800 dark:text-white",
        subtitle: "text-slate-600 dark:text-slate-300",
        button: "text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-200",
        swatch: "bg-gradient-to-br from-amber-200 to-rose-300",
    },
    sky: {
        key: "sky", label: "ฟ้าใส",
        card: "border-sky-200/70 bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-50 dark:border-sky-500/20 dark:from-sky-950/40 dark:via-cyan-950/30 dark:to-blue-950/30",
        glow: "bg-sky-300/30",
        badge: "bg-sky-500/15 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
        title: "text-slate-800 dark:text-white",
        subtitle: "text-slate-600 dark:text-slate-300",
        button: "text-white bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 shadow-lg shadow-sky-200",
        swatch: "bg-gradient-to-br from-sky-200 to-blue-300",
    },
    mint: {
        key: "mint", label: "เขียวมิ้นต์",
        card: "border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 dark:border-emerald-500/20 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-green-950/30",
        glow: "bg-emerald-300/30",
        badge: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
        title: "text-slate-800 dark:text-white",
        subtitle: "text-slate-600 dark:text-slate-300",
        button: "text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200",
        swatch: "bg-gradient-to-br from-emerald-200 to-teal-300",
    },
    sunset: {
        key: "sunset", label: "ส้มสด",
        card: "border-orange-300/50 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500",
        glow: "bg-white/20",
        badge: "bg-white/20 text-white",
        title: "text-white",
        subtitle: "text-white/90",
        button: "text-orange-600 bg-white hover:bg-white/90 shadow-lg shadow-black/10",
        swatch: "bg-gradient-to-br from-amber-500 to-rose-500",
    },
    ocean: {
        key: "ocean", label: "น้ำเงินเข้ม",
        card: "border-blue-400/40 bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500",
        glow: "bg-white/20",
        badge: "bg-white/20 text-white",
        title: "text-white",
        subtitle: "text-white/90",
        button: "text-blue-700 bg-white hover:bg-white/90 shadow-lg shadow-black/10",
        swatch: "bg-gradient-to-br from-indigo-600 to-sky-500",
    },
    grape: {
        key: "grape", label: "ม่วงเข้ม",
        card: "border-purple-400/40 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600",
        glow: "bg-white/20",
        badge: "bg-white/20 text-white",
        title: "text-white",
        subtitle: "text-white/90",
        button: "text-purple-700 bg-white hover:bg-white/90 shadow-lg shadow-black/10",
        swatch: "bg-gradient-to-br from-violet-600 to-fuchsia-600",
    },
};

export const DEFAULT_PROMO_THEME = "peach";
export const PROMO_THEME_LIST = Object.values(PROMO_THEMES);

/**
 * Big promotional card shown above the hero. Background is a chosen gradient
 * theme; image, title, subtitle and button are all OPTIONAL (omit to hide).
 * The caller gates on promo.enabled; this component just draws the card from
 * the given data, so the admin live-preview reuses it unchanged.
 */
export default function PromotionBanner({ promo, dismissKey, track }: { promo: PromotionData; dismissKey?: string; track?: boolean }) {
    const t = PROMO_THEMES[promo.theme || DEFAULT_PROMO_THEME] || PROMO_THEMES[DEFAULT_PROMO_THEME];
    const hasImage = !!promo.imageUrl;
    const hasCta = !!(promo.ctaText && promo.ctaLink);
    const badge = promo.badgeText ?? "โปรโมชันพิเศษ";
    const isExternal = !!promo.ctaLink && /^https?:\/\//i.test(promo.ctaLink);
    const onLight = !t.title.includes("white"); // dark text themes -> X is dark

    // Dismiss (remembered per promo version) — SSR-safe, no setState-in-effect.
    const dismissed = useSyncExternalStore(subscribeDismiss, () => readDismissed(dismissKey), () => false);
    if (dismissKey && dismissed) return null;

    const btnClass = `mt-5 inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold transition-all hover:scale-105 active:scale-95 ${t.button}`;
    const btnInner = (
        <>
            {promo.ctaText}
            <ArrowRight size={18} />
        </>
    );
    const handleCtaClick = () => { if (track) logPromoClick(); };

    return (
        <div className={`relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border shadow-xl ${t.card}`}>
            {/* decorative glow */}
            <div className={`pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl ${t.glow}`}></div>

            {dismissKey && (
                <button
                    type="button"
                    onClick={() => dismissKey && dismissPromo(dismissKey)}
                    aria-label="ปิดโปรโมชัน"
                    className={`absolute top-3 right-3 z-10 rounded-full p-1.5 transition-colors ${onLight ? "text-slate-500 hover:bg-black/5" : "text-white/80 hover:bg-white/20"}`}
                >
                    <X size={18} />
                </button>
            )}

            <div className={`relative grid gap-6 p-6 md:p-10 items-center ${hasImage ? "md:grid-cols-2" : "grid-cols-1"}`}>
                {/* Text side */}
                <div className={hasImage ? "" : "max-w-3xl text-center md:text-left mx-auto md:mx-0"}>
                    {badge && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide mb-3 ${t.badge}`}>
                            <Sparkles size={13} /> {badge}
                        </span>
                    )}
                    {promo.title && (
                        <h2 className={`text-2xl md:text-4xl font-black leading-tight mb-2 ${t.title}`}>{promo.title}</h2>
                    )}
                    {promo.subtitle && (
                        <p className={`text-base md:text-lg leading-relaxed whitespace-pre-line ${t.subtitle}`}>{promo.subtitle}</p>
                    )}
                    {hasCta && (
                        isExternal ? (
                            <a href={promo.ctaLink as string} target="_blank" rel="noopener noreferrer" className={btnClass} onClick={handleCtaClick}>
                                {btnInner}
                            </a>
                        ) : (
                            <Link href={promo.ctaLink as string} className={btnClass} onClick={handleCtaClick}>
                                {btnInner}
                            </Link>
                        )
                    )}
                </div>

                {/* Image side (optional) */}
                {hasImage && (
                    <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden shadow-lg ring-1 ring-black/10">
                        <Image
                            src={promo.imageUrl as string}
                            alt={promo.title || "โปรโมชัน"}
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
