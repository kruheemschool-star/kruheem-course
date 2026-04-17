"use client";
import { useState } from "react";
import type { FAQData } from "../types";

const COLORS = [
    "bg-rose-50 border-rose-100",
    "bg-orange-50 border-orange-100",
    "bg-amber-50 border-amber-100",
    "bg-yellow-50 border-yellow-100",
    "bg-lime-50 border-lime-100",
    "bg-green-50 border-green-100",
    "bg-emerald-50 border-emerald-100",
    "bg-teal-50 border-teal-100",
    "bg-cyan-50 border-cyan-100",
];

export default function FAQSection({ data }: { data: FAQData }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="max-w-3xl mx-auto px-6 py-16">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4 leading-relaxed">
                    {data.title || "🔥 ถามตรง-ตอบเคลียร์!"}
                </h2>
                {data.subtitle && <p className="text-slate-600 text-lg">{data.subtitle}</p>}
            </div>

            <div className="space-y-4">
                {data.faqs.map((faq, i) => (
                    <div
                        key={i}
                        className={`border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${COLORS[i % COLORS.length]}`}
                    >
                        <button
                            onClick={() => setOpenIndex(openIndex === i ? null : i)}
                            className="w-full px-6 py-5 text-left font-bold text-slate-800 flex justify-between items-start gap-4"
                        >
                            <span className="text-lg">{faq.q}</span>
                            <span className="text-slate-500 font-bold text-xl flex-shrink-0 mt-0.5">
                                {openIndex === i ? "−" : "+"}
                            </span>
                        </button>
                        <div
                            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                                openIndex === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                            }`}
                        >
                            <div className="overflow-hidden">
                                <div className="px-6 pb-6 pt-2 text-slate-700 leading-relaxed border-t border-black/5 text-base">
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
