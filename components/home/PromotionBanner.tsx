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
}

/**
 * Big promotional card shown above the hero on the homepage.
 * Image + title + subtitle + optional button. Image and button are OPTIONAL —
 * leave them blank to hide. The caller decides whether to render at all (gate
 * on promo.enabled); this component just draws the card from the given data,
 * so the admin live-preview can reuse it unchanged.
 */
export default function PromotionBanner({ promo }: { promo: PromotionData }) {
    const hasImage = !!promo.imageUrl;
    const hasCta = !!(promo.ctaText && promo.ctaLink);

    return (
        <div className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border border-amber-200/70 dark:border-amber-500/20 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-900/30 dark:via-orange-900/20 dark:to-slate-900 shadow-xl shadow-amber-100/50 dark:shadow-none">
            {/* decorative glow */}
            <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 bg-amber-300/30 rounded-full blur-3xl"></div>

            <div className={`relative grid gap-6 p-6 md:p-10 items-center ${hasImage ? "md:grid-cols-2" : "grid-cols-1"}`}>
                {/* Text side */}
                <div className={hasImage ? "" : "max-w-3xl text-center md:text-left mx-auto md:mx-0"}>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-extrabold uppercase tracking-wide mb-3">
                        <Sparkles size={13} /> โปรโมชันพิเศษ
                    </span>
                    {promo.title && (
                        <h2 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-white leading-tight mb-2">
                            {promo.title}
                        </h2>
                    )}
                    {promo.subtitle && (
                        <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed whitespace-pre-line">
                            {promo.subtitle}
                        </p>
                    )}
                    {hasCta && (
                        <Link
                            href={promo.ctaLink as string}
                            className="mt-5 inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-200 dark:shadow-none transition-all hover:scale-105 active:scale-95"
                        >
                            {promo.ctaText}
                            <ArrowRight size={18} />
                        </Link>
                    )}
                </div>

                {/* Image side */}
                {hasImage && (
                    <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden shadow-lg ring-1 ring-black/5">
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
