"use client";

import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─────────────────────────────────────────────────────────────────────────────
// ExamCountdownHero — นาฬิกานับถอยหลังวันสอบ ดีไซน์ "มินิมอล · แอคเซนต์เดียว"
// (ตามสเปก มินิมอล-แอคเซนต์เดียว-spec.md). แทนที่การ์ด StartHereNav บนหน้าแรก.
// ปรับรายละเอียดได้จากหลังบ้าน: settings/homeCountdown (แก้ที่ /admin/countdown).
//
// กับดักที่จัดการแล้ว:
//   • Hydration — เรนเดอร์โครงว่างจน mounted (SSR + client แรกตรงกัน) แล้วค่อยโชว์เลข
//   • Timezone — เวลาที่ไม่มี TZ ถูกตีความเป็นเวลาเครื่อง (ผู้เรียนไทย = เวลาไทย)
//   • Re-render — setInterval ตัวเดียว หยุดตอนแท็บซ่อน
//   • ถึงวันสอบ — diff clamp ≥ 0, สลับเป็นข้อความ "ถึงวันสอบแล้ว! สู้ ๆ"
// ─────────────────────────────────────────────────────────────────────────────

export interface CountdownConfig {
    examName: string;
    targetDate: string;  // ISO-ish "YYYY-MM-DDTHH:mm:ss" (ตีความเป็นเวลาไทย)
    startDaysBefore: number; // เริ่มแถบ progress กี่วันก่อนสอบ (ค่าเริ่มต้น 120)
    startDate: string;   // (ทางเลือก) วันเริ่มแบบเจาะจง — ถ้าใส่ จะชนะ startDaysBefore
    showProgress: boolean;
    showQuote: boolean;
    quotes: string[];
}

export const DEFAULT_QUOTES = [
    "ทุกวินาทีที่ตั้งใจ คือก้าวที่เข้าใกล้ความฝัน",
    "เหนื่อยวันนี้ เพื่อยิ้มในวันสอบ",
    "อย่ายอมแพ้ ในวันที่ยังไปต่อได้",
    "ความพยายามไม่เคยทรยศใคร",
    "อ่านอีกนิด พรุ่งนี้จะขอบคุณตัวเอง",
    "เก่งขึ้นทุกวัน แม้ทีละก้าว",
];

