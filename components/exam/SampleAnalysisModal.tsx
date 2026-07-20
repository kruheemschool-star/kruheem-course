"use client";

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { X, Trophy, Clock, Target, History, TrendingUp, Lock } from 'lucide-react';
import { getProficiencyLevel } from '@/lib/exam-utils';

// Charts reused from the REAL result screen (same components), fed demo data —
// so the sample looks exactly like what the student will get, not a mock-up.
const TopicRadarChart = dynamic(() => import('./TopicRadarChart'), { ssr: false, loading: () => <div style={{ height: 300 }} /> });
const ScoreDistributionChart = dynamic(() => import('./ScoreDistributionChart'), { ssr: false, loading: () => <div style={{ height: 150 }} /> });

// ─────────────────────────────────────────────────────────────────────────────
// SampleAnalysisModal — a full, faithful preview of the result/analysis screen,
// rendered with a fictional student's data, shown BEFORE the exam starts. Goal:
// let students (and parents) see exactly what they unlock — the score ring,
// proficiency level, weakness radar, 4-angle breakdown, peer percentile, mistake
// notebook and pacing — so they don't quit after 2 questions. A persistent
// "ตัวอย่าง" banner + per-card badges make clear this is a demo, not real data.
// Shared by the exam bank (variant 'bank') and the in-course runner ('course').
// ─────────────────────────────────────────────────────────────────────────────

interface SampleAnalysisModalProps {
    open: boolean;
    onClose: () => void;
    variant?: 'bank' | 'course';
    isDark?: boolean;
}

// ── Fictional student "น้องแนน" — 13/20 (65%), 2 clearly-weak สาระ. Numbers are
// chosen to tell a story: strong on arithmetic, weak on equations & geometry, so
// the analysis visibly points at what to fix first.
const DEMO = {
    score: 13,
    total: 20,
    percent: 65,
    grade: 'B',
    radar: [
        { tag: 'จำนวนเต็ม', percent: 88 },
        { tag: 'เศษส่วน·ทศนิยม', percent: 72 },
        { tag: 'อัตราส่วน·ร้อยละ', percent: 75 },
        { tag: 'สมการเชิงเส้น', percent: 45 },
        { tag: 'เรขาคณิต', percent: 40 },
        { tag: 'สถิติ', percent: 62 },
    ],
    skills: [
        { tag: 'คิดเลขแม่น', hint: 'บวกลบคูณหาร/ทำตามขั้นตอน', percent: 82, correct: 9, total: 11 },
        { tag: 'เข้าใจมโนทัศน์', hint: 'รู้ว่าทำไปทำไม ไม่ใช่ท่องจำ', percent: 55, correct: 6, total: 11 },
        { tag: 'แปลโจทย์ปัญหา', hint: 'อ่านโจทย์ยาวแล้วตั้งต้นถูก', percent: 44, correct: 4, total: 9 },
    ],
    origins: [
        { tag: 'เนื้อชั้นปัจจุบัน (ม.1)', percent: 68, correct: 11, total: 16 },
        { tag: 'ของเก่าติดมา (ป.ปลาย)', percent: 50, correct: 2, total: 4 },
    ],
    percentile: 58,
    peerCount: 240,
    buckets: [2, 4, 8, 13, 20, 29, 37, 33, 24, 15],
    yourBucket: 6,
    notebookLeft: 7,
    totalTimeMin: 18,
    avgPace: 54,
    paceTarget: 90,
};

