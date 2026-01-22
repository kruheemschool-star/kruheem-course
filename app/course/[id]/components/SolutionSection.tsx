'use client';

import { GrandSlamContent } from '../grandSlamContent';

interface SolutionSectionProps {
    content: GrandSlamContent['solution'];
}

export default function SolutionSection({ content }: SolutionSectionProps) {
    return (
        <section className="py-20 bg-white">
            <div className="max-w-3xl mx-auto px-6">
                {/* Intro Text */}
                <p className="text-2xl text-slate-500 mb-4 text-center">
                    {content.intro}
                </p>

                {/* System Name - Big and Bold */}
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 text-center mb-8">
                    {content.systemName}
                </h2>

                {/* System Intro - ข้อความแนะนำระบบ */}
                <p className="text-2xl text-slate-600 text-center mb-12 leading-relaxed">
                    {content.systemIntro}
                </p>

                {/* Diagram Image (Optional) */}
                {content.diagramImage && (
                    <div className="mb-12 rounded-xl overflow-hidden shadow-2xl border-4 border-white mx-auto max-w-4xl">
                        <img
                            src={content.diagramImage}
                            alt="Blueprint System Diagram"
                            className="w-full h-auto object-cover"
                        />
                    </div>
                )}

                {/* Features - Simple List */}
                <div className="space-y-8">
                    {content.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-5">
                            {/* Icon */}
                            <div className="flex-shrink-0 w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">{feature.icon}</span>
                            </div>

                            {/* Content */}
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                                    {index + 1}. {feature.title}
                                </h3>
                                <p className="text-xl text-slate-600 leading-relaxed">
                                    {feature.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
