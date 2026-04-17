"use client";
import type { SolutionData } from "../types";

export default function SolutionSection({ data }: { data: SolutionData }) {
    return (
        <section className="max-w-6xl mx-auto px-6 py-16">
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">{data.title}</h2>
                {data.subtitle && <p className="text-lg text-slate-500 max-w-2xl mx-auto">{data.subtitle}</p>}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.items.map((item, i) => (
                    <div
                        key={i}
                        className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-3xl mb-5">
                            {item.icon}
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-3">{item.title}</h3>
                        <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
