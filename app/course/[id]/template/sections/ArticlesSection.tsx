"use client";
import type { ArticlesData, ArticleItem } from "../types";
import { BookOpen, ArrowRight } from "lucide-react";

/* ─── Single article card ─── */
function ArticleCard({ item }: { item: ArticleItem }) {
    // Eyebrow label: default "บทความ"; an explicit empty string hides it.
    const eyebrow = item.badgeText ?? "บทความ";

    return (
        <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/70 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
            {/* Cover */}
            <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600">
                        <BookOpen className="text-white/90" size={44} strokeWidth={1.5} />
                    </div>
                )}

                {/* Eyebrow chip */}
                {eyebrow && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 dark:bg-slate-900/90 text-indigo-700 dark:text-indigo-300 backdrop-blur-sm shadow-sm">
                        📖 {eyebrow}
                    </span>
                )}
            </div>

            {/* Body */}
            <div className="flex flex-col flex-1 p-5">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.title}
                </h3>
                {item.excerpt && (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                        {item.excerpt}
                    </p>
                )}
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    อ่านบทความ
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </span>
            </div>
        </a>
    );
}

/* ─── Main Section ─── */
export default function ArticlesSection({ data }: { data: ArticlesData }) {
    // Only render cards that have both a title and a link.
    const items = (data.items || []).filter((a) => a.title?.trim() && a.url?.trim());
    if (items.length === 0) return null;

    // Keep the grid balanced for small counts.
    const gridClass =
        items.length === 1
            ? "max-w-md mx-auto"
            : items.length === 2
                ? "sm:grid-cols-2 max-w-3xl mx-auto"
                : "sm:grid-cols-2 lg:grid-cols-3";

    return (
        <section className="w-full py-16 md:py-24 bg-gradient-to-b from-white via-slate-50 to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
            <div className="max-w-6xl mx-auto px-4 md:px-8">
                {/* Header */}
                <div className="text-center mb-12 md:mb-16">
                    <h2 className="text-3xl md:text-5xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-4">
                        {data.title || "บทความน่าอ่าน"}{" "}
                        <span className="text-indigo-600 dark:text-indigo-400">📰</span>
                    </h2>
                    {data.subtitle && (
                        <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
                            {data.subtitle}
                        </p>
                    )}
                    <div className="w-24 h-1.5 bg-indigo-600 dark:bg-indigo-400 mx-auto rounded-full opacity-20 mt-5" />
                </div>

                {/* Grid */}
                <div className={`grid gap-6 ${gridClass}`}>
                    {items.map((item, i) => (
                        <ArticleCard key={i} item={item} />
                    ))}
                </div>
            </div>
        </section>
    );
}
