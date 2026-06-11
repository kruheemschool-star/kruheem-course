"use client";
import type { CTAData, SectionContext } from "../types";
import { smoothScrollToId } from "../smoothScroll";

const formatBaht = (n?: number) =>
    typeof n === "number" && !Number.isNaN(n) ? `฿${n.toLocaleString("en-US")}` : undefined;

export default function CTASection({ data, ctx }: { data: CTAData; ctx: SectionContext }) {
    const priceText = formatBaht(ctx.coursePrice);
    const fullPriceText =
        ctx.courseFullPrice && ctx.courseFullPrice > ctx.coursePrice
            ? formatBaht(ctx.courseFullPrice)
            : undefined;

    return (
        <section className="kh-sec">
            <div className="kh-dark p-7 sm:p-10 md:p-14">
                <div className="flex flex-col md:flex-row items-center gap-7 md:gap-10">
                    {/* Mascot */}
                    <img
                        src="/assets/kruheem_avatar.png"
                        alt="ครูฮีม"
                        className="w-24 md:w-32 h-auto flex-shrink-0"
                        loading="lazy"
                    />

                    <div className="flex-1 text-center md:text-left">
                        {/* Urgency chip */}
                        {data.urgencyText && (
                            <div
                                className="kh-kanit inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[13px] font-semibold mb-4"
                                style={{ background: "var(--kh-urgBg)", color: "var(--kh-urgText)" }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--kh-urg)" }} />
                                {data.urgencyText}
                            </div>
                        )}

                        {/* Headline */}
                        <h2
                            className="kh-kanit font-extrabold leading-[1.25]"
                            style={{ fontSize: "clamp(26px, 4vw, 40px)", color: "var(--kh-onD)", letterSpacing: "-0.4px" }}
                        >
                            {data.title}
                        </h2>

                        {/* Subhead */}
                        {data.subtitle && (
                            <p className="mt-3 text-base md:text-lg leading-relaxed" style={{ color: "var(--kh-onDmut)" }}>
                                {data.subtitle}
                            </p>
                        )}

                        {/* Price line */}
                        {priceText && (
                            <p className="mt-5">
                                <span className="text-sm" style={{ color: "var(--kh-onDmut)" }}>เริ่มต้น </span>
                                <span
                                    className="kh-num font-extrabold align-middle mx-1"
                                    style={{
                                        fontSize: "clamp(28px, 3.6vw, 40px)",
                                        background: "linear-gradient(135deg, var(--kh-cta1), var(--kh-cta2))",
                                        WebkitBackgroundClip: "text",
                                        backgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        color: "transparent",
                                    }}
                                >
                                    {priceText}
                                </span>
                                {fullPriceText && (
                                    <span className="line-through ml-1.5 text-sm" style={{ color: "var(--kh-onDmut)" }}>{fullPriceText}</span>
                                )}
                                {data.priceText && (
                                    <span className="text-sm" style={{ color: "var(--kh-onDmut)" }}> · {data.priceText}</span>
                                )}
                            </p>
                        )}

                        {/* Actions */}
                        <div className="mt-7 flex items-center justify-center md:justify-start gap-3 sm:gap-4 flex-wrap">
                            <button
                                onClick={ctx.onCTAClick}
                                className="kh-cta-btn w-full sm:w-auto"
                                style={{ padding: "16px 34px", fontSize: "clamp(17px, 2vw, 20px)" }}
                            >
                                {data.ctaText}
                            </button>
                            <button
                                onClick={() => smoothScrollToId("section-curriculum")}
                                className="kh-ghost-btn w-full sm:w-auto"
                            >
                                เรียนรู้เพิ่มเติม
                                <span className="text-lg leading-none">›</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
