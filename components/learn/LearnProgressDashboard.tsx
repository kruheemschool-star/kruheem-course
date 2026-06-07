"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { tryParseQuestions } from "./utils";
import { formatDuration } from "@/lib/exam-utils";
import type { Lesson } from "./types";
import { X, Target, Trophy, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";

interface AttemptSummary { percent: number; durationSeconds: number; at?: number }
interface StoredResult {
    lessonId?: string;
    lessonTitle?: string;
    courseId?: string;
    attempts?: number;
    bestPercent?: number;
    last?: AttemptSummary;
    previous?: AttemptSummary | null;
    history?: AttemptSummary[];
}

const getGrade = (p: number) => {
    if (p >= 80) return { grade: 'A', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500' };
    if (p >= 60) return { grade: 'B', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500' };
    if (p >= 40) return { grade: 'C', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500' };
    return { grade: 'D', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500' };
};

const pctColor = (p: number) => p >= 80 ? 'text-emerald-600 dark:text-emerald-400' : p >= 60 ? 'text-blue-600 dark:text-blue-400' : p >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';

// Container: fetch the user's results for this course, then render the view.
export default function LearnProgressDashboard({ courseId, userId, examLessons, onClose, onSelectLesson }: {
    courseId: string;
    userId: string;
    examLessons: Lesson[];
    onClose: () => void;
    onSelectLesson: (lessonId: string) => void;
}) {
    const [loading, setLoading] = useState(true);
    const [byLesson, setByLesson] = useState<Record<string, StoredResult>>({});

    useEffect(() => {
        (async () => {
            try {
                const snap = await getDocs(collection(db, 'users', userId, 'lessonExamResults'));
                const map: Record<string, StoredResult> = {};
                snap.docs.forEach((d) => {
                    const r = d.data() as StoredResult;
                    if ((r.courseId || '') === courseId && r.lessonId) map[r.lessonId] = r;
                });
                setByLesson(map);
            } catch (e) {
                console.warn('[ProgressDashboard] load failed:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [userId, courseId]);

    return <ProgressDashboardView examLessons={examLessons} byLesson={byLesson} loading={loading} onClose={onClose} onSelectLesson={onSelectLesson} />;
}

// Presentational view — computes the summary from byLesson + renders. Pure (testable).
export function ProgressDashboardView({ examLessons, byLesson, loading, onClose, onSelectLesson }: {
    examLessons: Lesson[];
    byLesson: Record<string, StoredResult>;
    loading: boolean;
    onClose: () => void;
    onSelectLesson: (lessonId: string) => void;
}) {
    // Real exam sets only (content parses to questions)
    const examSets = examLessons.filter((l) => tryParseQuestions(l.content || ''));
    const rows = examSets.map((l) => ({ lesson: l, r: byLesson[l.id] || null }));
    const done = rows.filter((x) => x.r) as { lesson: Lesson; r: StoredResult }[];
    const attemptedCount = done.length;
    const totalSets = examSets.length;
    const avgBest = attemptedCount > 0 ? Math.round(done.reduce((s, x) => s + (x.r.bestPercent || 0), 0) / attemptedCount) : 0;
    const totalAttempts = done.reduce((s, x) => s + (x.r.attempts || 0), 0);
    const totalTime = done.reduce((s, x) => s + (Array.isArray(x.r.history) ? x.r.history.reduce((a, h) => a + (h.durationSeconds || 0), 0) : 0), 0);
    const g = getGrade(avgBest);
    const weak = done.filter((x) => (x.r.bestPercent || 0) < 70).sort((a, b) => (a.r.bestPercent || 0) - (b.r.bestPercent || 0));

    const go = (id: string) => { onSelectLesson(id); onClose(); };

    return (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-start md:items-center justify-center md:p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-3xl md:rounded-3xl shadow-2xl my-0 md:my-8 min-h-screen md:min-h-0" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between md:rounded-t-3xl">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white">📊 สรุปผลของฉัน</h2>
                    <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 transition"><X size={20} /></button>
                </div>

                <div className="p-5 md:p-6 space-y-6">
                    {loading ? (
                        <div className="text-center py-20 text-slate-400">กำลังโหลดผล...</div>
                    ) : attemptedCount === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-5xl mb-3">📝</div>
                            <h3 className="text-lg font-black text-slate-700 dark:text-slate-200 mb-1">ยังไม่มีผลการทำข้อสอบ</h3>
                            <p className="text-slate-400 dark:text-slate-500 text-sm">ลองทำข้อสอบสักชุดก่อน แล้วกลับมาดูสรุปผลที่นี่ได้เลย</p>
                        </div>
                    ) : (
                        <>
                            {/* Overall hero */}
                            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    <div className="relative w-32 h-32 flex-shrink-0">
                                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                                            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-700" />
                                            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${avgBest * 2.83} 283`} className={g.color} style={{ transition: 'stroke-dasharray 1s ease-out' }} />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className={`text-3xl font-black ${g.color}`}>{avgBest}%</span>
                                            <span className="text-[11px] text-slate-400 font-bold">เกรด {g.grade}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 grid grid-cols-3 gap-3 w-full">
                                        <div className="text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-3">
                                            <div className="text-xl font-black text-slate-800 dark:text-slate-100 tabular-nums">{attemptedCount}<span className="text-sm text-slate-400">/{totalSets}</span></div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">ชุดที่ทำแล้ว</div>
                                        </div>
                                        <div className="text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-3">
                                            <div className="text-xl font-black text-slate-800 dark:text-slate-100 tabular-nums">{totalAttempts}</div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">ครั้งที่ฝึก</div>
                                        </div>
                                        <div className="text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-3">
                                            <div className="text-xl font-black text-slate-800 dark:text-slate-100 tabular-nums">{formatDuration(totalTime)}</div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">เวลาฝึกรวม</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Weak topics */}
                            {weak.length > 0 && (
                                <div className="rounded-3xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 p-5">
                                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><Target size={18} className="text-amber-500" /> หัวข้อที่ควรกลับไปเก็บ</h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">คะแนนยังไม่ถึง 70% — กดเพื่อไปฝึกซ้ำได้เลย</p>
                                    <div className="space-y-2">
                                        {weak.map((x) => (
                                            <button key={x.lesson.id} onClick={() => go(x.lesson.id)} className="w-full flex items-center justify-between gap-3 bg-white dark:bg-slate-900/40 rounded-xl px-4 py-2.5 border border-slate-100 dark:border-slate-700 hover:border-amber-300 hover:-translate-y-0.5 transition text-left">
                                                <span className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{x.lesson.title}</span>
                                                <span className="flex items-center gap-1 flex-shrink-0">
                                                    <span className="text-sm font-black text-rose-500 dark:text-rose-400 tabular-nums">{x.r.bestPercent}%</span>
                                                    <ChevronRight size={16} className="text-slate-300" />
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* All sets */}
                            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
                                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><Trophy size={18} className="text-indigo-500" /> ทุกชุดข้อสอบ ({totalSets})</h3>
                                <div className="space-y-2">
                                    {rows.map(({ lesson, r }) => {
                                        const best = r?.bestPercent ?? 0;
                                        const delta = r?.last && r?.previous ? (r.last.percent - r.previous.percent) : null;
                                        return (
                                            <button key={lesson.id} onClick={() => go(lesson.id)} className="w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition text-left">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{lesson.title}</p>
                                                    {r ? (
                                                        <p className="text-[11px] text-slate-400 mt-0.5">ทำแล้ว {r.attempts || 1} ครั้ง</p>
                                                    ) : (
                                                        <p className="text-[11px] text-slate-400 mt-0.5">ยังไม่ได้ทำ</p>
                                                    )}
                                                </div>
                                                {r ? (
                                                    <span className="flex items-center gap-1.5 flex-shrink-0">
                                                        {delta !== null && delta !== 0 && (delta > 0
                                                            ? <TrendingUp size={14} className="text-emerald-500" />
                                                            : <TrendingDown size={14} className="text-rose-500" />)}
                                                        <span className={`text-sm font-black tabular-nums ${pctColor(best)}`}>{best}%</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 flex-shrink-0">ยังไม่ทำ</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
