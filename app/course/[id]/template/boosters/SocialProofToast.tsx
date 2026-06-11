"use client";
import { useEffect, useState } from "react";
import type { SocialProofConfig, SocialProofMessage } from "../types";

interface Props {
    config: SocialProofConfig;
}

export default function SocialProofToast({ config }: Props) {
    const [currentMsg, setCurrentMsg] = useState<SocialProofMessage | null>(null);
    const [visible, setVisible] = useState(false);

    const intervalSec = config.intervalSeconds ?? 15;
    const displaySec = config.displaySeconds ?? 5;

    useEffect(() => {
        if (!config.enabled || !config.messages?.length) return;
        let idx = 0;
        let hideTimer: ReturnType<typeof setTimeout>;

        const showNext = () => {
            const msg = config.messages[idx % config.messages.length];
            idx += 1;
            setCurrentMsg(msg);
            setVisible(true);
            hideTimer = setTimeout(() => setVisible(false), displaySec * 1000);
        };

        // First show after 5 seconds
        const firstTimer = setTimeout(showNext, 5000);
        const loopTimer = setInterval(showNext, intervalSec * 1000);

        return () => {
            clearTimeout(firstTimer);
            clearTimeout(hideTimer);
            clearInterval(loopTimer);
        };
    }, [config.enabled, config.messages, intervalSec, displaySec]);

    if (!config.enabled || !currentMsg) return null;

    return (
        <div
            className={`fixed bottom-24 left-4 md:left-6 z-30 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
        >
            <div
                className="kh-card p-3.5 flex items-start gap-3 max-w-[320px]"
                style={{ borderRadius: 16, boxShadow: "var(--kh-shadow)" }}
            >
                {/* live pulse dot */}
                <span className="relative mt-1.5 flex h-2.5 w-2.5 flex-shrink-0" aria-hidden="true">
                    <span
                        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                        style={{ background: "var(--kh-good)" }}
                    />
                    <span
                        className="relative inline-flex h-2.5 w-2.5 rounded-full"
                        style={{ background: "var(--kh-good)" }}
                    />
                </span>
                <div className="flex-1 min-w-0">
                    <p className="kh-kanit truncate" style={{ fontSize: 14, fontWeight: 600, color: "var(--kh-ink)" }}>
                        {currentMsg.name}
                        {currentMsg.location && (
                            <span style={{ fontWeight: 400, color: "var(--kh-mut)" }}> ({currentMsg.location})</span>
                        )}
                    </p>
                    <p style={{ fontSize: 12.5, color: "var(--kh-mut)" }}>
                        {currentMsg.action || "เพิ่งสมัครเรียน"}
                    </p>
                    <p className="mt-0.5" style={{ fontSize: 12.5, color: "var(--kh-mut)" }}>
                        ⏱️ {currentMsg.timeAgo || "ไม่กี่นาทีที่แล้ว"}
                    </p>
                </div>
            </div>
        </div>
    );
}
