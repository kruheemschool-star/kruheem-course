"use client";
import type { HeroTrustChip, HeroData, SectionContext } from "../types";
import CourseCard from "./CourseCard";
import { smoothScrollToId } from "../smoothScroll";

interface Props {
    data: HeroData;
    ctx: SectionContext;
}

// ============================================================
// Helpers
// ============================================================
const formatBaht = (n?: number) =>
    typeof n === "number" && !Number.isNaN(n) ? `฿${n.toLocaleString("en-US")}` : undefined;

// Render the headline, gradient-highlighting the word "Gifted".
function renderHeadline(text: string) {
    return text.split(/(Gifted)/g).map((part, i) =>
        part === "Gifted" ? (
            <span
                key={i}
                style={{
                    background: "linear-gradient(180deg,#fb923c 0%, #ef4444 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                }}
            >
                {part}
            </span>
        ) : (
            <span key={i}>{part}</span>
        )
    );
}

export default function HeroSection({ data, ctx }: Props) {
    // ---- Theme / background ----
    const bgFrom = data.bgColorFrom || "#fffaf2";
    const bgTo = data.bgColorTo || "#fef3e0";
    const titleColor = data.titleColor || "#13132a";
    const subtitleColor = data.subtitleColor || "#4a4a5e";

    // Default to the rich course card — the standard cover for this template.
    // Courses can still opt into a plain image cover via coverType: "image".
    const coverType = data.coverType || "courseCard";
    const showRichCard = coverType === "card" || coverType === "courseCard";

    // ---- Left column: price + CTAs (data-driven w/ graceful fallbacks) ----
    const regularPriceText =
        data.regularPriceText ??
        (ctx.courseFullPrice ? `ราคาปกติ ${formatBaht(ctx.courseFullPrice)}` : undefined);
    const savingsText =
        data.savingsText ??
        (ctx.courseFullPrice && ctx.courseFullPrice > ctx.coursePrice
            ? `ประหยัด ${formatBaht(ctx.courseFullPrice - ctx.coursePrice)}`
            : undefined);
    const ctaPriceText = data.ctaPriceText || formatBaht(ctx.coursePrice) || "฿2,900";
    const secondaryCtaText = data.secondaryCtaText || "ดูเนื้อหาทั้งหมด";
    const secondaryCtaMeta = data.secondaryCtaMeta ?? "· 40 บท";

    const perDay = (ctx.coursePrice / (5 * 365)).toFixed(2);
    const trustChips: HeroTrustChip[] =
        data.trustChips ?? [
            { icon: "⚡", text: "เฉลี่ยวันละ", boldText: perDay, suffix: "บาท", tone: "amber" },
            { icon: "✓", text: "คืนเงิน", boldText: "7 วัน", tone: "green" },
        ];

    return (
        <header
            className="relative pt-32 pb-20 overflow-hidden"
            style={{
                background: `
                    radial-gradient(60% 80% at 100% 0%, rgba(251,146,60,.22), transparent 60%),
                    radial-gradient(50% 70% at 0% 100%, rgba(254,215,170,.45), transparent 60%),
                    linear-gradient(180deg, ${bgFrom} 0%, ${bgTo} 100%)`,
            }}
        >
            <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-col lg:flex-row gap-12 lg:gap-8 items-center lg:items-start relative z-10">
                {/* ============ LEFT COLUMN ============ */}
                <div className="w-full lg:flex-1 lg:max-w-[640px] text-center lg:text-left">
                    {/* Tag badge */}
                    {data.badgeText && (
                        <div
                            className="inline-flex items-center gap-2.5 pl-3.5 pr-4 py-2 rounded-full text-[13.5px] font-semibold"
                            style={{
                                background: data.badgeBgColor || "rgba(255,255,255,.7)",
                                border: "1px solid rgba(20,20,30,.06)",
                                color: data.badgeTextColor || "#1a1a2e",
                                boxShadow: "0 1px 2px rgba(20,20,40,.04)",
                            }}
                        >
                            <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                            {data.badgeText}
                        </div>
                    )}

                    {/* Headline */}
                    <h1
                        className="whitespace-pre-line font-extrabold text-[40px] leading-[1.08] sm:text-5xl md:text-6xl lg:text-[72px] mt-6"
                        style={{ color: titleColor, letterSpacing: "-1.5px" }}
                    >
                        {renderHeadline(data.title)}
                    </h1>

                    {/* Subhead */}
                    {data.subtitle && (
                        <p
                            className="whitespace-pre-line text-[17px] md:text-[19px] leading-[1.55] mt-6 max-w-[520px] mx-auto lg:mx-0"
                            style={{ color: subtitleColor }}
                        >
                            {data.subtitle}
                        </p>
                    )}

                    {/* CTA cluster */}
                    <div className="mt-8 flex flex-col gap-3.5 max-w-[460px] mx-auto lg:mx-0">
                        {/* Price-savings row */}
                        {(regularPriceText || savingsText) && (
                            <div className="flex items-center justify-center lg:justify-start gap-2.5 flex-wrap">
                                {regularPriceText && (
                                    <span
                                        className="text-sm line-through"
                                        style={{ color: "#9a8a78", textDecorationColor: "rgba(154,138,120,.55)" }}
                                    >
                                        {regularPriceText}
                                    </span>
                                )}
                                {savingsText && (
                                    <span
                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold"
                                        style={{
                                            background: "#dcfce7",
                                            color: "#15803d",
                                            border: "1px solid #bbf7d0",
                                            letterSpacing: ".3px",
                                        }}
                                    >
                                        <span className="text-[10px]">●</span>
                                        {savingsText}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Primary CTA — dark ink + warm price chip */}
                        <button
                            onClick={ctx.onCTAClick}
                            className="relative overflow-hidden flex items-center justify-between gap-3.5 pl-7 pr-2.5 py-2.5 rounded-[18px] text-white font-bold text-[17px] transition-all hover:scale-[1.02] active:scale-95"
                            style={{
                                background: "linear-gradient(180deg,#1f1b34 0%, #0f0d1f 100%)",
                                boxShadow:
                                    "0 18px 30px -12px rgba(15,13,31,.45), 0 0 0 1px rgba(251,146,60,.18), inset 0 1px 0 rgba(255,255,255,.06)",
                            }}
                        >
                            <span
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    background:
                                        "radial-gradient(80% 120% at 0% 100%, rgba(251,146,60,.22), transparent 55%)",
                                }}
                            />
                            <span className="relative inline-flex items-center gap-3">
                                <span>{data.ctaText || "สมัครเลย ล็อกราคาพิเศษ"}</span>
                                <span
                                    className="w-[22px] h-[22px] rounded-full grid place-items-center text-xs"
                                    style={{ background: "rgba(251,146,60,.18)", color: "#fb923c" }}
                                >
                                    →
                                </span>
                            </span>
                            <span
                                className="relative px-4 py-2.5 rounded-xl text-[17px] font-extrabold"
                                style={{
                                    background: "linear-gradient(160deg,#fb923c 0%, #f97316 40%, #dc2626 100%)",
                                    letterSpacing: "-.3px",
                                    boxShadow:
                                        "0 6px 14px -4px rgba(220,40,40,.55), inset 0 1px 0 rgba(255,255,255,.3)",
                                }}
                            >
                                {ctaPriceText}
                            </span>
                        </button>

                        {/* Secondary CTA — scroll to curriculum */}
                        <a
                            href="#section-curriculum"
                            onClick={(e) => {
                                e.preventDefault();
                                smoothScrollToId("section-curriculum");
                            }}
                            className="inline-flex items-center gap-3 pl-3 pr-[18px] py-3 rounded-[14px] font-semibold text-[15px] w-fit mx-auto lg:mx-0 hover:bg-white/60 transition-colors"
                            style={{ border: "1px solid rgba(20,20,40,.08)", color: "#13132a" }}
                        >
                            <span
                                className="w-8 h-8 rounded-full grid place-items-center text-white text-[11px]"
                                style={{
                                    background: "linear-gradient(160deg,#fb923c,#dc2626)",
                                    boxShadow: "0 4px 10px -3px rgba(220,40,40,.5)",
                                }}
                            >
                                ▶
                            </span>
                            {secondaryCtaText}{" "}
                            {secondaryCtaMeta && (
                                <span className="font-medium" style={{ color: "#9a9aa8" }}>
                                    {secondaryCtaMeta}
                                </span>
                            )}
                        </a>

                        {/* Trust chips */}
                        {trustChips.length > 0 && (
                            <div className="flex gap-2.5 mt-1 flex-wrap justify-center lg:justify-start">
                                {trustChips.map((chip, i) => (
                                    <div
                                        key={i}
                                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px]"
                                        style={{
                                            background: "rgba(255,255,255,.55)",
                                            border: "1px solid rgba(20,20,40,.04)",
                                            color: "#4a4a5e",
                                        }}
                                    >
                                        <span
                                            className="w-[22px] h-[22px] rounded-full grid place-items-center text-[11px]"
                                            style={
                                                chip.tone === "green"
                                                    ? { background: "rgba(34,197,94,.14)", color: "#15803d" }
                                                    : { background: "rgba(245,158,11,.14)", color: "#b45309" }
                                            }
                                        >
                                            {chip.icon}
                                        </span>
                                        {chip.text}
                                        {chip.boldText && (
                                            <b style={{ color: "#13132a" }}>&nbsp;{chip.boldText}&nbsp;</b>
                                        )}
                                        {chip.suffix}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ============ RIGHT COLUMN ============ */}
                <div className="w-full lg:flex-1 flex justify-center lg:justify-end">
                    {showRichCard ? (
                        <CourseCard data={data} courseId={ctx.courseId} courseTitle={ctx.courseTitle} previewVideoId={ctx.previewVideoId} totalStudents={ctx.totalStudents} />
                    ) : (
                        // Backward-compatible image cover
                        (data.imageUrl || ctx.courseImage) && (
                            <div className="w-full max-w-[540px]">
                                <div
                                    className="relative rounded-[2.5rem] p-3 bg-white/30 backdrop-blur-xl border border-white/50 shadow-2xl"
                                    style={{ boxShadow: "0 30px 60px -20px rgba(99,102,241,.2)" }}
                                >
                                    <div className="relative rounded-[2rem] overflow-hidden shadow-inner">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={data.imageUrl || ctx.courseImage}
                                            alt={ctx.courseTitle}
                                            className="w-full h-auto object-cover"
                                            loading="lazy"
                                        />
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </header>
    );
}
