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
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
        >
            <div
                className="bg-white rounded-[2rem] max-w-lg w-full p-8 md:p-10 text-center shadow-2xl relative animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => setOpen(false)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xl leading-none"
                >
                    ×
                </button>

                <div className="text-6xl mb-4">✋</div>

                <h3 className="text-3xl font-black text-slate-800 mb-3">
                    {config.title || "เดี๋ยวก่อน!"}
                </h3>

                <p className="text-lg text-slate-600 leading-relaxed mb-6">
                    {config.desc || "อย่าพลาดโอกาสดีๆ วันนี้เท่านั้น!"}
                </p>

                {config.discountText && (
                    <div className="inline-block px-5 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white font-black rounded-full text-lg mb-6 shadow-lg">
                        🎁 {config.discountText}
                    </div>
                )}

                <button
                    onClick={() => {
                        setOpen(false);
                        onCTAClick();
                    }}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-xl shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                    {config.ctaText || "สนใจเลย!"}
                </button>

                <button
                    onClick={() => setOpen(false)}
                    className="mt-3 text-sm text-slate-400 hover:text-slate-600"
                >
                    ไม่สนใจ ขอบคุณ
                </button>
            </div>
        </div>
    );
}
