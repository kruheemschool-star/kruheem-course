"use client";

import React from 'react';
import { Target, BarChart3, Trophy, Sparkles, Lock } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// AnalysisPreview — "ทำแล้วได้เห็นอะไร" — shown on the START screen, BEFORE the
// student answers anything. Purpose: give a concrete picture of the analysis
// they unlock so they don't quit after 2 questions. Two motivational pieces:
//   1) an unlock LADDER tied to the real thresholds (≥5 → ~20 (ควิซย่อย) → ครบชุด)
//   2) a ghosted SAMPLE of the weakness map so they see the shape of the payoff.
//
// Presentational only — the parent computes `total`, `isDiagnostic`, and any
// real `lastResult`. Shared by both runners; `variant` swaps the accent so the
// exam bank (สนามสอบ, indigo) and in-course (ห้องเรียน, emerald) stay distinct.
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalysisPreviewLastResult {
    percent: number;
    grade?: string;
    attempts?: number;
}

interface AnalysisPreviewProps {
    variant?: 'bank' | 'course';
    total: number;
    miniSize?: number; // ควิซย่อย size (default 20)
    isDiagnostic?: boolean;
    lastResult?: AnalysisPreviewLastResult | null;
    className?: string;
}

// Accent palette per surface. Kept as full utility-class strings (not
// interpolated fragments) so Tailwind keeps them in the build.
const ACCENTS = {
    bank: {
        chip: 'from-indigo-500 to-violet-500',
        ring: 'border-indigo-200 dark:border-indigo-800',
        soft: 'from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-800/40',
        text: 'text-indigo-600 dark:text-indigo-400',
        radar: '#6366f1',
        badge: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300',
    },
    course: {
        chip: 'from-emerald-500 to-teal-500',
        ring: 'border-emerald-200 dark:border-emerald-800',
        soft: 'from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800/40',
        text: 'text-emerald-600 dark:text-emerald-400',
        radar: '#10b981',
        badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
} as const;

// A faint 6-spoke radar drawn in plain SVG (no recharts) — just to convey the
// SHAPE of the payoff. Values are illustrative, not a real student's data.
function GhostRadar({ color }: { color: string }) {
    const cx = 90, cy = 82, r = 62;
    const spokes = 6;
    // sample "mastery" per spoke (0..1) — deliberately uneven so a weak spot shows
    const sample = [0.9, 0.55, 0.75, 0.35, 0.8, 0.5];
    const pt = (i: number, radius: number) => {
        const ang = (Math.PI * 2 * i) / spokes - Math.PI / 2;
        return [cx + radius * Math.cos(ang), cy + radius * Math.sin(ang)];
    };
    const gridRings = [0.33, 0.66, 1].map((k) =>
        Array.from({ length: spokes }, (_, i) => pt(i, r * k).join(',')).join(' ')
    );
    const shape = sample.map((v, i) => pt(i, r * Math.max(0.15, v)).join(',')).join(' ');
    return (
        <svg viewBox="0 0 180 164" className="w-full h-full" aria-hidden>
            {gridRings.map((pts, i) => (
                <polygon key={i} points={pts} fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth={1} />
            ))}
            {Array.from({ length: spokes }, (_, i) => {
                const [x, y] = pt(i, r);
                return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth={1} />;
            })}
            <polygon points={shape} fill={color} fillOpacity={0.22} stroke={color} strokeWidth={2} strokeOpacity={0.7} />
        </svg>
    );
}

export const AnalysisPreview: React.FC<AnalysisPreviewProps> = ({
    variant = 'bank',
    total,
    miniSize = 20,
    isDiagnostic = false,
    lastResult = null,
    className = '',
}) => {
    const a = ACCENTS[variant];

    // Ladder thresholds clamped to this set's size, de-duplicated so a short set
    // (e.g. a 24-q diagnostic) doesn't show "5 → 20 → 24" awkwardly.
    const step1 = Math.min(5, total);
    const step2 = Math.min(miniSize, total);
    const rungs: { n: number; icon: React.ReactNode; title: string; desc: string }[] = [];
    rungs.push({
        n: step1,
        icon: <BarChart3 size={18} />,
        title: 'เห็นคะแนน + ส่งเท่าที่ทำได้เลย',
        desc: `ทำแค่ ${step1} ข้อก็กด "ส่งเท่าที่ทำ" เพื่อดูคะแนนและข้อที่ผิดได้ ไม่ต้องรอครบ`,
    });
    if (step2 > step1) {
        rungs.push({
            n: step2,
            icon: <Target size={18} />,
            title: isDiagnostic ? 'แผนที่จุดอ่อน + วิเคราะห์ 4 มุม' : 'เรดาร์จุดแข็ง-จุดอ่อนรายหัวข้อ',
            desc: `ทำ ~${step2} ข้อ (หรือกด "ควิซย่อย") ระบบวาดเรดาร์บอกว่าอ่อนหัวข้อไหน ควรซ่อมตรงไหนก่อน`,
        });
    }
    if (total > step2) {
        rungs.push({
            n: total,
            icon: <Trophy size={18} />,
            title: 'เทียบกับเพื่อนทั้งประเทศ + วิเคราะห์เวลา',
            desc: `ทำครบ ${total} ข้อ ปลดล็อก "เก่งกว่า X% ของคนที่ทำชุดนี้" และภาพรวมการใช้เวลารายข้อ`,
        });
    }

    return (
        <div className={`rounded-3xl border ${a.ring} bg-gradient-to-br ${a.soft} p-6 md:p-7 ${className}`}>
            <div className="flex items-start gap-3 mb-5">
                <div className={`flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br ${a.chip} text-white flex items-center justify-center shadow-md`}>
                    <Sparkles size={22} />
                </div>
                <div className="min-w-0">
                    <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100">ทำแล้วได้รู้อะไรบ้าง?</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        ยิ่งทำมาก ระบบยิ่งวิเคราะห์ละเอียด — ไม่ต้องทำครบก็เริ่มเห็นผลได้
                    </p>
                </div>
            </div>

            {/* Real last-result strip (only when the student has done this set before) */}
            {lastResult && (
                <div className={`mb-5 flex items-center justify-between gap-3 rounded-2xl bg-white/70 dark:bg-slate-900/40 border ${a.ring} px-4 py-3`}>
                    <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">ผลครั้งล่าสุดของคุณ</div>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            ทำได้ <span className={`text-lg font-black ${a.text}`}>{lastResult.percent}%</span>
                            {lastResult.grade ? ` · Grade ${lastResult.grade}` : ''}
                            {lastResult.attempts ? ` · ทำมาแล้ว ${lastResult.attempts} ครั้ง` : ''}
                        </div>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-black px-3 py-1.5 rounded-full ${a.badge}`}>ทำอีกครั้งเพื่ออัปเดตกราฟ →</span>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-stretch">
                {/* Unlock ladder */}
                <ol className="flex flex-col gap-2.5">
                    {rungs.map((r, i) => (
                        <li key={i} className="flex items-start gap-3 rounded-2xl bg-white/60 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700/60 px-3.5 py-3">
                            <span className={`flex-shrink-0 mt-0.5 w-9 h-9 rounded-xl bg-gradient-to-br ${a.chip} text-white flex items-center justify-center shadow-sm`}>
                                {r.icon}
                            </span>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${a.badge}`}>ทำ {r.n} ข้อ</span>
                                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">{r.title}</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{r.desc}</p>
                            </div>
                        </li>
                    ))}
                </ol>

                {/* Ghosted sample of the weakness map */}
                <div className="relative rounded-2xl bg-white/60 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700/60 p-4 flex flex-col items-center justify-center min-w-[180px]">
                    <span className={`absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${a.badge}`}>
                        <Lock size={10} /> ตัวอย่าง
                    </span>
                    <div className="w-full max-w-[180px] opacity-70">
                        <GhostRadar color={a.radar} />
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-1 px-2">หน้าตาผลวิเคราะห์จุดอ่อนที่คุณจะได้รับ</p>
                </div>
            </div>
        </div>
    );
};

export default AnalysisPreview;
