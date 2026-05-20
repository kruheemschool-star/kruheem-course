"use client";
import { useState } from "react";
import type { FAQData } from "../types";

const COLORS = [
    "bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/50",
    "bg-orange-50 border-orange-100 dark:bg-orange-950/30 dark:border-orange-900/50",
    "bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/50",
    "bg-yellow-50 border-yellow-100 dark:bg-yellow-950/30 dark:border-yellow-900/50",
    "bg-lime-50 border-lime-100 dark:bg-lime-950/30 dark:border-lime-900/50",
    "bg-green-50 border-green-100 dark:bg-green-950/30 dark:border-green-900/50",
    "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/50",
    "bg-teal-50 border-teal-100 dark:bg-teal-950/30 dark:border-teal-900/50",
    "bg-cyan-50 border-cyan-100 dark:bg-cyan-950/30 dark:border-cyan-900/50",
];

export default function FAQSection({ data }: { data: FAQData }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="max-w-3xl mx-auto px-6 py-16">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mb-4 leading-relaxed">
                    {data.title || "🔥 ถามตรง-ตอบเคลียร์!"}
                </h2>
                {data.subtitle && <p className="text-slate-600 dark:text-slate-300 text-lg">{data.subtitle}</p>}
            </div>

            <div className="space-y-4">
                {data.faqs.map((faq, i) => (
                    <div
                        key={i}
                        className={`border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${COLORS[i % COLORS.length]}`}
                    >
                        <button
                            onClick={() => setOpenIndex(openIndex === i ? null : i)}
                            className="w-full px-6 py-5 text-left font-bold text-slate-800 dark:text-white flex justify-between items-start gap-4"
                        >
                            <span className="text-lg">{faq.q}</span>
                            <span className="text-slate-500 dark:text-slate-400 font-bold text-xl flex-shrink-0 mt-0.5">
                                {openIndex === i ? "−" : "+"}
                            </span>
                        </button>
                        <div
                            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                                openIndex === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                            }`}
                        >
                            <div className="overflow-hidden">
                                <div className="px-6 pb-6 pt-2 text-slate-700 dark:text-slate-200 leading-relaxed border-t border-black/5 dark:border-white/10 text-base">
                                    {faq.a}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
