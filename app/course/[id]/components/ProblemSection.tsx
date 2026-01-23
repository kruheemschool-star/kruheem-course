'use client';

import { GrandSlamContent } from '../grandSlamContent';

interface ProblemSectionProps {
    content: GrandSlamContent['problem'];
}

export default function ProblemSection({ content }: ProblemSectionProps) {
    return (
        <section
            className="relative z-10 py-20 bg-white"
            style={{
                boxShadow: '0px -10px 40px rgba(0, 0, 0, 0.1)',
            }}
        >
            <div className="max-w-3xl mx-auto px-6">
                {/* Section Header */}
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-12 text-center">
                    <span className="bg-green-200 px-4 py-2 leading-relaxed decoration-clone box-decoration-clone rounded-lg">
                        {content.intro}
                    </span>
                </h2>

                {/* Problem Illustration Image */}
                {content.image && (
                    <div className="mb-12 rounded-2xl overflow-hidden shadow-xl border-4 border-white mx-auto max-w-4xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={content.image}
                            alt="Problem Illustration"
                            className="w-full h-auto object-cover"
                        />
                    </div>
                )}

                {/* Pain Points - Simple List */}
                <div className="space-y-6 mb-12">
                    {content.painPoints.map((point, index) => (
                        <div
                            key={index}
                            className="flex items-start gap-4 p-5 bg-white rounded-lg border border-slate-200 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-slate-300 cursor-default"
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

                {/* Warning Image */}
                {content.warningImage && (
                    <div className="mb-8 rounded-2xl overflow-hidden shadow-xl border-4 border-white mx-auto max-w-4xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={content.warningImage}
                            alt="Warning Illustration"
                            className="w-full h-auto object-cover"
                        />
                    </div>
                )}

                {/* Warning Message - Simple */}
                {/* Warning Message - Simple */}
                <div className="p-6 bg-slate-50 border-l-4 border-amber-400 rounded-r-lg">
                    <p className="text-xl text-slate-800 font-medium">
                        ⚠️ {content.warning}
                    </p>
                </div>
            </div>
        </section>
    );
}