const pctBar = (p: number) => p >= 75
    ? { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', track: 'bg-emerald-100 dark:bg-emerald-900/30' }
    : p >= 50
    ? { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', track: 'bg-amber-100 dark:bg-amber-900/30' }
    : { bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', track: 'bg-rose-100 dark:bg-rose-900/30' };

const ACCENT = {
    bank: { chip: 'from-indigo-500 to-violet-500', radar: '#6366f1', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300', cta: 'bg-gradient-to-r from-indigo-500 to-violet-500' },
    course: { chip: 'from-emerald-500 to-teal-500', radar: '#10b981', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', cta: 'bg-gradient-to-r from-emerald-500 to-teal-500' },
} as const;

const SampleBadge: React.FC<{ cls: string }> = ({ cls }) => (
    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${cls}`}>
        <Lock size={10} /> ตัวอย่าง
    </span>
);

export const SampleAnalysisModal: React.FC<SampleAnalysisModalProps> = ({ open, onClose, variant = 'bank', isDark = false }) => {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        // lock body scroll while the modal is open
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    }, [open, onClose]);

    if (!open) return null;

    const a = ACCENT[variant];
    const prof = getProficiencyLevel(DEMO.percent, DEMO.avgPace / DEMO.paceTarget);
    const radarColors = { grid: isDark ? '#334155' : '#e2e8f0', tick: isDark ? '#cbd5e1' : '#475569', stroke: a.radar };
    const wrongCount = DEMO.total - DEMO.score;

    return (
        <div className="fixed inset-0 z-[95] bg-slate-900/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-3 md:p-6 animate-in fade-in" onClick={onClose}>
            <div
                className="relative w-full max-w-2xl my-4 rounded-[2rem] bg-white dark:bg-slate-800 shadow-2xl border border-slate-100 dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="ตัวอย่างผลวิเคราะห์"
            >
                {/* Sticky header + persistent "sample" banner */}
                <div className="sticky top-0 z-10 rounded-t-[2rem] bg-white/95 dark:bg-slate-800/95 backdrop-blur border-b border-slate-100 dark:border-slate-700 px-5 md:px-7 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${a.badge}`}>ตัวอย่างผลวิเคราะห์</span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-tight">นี่คือหน้าที่คุณจะได้เห็นหลังทำเสร็จ — ข้อมูลด้านล่างเป็นของนักเรียนตัวอย่าง</p>
                    </div>
                    <button onClick={onClose} className="flex-shrink-0 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition" aria-label="ปิด">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="px-5 md:px-8 py-6 space-y-8">
                    {/* Score ring + grade */}
                    <div className="text-center">
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg"><Trophy size={40} /></div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">ผลการทดสอบ</h2>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mb-5">ตัวอย่าง: “น้องแนน” ทำชุดสแกนจุดอ่อน ม.1</p>
                        <div className="relative w-40 h-40 mx-auto mb-4">
                            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-700" />
                                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${DEMO.percent * 2.83} 283`} className="text-blue-500" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black text-blue-600 dark:text-blue-400">{DEMO.percent}%</span>
                                <span className="text-slate-400 dark:text-slate-500 text-xs font-bold">{DEMO.score}/{DEMO.total} ข้อ</span>
                            </div>
                        </div>
                        <div className="inline-block px-6 py-2 rounded-2xl bg-blue-500 text-white font-black text-xl shadow">Grade {DEMO.grade}</div>
                    </div>

                    {/* Proficiency */}
                    <div className={`rounded-3xl border bg-gradient-to-br ${prof.bg} p-6 text-center`}>
                        <div className="text-4xl mb-1">{prof.emoji}</div>
                        <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ระดับความพร้อม</div>
                        <h3 className={`text-2xl font-black ${prof.color} mb-1`}>{prof.label}</h3>
                        <p className="text-slate-600 dark:text-slate-300 text-sm max-w-md mx-auto mb-3">{prof.meaning}</p>
                        <div className="inline-flex items-start gap-2 text-left bg-white/70 dark:bg-slate-900/40 rounded-2xl px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 max-w-md">
                            <span>👉</span><span>{prof.nextStep}</span>
                        </div>
                    </div>

                    {/* Weakness radar */}
                    <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 md:p-6">
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">📊 จุดแข็ง-จุดอ่อนรายสาระ</h3>
                            <SampleBadge cls={a.badge} />
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">ยิ่งกางออกไกล = ยิ่งแม่นสาระนั้น · สาระที่หุบเข้า = จุดที่ควรซ่อมก่อน</p>
                        <TopicRadarChart data={DEMO.radar} colors={radarColors} />
                        <p className="text-xs text-center text-rose-500 dark:text-rose-400 font-bold mt-1">🔍 เห็นชัดว่าควรเก็บ “สมการเชิงเส้น” และ “เรขาคณิต” ก่อน</p>
                    </div>

                    {/* 4-angle breakdown */}
                    <div className="grid gap-5 md:grid-cols-2">
                        <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 md:p-6">
                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">🧠 อ่อนทักษะไหน</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">แยกว่าพลาดเพราะคิดเลข เข้าใจ หรือแปลโจทย์</p>
                            <div className="flex flex-col gap-4">
                                {DEMO.skills.map((s) => { const c = pctBar(s.percent); return (
                                    <div key={s.tag}>
                                        <div className="flex items-baseline justify-between mb-1">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{s.tag}</span>
                                            <span className={`text-sm font-black tabular-nums ${c.text}`}>{s.percent}%</span>
                                        </div>
                                        <div className={`h-2.5 rounded-full ${c.track} overflow-hidden`}><div className={`h-full rounded-full ${c.bar}`} style={{ width: `${s.percent}%` }} /></div>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{s.hint} · ถูก {s.correct}/{s.total}</p>
                                    </div>
                                ); })}
                            </div>
                        </div>
                        <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 md:p-6">
                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">🔍 รูรั่วอยู่ชั้นไหน</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">บอกว่าจุดอ่อนเป็นของเก่าติดมา หรือเนื้อชั้นปัจจุบัน</p>
                            <div className="flex flex-col gap-4">
                                {DEMO.origins.map((o) => { const c = pctBar(o.percent); return (
                                    <div key={o.tag}>
                                        <div className="flex items-baseline justify-between mb-1">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{o.tag}</span>
                                            <span className={`text-sm font-black tabular-nums ${c.text}`}>{o.percent}%</span>
                                        </div>
                                        <div className={`h-2.5 rounded-full ${c.track} overflow-hidden`}><div className={`h-full rounded-full ${c.bar}`} style={{ width: `${o.percent}%` }} /></div>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">ถูก {o.correct}/{o.total}</p>
                                    </div>
                                ); })}
                            </div>
                        </div>
                    </div>

                    {/* Peer percentile */}
                    <div className="rounded-3xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/70 to-white dark:from-indigo-900/20 dark:to-slate-800/40 p-5 md:p-6">
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">🏆 อันดับของคุณ</h3>
                            <SampleBadge cls={a.badge} />
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mb-3">ทำได้ <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 align-middle">เก่งกว่า {DEMO.percentile}%</span> <span className="text-sm">ของคนที่ทำชุดนี้ ({DEMO.peerCount} ครั้ง)</span></p>
                        <ScoreDistributionChart buckets={DEMO.buckets} yourBucket={DEMO.yourBucket} isDark={isDark} height={150} />
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-1">การกระจายคะแนนของทุกคน · <span className="text-amber-500 font-bold">แท่งสีส้ม</span> = ช่วงคะแนนของคุณ</p>
                    </div>

                    {/* Mistake notebook + pacing (compact) */}
                    <div className="grid gap-5 md:grid-cols-2">
                        <div className="rounded-3xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 p-5 md:p-6">
                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">✍️ สมุดข้อผิด — ค้าง {DEMO.notebookLeft} ข้อ</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">ระบบจดข้อที่ยังตอบผิดไว้ให้ถาวร กลับมาทำชุดนี้อีกครั้งแล้วตอบให้ถูก ข้อจะหลุดจากสมุดอัตโนมัติ</p>
                        </div>
                        <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 md:p-6">
                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><Clock size={18} className="text-indigo-500" /> ภาพรวมการจับเวลา</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-3 text-center">
                                    <div className="text-xl font-black tabular-nums text-slate-800 dark:text-slate-100">{DEMO.totalTimeMin} นาที</div>
                                    <div className="text-[11px] text-slate-400 dark:text-slate-500">เวลารวม</div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-3 text-center">
                                    <div className="text-xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">{DEMO.avgPace} วิ</div>
                                    <div className="text-[11px] text-slate-400 dark:text-slate-500">เฉลี่ย/ข้อ · เป้า {DEMO.paceTarget} วิ</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Compare + close */}
                    <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 md:p-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center flex-shrink-0"><History size={18} /></div>
                        <p className="text-sm text-slate-600 dark:text-slate-300"><span className="font-black text-slate-800 dark:text-slate-100">ทำซ้ำได้เรื่อยๆ</span> — ทุกครั้งที่ทำ ระบบจะ<span className="inline-flex items-center gap-0.5 font-bold text-emerald-600 dark:text-emerald-400"><TrendingUp size={14} /> เทียบกับครั้งก่อน</span>ให้เห็นพัฒนาการ</p>
                    </div>

                    <button onClick={onClose} className={`w-full rounded-2xl text-white text-lg font-black py-4 shadow-lg ${a.cta} hover:brightness-110 active:scale-[0.99] transition flex items-center justify-center gap-2`}>
                        <Target size={20} /> เข้าใจแล้ว เริ่มทำข้อสอบเลย
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SampleAnalysisModal;
