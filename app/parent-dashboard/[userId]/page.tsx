"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { getCachedData } from "@/lib/dataCache";
import { getProficiencyLevel, projectAttemptsToGoal } from "@/lib/exam-utils";
import Link from "next/link";
import {
    ArrowLeft, ChevronDown, Clock, CheckCircle2, PlayCircle, Lock, Award, Target,
    TrendingUp, TrendingDown, Sparkles, GraduationCap, Flame, BarChart3, Trophy, Layers,
} from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useTheme } from "next-themes";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer,
    Tooltip, PieChart, Pie, Cell,
} from "recharts";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";

// Firestore timestamp-ish value (Timestamp | { seconds } | epoch | ISO | null)
type FsDate = { toDate?: () => Date; seconds?: number } | number | string | null | undefined;

// Types
interface Course {
    id: string;
    title: string;
    image?: string;
}

interface Lesson {
    id: string;
    title: string;
    type: string;
    order?: number;
    isHidden?: boolean;
    headerId?: string;
}

interface UserProfile {
    displayName?: string;
    avatar?: string;
    caption?: string;
}

interface CourseProgress {
    courseId: string;
    completed: string[];
    total: number;
    percent: number;
    lastUpdated?: FsDate;
    lessons: Lesson[];
}

interface ExamResultLite {
    examId?: string;
    examTitle?: string;
    score: number;
    total: number;
    percent: number;
    grade?: string;
    tags?: string[];
    wrongQuestionIndices?: number[];
    completedAt?: FsDate;
}

interface TrendPoint { idx: number; percent: number; title: string; dateLabel: string }

interface ExamSummary {
    totalAttempts: number;
    avgPercent: number;
    bestPercent: number;
    weakTags: { tag: string; pct: number; total: number }[];
    recent: ExamResultLite[];
    trend: TrendPoint[];
    bands: { A: number; B: number; C: number; D: number };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const toDate = (date: FsDate): Date | null => {
    if (!date) return null;
    try {
        if (typeof date === 'object') {
            if (typeof date.toDate === 'function') return date.toDate();
            if (typeof date.seconds === 'number') return new Date(date.seconds * 1000);
            return null;
        }
        return new Date(date);
    } catch {
        return null;
    }
};

const formatDate = (date: FsDate) => {
    const d = toDate(date);
    return d ? d.toLocaleDateString("th-TH", { day: 'numeric', month: 'long', year: 'numeric' }) : "-";
};

const shortDate = (date: FsDate) => {
    const d = toDate(date);
    return d ? d.toLocaleDateString("th-TH", { day: 'numeric', month: 'short' }) : "";
};

// Animated count-up number (uses framer-motion)
function AnimatedNumber({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (v) => Math.round(v));
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const controls = animate(count, value, { duration: 1.1, ease: "easeOut" });
        const unsub = rounded.on("change", (v) => setDisplay(v));
        return () => { controls.stop(); unsub(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);
    return <span className={className}>{display}{suffix}</span>;
}

// Circular gauge ring
function Gauge({ percent, colorClass, size = 128, stroke = 8, children }: {
    percent: number; colorClass: string; size?: number; stroke?: number; children?: React.ReactNode;
}) {
    const p = Math.max(0, Math.min(100, percent));
    return (
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-100 dark:text-slate-700/70" />
                <circle
                    cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth={stroke}
                    strokeLinecap="round" strokeDasharray={`${p * 2.83} 283`}
                    className={colorClass} style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.22,1,0.36,1)' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
        </div>
    );
}

const ringColor = (p: number) =>
    p >= 80 ? 'text-emerald-500 dark:text-emerald-400'
        : p >= 60 ? 'text-blue-500 dark:text-blue-400'
            : p >= 40 ? 'text-amber-500 dark:text-amber-400'
                : 'text-rose-500 dark:text-rose-400';

const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] as const } }),
};

