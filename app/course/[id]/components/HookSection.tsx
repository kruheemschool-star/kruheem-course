'use client';

import { useEffect, useState, useRef } from 'react';
import { GrandSlamContent } from '../grandSlamContent';

interface HookSectionProps {
    content: GrandSlamContent['hook'];
}

export default function HookSection({ content }: HookSectionProps) {
    const [scrollProgress, setScrollProgress] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
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
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-relaxed tracking-tight text-slate-800 mb-8">
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

                {/* Free Sample Button (Endowment Effect) */}
                {content.sampleVideoId && (
                    <div className="mt-8">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-slate-200 rounded-full text-slate-700 font-bold text-lg hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm hover:shadow-md"
                        >
                            <span className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </span>
                            <span>ทดลองเรียนบทที่ 1 ฟรี</span>
                        </button>
                        <p className="text-sm text-slate-400 mt-3">
                            (คลิกเพื่อดูตัวอย่างการสอนจริง - ไม่ต้องสมัครสมาชิก)
                        </p>
                    </div>
                )}

                {/* Blueprint System Badge - Minimal */}
                <div className="mt-12 inline-flex items-center gap-2 text-lg text-slate-500 opacity-60">
                    <span className="text-xl">🎯</span>
                    <span className="font-medium">The Blueprint System</span>
                </div>
            </div>

            {/* Video Modal */}
            <VideoModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                videoId={content.sampleVideoId || ''}
            />
        </section>
    );
}

function VideoModal({ isOpen, onClose, videoId }: { isOpen: boolean; onClose: () => void; videoId: string }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl aspect-video transform transition-all animate-scale-up" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors">
                    ✕
                </button>
                <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                ></iframe>
            </div>
        </div>
    );
}
