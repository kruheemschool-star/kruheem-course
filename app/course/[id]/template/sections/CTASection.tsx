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
        <section className="max-w-3xl mx-auto px-6 py-24 text-center">
            {/* Eyebrow */}
            {data.urgencyText && (
                <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 mb-5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    {data.urgencyText}
                </div>
            )}

            {/* Headline */}
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.12]">
                {data.title}
            </h2>

            {/* Subhead */}
            {data.subtitle && (
                <p className="mt-5 text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto">
                    {data.subtitle}
                </p>
            )}

            {/* Actions */}
            <div className="mt-9 flex items-center justify-center gap-6 flex-wrap">
                <button
                    onClick={ctx.onCTAClick}
                    className="inline-flex items-center px-8 py-3.5 rounded-full bg-blue-600 text-white font-semibold text-[17px] shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
                >
                    {data.ctaText}
                </button>
                <button
                    onClick={() => smoothScrollToId("section-curriculum")}
                    className="inline-flex items-center gap-1 text-blue-600 font-semibold text-[17px] hover:underline"
                >
                    เรียนรู้เพิ่มเติม
                    <span className="text-lg leading-none">›</span>
                </button>
            </div>

            {/* Price line */}
            {priceText && (
                <p className="mt-8 text-sm text-slate-400">
                    เริ่มต้น <span className="font-semibold text-slate-600">{priceText}</span>
                    {fullPriceText && <span className="line-through ml-1.5">{fullPriceText}</span>}
                    {data.priceText && <span> · {data.priceText}</span>}
                </p>
            )}
        </section>
    );
}