export default function ParentDashboard() {
    const { userId } = useParams();
    const uid = typeof userId === 'string' ? userId : "";

    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [courseProgressMap, setCourseProgressMap] = useState<Record<string, CourseProgress>>({});
    const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
    const [examSummary, setExamSummary] = useState<ExamSummary | null>(null);

    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const cc = useMemo(() => ({
        grid: isDark ? '#1e293b' : '#eef2f7',
        axis: isDark ? '#94a3b8' : '#94a3b8',
        primary: isDark ? '#a5b4fc' : '#6366f1',
        fill: isDark ? '#818cf8' : '#6366f1',
        goal: isDark ? '#c4b5fd' : '#8b5cf6',
    }), [isDark]);

    // Fetch user and enrolled courses with progress
    useEffect(() => {
        if (!uid) return;

        const fetchData = async () => {
            try {
                setLoading(true);

                // 1. Fetch user profile
                const userDoc = await getDoc(doc(db, "users", uid));
                if (userDoc.exists()) {
                    setUserProfile(userDoc.data() as UserProfile);
                }

                // 2. Fetch progress documents to find which courses user has progress in
                const progressSnap = await getDocs(collection(db, "users", uid, "progress"));
                const progressCourseIds = progressSnap.docs.map(d => d.id);

                // Store progress data
                const progressDataMap: Record<string, { completed: string[], lastUpdated: FsDate }> = {};
                progressSnap.docs.forEach(d => {
                    const data = d.data();
                    progressDataMap[d.id] = {
                        completed: data.completed || [],
                        lastUpdated: data.lastUpdated
                    };
                });

                // 3. Fetch ALL courses and filter to those with progress (cached — shared with my-courses)
                const allCourses = await getCachedData<Course[]>("all-courses", async () => {
                    const coursesSnap = await getDocs(collection(db, "courses"));
                    return coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Course);
                });
                let filteredCourses: Course[];
                if (progressCourseIds.length > 0) {
                    filteredCourses = allCourses
                        .filter((c) => progressCourseIds.includes(c.id));
                } else {
                    filteredCourses = allCourses.slice(0, 5);
                }

                setCourses(filteredCourses);

                // 4. Fetch lessons for each course and calculate progress
                const progressMap: Record<string, CourseProgress> = {};

                for (const course of filteredCourses) {
                    // Cached per-course — shared with my-courses and learn/[id]
                    const lessonDocs = await getCachedData<Lesson[]>(`lessons-${course.id}`, async () => {
                        const lessonsSnap = await getDocs(collection(db, "courses", course.id, "lessons"));
                        return lessonsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Lesson);
                    });
                    const lessonList = lessonDocs
                        .slice()
                        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

                    const videoLessons = lessonList.filter(l => l.type === 'video' && !l.isHidden);
                    const progressData = progressDataMap[course.id] || { completed: [], lastUpdated: null };
                    const completedVideos = progressData.completed.filter(id => videoLessons.some(l => l.id === id));
                    const percent = videoLessons.length > 0
                        ? Math.round((completedVideos.length / videoLessons.length) * 100)
                        : 0;

                    progressMap[course.id] = {
                        courseId: course.id,
                        completed: progressData.completed,
                        total: videoLessons.length,
                        percent,
                        lastUpdated: progressData.lastUpdated,
                        lessons: videoLessons
                    };
                }

                setCourseProgressMap(progressMap);

                // 5. Fetch latest exam results (capped) to compute summary.
                //    Capped at 200 latest to keep parent-dashboard cheap.
                try {
                    const examQ = query(
                        collection(db, "users", uid, "examResults"),
                        orderBy("completedAt", "desc"),
                        limit(200)
                    );
                    const examSnap = await getDocs(examQ);
                    if (!examSnap.empty) {
                        const results: ExamResultLite[] = examSnap.docs.map(d => d.data() as ExamResultLite);
                        const totalAttempts = results.length;
                        const avgPercent = Math.round(
                            results.reduce((s, r) => s + (r.percent || 0), 0) / totalAttempts
                        );
                        const bestPercent = Math.max(...results.map(r => r.percent || 0));

                        // Aggregate per-tag wrong rate across all attempts
                        const tagStats: Record<string, { wrong: number; total: number }> = {};
                        for (const r of results) {
                            const wrongSet = new Set(r.wrongQuestionIndices || []);
                            // Without per-question tags we only know the union of tags;
                            // approximate weak-rate by mapping any wrong-on-attempt to all tags.
                            if (!r.tags || r.tags.length === 0) continue;
                            const wrongCount = wrongSet.size;
                            const totalQ = r.total || 0;
                            for (const tag of r.tags) {
                                if (!tagStats[tag]) tagStats[tag] = { wrong: 0, total: 0 };
                                tagStats[tag].wrong += wrongCount;
                                tagStats[tag].total += totalQ;
                            }
                        }
                        const weakTags = Object.entries(tagStats)
                            .filter(([, s]) => s.total >= 3 && s.wrong / s.total >= 0.4)
                            .map(([tag, s]) => ({ tag, pct: Math.round((s.wrong / s.total) * 100), total: s.total }))
                            .sort((a, b) => b.pct - a.pct)
                            .slice(0, 6);

                        // Grade distribution across all attempts (for the donut)
                        const bands = { A: 0, B: 0, C: 0, D: 0 };
                        for (const r of results) {
                            const p = r.percent || 0;
                            if (p >= 80) bands.A++; else if (p >= 60) bands.B++; else if (p >= 40) bands.C++; else bands.D++;
                        }

                        // Trend: the 20 most-recent attempts, chronological (oldest → newest)
                        const trend: TrendPoint[] = results.slice(0, 20).reverse().map((r, i) => ({
                            idx: i + 1,
                            percent: r.percent || 0,
                            title: r.examTitle || "ข้อสอบ",
                            dateLabel: shortDate(r.completedAt),
                        }));

                        setExamSummary({
                            totalAttempts,
                            avgPercent,
                            bestPercent,
                            weakTags,
                            recent: results.slice(0, 5),
                            trend,
                            bands,
                        });
                    }
                } catch (examErr) {
                    console.warn("Exam summary fetch failed (non-blocking):", examErr);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [uid]);

    // Overall course completion across every enrolled course
    const overallCourse = useMemo(() => {
        const list = Object.values(courseProgressMap);
        const totalVids = list.reduce((s, p) => s + p.total, 0);
        const doneVids = list.reduce((s, p) => s + p.completed.filter(id => p.lessons.some(l => l.id === id)).length, 0);
        return totalVids > 0 ? Math.round((doneVids / totalVids) * 100) : 0;
    }, [courseProgressMap]);

    const hasExams = !!(examSummary && examSummary.totalAttempts > 0);
    const prof = hasExams ? getProficiencyLevel(examSummary!.avgPercent) : null;
    const projection = hasExams && examSummary!.trend.length >= 2
        ? projectAttemptsToGoal(examSummary!.trend.map(t => t.percent), 80)
        : null;

    if (loading) {
        return <LoadingState message="กำลังโหลดข้อมูล..." size="lg" fullScreen />;
    }

    if (!userProfile) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-6xl mb-4">🔍</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-white mb-2">ไม่พบข้อมูลนักเรียน</p>
                    <p className="text-slate-500 dark:text-slate-400">ลิงก์อาจไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง</p>
                </div>
            </div>
        );
    }

    // Donut data (grade distribution)
    const donutData = hasExams ? [
        { name: 'ดีมาก (80%+)', key: 'A', value: examSummary!.bands.A, color: '#10b981' },
        { name: 'ดี (60-79%)', key: 'B', value: examSummary!.bands.B, color: '#3b82f6' },
        { name: 'พอใช้ (40-59%)', key: 'C', value: examSummary!.bands.C, color: '#f59e0b' },
        { name: 'ต้องฝึก (<40%)', key: 'D', value: examSummary!.bands.D, color: '#f43f5e' },
    ].filter(d => d.value > 0) : [];

    return (
        <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950 font-sans">
            {/* Header */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 max-w-5xl">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition">
                            <ArrowLeft size={24} />
                        </Link>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <BarChart3 size={18} className="text-indigo-500" /> รายงานผลการเรียน
                        </h1>
                        <div className="w-6"></div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
                {/* ── Hero: student + overall gauge ─────────────────────────── */}
                <motion.div
                    custom={0} variants={fadeUp} initial="hidden" animate="show"
                    className="relative overflow-hidden rounded-3xl mb-5 p-6 sm:p-7 border border-indigo-100/70 dark:border-indigo-900/40 shadow-sm
                               bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-indigo-950/50 dark:via-slate-900 dark:to-slate-900"
                >
                    {/* decorative blobs */}
                    <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-indigo-200/30 dark:bg-indigo-700/10 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-blue-200/30 dark:bg-blue-700/10 blur-3xl" />

                    <div className="relative flex flex-col sm:flex-row items-center gap-6">
                        {/* Avatar + name */}
                        <div className="flex items-center gap-4 flex-1 w-full">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 overflow-hidden border-2 border-white dark:border-slate-800 shadow-lg flex-shrink-0">
                                {userProfile.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-indigo-500 dark:text-indigo-300 font-bold flex items-center gap-1">
                                    <Sparkles size={12} /> รายงานของนักเรียน
                                </p>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white truncate">{userProfile.displayName || "ไม่ระบุชื่อ"}</h2>
                                {userProfile.caption && (
                                    <p className="text-slate-400 dark:text-slate-500 italic text-xs mt-0.5 truncate">&ldquo;{userProfile.caption}&rdquo;</p>
                                )}
                                {prof && (
                                    <span className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-bold border bg-gradient-to-r ${prof.bg} ${prof.color}`}>
                                        <span>{prof.emoji}</span> ระดับ: {prof.label}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Big gauge */}
                        <div className="flex items-center gap-4">
                            <Gauge percent={hasExams ? examSummary!.avgPercent : overallCourse} colorClass={ringColor(hasExams ? examSummary!.avgPercent : overallCourse)} size={130}>
                                <span className={`text-3xl font-black ${ringColor(hasExams ? examSummary!.avgPercent : overallCourse).replace('500', '600').replace('400', '400')}`}>
                                    <AnimatedNumber value={hasExams ? examSummary!.avgPercent : overallCourse} suffix="%" />
                                </span>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold">
                                    {hasExams ? 'คะแนนเฉลี่ย' : 'ดูคลิปแล้ว'}
                                </span>
                            </Gauge>
                        </div>
                    </div>
                </motion.div>

                {/* ── KPI stat cards ────────────────────────────────────────── */}
                <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
                    <StatCard icon={<GraduationCap size={18} />} tint="indigo" label="ทำข้อสอบไปแล้ว" value={examSummary?.totalAttempts ?? 0} suffix=" ครั้ง" />
                    <StatCard icon={<Target size={18} />} tint="blue" label="คะแนนเฉลี่ย" value={examSummary?.avgPercent ?? 0} suffix="%" />
                    <StatCard icon={<Trophy size={18} />} tint="emerald" label="คะแนนดีที่สุด" value={examSummary?.bestPercent ?? 0} suffix="%" />
                    <StatCard icon={<Layers size={18} />} tint="amber" label="ความคืบหน้าคอร์ส" value={overallCourse} suffix="%" />
                </motion.div>

                {/* ── Trend area chart ──────────────────────────────────────── */}
                {hasExams && examSummary!.trend.length >= 2 && (
                    <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show"
                        className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-5">
                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-0.5 flex items-center gap-2">
                            <TrendingUp size={18} className="text-emerald-500" /> พัฒนาการการทำข้อสอบ
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">คะแนนทุกครั้งที่ทำ (เรียงตามเวลา) — เส้นประคือเป้าหมาย 80%</p>
                        <ResponsiveContainer width="100%" height={230}>
                            <AreaChart data={examSummary!.trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="parentTrendFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={cc.fill} stopOpacity={0.35} />
                                        <stop offset="95%" stopColor={cc.fill} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
                                <XAxis dataKey="idx" tick={{ fontSize: 10, fill: cc.axis }} stroke={cc.axis} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: cc.axis }} stroke={cc.axis} />
                                <Tooltip content={<TrendTooltip />} />
                                <ReferenceLine y={80} stroke={cc.goal} strokeDasharray="6 4" strokeWidth={2}
                                    label={{ value: 'เป้า 80%', position: 'insideTopRight', fontSize: 10, fill: cc.goal, fontWeight: 700 }} />
                                <Area type="monotone" dataKey="percent" stroke={cc.primary} strokeWidth={2.5}
                                    fill="url(#parentTrendFill)" dot={{ r: 3, fill: cc.primary }} activeDot={{ r: 5 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                        {projection && (
                            <div className={`mt-3 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2 ${projection.reached
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                                : projection.trend === 'down'
                                    ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                                    : 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'}`}>
                                {projection.trend === 'down' ? <TrendingDown size={16} className="flex-shrink-0" /> : <Sparkles size={16} className="flex-shrink-0" />}
                                <span>{projection.message}</span>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ── Two-column: grade donut + weak topics ─────────────────── */}
                {hasExams && (
                    <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                        {/* Grade donut */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                                <Award size={18} className="text-amber-500" /> สัดส่วนเกรด
                            </h3>
                            <div className="flex items-center gap-3">
                                <div className="relative w-[140px] h-[140px] flex-shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                                                innerRadius={42} outerRadius={64} paddingAngle={donutData.length > 1 ? 3 : 0} stroke="none">
                                                {donutData.map((d) => <Cell key={d.key} fill={d.color} />)}
                                            </Pie>
                                            <Tooltip content={<DonutTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-2xl font-black text-slate-800 dark:text-white">{examSummary!.totalAttempts}</span>
                                        <span className="text-[10px] text-slate-400 font-bold">ครั้ง</span>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    {donutData.map((d) => (
                                        <div key={d.key} className="flex items-center gap-2 text-xs">
                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                                            <span className="text-slate-600 dark:text-slate-300 flex-1 truncate">{d.name}</span>
                                            <span className="font-black text-slate-700 dark:text-slate-200 tabular-nums">{d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Weak topics as bars */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
                                <Target size={18} className="text-rose-500" /> หัวข้อที่ควรฝึกเพิ่ม
                            </h3>
                            {examSummary!.weakTags.length > 0 ? (
                                <>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">ยิ่งแท่งยาว = ตอบผิดบ่อย ควรกลับไปทบทวน</p>
                                    <div className="space-y-3">
                                        {examSummary!.weakTags.map((t, i) => (
                                            <div key={t.tag}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate pr-2">{t.tag}</span>
                                                    <span className="text-xs font-black text-rose-500 dark:text-rose-400 tabular-nums flex-shrink-0">ผิด {t.pct}%</span>
                                                </div>
                                                <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }} animate={{ width: `${t.pct}%` }}
                                                        transition={{ duration: 0.9, delay: 0.3 + i * 0.08, ease: "easeOut" }}
                                                        className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500 dark:from-rose-500 dark:to-rose-600"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <div className="text-3xl mb-2">🎉</div>
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">ทำได้สม่ำเสมอทุกหัวข้อ</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">ยังไม่มีหัวข้อที่ต้องเร่งฝึกเป็นพิเศษ</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ── Recent exams ──────────────────────────────────────────── */}
                {hasExams && (
                    <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show"
                        className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-5">
                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                            <Clock size={18} className="text-indigo-500" /> ข้อสอบล่าสุด
                        </h3>
                        <div className="space-y-2">
                            {examSummary!.recent.map((r, i) => {
                                const p = r.percent || 0;
                                return (
                                    <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${p >= 80 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300'
                                            : p >= 60 ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300'
                                                : p >= 40 ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300'
                                                    : 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300'}`}>
                                            {p}%
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{r.examTitle || "ข้อสอบไม่ระบุชื่อ"}</p>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500">{shortDate(r.completedAt)} • ได้ {r.score}/{r.total} ข้อ</p>
                                        </div>
                                        <div className="w-16 flex-shrink-0">
                                            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                <div className={`h-full rounded-full ${p >= 80 ? 'bg-emerald-500' : p >= 60 ? 'bg-blue-500' : p >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${p}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* ── No-exam empty hint ────────────────────────────────────── */}
                {!hasExams && (
                    <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show"
                        className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 mb-5 text-center">
                        <div className="text-4xl mb-2">📝</div>
                        <p className="text-base font-black text-slate-700 dark:text-slate-200">ยังไม่มีผลการทำข้อสอบ</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">เมื่อนักเรียนเริ่มทำข้อสอบ กราฟพัฒนาการและสรุปผลจะแสดงที่นี่</p>
                    </motion.div>
                )}

                {/* ── Courses ───────────────────────────────────────────────── */}
                <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show" className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Flame size={18} className="text-orange-500" /> คอร์สที่ลงเรียน
                        </h3>
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{courses.length} คอร์ส</span>
                    </div>

                    {courses.length === 0 ? (
                        <EmptyState
                            icon="📭"
                            title="ยังไม่มีคอร์สที่ลงเรียน"
                            description="เมื่อนักเรียนลงทะเบียนเรียนคอร์สใดๆ จะแสดงผลการเรียนที่นี่"
                        />
                    ) : (
                        courses.map(course => {
                            const progress = courseProgressMap[course.id];
                            const isExpanded = expandedCourseId === course.id;
                            const completedCount = progress?.completed.filter(id => progress.lessons.some(l => l.id === id)).length || 0;
                            const pct = progress?.percent || 0;
                            const done = pct === 100;

                            return (
                                <div key={course.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                                    {/* Course Header - Clickable */}
                                    <button
                                        onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                                        className="w-full p-4 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition text-left"
                                    >
                                        {/* Progress Ring */}
                                        <Gauge percent={pct} colorClass={done ? 'text-amber-500 dark:text-amber-400' : 'text-indigo-500 dark:text-indigo-400'} size={56} stroke={3.5}>
                                            <span className={`text-xs font-black ${done ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{pct}%</span>
                                        </Gauge>

                                        {/* Course Info */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-800 dark:text-white truncate flex items-center gap-1.5">
                                                {done && <span className="text-amber-500">🏆</span>}{course.title}
                                            </h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                ดูจบแล้ว {completedCount} / {progress?.total || 0} คลิป
                                            </p>
                                            {/* mini bar */}
                                            <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                <div className={`h-full rounded-full ${done ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-indigo-400 to-blue-500'}`} style={{ width: `${pct}%`, transition: 'width 1s ease-out' }} />
                                            </div>
                                        </div>

                                        {/* Expand Icon */}
                                        <ChevronDown
                                            className={`text-slate-300 dark:text-slate-500 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                                            size={20}
                                        />
                                    </button>

                                    {/* Expanded Content with Animation */}
                                    <div className={`overflow-hidden transition-all duration-300 ease-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="border-t border-slate-100 dark:border-slate-800">
                                            {/* Last Updated */}
                                            {progress?.lastUpdated && (
                                                <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-800/40 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                                    <Clock size={14} />
                                                    <span>อัปเดตล่าสุด: {formatDate(progress.lastUpdated)}</span>
                                                </div>
                                            )}

                                            {/* Lessons List */}
                                            <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
                                                {progress?.lessons.length === 0 ? (
                                                    <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">
                                                        ยังไม่มีบทเรียนในคอร์สนี้
                                                    </div>
                                                ) : (
                                                    progress?.lessons.map((lesson, index) => {
                                                        const isCompleted = progress.completed.includes(lesson.id);
                                                        const isInProgress = !isCompleted && index <= completedCount;

                                                        return (
                                                            <div key={lesson.id} className="flex items-center gap-3 px-4 py-3">
                                                                <div className="flex-shrink-0">
                                                                    {isCompleted ? (
                                                                        <CheckCircle2 className="text-emerald-500 dark:text-emerald-400" size={18} />
                                                                    ) : isInProgress ? (
                                                                        <PlayCircle className="text-amber-500 dark:text-amber-400" size={18} />
                                                                    ) : (
                                                                        <Lock className="text-slate-300 dark:text-slate-600" size={16} />
                                                                    )}
                                                                </div>
                                                                <span className={`flex-1 text-sm truncate ${isCompleted ? 'text-slate-700 dark:text-slate-200' : isInProgress ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                                                                    {lesson.title}
                                                                </span>
                                                                {isCompleted && (
                                                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </motion.div>

                {/* Footer */}
                <div className="mt-10 text-center text-slate-400 dark:text-slate-500 text-xs pb-8">
                    <p className="flex items-center justify-center gap-1.5"><BarChart3 size={13} /> ข้อมูลจาก KruHeem Math School</p>
                    <p className="mt-1">อัปเดตแบบ Real-time เมื่อนักเรียนเข้าเรียน</p>
                </div>
            </main>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────
const TINTS: Record<string, { ring: string; icon: string; text: string }> = {
    indigo: { ring: 'from-indigo-500 to-indigo-600', icon: 'text-white', text: 'text-indigo-600 dark:text-indigo-300' },
    blue: { ring: 'from-blue-500 to-sky-500', icon: 'text-white', text: 'text-blue-600 dark:text-blue-300' },
    emerald: { ring: 'from-emerald-500 to-teal-500', icon: 'text-white', text: 'text-emerald-600 dark:text-emerald-300' },
    amber: { ring: 'from-amber-500 to-orange-500', icon: 'text-white', text: 'text-amber-600 dark:text-amber-300' },
};

function StatCard({ icon, tint, label, value, suffix }: {
    icon: React.ReactNode; tint: keyof typeof TINTS | string; label: string; value: number; suffix?: string;
}) {
    const t = TINTS[tint] || TINTS.indigo;
    return (
        <div className="group bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${t.ring} ${t.icon} flex items-center justify-center shadow-sm mb-2.5 group-hover:scale-105 transition-transform`}>
                {icon}
            </div>
            <div className={`text-2xl font-black ${t.text} tabular-nums leading-none`}>
                <AnimatedNumber value={value} suffix={suffix} />
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">{label}</div>
        </div>
    );
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TrendPoint }> }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur px-3 py-2 shadow-lg border border-slate-100 dark:border-slate-700">
            <div className="text-[11px] text-slate-400">ครั้งที่ {d.idx}{d.dateLabel ? ` • ${d.dateLabel}` : ''}</div>
            <div className="text-sm font-black text-indigo-600 dark:text-indigo-300">{d.percent}%</div>
            {d.title && <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[170px]">{d.title}</div>}
        </div>
    );
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; color: string } }> }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur px-3 py-2 shadow-lg border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                <span className="w-2 h-2 rounded-full" style={{ background: d.color }} /> {d.name}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{d.value} ครั้ง</div>
        </div>
    );
}
