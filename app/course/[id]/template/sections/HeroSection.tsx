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
                    background: "linear-gradient(135deg, var(--kh-cta1) 0%, var(--kh-acc) 100%)",
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
        <header className="kh-sec relative" style={{ paddingTop: "clamp(112px, 13vw, 136px)" }}>
            <div className="grid lg:grid-cols-2 gap-10 items-start">
                {/* ============ LEFT COLUMN ============ */}
                <div className="w-full text-center lg:text-left">
                    {/* Tag badge */}
                    {data.badgeText && (
                        <span className="kh-eyebrow">
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ background: "var(--kh-good)" }}
                            />
                            {data.badgeText}
                        </span>
                    )}

                    {/* Headline */}
                    <h1 className="kh-h1 whitespace-pre-line mt-5">{renderHeadline(data.title)}</h1>

                    {/* Subhead */}
                    {data.subtitle && (
                        <p className="kh-sub whitespace-pre-line mt-5 max-w-[520px] mx-auto lg:mx-0">
                            {data.subtitle}
                        </p>
                    )}

                    {/* CTA cluster */}
                    <div className="mt-8 flex flex-col gap-4 max-w-[460px] mx-auto lg:mx-0">
                        {/* Price-savings row */}
                        {(regularPriceText || savingsText) && (
                            <div className="flex items-center justify-center lg:justify-start gap-2.5 flex-wrap">
                                {regularPriceText && (
                                    <span
                                        className="kh-num text-sm line-through"
                                        style={{ color: "var(--kh-mut)" }}
                                    >
                                        {regularPriceText}
                                    </span>
                                )}
                                {savingsText && (
                                    <span
                                        className="kh-kanit inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                                        style={{
                                            background: "var(--kh-good)",
                                            color: "var(--kh-onD)",
                                            boxShadow: "var(--kh-shadow-sm)",
                                        }}
                                    >
                                        {savingsText}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* CTA row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-center lg:justify-start gap-3">
                            <button onClick={ctx.onCTAClick} className="kh-cta-btn w-full sm:w-auto">
                                <span>{data.ctaText || "สมัครเลย ล็อกราคาพิเศษ"}</span>
                                <span
                                    aria-hidden="true"
                                    className="w-px h-5 opacity-40"
                                    style={{ background: "currentColor" }}
                                />
                                <span className="kh-num text-[1.1em] font-extrabold">{ctaPriceText}</span>
                            </button>

                            {/* Secondary CTA — scroll to curriculum */}
                            <a
                                href="#section-curriculum"
                                onClick={(e) => {
                                    e.preventDefault();
                                    smoothScrollToId("section-curriculum");
                                }}
                                className="kh-ghost-btn w-full sm:w-auto"
                            >
                                <span
                                    aria-hidden="true"
                                    className="w-7 h-7 rounded-full grid place-items-center text-[10px] shrink-0"
                                    style={{ background: "var(--kh-pT)", color: "var(--kh-pText)" }}
                                >
                                    ▶
                                </span>
                                {secondaryCtaText}
                                {secondaryCtaMeta && (
                                    <span className="font-medium" style={{ color: "var(--kh-mut)" }}>
                                        {secondaryCtaMeta}
                                    </span>
                                )}
                            </a>
                        </div>

                        {/* Trust chips */}
                        {trustChips.length > 0 && (
                            <div className="flex gap-2.5 flex-wrap justify-center lg:justify-start">
                                {trustChips.map((chip, i) => (
                                    <span
                                        key={i}
                                        className="kh-chip"
                                        style={
                                            chip.tone === "green"
                                                ? {
                                                      background: "var(--kh-goodBg)",
                                                      color: "var(--kh-goodText)",
                                                      borderColor: "var(--kh-goodBg)",
                                                  }
                                                : {
                                                      background: "var(--kh-ctaT)",
                                                      color: "var(--kh-ctaDeep)",
                                                      borderColor: "var(--kh-ctaT)",
                                                  }
                                        }
                                    >
                                        <span aria-hidden="true">{chip.icon}</span>
                                        {chip.text}
                                        {chip.boldText && <b className="kh-num">&nbsp;{chip.boldText}&nbsp;</b>}
                                        {chip.suffix}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Price-per-day note */}
                        {data.pricePerDayText && (
                            <p className="text-xs" style={{ color: "var(--kh-mut)" }}>
                                {data.pricePerDayText}
                            </p>
                        )}
                    </div>

                    {/* Mascot greeter */}
                    <div className="mt-9 flex items-end justify-center lg:justify-start gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/assets/kruheem_avatar.png"
                            alt="ครูฮีม"
                            loading="lazy"
                            className="w-20 md:w-24 h-auto"
                        />
                        <span
                            className="kh-chip mb-3"
                            style={{ borderRadius: "16px 16px 16px 4px", boxShadow: "var(--kh-shadow-sm)" }}
                        >
                            ครูฮีมรอสอนน้องอยู่นะ 👋
                        </span>
                    </div>
                </div>

                {/* ============ RIGHT COLUMN ============ */}
                <div className="w-full flex justify-center lg:justify-end">
                    {showRichCard ? (
                        <CourseCard data={data} courseId={ctx.courseId} courseTitle={ctx.courseTitle} previewVideoId={ctx.previewVideoId} totalStudents={ctx.totalStudents} />
                    ) : (
                        // Backward-compatible image cover
                        (data.imageUrl || ctx.courseImage) && (
                            <div className="w-full max-w-[540px]">
                                <div
                                    className="kh-card p-3"
                                    style={{ borderRadius: 26, boxShadow: "var(--kh-shadow)" }}
                                >
                                    <div className="relative overflow-hidden" style={{ borderRadius: 18 }}>
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
