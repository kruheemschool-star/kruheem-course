"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { getCachedData } from "@/lib/dataCache";
import Link from "next/link";
import { ArrowLeft, ChevronDown, BookOpen, Clock, CheckCircle2, PlayCircle, Lock, Award, Target, TrendingUp } from "lucide-react";

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
    lastUpdated?: any;
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
    completedAt?: any;
}

interface ExamSummary {
    totalAttempts: number;
    avgPercent: number;
    bestPercent: number;
    weakTags: { tag: string; pct: number; total: number }[];
    recent: ExamResultLite[];
}

// Helper: Format date
const formatDate = (date: any) => {
    if (!date) return "-";
    try {
        const d = date.toDate ? date.toDate() : new Date(date.seconds ? date.seconds * 1000 : date);
        return d.toLocaleDateString("th-TH", { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
        return "-";
    }
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
                const progressDataMap: Record<string, { completed: string[], lastUpdated: any }> = {};
                progressSnap.docs.forEach(d => {
                    const data = d.data();
                    progressDataMap[d.id] = {
                        completed: data.completed || [],
                        lastUpdated: data.lastUpdated
                    };
                });

                // 3. Fetch ALL courses and filter to those with progress (cached — shared with my-courses)
                const allCourses = await getCachedData<any[]>("all-courses", async () => {
                    const coursesSnap = await getDocs(collection(db, "courses"));
                    return coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                });
                let filteredCourses: Course[];
                if (progressCourseIds.length > 0) {
                    filteredCourses = allCourses
                        .filter((c: any) => progressCourseIds.includes(c.id)) as Course[];
                } else {
                    filteredCourses = allCourses.slice(0, 5) as Course[];
                }

                setCourses(filteredCourses);

                // 4. Fetch lessons for each course and calculate progress
                const progressMap: Record<string, CourseProgress> = {};

                for (const course of filteredCourses) {
                    // Cached per-course — shared with my-courses and learn/[id]
                    const lessonDocs = await getCachedData<any[]>(`lessons-${course.id}`, async () => {
                        const lessonsSnap = await getDocs(collection(db, "courses", course.id, "lessons"));
                        return lessonsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    });
                    const lessonList = (lessonDocs as Lesson[])
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
                            .slice(0, 5);

                        setExamSummary({
                            totalAttempts,
                            avgPercent,
                            bestPercent,
                            weakTags,
                            recent: results.slice(0, 5),
                        });
                    }
                } catch (examErr) {
                    console.warn("Exam summary fetch failed (non-blocking):", examErr);
                }

                // Auto-expand first course (Disabled as per user request)
                // if (filteredCourses.length > 0) {
                //     setExpandedCourseId(filteredCourses[0].id);
                // }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [uid]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 border-t-slate-800 dark:border-t-slate-200 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
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

    return (
        <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950 font-sans">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 max-w-4xl">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition">
                            <ArrowLeft size={24} />
                        </Link>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-white">📊 รายงานผลการเรียน</h1>
                        <div className="w-6"></div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Student Profile Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 overflow-hidden border-2 border-white dark:border-slate-800 shadow-md">
                            {userProfile.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">นักเรียน</p>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{userProfile.displayName || "ไม่ระบุชื่อ"}</h2>
                            {userProfile.caption && (
                                <p className="text-slate-400 dark:text-slate-500 italic text-xs mt-0.5">"{userProfile.caption}"</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Exam Summary */}
                {examSummary && examSummary.totalAttempts > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                            <Award size={16} className="text-amber-500 dark:text-amber-400" />
                            ผลการทำข้อสอบ ({examSummary.totalAttempts} ครั้งล่าสุด)
                        </p>

                        {/* Stat row */}
                        <div className="grid grid-cols-3 gap-3 mb-5">
                            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-center">
                                <div className="text-2xl font-black text-slate-700 dark:text-slate-100">{examSummary.totalAttempts}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">ทำไปแล้ว</div>
                            </div>
                            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-3 text-center">
                                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-300">{examSummary.avgPercent}%</div>
                                <div className="text-xs text-indigo-500 dark:text-indigo-400 font-medium mt-0.5">คะแนนเฉลี่ย</div>
                            </div>
                            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 text-center">
                                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-300">{examSummary.bestPercent}%</div>
                                <div className="text-xs text-emerald-500 dark:text-emerald-400 font-medium mt-0.5">คะแนนดีสุด</div>
                            </div>
                        </div>

                        {/* Weak topics */}
                        {examSummary.weakTags.length > 0 && (
                            <div className="mb-5">
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                                    <Target size={13} className="text-amber-500 dark:text-amber-400" />
                                    หัวข้อที่ควรฝึกเพิ่ม
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {examSummary.weakTags.map(t => (
                                        <span
                                            key={t.tag}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-800 dark:text-amber-300"
                                        >
                                            {t.tag}
                                            <span className="text-rose-600 dark:text-rose-400">{t.pct}%</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recent exams */}
                        <div>
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                                <TrendingUp size={13} className="text-indigo-500 dark:text-indigo-400" />
                                ข้อสอบล่าสุด
                            </p>
                            <div className="space-y-1.5">
                                {examSummary.recent.map((r, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                                        <span className="text-slate-700 dark:text-slate-200 truncate flex-1 pr-2">
                                            {r.examTitle || "ข้อสอบไม่ระบุชื่อ"}
                                        </span>
                                        <span
                                            className={`flex-shrink-0 font-bold text-xs px-2 py-0.5 rounded-full ${
                                                (r.percent || 0) >= 80
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                    : (r.percent || 0) >= 60
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                                    : (r.percent || 0) >= 40
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                            }`}
                                        >
                                            {r.score}/{r.total} ({r.percent || 0}%)
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Courses List - Notion Style Accordion */}
                <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 px-1">📚 คอร์สที่ลงเรียน ({courses.length} คอร์ส)</p>

                    {courses.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-slate-100 dark:border-slate-800">
                            <p className="text-4xl mb-2">📭</p>
                            <p className="text-slate-500 dark:text-slate-400">ยังไม่มีคอร์สที่ลงเรียน</p>
                        </div>
                    ) : (
                        courses.map(course => {
                            const progress = courseProgressMap[course.id];
                            const isExpanded = expandedCourseId === course.id;
                            const completedCount = progress?.completed.filter(id => progress.lessons.some(l => l.id === id)).length || 0;

                            return (
                                <div key={course.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                                    {/* Course Header - Clickable */}
                                    <button
                                        onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                                        className="w-full p-4 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition text-left"
                                    >
                                        {/* Progress Ring */}
                                        <div className="relative w-14 h-14 flex-shrink-0">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                <circle cx="18" cy="18" r="15" fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="3" />
                                                <circle
                                                    cx="18" cy="18" r="15" fill="none"
                                                    className={progress?.percent === 100 ? "stroke-amber-500 dark:stroke-amber-400" : "stroke-indigo-500 dark:stroke-indigo-400"}
                                                    strokeWidth="3"
                                                    strokeLinecap="round"
                                                    strokeDasharray={`${(progress?.percent || 0) * 0.94} 100`}
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className={`text-sm font-bold ${progress?.percent === 100 ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                                    {progress?.percent || 0}%
                                                </span>
                                            </div>
                                        </div>

                                        {/* Course Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-800 dark:text-white truncate">{course.title}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                ดูจบแล้ว {completedCount} / {progress?.total || 0} คลิป
                                            </p>
                                        </div>

                                        {/* Expand Icon */}
                                        <ChevronDown
                                            className={`text-slate-300 dark:text-slate-500 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                                            size={20}
                                        />
                                    </button>

                                    {/* Expanded Content with Animation */}
                                    <div
                                        className={`overflow-hidden transition-all duration-300 ease-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                                            }`}
                                    >
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
                </div>

                {/* Footer */}
                <div className="mt-10 text-center text-slate-400 dark:text-slate-500 text-xs pb-8">
                    <p>📊 ข้อมูลจาก KruHeem Math School</p>
                    <p className="mt-1">อัปเดตแบบ Real-time เมื่อนักเรียนเข้าเรียน</p>
                </div>
            </main>
        </div>
    );
}
