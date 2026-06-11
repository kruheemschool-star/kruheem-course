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
            {/* Frosted bar on the kh palette; left padding keeps the floating
                theme-picker FAB (fixed left-4 bottom-5, z-[75]) clear & clickable */}
            <div
                className="backdrop-blur-xl"
                style={{
                    background: "rgba(255,255,255,.92)",
                    borderTop: "1px solid var(--kh-line)",
                    boxShadow: "0 -18px 40px -24px rgba(0,0,0,.28)",
                }}
            >
                <div className="max-w-5xl mx-auto pl-16 sm:pl-20 pr-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                        <div className="hidden sm:block min-w-0">
                            <p className="text-xs font-medium" style={{ color: "var(--kh-mut)" }}>สนใจคอร์ส</p>
                            <p className="kh-kanit font-bold truncate" style={{ color: "var(--kh-ink)" }}>{courseTitle}</p>
                        </div>
                        {config.priceText && (
                            <span
                                className="kh-num text-lg font-extrabold whitespace-nowrap"
                                style={{ color: "var(--kh-ctaDeep)" }}
                            >
                                {config.priceText}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onCTAClick}
                        className="kh-cta-btn flex-1 sm:flex-none"
                        style={{ padding: "12px 24px" }}
                    >
                        {config.ctaText || "สมัครเรียน"}
                    </button>
                </div>
            </div>
        </div>
    );
}