export const DEFAULT_COUNTDOWN: CountdownConfig = {
    examName: "สอบเข้ามหาวิทยาลัย",
    targetDate: "2027-03-06T09:00:00",
    startDaysBefore: 120,
    startDate: "",
    showProgress: true,
    showQuote: true,
    quotes: DEFAULT_QUOTES,
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const DAY_MS = 86400000;

export default function ExamCountdownHero() {
    const [mounted, setMounted] = useState(false);
    const [config, setConfig] = useState<CountdownConfig>(DEFAULT_COUNTDOWN);
    const [now, setNow] = useState(() => Date.now());
    const [quoteIdx, setQuoteIdx] = useState(0);

    // Load backend config once (client-side; keeps SSR output stable → no mismatch)
    useEffect(() => {
        setMounted(true);
        (async () => {
            try {
                const snap = await getDoc(doc(db, "settings", "homeCountdown"));
                if (!snap.exists()) return;
                const d = snap.data() as Partial<CountdownConfig>;
                setConfig((prev) => ({
                    examName: typeof d.examName === "string" && d.examName.trim() ? d.examName : prev.examName,
                    targetDate: typeof d.targetDate === "string" && d.targetDate.trim() ? d.targetDate : prev.targetDate,
                    startDaysBefore: typeof d.startDaysBefore === "number" && d.startDaysBefore > 0 ? d.startDaysBefore : prev.startDaysBefore,
                    startDate: typeof d.startDate === "string" ? d.startDate : prev.startDate,
                    showProgress: typeof d.showProgress === "boolean" ? d.showProgress : prev.showProgress,
                    showQuote: typeof d.showQuote === "boolean" ? d.showQuote : prev.showQuote,
                    quotes: Array.isArray(d.quotes) && d.quotes.filter(Boolean).length > 0 ? d.quotes.filter(Boolean) : prev.quotes,
                }));
            } catch { /* keep defaults */ }
        })();
    }, []);

    // Tick every second; pause while the tab is hidden.
    useEffect(() => {
        let id: ReturnType<typeof setInterval> | null = null;
        const start = () => { if (!id) { setNow(Date.now()); id = setInterval(() => setNow(Date.now()), 1000); } };
        const stop = () => { if (id) { clearInterval(id); id = null; } };
        const onVis = () => (document.visibilityState === "visible" ? start() : stop());
        start();
        document.addEventListener("visibilitychange", onVis);
        return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
    }, []);

    // Rotate the quote every 6s.
    useEffect(() => {
        if (!config.showQuote || config.quotes.length < 2) return;
        const id = setInterval(() => setQuoteIdx((i) => (i + 1) % config.quotes.length), 6000);
        return () => clearInterval(id);
    }, [config.showQuote, config.quotes.length]);

    const targetMs = (() => { const t = Date.parse(config.targetDate); return Number.isNaN(t) ? Date.parse(DEFAULT_COUNTDOWN.targetDate) : t; })();
    const startMs = (() => {
        // วันเริ่มแบบเจาะจง (ถ้าใส่) ชนะ; ไม่งั้นใช้ "กี่วันก่อนสอบ"; สุดท้าย 120 วัน
        const s = config.startDate ? Date.parse(config.startDate) : NaN;
        if (!Number.isNaN(s)) return s;
        const daysBefore = config.startDaysBefore > 0 ? config.startDaysBefore : 120;
        return targetMs - daysBefore * DAY_MS;
    })();

    const diff = Math.max(0, targetMs - now);
    const reached = mounted && diff <= 0;
    const dDays = Math.floor(diff / DAY_MS);
    const dHours = Math.floor(diff / 3600000) % 24;
    const dMins = Math.floor(diff / 60000) % 60;
    const dSecs = Math.floor(diff / 1000) % 60;

    const progressPct = (() => {
        const span = targetMs - startMs;
        if (span <= 0) return 100;
        return Math.max(0, Math.min(100, ((now - startMs) / span) * 100));
    })();

    const quote = config.quotes[quoteIdx % Math.max(1, config.quotes.length)] || "";

    return (
        <section className="khcd-wrap px-4 sm:px-6 py-10 md:py-14">
            <div className="khcd" aria-label="นับถอยหลังสู่วันสอบ">
                {/* Kicker */}
                <div className="khcd-kicker">
                    <span className="khcd-dot" aria-hidden />
                    นับถอยหลังสู่วันสอบ
                </div>

                {/* Exam name */}
                <h2 className="khcd-exam">{config.examName}</h2>

                {reached ? (
                    <div className="khcd-reached">ถึงวันสอบแล้ว! สู้ ๆ</div>
                ) : (
                    <>
                        <p className="khcd-left">เหลือเวลาอีก</p>

                        {/* 4 units */}
                        <div className="khcd-units" role="timer" aria-live="off">
                            {mounted ? (
                                <>
                                    <Unit value={String(dDays)} label="วัน" accent anim="flip" />
                                    <Unit value={pad2(dHours)} label="ชั่วโมง" anim="flip" />
                                    <Unit value={pad2(dMins)} label="นาที" anim="flip" />
                                    <Unit value={pad2(dSecs)} label="วินาที" anim="tick" />
                                </>
                            ) : (
                                <>
                                    <Unit value="—" label="วัน" accent />
                                    <Unit value="—" label="ชั่วโมง" />
                                    <Unit value="—" label="นาที" />
                                    <Unit value="—" label="วินาที" />
                                </>
                            )}
                        </div>

                        {/* Progress */}
                        {config.showProgress && (
                            <div className="khcd-progress-wrap">
                                <div className="khcd-track">
                                    <div className="khcd-fill" style={{ width: `${progressPct}%` }} />
                                </div>
                                <div className="khcd-progress-label">ผ่านมา {Math.round(progressPct)}%</div>
                            </div>
                        )}
                    </>
                )}

                {/* Quote */}
                {config.showQuote && !reached && quote && (
                    <p key={quote} className="khcd-quote">“{quote}”</p>
                )}
            </div>

            <style jsx>{`
                .khcd-wrap { display: flex; justify-content: center; }
                .khcd {
                    --bg: #fbfbf9; --border: #ececec; --accent: #c2410c;
                    --num: #1a1a1a; --exam: #1a1a1a; --kicker: #b5ac97;
                    --left: #9c9384; --track: #efeadf; --quote: #8a8172;
                    width: 100%; max-width: 720px; min-height: 440px;
                    background: var(--bg); border: 1px solid var(--border);
                    border-radius: 32px; padding: 52px 48px;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    gap: 22px; text-align: center;
                    font-family: var(--font-ibm-loop), "IBM Plex Sans Thai", system-ui, sans-serif;
                }
                :global(.dark) .khcd {
                    --bg: #1b1a17; --border: #33322d; --accent: #f97316;
                    --num: #f4f2ee; --exam: #f4f2ee; --kicker: #8f8877;
                    --left: #9c9384; --track: #33302a; --quote: #a9a091;
                }
                .khcd-kicker {
                    display: inline-flex; align-items: center; gap: 9px;
                    font-size: 13px; font-weight: 500; letter-spacing: 4px;
                    color: var(--kicker); text-transform: none;
                }
                .khcd-dot { width: 8px; height: 8px; border-radius: 999px; background: var(--accent); display: inline-block; }
                .khcd-exam { font-size: 40px; font-weight: 600; letter-spacing: -0.5px; color: var(--exam); line-height: 1.15; margin: 0; }
                .khcd-left { font-size: 15px; color: var(--left); margin: 0; }
                .khcd-units { display: flex; align-items: flex-start; justify-content: center; gap: 18px; }
                .khcd-progress-wrap { width: 100%; max-width: 460px; }
                .khcd-track { height: 6px; border-radius: 999px; background: var(--track); overflow: hidden; }
                .khcd-fill { height: 100%; border-radius: 999px; background: var(--accent); transition: width .6s ease; }
                .khcd-progress-label { margin-top: 10px; font-size: 12px; letter-spacing: 1px; color: var(--kicker); }
                .khcd-quote {
                    font-size: 16px; font-style: italic; color: var(--quote); margin: 0; max-width: 460px;
                    animation: khcdQuoteFade 1.1s cubic-bezier(.22,1,.36,1);
                }
                .khcd-reached { font-size: 38px; font-weight: 700; color: var(--accent); }
                @media (max-width: 520px) {
                    .khcd { padding: 40px 24px; border-radius: 26px; min-height: 380px; }
                    .khcd-exam { font-size: 30px; }
                    .khcd-units { gap: 10px; }
                }
                @keyframes khcdQuoteFade { 0% { opacity: 0; filter: blur(5px); transform: translateY(8px); } 100% { opacity: 1; filter: blur(0); transform: translateY(0); } }
            `}</style>
        </section>
    );
}

// One time unit: big number over a small unit label. The number remounts on
// change (key=value) so its CSS animation replays each tick.
function Unit({ value, label, accent = false, anim }: { value: string; label: string; accent?: boolean; anim?: "flip" | "tick" }) {
    return (
        <div className="khcd-unit">
            <span className="khcd-num-clip">
                <span key={value} className={`khcd-num${accent ? " is-accent" : ""}${anim ? ` a-${anim}` : ""}`}>{value}</span>
            </span>
            <span className="khcd-unit-label">{label}</span>
            <style jsx>{`
                .khcd-unit { display: flex; flex-direction: column; align-items: center; gap: 10px; min-width: 2ch; }
                .khcd-num-clip { display: block; overflow: hidden; line-height: 1; }
                .khcd-num {
                    display: inline-block; font-size: 72px; font-weight: 300; letter-spacing: -2px;
                    line-height: 1; color: var(--num); font-variant-numeric: tabular-nums;
                }
                .khcd-num.is-accent { color: var(--accent); }
                .a-flip { animation: khcdFlipIn .55s ease; }
                .a-tick { animation: khcdTick .55s ease; }
                .khcd-unit-label { font-size: 11px; font-weight: 500; letter-spacing: 3px; color: var(--kicker); }
                @media (max-width: 520px) { .khcd-num { font-size: 44px; letter-spacing: -1px; } }
                @keyframes khcdFlipIn { 0% { transform: translateY(-78%); opacity: 0; } 55% { opacity: 1; } 100% { transform: translateY(0); opacity: 1; } }
                @keyframes khcdTick { 0% { transform: translateY(-78%); opacity: .15; } 100% { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
}
