"use client";
import type { FeaturesData, FeatureItem, SectionContext } from "../types";

function Badge({ text, onImage = false }: { text: string; onImage?: boolean }) {
    if (onImage) {
        return (
            <span className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 dark:bg-slate-900/90 text-indigo-700 dark:text-indigo-300 backdrop-blur-sm shadow-sm">
                {text}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
            {text}
        </span>
    );
}

function FeatureCard({ item }: { item: FeatureItem }) {
    const hasImage = !!item.imageUrl?.trim();
    return (
        <div className="group flex flex-col bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            {/* Optional screenshot of the feature */}
            {hasImage && (
                <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {item.badgeText?.trim() && <Badge text={item.badgeText} onImage />}
                </div>
            )}

            <div className="flex flex-col flex-1 p-7">
                <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/20">
                        {item.icon || "✨"}
                    </div>
                    {!hasImage && item.badgeText?.trim() && <Badge text={item.badgeText} />}
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 leading-snug">{item.title}</h3>
                {item.desc && <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{item.desc}</p>}
            </div>
        </div>
    );
}

export default function FeaturesSection({ data, ctx }: { data: FeaturesData; ctx: SectionContext }) {
    const items = (data.items || []).filter((f) => f.title?.trim());
    if (items.length === 0) return null;

    const gridClass =
        items.length === 1
            ? "max-w-md mx-auto"
            : items.length === 2
                ? "sm:grid-cols-2 max-w-3xl mx-auto"
                : "sm:grid-cols-2 lg:grid-cols-3";

    return (
        <section className="w-full py-16 md:py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
            <div className="max-w-6xl mx-auto px-4 md:px-8">
                {/* Header */}
                <div className="text-center mb-12 md:mb-16">
                    <h2 className="text-3xl md:text-5xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-4">
                        {data.title || "ในคอร์สมีอะไรบ้าง?"}{" "}
                        <span className="text-indigo-600 dark:text-indigo-400">✨</span>
                    </h2>
                    {data.subtitle && (
                        <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">{data.subtitle}</p>
                    )}
                    <div className="w-24 h-1.5 bg-indigo-600 dark:bg-indigo-400 mx-auto rounded-full opacity-20 mt-5" />
                </div>

                {/* Grid */}
                <div className={`grid gap-6 ${gridClass}`}>
                    {items.map((item, i) => (
                        <FeatureCard key={i} item={item} />
                    ))}
                </div>

                {/* Optional CTA */}
                {data.ctaText?.trim() && (
                    <div className="text-center mt-12">
                        <button
                            onClick={() => ctx.onCTAClick()}
                            className="inline-block px-10 py-4 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow-xl shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-transform"
                        >
                            {data.ctaText}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
