"use client";
import { useEffect, useState } from "react";
import type { ExitIntentConfig } from "../types";

interface Props {
    config: ExitIntentConfig;
    onCTAClick: () => void | Promise<void>;
    courseId: string;
}

const STORAGE_KEY_PREFIX = "exitIntent_shown_";

export default function ExitIntentPopup({ config, onCTAClick, courseId }: Props) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!config.enabled) return;
        // Only show once per course per session
        const key = `${STORAGE_KEY_PREFIX}${courseId}`;
        if (typeof window !== "undefined" && sessionStorage.getItem(key)) return;

        let triggered = false;
        const handleLeave = (e: MouseEvent) => {
            if (triggered) return;
            // Trigger when mouse leaves top of viewport
            if (e.clientY <= 0) {
                triggered = true;
                setOpen(true);
                try {
                    sessionStorage.setItem(key, "1");
                } catch {}
            }
        };

        // Delay binding so it doesn't trigger on initial mouse entry
        const timer = setTimeout(() => {
            document.addEventListener("mouseleave", handleLeave);
        }, 3000);

        return () => {
            clearTimeout(timer);
            document.removeEventListener("mouseleave", handleLeave);
        };
    }, [config.enabled, courseId]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100] backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            style={{ background: "rgba(15,23,42,.55)" }}
            onClick={() => setOpen(false)}
        >
            <div
                className="kh-card max-w-md w-full p-7 text-center relative animate-in zoom-in-95 duration-300"
                style={{ borderRadius: 24, boxShadow: "var(--kh-shadow)" }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => setOpen(false)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-xl leading-none transition-opacity hover:opacity-70"
                    style={{ background: "var(--kh-tint)", color: "var(--kh-mut)" }}
                >
                    ×
                </button>

                <div className="text-6xl mb-4">✋</div>

                {config.discountText && (
                    <div
                        className="kh-kanit inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-base mb-4"
                        style={{ background: "var(--kh-urgBg)", color: "var(--kh-urgText)" }}
                    >
                        🎁 {config.discountText}
                    </div>
                )}

                <h3
                    className="kh-kanit font-extrabold mb-3"
                    style={{ fontSize: "clamp(22px, 3vw, 28px)", lineHeight: 1.3, color: "var(--kh-ink)" }}
                >
                    {config.title || "เดี๋ยวก่อน!"}
                </h3>

                <p className="leading-relaxed mb-6" style={{ fontSize: 16, color: "var(--kh-mut)" }}>
                    {config.desc || "อย่าพลาดโอกาสดีๆ วันนี้เท่านั้น!"}
                </p>

                <button
                    onClick={() => {
                        setOpen(false);
                        onCTAClick();
                    }}
                    className="kh-cta-btn w-full"
                >
                    {config.ctaText || "สนใจเลย!"}
                </button>

                <button
                    onClick={() => setOpen(false)}
                    className="mt-3 text-sm transition-opacity hover:opacity-70"
                    style={{ color: "var(--kh-mut)" }}
                >
                    ไม่สนใจ ขอบคุณ
                </button>
            </div>
        </div>
    );
}
