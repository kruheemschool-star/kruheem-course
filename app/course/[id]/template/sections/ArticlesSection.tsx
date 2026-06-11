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
            className="group kh-card kh-lift flex flex-col overflow-hidden"
        >
            {/* Cover */}
            <div className="relative aspect-[16/10] overflow-hidden" style={{ background: "var(--kh-tint)" }}>
                {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, var(--kh-p), var(--kh-p2))" }}
                    >
                        <BookOpen className="opacity-90" size={44} strokeWidth={1.5} style={{ color: "var(--kh-onD)" }} />
                    </div>
                )}

                {/* Eyebrow chip */}
                {eyebrow && (
                    <span
                        className="kh-chip absolute top-3 left-3"
                        style={{ background: "var(--kh-card)", color: "var(--kh-pText)" }}
                    >
                        📖 {eyebrow}
                    </span>
                )}
            </div>

            {/* Body */}
            <div className="flex flex-col flex-1 p-5">
                <h3 className="kh-h3 line-clamp-2">
                    {item.title}
                </h3>
                {item.excerpt && (
                    <p className="mt-2 text-sm leading-relaxed line-clamp-2" style={{ color: "var(--kh-mut)" }}>
                        {item.excerpt}
                    </p>
                )}
                <span
                    className="kh-kanit mt-auto pt-4 inline-flex items-center gap-1.5 text-sm font-semibold"
                    style={{ color: "var(--kh-pText)" }}
                >
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
                : "sm:grid-cols-2 md:grid-cols-3";

    return (
        <section className="kh-sec">
            {/* Header */}
            <div className="kh-sec-head">
                <h2 className="kh-h2">
                    {data.title || "บทความน่าอ่าน"}{" "}
                    <span aria-hidden="true">📰</span>
                </h2>
                {data.subtitle && <p className="kh-sub mt-3">{data.subtitle}</p>}
            </div>

            {/* Grid */}
            <div className={`grid gap-6 ${gridClass}`}>
                {items.map((item, i) => (
                    <ArticleCard key={i} item={item} />
                ))}
            </div>
        </section>
    );
}
