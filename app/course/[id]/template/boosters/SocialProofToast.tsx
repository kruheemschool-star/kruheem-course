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
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex items-center gap-3 max-w-[320px]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {currentMsg.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                        {currentMsg.name}
                        {currentMsg.location && (
                            <span className="font-normal text-slate-500"> ({currentMsg.location})</span>
                        )}
                    </p>
                    <p className="text-xs text-slate-600">
                        {currentMsg.action || "เพิ่งสมัครเรียน"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                        ⏱️ {currentMsg.timeAgo || "ไม่กี่นาทีที่แล้ว"}
                    </p>
                </div>
            </div>
        </div>
    );
}
