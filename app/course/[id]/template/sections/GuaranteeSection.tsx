"use client";
import type { GuaranteeData } from "../types";

export default function GuaranteeSection({ data }: { data: GuaranteeData }) {
    return (
        <section className="max-w-4xl mx-auto px-6 py-16">
            <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[2.5rem] p-8 md:p-12 border-2 border-emerald-100 shadow-xl overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl bg-emerald-200/40 translate-x-1/2 -translate-y-1/2"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40 rounded-full bg-white shadow-2xl flex items-center justify-center border-4 border-emerald-200">
                        <span className="text-7xl md:text-8xl">🛡️</span>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        {data.badgeText && (
                            <span className="inline-block px-4 py-1 bg-emerald-600 text-white text-sm font-bold rounded-full mb-3">
                                {data.badgeText}
                            </span>
                        )}
                        <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4">{data.title}</h2>
                        {data.desc && <p className="text-lg text-slate-600 leading-relaxed mb-4">{data.desc}</p>}

                        {data.features && data.features.length > 0 && (
                            <ul className="space-y-2">
                                {data.features.map((f, i) => (
                                    <li key={i} className="flex items-start gap-2 text-slate-700">
                                        <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
