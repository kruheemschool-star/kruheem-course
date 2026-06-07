"use client";
import { Fragment } from "react";
import type { HowItWorksData, SectionContext } from "../types";
import { ChevronRight, ChevronDown } from "lucide-react";

export default function HowItWorksSection({ data, ctx }: { data: HowItWorksData; ctx: SectionContext }) {
    const steps = (data.steps || []).filter((s) => s.title?.trim() || s.icon?.trim());
    if (steps.length === 0) return null;

    return (
        <section className="w-full py-16 md:py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
            <div className="max-w-5xl mx-auto px-4 md:px-8">
                {/* Header */}
                <div className="text-center mb-12 md:mb-16">
                    <h2 className="text-3xl md:text-5xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-4">
                        {data.title || "เรียนยังไง?"}{" "}
                        <span className="text-indigo-600 dark:text-indigo-400">🪜</span>
                    </h2>
                    {data.subtitle && (
                        <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
                            {data.subtitle}
                        </p>
                    )}
                    <div className="w-24 h-1.5 bg-indigo-600 dark:bg-indigo-400 mx-auto rounded-full opacity-20 mt-5" />
                </div>

                {/* Steps */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-center gap-2 sm:gap-3">
                    {steps.map((step, i) => (
                        <Fragment key={i}>
                            <div className="flex-1 sm:max-w-xs flex flex-col items-center text-center">
                                {/* Number circle + icon */}
                                <div className="relative">
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center text-3xl md:text-4xl shadow-lg shadow-indigo-500/25">
                                        {step.icon || "•"}
                                    </div>
                                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 text-sm font-extrabold flex items-center justify-center shadow border border-indigo-100 dark:border-slate-700">
                                        {i + 1}
                                    </span>
                                </div>
                                <h3 className="mt-5 font-bold text-lg md:text-xl text-slate-800 dark:text-white">
                                    {step.title}
                                </h3>
                                {step.desc && (
                                    <p className="mt-2 text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {step.desc}
                                    </p>
                                )}
                            </div>

                            {/* Connector between steps */}
                            {i < steps.length - 1 && (
                                <div className="flex items-center justify-center text-indigo-300 dark:text-indigo-700 py-1 sm:py-0 sm:mt-7 md:mt-9">
                                    <ChevronDown className="sm:hidden" size={26} />
                                    <ChevronRight className="hidden sm:block" size={28} />
                                </div>
                            )}
                        </Fragment>
                    ))}
                </div>

                {/* Optional CTA */}
                {data.ctaText?.trim() && (
                    <div className="text-center mt-12">
                        <button
                            onClick={() => ctx.onCTAClick()}
                            className="inline-block px-10 py-4 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow-xl shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-transform"
                        >
                            {data.ctaText}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
