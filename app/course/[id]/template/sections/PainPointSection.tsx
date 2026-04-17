"use client";
import type { PainPointData } from "../types";

export default function PainPointSection({ data }: { data: PainPointData }) {
    return (
        <section className="max-w-5xl mx-auto px-6 py-16">
            <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white/50 p-8 md:p-12 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-64 h-64 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 bg-rose-200/40"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 bg-indigo-200/40"></div>

                <h2 className="text-4xl md:text-5xl font-black text-slate-800 leading-relaxed mb-6 relative z-10">
                    {data.title}
                </h2>
                {data.subtitle && (
                    <p className="text-xl text-slate-600 mb-12 font-medium relative z-10">{data.subtitle}</p>
                )}

                <div className="text-left grid md:grid-cols-2 gap-10 items-start relative z-10">
                    {/* Problems */}
                    <div className="bg-white/60 rounded-3xl p-6 border border-white/60 shadow-sm">
                        <h3 className="font-bold text-2xl text-slate-700 mb-6 flex items-center gap-2">
                            <span className="text-3xl">{data.problemIcon || "🔓"}</span>
                            {data.problemTitle || "ปัญหาที่เจอ"}
                        </h3>
                        <ul className="space-y-5">
                            {data.problems.map((item, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <span className="text-2xl flex-shrink-0">{item.icon}</span>
                                    <span className="text-lg text-slate-600">{item.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Solutions */}
                    <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-200/60 shadow-sm">
                        <h3 className="font-bold text-2xl text-slate-700 mb-6 flex items-center gap-2">
                            <span className="text-3xl">{data.solutionIcon || "💡"}</span>
                            {data.solutionTitle || "สิ่งที่จะได้รับ"}
                        </h3>
                        {data.solutionDesc && (
                            <p className="text-lg text-slate-600 mb-6 font-medium">{data.solutionDesc}</p>
                        )}
                        <ul className="space-y-4">
                            {data.solutions.map((item, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <span className="text-2xl text-green-600 font-bold">{item.icon}</span>
                                    <span className="text-lg text-slate-700">{item.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
