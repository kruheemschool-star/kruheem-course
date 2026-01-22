'use client';

import { GrandSlamContent } from '../grandSlamContent';

interface HookSectionProps {
    content: GrandSlamContent['hook'];
}

export default function HookSection({ content }: HookSectionProps) {
    return (
        <section className="pt-32 pb-20 bg-white">
            <div className="max-w-3xl mx-auto px-6 text-center">
                {/* Main Headline */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-slate-900 mb-8">
                    {Array.isArray(content.headline) ? (
                        content.headline.map((line, i) => (
                            <span key={i} className="block">
                                {line}
                            </span>
                        ))
                    ) : (
                        content.headline
                    )}
                </h1>

                {/* Secondary Headline */}
                {content.secondaryHeadline && (
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-700 mb-8 leading-snug">
                        {content.secondaryHeadline}
                    </h2>
                )}

                {/* Sub-headline */}
                <p className="text-2xl md:text-3xl text-slate-500 font-normal max-w-2xl mx-auto leading-relaxed">
                    {content.subHeadline}
                </p>

                {/* Blueprint System Badge - Minimal */}
                <div className="mt-12 inline-flex items-center gap-2 text-xl text-slate-600">
                    <span className="text-2xl">🎯</span>
                    <span className="font-semibold">The Blueprint System</span>
                </div>
            </div>
        </section>
    );
}
