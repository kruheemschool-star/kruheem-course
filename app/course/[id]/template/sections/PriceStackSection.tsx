"use client";
import type { PriceStackData, SectionContext } from "../types";

export default function PriceStackSection({ data, ctx }: { data: PriceStackData; ctx: SectionContext }) {
    const totalValue = data.totalValue ?? data.items.reduce((sum, it) => sum + it.value, 0);
    const savings = data.regularPrice - data.finalPrice;
    const savingsPercent = Math.round((savings / data.regularPrice) * 100);

    return (
        <section className="kh-sec">
            <div className="kh-sec-head">
                <div className="mb-4">
                    <span className="kh-eyebrow">💎 ข้อเสนอพิเศษ</span>
                </div>
                <h2 className="kh-h2">{data.title || "คุ้มทุกบาท ทุกสตางค์ 💰"}</h2>
                {data.subtitle && <p className="kh-sub mt-3">{data.subtitle}</p>}
            </div>

            {/* The drama panel */}
            <div className="kh-dark mx-auto w-full max-w-[640px] p-8 md:p-10">
                {/* Value stack — receipt rows */}
                <div className="mb-6">
                    {data.items.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 py-3.5 border-b last:border-b-0"
                            style={{ borderColor: "var(--kh-onDline)" }}
                        >
                            <span className="text-lg leading-none" style={{ color: "var(--kh-good)" }}>✓</span>
                            <span className="font-medium" style={{ color: "var(--kh-onD)" }}>{item.name}</span>
                            <span
                                aria-hidden="true"
                                className="flex-1 mx-1 border-b border-dashed"
                                style={{ borderColor: "var(--kh-onDline)" }}
                            />
                            <span className="kh-num font-semibold whitespace-nowrap" style={{ color: "var(--kh-onD)" }}>
                                {item.value.toLocaleString("th-TH")} ฿
                            </span>
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div className="pt-5" style={{ borderTop: "1px solid var(--kh-onDline)" }}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                        <span style={{ color: "var(--kh-onDmut)" }}>มูลค่ารวม</span>
                        <span className="kh-num text-xl md:text-2xl font-bold line-through" style={{ color: "var(--kh-onDmut)" }}>
                            {totalValue.toLocaleString("th-TH")} ฿
                        </span>
                    </div>

                    {data.regularPrice !== data.finalPrice && (
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <span style={{ color: "var(--kh-onDmut)" }}>ราคาปกติ</span>
                            <span className="kh-num text-lg font-semibold line-through" style={{ color: "var(--kh-onDmut)" }}>
                                {data.regularPrice.toLocaleString("th-TH")} ฿
                            </span>
                        </div>
                    )}

                    {/* Special price */}
                    <div className="text-center mt-6">
                        <p className="kh-kanit text-sm font-semibold tracking-wide" style={{ color: "var(--kh-onDmut)" }}>
                            ราคาพิเศษวันนี้
                        </p>
                        <p
                            className="kh-num font-extrabold leading-tight mt-1"
                            style={{
                                fontSize: "clamp(44px, 7vw, 64px)",
                                background: "linear-gradient(135deg, var(--kh-cta1), var(--kh-cta2))",
                                WebkitBackgroundClip: "text",
                                backgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                color: "transparent",
                            }}
                        >
                            {data.finalPrice.toLocaleString("th-TH")} ฿
                        </p>

                        {savings > 0 && (
                            <div
                                className="kh-kanit mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
                                style={{ background: "var(--kh-good)", color: "var(--kh-onD)" }}
                            >
                                🔥 ประหยัด {savings.toLocaleString("th-TH")} ฿ ({savingsPercent}%)
                            </div>
                        )}
                    </div>
                </div>

                {data.discountNote && (
                    <p className="text-center text-sm mt-5" style={{ color: "var(--kh-onDmut)" }}>{data.discountNote}</p>
                )}

                <button onClick={ctx.onCTAClick} className="kh-cta-btn w-full mt-6" style={{ padding: "17px 30px" }}>
                    {data.ctaText || "สมัครเรียนเลย"}
                </button>
            </div>
        </section>
    );
}
