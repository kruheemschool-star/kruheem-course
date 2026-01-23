"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import Link from "next/link";
import { ArrowLeft, ChevronDown, BookOpen, Clock, CheckCircle2, PlayCircle, Lock } from "lucide-react";

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

    // Fetch user and enrolled courses with progress
    useEffect(() => {
        if (!uid) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                console.log("[Parent Dashboard] Starting fetch for uid:", uid);

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

                // 3. Fetch ALL courses and filter to those with progress
                const coursesSnap = await getDocs(collection(db, "courses"));
                let filteredCourses: Course[];
                if (progressCourseIds.length > 0) {
                    filteredCourses = coursesSnap.docs
                        .filter(d => progressCourseIds.includes(d.id))
                        .map(d => ({ id: d.id, ...d.data() } as Course));
                } else {
                    filteredCourses = coursesSnap.docs
                        .slice(0, 5)
                        .map(d => ({ id: d.id, ...d.data() } as Course));
                }

                setCourses(filteredCourses);

                // 4. Fetch lessons for each course and calculate progress
                const progressMap: Record<string, CourseProgress> = {};

                for (const course of filteredCourses) {
                    const lessonsSnap = await getDocs(collection(db, "courses", course.id, "lessons"));
                    const lessonList = lessonsSnap.docs
                        .map(d => ({ id: d.id, ...d.data() } as Lesson))
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
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 font-medium">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    if (!userProfile) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-6xl mb-4">🔍</p>
                    <p className="text-xl font-bold text-slate-800 mb-2">ไม่พบข้อมูลนักเรียน</p>
                    <p className="text-slate-500">ลิงก์อาจไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] font-sans">
            {/* Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 max-w-4xl">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="text-slate-400 hover:text-slate-600 transition">
                            <ArrowLeft size={24} />
                        </Link>
                        <h1 className="text-lg font-bold text-slate-800">📊 รายงานผลการเรียน</h1>
                        <div className="w-6"></div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Student Profile Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 overflow-hidden border-2 border-white shadow-md">
                            {userProfile.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium">นักเรียน</p>
                            <h2 className="text-xl font-bold text-slate-800">{userProfile.displayName || "ไม่ระบุชื่อ"}</h2>
                            {userProfile.caption && (
                                <p className="text-slate-400 italic text-xs mt-0.5">"{userProfile.caption}"</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Courses List - Notion Style Accordion */}
                <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-500 px-1">📚 คอร์สที่ลงเรียน ({courses.length} คอร์ส)</p>

                    {courses.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
                            <p className="text-4xl mb-2">📭</p>
                            <p className="text-slate-500">ยังไม่มีคอร์สที่ลงเรียน</p>
                        </div>
                    ) : (
                        courses.map(course => {
                            const progress = courseProgressMap[course.id];
                            const isExpanded = expandedCourseId === course.id;
                            const completedCount = progress?.completed.filter(id => progress.lessons.some(l => l.id === id)).length || 0;

                            return (
                                <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                    {/* Course Header - Clickable */}
                                    <button
                                        onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                                        className="w-full p-4 flex items-center gap-4 hover:bg-slate-50/50 transition text-left"
                                    >
                                        {/* Progress Ring */}
                                        <div className="relative w-14 h-14 flex-shrink-0">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                <circle cx="18" cy="18" r="15" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                                                <circle
                                                    cx="18" cy="18" r="15" fill="none"
                                                    stroke={progress?.percent === 100 ? "#F59E0B" : "#6366F1"}
                                                    strokeWidth="3"
                                                    strokeLinecap="round"
                                                    strokeDasharray={`${(progress?.percent || 0) * 0.94} 100`}
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className={`text-sm font-bold ${progress?.percent === 100 ? 'text-amber-600' : 'text-indigo-600'}`}>
                                                    {progress?.percent || 0}%
                                                </span>
                                            </div>
                                        </div>

                                        {/* Course Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-800 truncate">{course.title}</h3>
                                            <p className="text-sm text-slate-500">
                                                ดูจบแล้ว {completedCount} / {progress?.total || 0} คลิป
                                            </p>
                                        </div>

                                        {/* Expand Icon */}
                                        <ChevronDown
                                            className={`text-slate-300 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                                            size={20}
                                        />
                                    </button>

                                    {/* Expanded Content with Animation */}
                                    <div
                                        className={`overflow-hidden transition-all duration-300 ease-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                                            }`}
                                    >
                                        <div className="border-t border-slate-100">
                                            {/* Last Updated */}
                                            {progress?.lastUpdated && (
                                                <div className="px-4 py-3 bg-slate-50/50 flex items-center gap-2 text-sm text-slate-500">
                                                    <Clock size={14} />
                                                    <span>อัปเดตล่าสุด: {formatDate(progress.lastUpdated)}</span>
                                                </div>
                                            )}

                                            {/* Lessons List */}
                                            <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                                                {progress?.lessons.length === 0 ? (
                                                    <div className="p-6 text-center text-slate-400 text-sm">
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
                                                                        <CheckCircle2 className="text-emerald-500" size={18} />
                                                                    ) : isInProgress ? (
                                                                        <PlayCircle className="text-amber-500" size={18} />
                                                                    ) : (
                                                                        <Lock className="text-slate-300" size={16} />
                                                                    )}
                                                                </div>
                                                                <span className={`flex-1 text-sm truncate ${isCompleted ? 'text-slate-700' : isInProgress ? 'text-slate-600' : 'text-slate-400'}`}>
                                                                    {lesson.title}
                                                                </span>
                                                                {isCompleted && (
                                                                    <span className="text-xs text-emerald-600 font-medium">✓</span>
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
                <div className="mt-10 text-center text-slate-400 text-xs pb-8">
                    <p>📊 ข้อมูลจาก KruHeem Math School</p>
                    <p className="mt-1">อัปเดตแบบ Real-time เมื่อนักเรียนเข้าเรียน</p>
                </div>
            </main>
        </div>
    );
}
