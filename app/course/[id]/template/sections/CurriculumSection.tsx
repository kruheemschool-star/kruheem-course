"use client";
import { useState } from "react";
import type { CurriculumData } from "../types";

const DEFAULT_COLORS = [
    { bg: "bg-blue-100/70", icon: "text-blue-500" },
    { bg: "bg-indigo-100/70", icon: "text-indigo-500" },
    { bg: "bg-emerald-100/70", icon: "text-emerald-500" },
    { bg: "bg-purple-100/70", icon: "text-purple-500" },
    { bg: "bg-rose-100/70", icon: "text-rose-500" },
    { bg: "bg-amber-100/70", icon: "text-amber-500" },
];

export default function CurriculumSection({ data }: { data: CurriculumData }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="max-w-4xl mx-auto px-6 py-16">
            <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] shadow-lg p-8 md:p-12 border border-white/50">
                <h2 className="text-4xl font-bold text-center text-slate-800 mb-4">{data.title}</h2>
                {data.subtitle && <p className="text-center text-lg text-slate-500 mb-12">{data.subtitle}</p>}

                <div className="space-y-4">
                    {data.chapters.map((ch, i) => {
                        const color = DEFAULT_COLORS[i % DEFAULT_COLORS.length];
                        const bg = ch.color || color.bg;
                        const iconColor = ch.iconColor || color.icon;
                        return (
                            <div key={ch.id} className={`rounded-2xl overflow-hidden transition-all duration-300 ${bg}`}>
                                <button
                                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                    className="w-full p-5 flex items-center justify-between text-left"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 bg-white shadow-sm rounded-2xl flex items-center justify-center font-bold text-xl ${iconColor}`}>
                                            {ch.id}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl text-slate-800">{ch.title}</h3>
                                            {ch.desc && <p className="text-slate-600 text-base">{ch.desc}</p>}
                                        </div>
                                    </div>
                                    <svg
                                        className={`w-6 h-6 text-slate-500 transition-transform duration-300 flex-shrink-0 ${openIndex === i ? "rotate-180" : ""}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${openIndex === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                                    <div className="overflow-hidden">
                                        <div className="px-5 pb-5 pt-0 pl-[5.5rem]">
                                            <ul className="list-disc text-slate-700 space-y-3 text-lg">
                                                {ch.content.map((item, j) => (
                                                    <li key={j}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
