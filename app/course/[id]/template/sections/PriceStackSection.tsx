"use client";
import type { PriceStackData, SectionContext } from "../types";

export default function PriceStackSection({ data, ctx }: { data: PriceStackData; ctx: SectionContext }) {
    const totalValue = data.totalValue ?? data.items.reduce((sum, it) => sum + it.value, 0);
    const savings = data.regularPrice - data.finalPrice;
    const savingsPercent = Math.round((savings / data.regularPrice) * 100);

    return (
        <section className="max-w-4xl mx-auto px-6 py-16">
            <div className="text-center mb-10">
                <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
                    {data.title || "คุ้มทุกบาท ทุกสตางค์ 💰"}
                </h2>
                {data.subtitle && <p className="text-lg text-slate-500">{data.subtitle}</p>}
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-[2rem] p-8 md:p-10 border-2 border-indigo-100 shadow-xl">
                {/* Value Stack */}
                <div className="space-y-3 mb-8">
                    {data.items.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-emerald-500 text-xl">✓</span>
                                <span className="text-slate-700 font-medium">{item.name}</span>
                            </div>
                            <span className="text-slate-500 font-semibold">
                                {item.value.toLocaleString("th-TH")} ฿
                            </span>
                        </div>
                    ))}
                </div>

                {/* Total value */}
                <div className="border-t-2 border-dashed border-indigo-200 pt-6 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-lg text-slate-500 line-through">มูลค่ารวม</span>
                        <span className="text-2xl text-slate-400 line-through font-bold">
                            {totalValue.toLocaleString("th-TH")} ฿
                        </span>
                    </div>

                    {data.regularPrice !== data.finalPrice && (
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-lg text-slate-500">ราคาปกติ</span>
                            <span className="text-xl text-slate-500 line-through">
                                {data.regularPrice.toLocaleString("th-TH")} ฿
                            </span>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-slate-800">ราคาพิเศษวันนี้</span>
                        <div className="text-right">
                            <span className="text-4xl md:text-5xl font-black bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                                {data.finalPrice.toLocaleString("th-TH")} ฿
                            </span>
                        </div>
                    </div>

                    {savings > 0 && (
                        <div className="mt-3 inline-flex items-center gap-2 bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-bold">
                            🔥 ประหยัด {savings.toLocaleString("th-TH")} ฿ ({savingsPercent}%)
                        </div>
                    )}
                </div>

                {data.discountNote && (
                    <p className="text-center text-sm text-slate-500 mb-6">{data.discountNote}</p>
                )}

                <button
                    onClick={ctx.onCTAClick}
                    className="w-full py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                >
                    {data.ctaText || "สมัครเรียนเลย"}
                </button>
            </div>
        </section>
    );
}
