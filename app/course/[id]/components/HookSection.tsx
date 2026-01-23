'use client';

import { useEffect, useState, useRef } from 'react';
import { GrandSlamContent } from '../grandSlamContent';

interface HookSectionProps {
    content: GrandSlamContent['hook'];
}

export default function HookSection({ content }: HookSectionProps) {
    const [scrollProgress, setScrollProgress] = useState(0);
    const sectionRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (!sectionRef.current) return;
            const sectionHeight = sectionRef.current.offsetHeight;
            const scrollY = window.scrollY;
            // Calculate progress: 0 at top, 1 when scrolled past section
            const progress = Math.min(scrollY / (sectionHeight * 0.8), 1);
            setScrollProgress(progress);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <section
            ref={sectionRef}
            className="sticky top-0 pt-32 pb-24 bg-white z-0"
            style={{
                opacity: 1 - scrollProgress * 0.6,
                filter: `blur(${scrollProgress * 4}px)`,
                transform: `scale(${1 - scrollProgress * 0.05})`,
            }}
        >
            <div className="max-w-3xl mx-auto px-6 text-center">
                {/* Main Headline */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-slate-800 mb-8">
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
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-600 mb-8 leading-snug">
                        <span className="bg-green-200 px-4 py-2 leading-relaxed decoration-clone box-decoration-clone rounded-lg">
                            {content.secondaryHeadline}
                        </span>
                    </h2>
                )}

                {/* Sub-headline */}
                <p className="text-xl md:text-2xl text-slate-500 font-normal max-w-2xl mx-auto leading-relaxed">
                    {content.subHeadline}
                </p>

                {/* Blueprint System Badge - Minimal */}
                <div className="mt-12 inline-flex items-center gap-2 text-lg text-slate-500">
                    <span className="text-xl">🎯</span>
                    <span className="font-medium">The Blueprint System</span>
                </div>
            </div>
        </section>
    );
}
