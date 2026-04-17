"use client";
import type { CTAData, SectionContext } from "../types";

export default function CTASection({ data, ctx }: { data: CTAData; ctx: SectionContext }) {
    return (
        <section className="max-w-4xl mx-auto px-6 py-20">
            <div className="relative bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 rounded-[2.5rem] p-10 md:p-16 text-center overflow-hidden shadow-2xl shadow-indigo-300/30">
                <div className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl bg-blue-400/30 -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl bg-indigo-400/30 translate-x-1/2 translate-y-1/2"></div>

                <div className="relative z-10">
                    {data.urgencyText && (
                        <div className="inline-block px-4 py-1.5 bg-red-500 text-white text-sm font-bold rounded-full mb-6 animate-pulse">
                            {data.urgencyText}
                        </div>
                    )}

                    <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">{data.title}</h2>

                    {data.subtitle && (
                        <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
                            {data.subtitle}
                        </p>
                    )}

                    <button
                        onClick={ctx.onCTAClick}
                        className="group inline-flex items-center gap-3 px-10 py-5 bg-white rounded-2xl font-black text-xl text-indigo-600 shadow-2xl hover:scale-105 active:scale-95 transition-all"
                    >
                        <span>{data.ctaText}</span>
                        {data.priceText && (
                            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-base">
                                {data.priceText}
                            </span>
                        )}
                        <svg
                            className="w-6 h-6 group-hover:translate-x-1 transition-transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>
            </div>
        </section>
    );
}
