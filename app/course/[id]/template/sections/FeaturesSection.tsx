"use client";
import type { FeaturesData, FeatureItem, SectionContext } from "../types";

// Highlight badge — accent palette (สี 4) per spec §3.1.
// `onImage` floats it over the screenshot; otherwise it sits by the icon.
function Badge({ text, onImage = false }: { text: string; onImage?: boolean }) {
    return (
        <span
            className={`kh-kanit inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                onImage ? "absolute top-3 left-3 backdrop-blur-sm" : ""
            }`}
            style={{
                background: onImage ? "rgba(255,255,255,.92)" : "var(--kh-accBg)",
                color: "var(--kh-accText)",
                boxShadow: onImage ? "var(--kh-shadow-sm)" : undefined,
            }}
        >
            {text}
        </span>
    );
}

function FeatureCard({ item }: { item: FeatureItem }) {
    const hasImage = !!item.imageUrl?.trim();
    return (
        <div className="kh-card kh-lift group flex flex-col overflow-hidden">
            {/* Optional screenshot of the feature (image slot — ข้อสอบ/Mindmap/Flashcard) */}
            {hasImage && (
                <div className="relative aspect-[16/10] overflow-hidden" style={{ background: "var(--kh-tint)" }}>
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

            <div className="flex flex-col flex-1 p-6 sm:p-7">
                <div className="flex items-center justify-between gap-2 mb-4">
                    {/* Icon tile — primary gradient (สี 1) */}
                    <div
                        className="grid h-14 w-14 place-items-center rounded-2xl text-3xl"
                        style={{
                            background: "linear-gradient(135deg, var(--kh-p), var(--kh-p2))",
                            color: "var(--kh-onD)",
                            boxShadow: "var(--kh-shadow-sm)",
                        }}
                    >
                        {item.icon || "✨"}
                    </div>
                    {!hasImage && item.badgeText?.trim() && <Badge text={item.badgeText} />}
                </div>
                <h3 className="kh-h3 mb-2">{item.title}</h3>
                {item.desc && (
                    <p className="leading-relaxed" style={{ color: "var(--kh-body)" }}>
                        {item.desc}
                    </p>
                )}
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
        <section className="kh-sec">
            {/* Header */}
            <div className="kh-sec-head">
                <span className="kh-eyebrow">เครื่องมือในคอร์ส</span>
                <h2 className="kh-h2 mt-4">
                    {data.title || "ในคอร์สมีอะไรบ้าง?"} <span>✨</span>
                </h2>
                {data.subtitle && <p className="kh-sub mt-3">{data.subtitle}</p>}
            </div>

            {/* Grid */}
            <div className={`grid gap-5 md:gap-6 ${gridClass}`}>
                {items.map((item, i) => (
                    <FeatureCard key={i} item={item} />
                ))}
            </div>

            {/* Optional CTA */}
            {data.ctaText?.trim() && (
                <div className="text-center mt-12">
                    <button onClick={() => ctx.onCTAClick()} className="kh-cta-btn">
                        {data.ctaText}
                    </button>
                </div>
            )}
        </section>
    );
}
