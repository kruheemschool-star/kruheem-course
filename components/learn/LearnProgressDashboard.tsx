"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { tryParseQuestions } from "./utils";
import { formatDuration, projectAttemptsToGoal } from "@/lib/exam-utils";
import type { Lesson } from "./types";
import { X, Target, Trophy, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { useTheme } from "next-themes";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";

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
    // P2: cumulative per-topic mastery + mistake notebook (written by ExamRunner)
    topicStats?: Record<string, { c: number; t: number }>;
    wrongQuestions?: Record<string, { at?: number }>;
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

    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const cc = { grid: isDark ? '#334155' : '#e2e8f0', axis: isDark ? '#94a3b8' : '#64748b', primary: isDark ? '#a5b4fc' : '#6366f1', fill: isDark ? '#818cf8' : '#6366f1', goal: isDark ? '#c4b5fd' : '#8b5cf6' };
    // L-F2 radar (best% per set) + L-F3 trend (all attempts merged, chronological) + projection
    const radarData = done.map((x) => ({ set: x.lesson.title.length > 24 ? x.lesson.title.slice(0, 23) + '…' : x.lesson.title, percent: x.r.bestPercent || 0 }));
    const trendData = done
        .flatMap((x) => (Array.isArray(x.r.history) ? x.r.history : []))
        .filter((h) => typeof h.at === 'number' && typeof h.percent === 'number')
        .sort((a, b) => (a.at || 0) - (b.at || 0))
        .map((h, i) => ({ idx: i + 1, percent: h.percent }));
    const projection = projectAttemptsToGoal(trendData.map((d) => d.percent), 80);

    // P2: per-TOPIC mastery across every set (from cumulative topicStats).
    // Only topics with enough evidence (>=5 answers) are shown — no verdicts
    // from thin data.
    const topicAgg: Record<string, { c: number; t: number }> = {};
    done.forEach((x) => Object.entries(x.r.topicStats || {}).forEach(([tag, s]) => {
        if (!s || typeof s.t !== 'number') return;
        const a = topicAgg[tag] || { c: 0, t: 0 };
        topicAgg[tag] = { c: a.c + (s.c || 0), t: a.t + s.t };
    }));
    const topicRows = Object.entries(topicAgg)
        .filter(([, s]) => s.t >= 5)
        .map(([tag, s]) => ({ tag, c: s.c, t: s.t, percent: Math.round((s.c / s.t) * 100) }));
    const topicRadarData = [...topicRows].sort((a, b) => b.t - a.t).slice(0, 8)
        .map((r) => ({ topic: r.tag.length > 16 ? r.tag.slice(0, 15) + '…' : r.tag, percent: r.percent }));
    const weakestTopics = topicRows.filter((r) => r.percent < 70)
        .sort((a, b) => a.percent - b.percent).slice(0, 3);
    // P2: mistake-notebook summary — leftover wrong questions per set.
    const wrongBySet = rows
        .map(({ lesson, r }) => ({ lesson, n: r?.wrongQuestions ? Object.keys(r.wrongQuestions).length : 0 }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n);
    const totalWrongLeft = wrongBySet.reduce((s, x) => s + x.n, 0);

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

                            {/* 📊 เรดาร์รายชุด (L-F2) */}
                            {radarData.length >= 3 && (
                                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
                                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">📊 เรดาร์รายชุด</h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">คะแนนดีที่สุดของแต่ละชุด — ยิ่งกางออกไกล = ยิ่งเก่ง (เต็ม 100%)</p>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <RadarChart data={radarData} outerRadius="68%">
                                            <PolarGrid stroke={cc.grid} />
                                            <PolarAngleAxis dataKey="set" tick={{ fontSize: 11, fill: cc.axis, fontWeight: 600 }} />
                                            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                                            <Radar dataKey="percent" stroke={cc.primary} fill={cc.fill} fillOpacity={0.35} strokeWidth={2} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* 🎯 เรดาร์รายหัวข้อข้ามชุด (P2) — from cumulative topicStats */}
                            {topicRadarData.length >= 3 && (
                                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
                                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">🎯 จุดแข็ง-จุดอ่อนรายหัวข้อ</h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">สะสมจากทุกครั้งที่ฝึก ทุกชุดรวมกัน — ยิ่งกางออกไกล = ยิ่งแม่นหัวข้อนั้น</p>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <RadarChart data={topicRadarData} outerRadius="68%">
                                            <PolarGrid stroke={cc.grid} />
                                            <PolarAngleAxis dataKey="topic" tick={{ fontSize: 11, fill: cc.axis, fontWeight: 600 }} />
                                            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                                            <Radar dataKey="percent" stroke={cc.primary} fill={cc.fill} fillOpacity={0.35} strokeWidth={2} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* 🔻 3 หัวข้ออ่อนสุดตอนนี้ (P2) */}
                            {weakestTopics.length > 0 && (
                                <div className="rounded-3xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-900/10 p-5">
                                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">🔻 หัวข้อที่อ่อนสุดของคุณตอนนี้</h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">คิดจากทุกข้อที่เคยทำในหัวข้อนั้น (อย่างน้อย 5 ข้อ) — โฟกัสซ่อมตรงนี้ก่อน คะแนนรวมจะขยับเร็วสุด</p>
                                    <div className="space-y-2">
                                        {weakestTopics.map((w) => (
                                            <div key={w.tag} className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900/40 rounded-xl px-4 py-2.5 border border-slate-100 dark:border-slate-700">
                                                <span className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{w.tag}</span>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">ถูก {w.c}/{w.t} ข้อ · <span className={`text-sm font-black tabular-nums ${pctColor(w.percent)}`}>{w.percent}%</span></span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ✍️ สมุดข้อผิดทั้งคอร์ส (P2) */}
                            {totalWrongLeft > 0 && (
                                <div className="rounded-3xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 p-5">
                                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">✍️ สมุดข้อผิด — ค้างอยู่ {totalWrongLeft} ข้อ</h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">ข้อที่ยังตอบผิดค้างในแต่ละชุด — กดเข้าไปที่ชุด แล้วเลือก &quot;สมุดข้อผิด&quot; เพื่อเก็บให้หมด</p>
                                    <div className="space-y-2">
                                        {wrongBySet.map((x) => (
                                            <button key={x.lesson.id} onClick={() => go(x.lesson.id)} className="w-full flex items-center justify-between gap-3 bg-white dark:bg-slate-900/40 rounded-xl px-4 py-2.5 border border-slate-100 dark:border-slate-700 hover:border-amber-300 hover:-translate-y-0.5 transition text-left">
                                                <span className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{x.lesson.title}</span>
                                                <span className="flex items-center gap-1 flex-shrink-0">
                                                    <span className="text-sm font-black text-amber-600 dark:text-amber-400 tabular-nums">{x.n} ข้อ</span>
                                                    <ChevronRight size={16} className="text-slate-300" />
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 📈 พัฒนาการ + เป้า + คาดการณ์ (L-F3) */}
                            {trendData.length >= 2 && (
                                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
                                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500" /> พัฒนาการของฉัน</h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">คะแนนทุกครั้งที่ทำ (รวมทุกชุด เรียงตามเวลา)</p>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -22, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="learnTrendFill" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={cc.fill} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={cc.fill} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
                                            <XAxis dataKey="idx" tick={{ fontSize: 10, fill: cc.axis }} stroke={cc.axis} />
                                            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: cc.axis }} stroke={cc.axis} />
                                            <ReferenceLine y={80} stroke={cc.goal} strokeDasharray="6 4" strokeWidth={2} label={{ value: 'เป้า 80%', position: 'insideBottomRight', fontSize: 10, fill: cc.goal, fontWeight: 700 }} />
                                            <Area type="monotone" dataKey="percent" stroke={cc.primary} strokeWidth={2} fill="url(#learnTrendFill)" dot={{ r: 3, fill: cc.primary }} activeDot={{ r: 5 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                    <div className={`mt-3 rounded-xl px-4 py-3 text-sm font-bold ${projection.reached ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : projection.trend === 'down' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'}`}>
                                        🎯 {projection.message}
                                    </div>
                                </div>
                            )}

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
