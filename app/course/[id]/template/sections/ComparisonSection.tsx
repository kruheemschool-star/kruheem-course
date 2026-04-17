"use client";
import type { ComparisonData } from "../types";

export default function ComparisonSection({ data }: { data: ComparisonData }) {
    return (
        <section className="max-w-6xl mx-auto px-6 py-16">
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
                    {data.title || "ทำไมต้องเลือกเรา?"}
                </h2>
                {data.subtitle && <p className="text-lg text-slate-500">{data.subtitle}</p>}
            </div>

            <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                {data.columns.map((col, i) => (
                    <div
                        key={i}
                        className={`rounded-[2rem] p-6 md:p-8 border-2 transition-all ${
                            col.highlight
                                ? "bg-gradient-to-br from-indigo-600 to-blue-600 border-indigo-600 shadow-2xl shadow-indigo-200/50 md:scale-105"
                                : "bg-white border-slate-100 shadow-sm"
                        }`}
                    >
                        <h3
                            className={`text-xl font-bold mb-6 text-center ${
                                col.highlight ? "text-white" : "text-slate-800"
                            }`}
                        >
                            {col.title}
                        </h3>
                        <ul className="space-y-4">
                            {col.features.map((feat, j) => (
                                <li key={j} className="flex items-start gap-3">
                                    {feat.included ? (
                                        <span className={`text-xl flex-shrink-0 ${col.highlight ? "text-emerald-300" : "text-emerald-500"}`}>
                                            ✓
                                        </span>
                                    ) : (
                                        <span className={`text-xl flex-shrink-0 ${col.highlight ? "text-white/40" : "text-slate-300"}`}>
                                            ✗
                                        </span>
                                    )}
                                    <span
                                        className={`${
                                            feat.included
                                                ? col.highlight
                                                    ? "text-white"
                                                    : "text-slate-700"
                                                : col.highlight
                                                ? "text-white/50 line-through"
                                                : "text-slate-400 line-through"
                                        }`}
                                    >
                                        {feat.text}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </section>
    );
}
