"use client";
import { useEffect, useState } from "react";
import type { StickyCTAConfig } from "../types";

interface Props {
    config: StickyCTAConfig;
    onCTAClick: () => void | Promise<void>;
    courseTitle: string;
}

export default function StickyCTA({ config, onCTAClick, courseTitle }: Props) {
    const [visible, setVisible] = useState(false);
    const threshold = config.showAfterScrollPx ?? 600;

    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY > threshold);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [threshold]);

    if (!config.enabled) return null;

    return (
        <div
            className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${visible ? "translate-y-0" : "translate-y-full"}`}
        >
            <div className="bg-slate-950/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.45)]">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                    <div className="hidden sm:block flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-400">สนใจคอร์ส</p>
                        <p className="font-bold text-white truncate">{courseTitle}</p>
                    </div>
                    <button
                        onClick={onCTAClick}
                        className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold text-base shadow-lg shadow-indigo-500/30 ring-1 ring-white/10 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <span>{config.ctaText || "สมัครเรียน"}</span>
                        {config.priceText && (
                            <span className="bg-white/15 backdrop-blur px-2 py-0.5 rounded text-sm">
                                {config.priceText}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
