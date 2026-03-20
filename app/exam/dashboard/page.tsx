"use client";

import { useState, useEffect, useMemo } from "react";
import { useUserAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
    BarChart3, Trophy, Target, TrendingUp, ArrowLeft, BookOpen,
    CheckCircle2, XCircle, ChevronRight, Loader2, LogIn, ShieldOff,
    Flame, Clock, Users, Zap, Timer, Calendar
} from "lucide-react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Area, AreaChart, ReferenceLine
} from "recharts";

interface ExamResult {
    examId: string;
    examTitle: string;
    category: string;
    level: string;
    score: number;
    total: number;
    percent: number;
    grade: string;
    answers: Record<number, number>;
    wrongQuestionIndices: number[];
    tags: string[];
    completedAt: any;
    durationSeconds?: number;
    avgTimePerQuestion?: number;
    questionTimes?: Record<number, number>;
}

interface GlobalAverages {
    globalAvgPercent: number;
    globalAvgDuration: number;
    globalAvgTimePerQ: number;
    totalExams: number;
    totalUsers: number;
    categories: { name: string; avgPercent: number; count: number }[];
    tags: { name: string; avgPercent: number; count: number }[];
}

const gradeColors: Record<string, { text: string; bg: string; border: string }> = {
    A: { text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-900/30", border: "border-emerald-200 dark:border-emerald-700" },
    B: { text: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-900/30", border: "border-blue-200 dark:border-blue-700" },
    C: { text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-900/30", border: "border-amber-200 dark:border-amber-700" },
    D: { text: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-900/30", border: "border-rose-200 dark:border-rose-700" },
};

export default function ExamDashboardPage() {
    const { user, loading: authLoading } = useUserAuth();
    const [results, setResults] = useState<ExamResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [dashboardEnabled, setDashboardEnabled] = useState<boolean | null>(null);
    const [globalAvg, setGlobalAvg] = useState<GlobalAverages | null>(null);

    // Check if dashboard is enabled
    useEffect(() => {
        (async () => {
            try {
                const snap = await getDoc(doc(db, "settings", "examConfig"));
                if (snap.exists()) {
                    setDashboardEnabled(snap.data().showExamDashboard ?? false);
                } else {
                    setDashboardEnabled(false);
                }
            } catch {
                setDashboardEnabled(false);
            }
        })();
    }, []);

    // Fetch exam results
    useEffect(() => {
        if (!user || dashboardEnabled === false) {
            setLoading(false);
            return;
        }
        if (dashboardEnabled === null) return; // still checking

        (async () => {
            try {
                const snap = await getDocs(collection(db, "users", user.uid, "examResults"));
                const fetched: ExamResult[] = snap.docs.map(d => ({ ...d.data() } as ExamResult));
                // Sort by completedAt desc
                fetched.sort((a, b) => {
                    const tA = a.completedAt?.seconds || 0;
                    const tB = b.completedAt?.seconds || 0;
                    return tB - tA;
                });
                setResults(fetched);
                // Fetch global averages for comparison
                try {
                    const res = await fetch('/api/exam-averages');
                    if (res.ok) {
                        const data = await res.json();
                        setGlobalAvg(data);
                    }
                } catch { /* ignore */ }
            } catch (err) {
                console.error("Error fetching exam results:", err);
            } finally {
                setLoading(false);
            }
        })();
    }, [user, dashboardEnabled]);

    // Computed Stats
    const stats = useMemo(() => {
        if (results.length === 0) return null;

        const totalCorrect = results.reduce((s, r) => s + r.score, 0);
        const totalQuestions = results.reduce((s, r) => s + r.total, 0);
        const avgPercent = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
        const totalWrong = results.reduce((s, r) => s + r.wrongQuestionIndices.length, 0);

        // Grade distribution
        const gradeDist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
        results.forEach(r => { if (gradeDist[r.grade] !== undefined) gradeDist[r.grade]++; });

        // Category breakdown
        const catMap: Record<string, { correct: number; total: number; count: number }> = {};
        results.forEach(r => {
            const key = r.category || "อื่นๆ";
            if (!catMap[key]) catMap[key] = { correct: 0, total: 0, count: 0 };
            catMap[key].correct += r.score;
            catMap[key].total += r.total;
            catMap[key].count++;
        });
        const categories = Object.entries(catMap)
            .map(([name, d]) => ({
                name,
                correct: d.correct,
                total: d.total,
                percent: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
                count: d.count,
            }))
            .sort((a, b) => a.percent - b.percent); // weakest first

        // Tag breakdown (only if tags exist)
        const tagMap: Record<string, { correct: number; total: number }> = {};
        results.forEach(r => {
            if (!r.tags || r.tags.length === 0) return;
            r.tags.forEach(tag => {
                if (!tagMap[tag]) tagMap[tag] = { correct: 0, total: 0 };
                tagMap[tag].total += r.total;
                tagMap[tag].correct += r.score;
            });
        });
        const tags = Object.entries(tagMap)
            .map(([name, d]) => ({
                name,
                correct: d.correct,
                total: d.total,
                percent: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
            }))
            .sort((a, b) => a.percent - b.percent);

        // === Progress over time (for line chart) ===
        const sortedByDate = [...results]
            .filter(r => r.completedAt?.seconds)
            .sort((a, b) => (a.completedAt.seconds || 0) - (b.completedAt.seconds || 0));
        
        const progressData = sortedByDate.map((r, i) => {
            const date = new Date(r.completedAt.seconds * 1000);
            return {
                date: date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
                fullDate: date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: '2-digit' }),
                percent: r.percent,
                examTitle: r.examTitle,
                score: r.score,
                total: r.total,
            };
        });

        // Running average for trend line
        let runningTotal = 0;
        const progressWithTrend = progressData.map((d, i) => {
            runningTotal += d.percent;
            return { ...d, trend: Math.round(runningTotal / (i + 1)) };
        });

        // === Streak Counter ===
        const examDates = sortedByDate.map(r => {
            const d = new Date(r.completedAt.seconds * 1000);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        });
        const uniqueDates = [...new Set(examDates)].sort().reverse();
        
        let streak = 0;
        const today = new Date();
        let checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        for (let i = 0; i < 365; i++) {
            const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
            if (uniqueDates.includes(dateStr)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else if (i === 0) {
                // Today might not have exam yet, check from yesterday
                checkDate.setDate(checkDate.getDate() - 1);
                continue;
            } else {
                break;
            }
        }

        // === Time Analytics ===
        const resultsWithTime = results.filter(r => typeof r.durationSeconds === 'number' && r.durationSeconds > 0);
        const totalDuration = resultsWithTime.reduce((s, r) => s + (r.durationSeconds || 0), 0);
        const avgDuration = resultsWithTime.length > 0 ? Math.round(totalDuration / resultsWithTime.length) : 0;
        const resultsWithAvgTime = results.filter(r => typeof r.avgTimePerQuestion === 'number' && r.avgTimePerQuestion > 0);
        const avgTimePerQ = resultsWithAvgTime.length > 0 
            ? Math.round(resultsWithAvgTime.reduce((s, r) => s + (r.avgTimePerQuestion || 0), 0) / resultsWithAvgTime.length) 
            : 0;
        const fastestExam = resultsWithTime.length > 0 
            ? resultsWithTime.reduce((f, r) => (r.avgTimePerQuestion || 999) < (f.avgTimePerQuestion || 999) ? r : f)
            : null;
        const slowestExam = resultsWithTime.length > 0
            ? resultsWithTime.reduce((s, r) => (r.avgTimePerQuestion || 0) > (s.avgTimePerQuestion || 0) ? r : s)
            : null;

        // === Heatmap data (tags with strength levels) ===
        const heatmapData = tags.map(t => ({
            ...t,
            level: t.percent >= 80 ? 'strong' as const : t.percent >= 60 ? 'good' as const : t.percent >= 40 ? 'weak' as const : 'critical' as const,
        }));

        return {
            totalCorrect, totalQuestions, avgPercent, totalWrong, gradeDist, categories, tags,
            progressWithTrend, streak, uniqueDates,
            avgDuration, avgTimePerQ, fastestExam, slowestExam, resultsWithTime,
            heatmapData,
        };
    }, [results]);

    // Loading / Auth / Disabled states
    if (authLoading || dashboardEnabled === null) {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-950">
                <Navbar />
                <div className="flex items-center justify-center pt-32">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                </div>
            </div>
        );
    }

    if (dashboardEnabled === false) {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-950">
                <Navbar />
                <div className="flex flex-col items-center justify-center pt-32 px-4 text-center">
                    <ShieldOff size={48} className="text-slate-300 mb-4" />
                    <h1 className="text-2xl font-black text-slate-700 dark:text-slate-200 mb-2">Dashboard ยังไม่เปิดใช้งาน</h1>
                    <p className="text-slate-400 mb-6">ระบบ Dashboard สำหรับข้อสอบยังไม่เปิดใช้งานในขณะนี้</p>
                    <Link href="/exam" className="px-6 py-3 bg-slate-800 text-white rounded-full font-bold hover:bg-slate-900 transition-all">
                        กลับไปคลังข้อสอบ
                    </Link>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-950">
                <Navbar />
                <div className="flex flex-col items-center justify-center pt-32 px-4 text-center">
                    <LogIn size={48} className="text-slate-300 mb-4" />
                    <h1 className="text-2xl font-black text-slate-700 dark:text-slate-200 mb-2">กรุณาเข้าสู่ระบบ</h1>
                    <p className="text-slate-400 mb-6">เข้าสู่ระบบเพื่อดูสถิติการทำข้อสอบของคุณ</p>
                    <Link href="/login" className="px-6 py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition-all">
                        เข้าสู่ระบบ
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
            <Navbar />
            <div className="pt-24 pb-16 px-4 md:px-8 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/exam" className="text-sm text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1 mb-2 transition-colors">
                            <ArrowLeft size={14} /> กลับไปคลังข้อสอบ
                        </Link>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                            <BarChart3 className="text-indigo-500" size={28} />
                            สถิติการทำข้อสอบ
                        </h1>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <Loader2 className="animate-spin text-indigo-500 mx-auto mb-4" size={32} />
                        <p className="text-slate-400 font-medium">กำลังโหลดข้อมูล...</p>
                    </div>
                ) : results.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <BookOpen size={48} className="text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-2">ยังไม่มีผลสอบ</h2>
                        <p className="text-slate-400 mb-6">ลองทำข้อสอบสักชุดแล้วกลับมาดูผลที่นี่!</p>
                        <Link href="/exam" className="px-6 py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition-all">
                            ไปทำข้อสอบ
                        </Link>
                    </div>
                ) : stats && (
                    <>
                        {/* Overall Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <StatCard
                                icon={<Target className="text-indigo-500" size={22} />}
                                label="คะแนนรวม"
                                value={`${stats.totalCorrect}/${stats.totalQuestions}`}
                                sub={`${stats.avgPercent}%`}
                            />
                            <StatCard
                                icon={<BookOpen className="text-blue-500" size={22} />}
                                label="ชุดที่ทำแล้ว"
                                value={`${results.length}`}
                                sub="ชุด"
                            />
                            <StatCard
                                icon={<CheckCircle2 className="text-emerald-500" size={22} />}
                                label="ตอบถูก"
                                value={`${stats.totalCorrect}`}
                                sub="ข้อ"
                            />
                            <StatCard
                                icon={<XCircle className="text-rose-500" size={22} />}
                                label="ตอบผิด"
                                value={`${stats.totalWrong}`}
                                sub="ข้อ"
                            />
                        </div>

                        {/* Streak & Time Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Flame className="text-orange-500" size={22} />
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Streak</span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-black text-slate-800 dark:text-white">{stats.streak}</span>
                                    <span className="text-sm font-bold text-slate-400">วันติดต่อกัน</span>
                                </div>
                                {stats.streak >= 3 && <p className="text-xs text-orange-500 font-bold mt-1">ทำได้ดีมาก! อย่าหยุด!</p>}
                                {stats.streak === 0 && <p className="text-xs text-slate-400 font-medium mt-1">ทำข้อสอบวันนี้เพื่อเริ่ม Streak!</p>}
                            </div>
                            {stats.avgTimePerQ > 0 && (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Timer className="text-cyan-500" size={22} />
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">เวลาเฉลี่ย/ข้อ</span>
                                    </div>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-3xl font-black text-slate-800 dark:text-white">{stats.avgTimePerQ}</span>
                                        <span className="text-sm font-bold text-slate-400">วินาที</span>
                                    </div>
                                    {globalAvg && globalAvg.globalAvgTimePerQ > 0 && (
                                        <p className={`text-xs font-bold mt-1 ${stats.avgTimePerQ <= globalAvg.globalAvgTimePerQ ? 'text-emerald-500' : 'text-amber-500'}`}>
                                            {stats.avgTimePerQ <= globalAvg.globalAvgTimePerQ ? 'เร็วกว่า' : 'ช้ากว่า'}ค่าเฉลี่ย ({globalAvg.globalAvgTimePerQ} วิ)
                                        </p>
                                    )}
                                </div>
                            )}
                            {stats.avgDuration > 0 && (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Clock className="text-violet-500" size={22} />
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">เวลาเฉลี่ย/ชุด</span>
                                    </div>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-3xl font-black text-slate-800 dark:text-white">
                                            {stats.avgDuration >= 60 ? `${Math.floor(stats.avgDuration / 60)}:${String(stats.avgDuration % 60).padStart(2, '0')}` : stats.avgDuration}
                                        </span>
                                        <span className="text-sm font-bold text-slate-400">{stats.avgDuration >= 60 ? 'นาที' : 'วินาที'}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Score Progress Bar */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 mb-8">
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <TrendingUp size={18} className="text-indigo-500" />
                                ภาพรวมคะแนน
                            </h3>
                            <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-indigo-500 to-violet-500"
                                    style={{ width: `${stats.avgPercent}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">0%</span>
                                <span className="font-black text-indigo-600 dark:text-indigo-400 text-lg">{stats.avgPercent}%</span>
                                <span className="text-slate-400">100%</span>
                            </div>

                            {/* Grade Distribution */}
                            <div className="mt-6 flex gap-3 flex-wrap">
                                {(["A", "B", "C", "D"] as const).map(g => {
                                    const colors = gradeColors[g];
                                    const count = stats.gradeDist[g] || 0;
                                    return (
                                        <div key={g} className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${colors.bg} ${colors.border}`}>
                                            <span className={`font-black text-lg ${colors.text}`}>{g}</span>
                                            <span className={`text-sm font-bold ${colors.text} opacity-70`}>{count} ชุด</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* === Progress Graph (Line Chart) === */}
                        {stats.progressWithTrend.length >= 2 && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 mb-8">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-emerald-500" />
                                    กราฟความก้าวหน้า
                                </h3>
                                <p className="text-xs text-slate-400 mb-4">คะแนนแต่ละชุด + เส้นค่าเฉลี่ยสะสม</p>
                                <div className="h-64 md:h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats.progressWithTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                            <defs>
                                                <linearGradient id="colorPercent" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                                            <Tooltip
                                                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600 }}
                                                formatter={(value: any, name: any) => [
                                                    `${value}%`,
                                                    name === 'percent' ? 'คะแนน' : 'ค่าเฉลี่ยสะสม'
                                                ]}
                                                labelFormatter={(label: any, payload: readonly any[]) => {
                                                    const item = payload?.[0]?.payload;
                                                    return item ? `${item.examTitle} (${item.fullDate})` : String(label);
                                                }}
                                            />
                                            {globalAvg && (
                                                <ReferenceLine y={globalAvg.globalAvgPercent} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: `ค่าเฉลี่ยรวม ${globalAvg.globalAvgPercent}%`, position: 'insideTopRight', fontSize: 11, fill: '#f59e0b' }} />
                                            )}
                                            <Area type="monotone" dataKey="percent" stroke="#6366f1" strokeWidth={2} fill="url(#colorPercent)" dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                                            <Line type="monotone" dataKey="trend" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex items-center gap-6 mt-3 text-xs text-slate-500">
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500"></span> คะแนนแต่ละชุด</span>
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 inline-block" style={{borderTop: '2px dashed'}}></span> ค่าเฉลี่ยสะสม</span>
                                    {globalAvg && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-500 inline-block" style={{borderTop: '2px dashed'}}></span> ค่าเฉลี่ยรวมทุกคน</span>}
                                </div>
                            </div>
                        )}

                        {/* === Comparison with Global Average === */}
                        {globalAvg && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 mb-8">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                    <Users size={18} className="text-blue-500" />
                                    เปรียบเทียบกับค่าเฉลี่ยรวม
                                </h3>
                                <p className="text-xs text-slate-400 mb-4">จากผู้ใช้งานทั้งหมด {globalAvg.totalUsers} คน / {globalAvg.totalExams} ครั้ง</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Overall comparison */}
                                    <div className="space-y-3">
                                        <div className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">คะแนนภาพรวม</div>
                                        <CompareBar label="คุณ" value={stats.avgPercent} color="bg-indigo-500" />
                                        <CompareBar label="ค่าเฉลี่ย" value={globalAvg.globalAvgPercent} color="bg-amber-500" />
                                        <p className={`text-sm font-bold mt-2 ${stats.avgPercent >= globalAvg.globalAvgPercent ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {stats.avgPercent >= globalAvg.globalAvgPercent
                                                ? `สูงกว่าค่าเฉลี่ย +${stats.avgPercent - globalAvg.globalAvgPercent}%`
                                                : `ต่ำกว่าค่าเฉลี่ย ${stats.avgPercent - globalAvg.globalAvgPercent}%`
                                            }
                                        </p>
                                    </div>

                                    {/* Per-category comparison */}
                                    {globalAvg.categories.length > 0 && stats.categories.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">แยกตามหมวดหมู่</div>
                                            {stats.categories.map(cat => {
                                                const globalCat = globalAvg.categories.find(c => c.name === cat.name);
                                                if (!globalCat) return null;
                                                const diff = cat.percent - globalCat.avgPercent;
                                                return (
                                                    <div key={cat.name} className="flex items-center justify-between text-sm">
                                                        <span className="font-medium text-slate-600 dark:text-slate-300 truncate mr-2">{cat.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-500">{cat.percent}%</span>
                                                            <span className="text-slate-300 dark:text-slate-600">vs</span>
                                                            <span className="text-slate-400">{globalCat.avgPercent}%</span>
                                                            <span className={`font-bold text-xs px-1.5 py-0.5 rounded ${diff >= 0 ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30' : 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/30'}`}>
                                                                {diff >= 0 ? '+' : ''}{diff}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* === Topic Heatmap === */}
                        {stats.heatmapData.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 mb-8">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-2">
                                    <Zap size={18} className="text-purple-500" />
                                    Heatmap หัวข้อที่แข็งแกร่ง / อ่อนแอ
                                </h3>
                                <p className="text-xs text-slate-400 mb-4">สีแสดงระดับความเข้าใจในแต่ละหัวข้อ</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {stats.heatmapData.map(item => {
                                        const heatColors = {
                                            strong: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300',
                                            good: 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300',
                                            weak: 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300',
                                            critical: 'bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300',
                                        };
                                        const levelLabels = { strong: 'แข็งแกร่ง', good: 'ดี', weak: 'ควรเสริม', critical: 'อ่อนแอ' };
                                        return (
                                            <div key={item.name} className={`rounded-xl border p-3 ${heatColors[item.level]} transition-all hover:scale-105`}>
                                                <div className="font-bold text-sm truncate">{item.name}</div>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-2xl font-black">{item.percent}%</span>
                                                    <span className="text-xs font-bold opacity-70">{levelLabels[item.level]}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center gap-4 mt-4 text-xs flex-wrap">
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200 dark:bg-emerald-800 border border-emerald-400"></span> แข็งแกร่ง (80%+)</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 dark:bg-blue-800 border border-blue-400"></span> ดี (60-79%)</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 dark:bg-amber-800 border border-amber-400"></span> ควรเสริม (40-59%)</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-200 dark:bg-rose-800 border border-rose-400"></span> อ่อนแอ (&lt;40%)</span>
                                </div>
                            </div>
                        )}

                        {/* === Time Analytics Detail === */}
                        {stats.resultsWithTime.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 mb-8">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                    <Timer size={18} className="text-cyan-500" />
                                    วิเคราะห์เวลาทำข้อสอบ
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">เวลาเฉลี่ยต่อข้อ</div>
                                        <div className="text-2xl font-black text-slate-800 dark:text-white">{stats.avgTimePerQ} <span className="text-sm font-bold text-slate-400">วินาที</span></div>
                                    </div>
                                    {stats.fastestExam && (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
                                            <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">เร็วที่สุด</div>
                                            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{stats.fastestExam.avgTimePerQuestion} <span className="text-sm font-bold text-emerald-500">วิ/ข้อ</span></div>
                                            <div className="text-xs text-emerald-600 dark:text-emerald-400 truncate mt-1">{stats.fastestExam.examTitle}</div>
                                        </div>
                                    )}
                                    {stats.slowestExam && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
                                            <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">ช้าที่สุด</div>
                                            <div className="text-2xl font-black text-amber-700 dark:text-amber-300">{stats.slowestExam.avgTimePerQuestion} <span className="text-sm font-bold text-amber-500">วิ/ข้อ</span></div>
                                            <div className="text-xs text-amber-600 dark:text-amber-400 truncate mt-1">{stats.slowestExam.examTitle}</div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {stats.resultsWithTime.map((r, i) => {
                                        const dur = r.durationSeconds || 0;
                                        const min = Math.floor(dur / 60);
                                        const sec = dur % 60;
                                        return (
                                            <div key={`time-${r.examId}-${i}`} className="flex items-center gap-3 text-sm">
                                                <Clock size={14} className="text-slate-300 flex-shrink-0" />
                                                <span className="font-medium text-slate-600 dark:text-slate-300 truncate flex-grow">{r.examTitle}</span>
                                                <span className="font-bold text-slate-500 flex-shrink-0">{min > 0 ? `${min}น. ${sec}วิ.` : `${sec}วิ.`}</span>
                                                <span className="text-xs text-slate-400 flex-shrink-0">({r.avgTimePerQuestion || '-'} วิ/ข้อ)</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Category Weakness Analysis */}
                        {stats.categories.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 mb-8">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                    <Trophy size={18} className="text-amber-500" />
                                    วิเคราะห์จุดแข็ง-จุดอ่อน (ตามหมวดหมู่)
                                </h3>
                                <div className="space-y-4">
                                    {stats.categories.map((cat) => (
                                        <div key={cat.name}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-sm text-slate-600 dark:text-slate-300">{cat.name}</span>
                                                <span className="text-sm font-bold text-slate-500">{cat.correct}/{cat.total} ({cat.percent}%)</span>
                                            </div>
                                            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${
                                                        cat.percent >= 80 ? "bg-emerald-500" :
                                                        cat.percent >= 60 ? "bg-blue-500" :
                                                        cat.percent >= 40 ? "bg-amber-500" : "bg-rose-500"
                                                    }`}
                                                    style={{ width: `${cat.percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {stats.categories.length > 0 && stats.categories[0].percent < 60 && (
                                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800 text-sm">
                                        <span className="font-bold text-amber-700 dark:text-amber-300">💡 แนะนำ:</span>
                                        <span className="text-amber-600 dark:text-amber-400 ml-1">
                                            หมวดที่ควรเสริม: {stats.categories.filter(c => c.percent < 60).map(c => c.name).join(", ")}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tag Breakdown (if any tags exist) */}
                        {stats.tags.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 mb-8">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                    <Target size={18} className="text-violet-500" />
                                    วิเคราะห์รายหัวข้อ (Tags)
                                </h3>
                                <div className="space-y-3">
                                    {stats.tags.map((tag) => (
                                        <div key={tag.name}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-sm text-slate-600 dark:text-slate-300">{tag.name}</span>
                                                <span className="text-sm font-bold text-slate-500">{tag.percent}%</span>
                                            </div>
                                            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${
                                                        tag.percent >= 80 ? "bg-emerald-500" :
                                                        tag.percent >= 60 ? "bg-violet-500" :
                                                        tag.percent >= 40 ? "bg-amber-500" : "bg-rose-500"
                                                    }`}
                                                    style={{ width: `${tag.percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Per-Exam Results Table */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <BookOpen size={18} className="text-blue-500" />
                                    ผลสอบแต่ละชุด
                                </h3>
                            </div>
                            <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                {results.map((r, i) => {
                                    const gc = gradeColors[r.grade] || gradeColors.D;
                                    const dateStr = r.completedAt?.seconds
                                        ? new Date(r.completedAt.seconds * 1000).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })
                                        : "";
                                    return (
                                        <Link
                                            key={`${r.examId}-${i}`}
                                            href={`/exam/${r.examId}`}
                                            className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 ${gc.bg} ${gc.text} ${gc.border} border`}>
                                                {r.grade}
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <div className="font-bold text-slate-700 dark:text-slate-200 truncate text-sm">{r.examTitle}</div>
                                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                                    {r.category && <span>{r.category}</span>}
                                                    {r.level && <span>{r.level}</span>}
                                                    {dateStr && <span>{dateStr}</span>}
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <div className="font-black text-slate-700 dark:text-slate-200">{r.score}/{r.total}</div>
                                                <div className={`text-xs font-bold ${gc.text}`}>{r.percent}%</div>
                                            </div>
                                            <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Wrong Questions Summary */}
                        {results.some(r => r.wrongQuestionIndices.length > 0) && (
                            <div className="mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                    <XCircle size={18} className="text-rose-500" />
                                    ข้อที่ทำผิด (ทบทวน)
                                </h3>
                                <div className="space-y-3">
                                    {results.filter(r => r.wrongQuestionIndices.length > 0).map((r, i) => (
                                        <div key={`wrong-${r.examId}-${i}`} className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                                            <div>
                                                <Link
                                                    href={`/exam/${r.examId}?q=${r.wrongQuestionIndices[0]}`}
                                                    className="font-bold text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                                >
                                                    {r.examTitle}
                                                </Link>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    ผิด {r.wrongQuestionIndices.length} ข้อ: {r.wrongQuestionIndices.map(idx => `ข้อ ${idx + 1}`).join(", ")}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
            <div className="flex items-center gap-2 mb-3">
                {icon}
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-800 dark:text-white">{value}</span>
                <span className="text-sm font-bold text-slate-400">{sub}</span>
            </div>
        </div>
    );
}

function CompareBar({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{label}</span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">{value}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
            </div>
        </div>
    );
}
