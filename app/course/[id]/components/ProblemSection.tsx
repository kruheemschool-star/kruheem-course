'use client';

import { GrandSlamContent } from '../grandSlamContent';

interface ProblemSectionProps {
    content: GrandSlamContent['problem'];
}

export default function ProblemSection({ content }: ProblemSectionProps) {
    return (
        <section className="py-20 bg-slate-50">
            <div className="max-w-3xl mx-auto px-6">
                {/* Section Header */}
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-12 text-center">
                    {content.intro}
                </h2>

                {/* Pain Points - Simple List */}
                <div className="space-y-6 mb-12">
                    {content.painPoints.map((point, index) => (
                        <div
                            key={index}
                            className="flex items-start gap-4 p-5 bg-white rounded-lg border border-slate-200"
                        >
                            <span className="text-2xl flex-shrink-0">{point.icon}</span>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-1">
                                    {point.title}
                                </h3>
                                <p className="text-xl text-slate-600 leading-relaxed">
                                    {point.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Warning Message - Simple */}
                <div className="p-6 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
                    <p className="text-xl text-slate-800 font-medium">
                        ⚠️ {content.warning}
                    </p>
                </div>
            </div>
        </section>
    );
}
