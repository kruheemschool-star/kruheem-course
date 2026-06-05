"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export interface PromotionData {
    enabled?: boolean;
    imageUrl?: string;
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    theme?: string;
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
        card: "border-amber-200/70 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50",
        glow: "bg-amber-300/30",
        badge: "bg-amber-500/15 text-amber-700",
        title: "text-slate-800",
        subtitle: "text-slate-600",
        button: "text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-200",
        swatch: "bg-gradient-to-br from-amber-200 to-rose-300",
    },
    sky: {
        key: "sky", label: "ฟ้าใส",
        card: "border-sky-200/70 bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-50",
        glow: "bg-sky-300/30",
        badge: "bg-sky-500/15 text-sky-700",
        title: "text-slate-800",
        subtitle: "text-slate-600",
        button: "text-white bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 shadow-lg shadow-sky-200",
        swatch: "bg-gradient-to-br from-sky-200 to-blue-300",
    },
    mint: {
        key: "mint", label: "เขียวมิ้นต์",
        card: "border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50",
        glow: "bg-emerald-300/30",
        badge: "bg-emerald-500/15 text-emerald-700",
        title: "text-slate-800",
        subtitle: "text-slate-600",
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
export default function PromotionBanner({ promo }: { promo: PromotionData }) {
    const t = PROMO_THEMES[promo.theme || DEFAULT_PROMO_THEME] || PROMO_THEMES[DEFAULT_PROMO_THEME];
    const hasImage = !!promo.imageUrl;
    const hasCta = !!(promo.ctaText && promo.ctaLink);

    return (
        <div className={`relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border shadow-xl ${t.card}`}>
            {/* decorative glow */}
            <div className={`pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl ${t.glow}`}></div>

            <div className={`relative grid gap-6 p-6 md:p-10 items-center ${hasImage ? "md:grid-cols-2" : "grid-cols-1"}`}>
                {/* Text side */}
                <div className={hasImage ? "" : "max-w-3xl text-center md:text-left mx-auto md:mx-0"}>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide mb-3 ${t.badge}`}>
                        <Sparkles size={13} /> โปรโมชันพิเศษ
                    </span>
                    {promo.title && (
                        <h2 className={`text-2xl md:text-4xl font-black leading-tight mb-2 ${t.title}`}>{promo.title}</h2>
                    )}
                    {promo.subtitle && (
                        <p className={`text-base md:text-lg leading-relaxed whitespace-pre-line ${t.subtitle}`}>{promo.subtitle}</p>
                    )}
                    {hasCta && (
                        <Link
                            href={promo.ctaLink as string}
                            className={`mt-5 inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold transition-all hover:scale-105 active:scale-95 ${t.button}`}
                        >
                            {promo.ctaText}
                            <ArrowRight size={18} />
                        </Link>
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
