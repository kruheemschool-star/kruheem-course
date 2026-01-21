"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
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
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [completedLessons, setCompletedLessons] = useState<string[]>([]);
    const [lastUpdated, setLastUpdated] = useState<any>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Fetch user and enrolled courses
    useEffect(() => {
        if (!uid) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                console.log("[Parent Dashboard] Starting fetch for uid:", uid);

                // 1. Fetch user profile
                const userDoc = await getDoc(doc(db, "users", uid));
                console.log("[Parent Dashboard] User doc exists:", userDoc.exists());
                if (userDoc.exists()) {
                    setUserProfile(userDoc.data() as UserProfile);
                }

                // 2. Alternative approach: Fetch progress documents to find which courses user has progress in
                // This works because users/{uid}/progress/* is more likely readable
                console.log("[Parent Dashboard] Fetching progress documents...");
                const progressSnap = await getDocs(collection(db, "users", uid, "progress"));
                console.log("[Parent Dashboard] Progress docs count:", progressSnap.docs.length);

                const progressCourseIds = progressSnap.docs.map(d => d.id);
                console.log("[Parent Dashboard] Courses with progress:", progressCourseIds);

                // 3. Fetch ALL courses and filter to those with progress (or show all if no progress)
                const coursesSnap = await getDocs(collection(db, "courses"));
                console.log("[Parent Dashboard] Total courses:", coursesSnap.docs.length);

                let filteredCourses: Course[];
                if (progressCourseIds.length > 0) {
                    filteredCourses = coursesSnap.docs
                        .filter(d => progressCourseIds.includes(d.id))
                        .map(d => ({ id: d.id, ...d.data() } as Course));
                } else {
                    // If no progress yet, show first few courses as options
                    filteredCourses = coursesSnap.docs
                        .slice(0, 5)
                        .map(d => ({ id: d.id, ...d.data() } as Course));
                }

                console.log("[Parent Dashboard] Filtered courses:", filteredCourses.map(c => c.title));
                setCourses(filteredCourses);

                // Auto-select first course
                if (filteredCourses.length > 0) {
                    setSelectedCourseId(filteredCourses[0].id);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [uid]);

    // Fetch lessons and progress when course changes
    useEffect(() => {
        if (!selectedCourseId || !uid) return;

        const fetchCourseData = async () => {
            try {
                // Fetch lessons
                const lessonsSnap = await getDocs(collection(db, "courses", selectedCourseId, "lessons"));
                const lessonList = lessonsSnap.docs
                    .map(d => ({ id: d.id, ...d.data() } as Lesson))
                    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
                setLessons(lessonList);

                // Fetch progress
                const progressDoc = await getDoc(doc(db, "users", uid, "progress", selectedCourseId));
                if (progressDoc.exists()) {
                    const data = progressDoc.data();
                    setCompletedLessons(data.completed || []);
                    setLastUpdated(data.lastUpdated);
                } else {
                    setCompletedLessons([]);
                    setLastUpdated(null);
                }
            } catch (error) {
                console.error("Error fetching course data:", error);
            }
        };

        fetchCourseData();
    }, [selectedCourseId, uid]);

    // Calculate stats
    const videoLessons = useMemo(() => {
        return lessons.filter(l => l.type === 'video' && !l.isHidden);
    }, [lessons]);

    const completedVideos = useMemo(() => {
        return completedLessons.filter(id => videoLessons.some(l => l.id === id));
    }, [completedLessons, videoLessons]);

    const progressPercent = useMemo(() => {
        if (videoLessons.length === 0) return 0;
        return Math.round((completedVideos.length / videoLessons.length) * 100);
    }, [completedVideos, videoLessons]);

    const selectedCourse = courses.find(c => c.id === selectedCourseId);

    // Get last watched lesson
    const lastWatchedLesson = useMemo(() => {
        if (completedVideos.length === 0) return null;
        const lastId = completedVideos[completedVideos.length - 1];
        return videoLessons.find(l => l.id === lastId);
    }, [completedVideos, videoLessons]);

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
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 overflow-hidden border-4 border-white shadow-lg">
                            {userProfile.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium mb-1">นักเรียน</p>
                            <h2 className="text-2xl font-black text-slate-800">{userProfile.displayName || "ไม่ระบุชื่อ"}</h2>
                            {userProfile.caption && (
                                <p className="text-slate-500 italic text-sm mt-1">"{userProfile.caption}"</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Course Selector */}
                {courses.length > 0 && (
                    <div className="mb-6 relative">
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between hover:border-slate-200 transition"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                                    <BookOpen className="text-indigo-600" size={24} />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs text-slate-400 font-medium">คอร์สที่เลือก</p>
                                    <p className="text-lg font-bold text-slate-800">{selectedCourse?.title || "เลือกคอร์ส"}</p>
                                </div>
                            </div>
                            <ChevronDown className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {dropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                                {courses.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => {
                                            setSelectedCourseId(c.id);
                                            setDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition flex items-center gap-3 ${c.id === selectedCourseId ? 'bg-indigo-50' : ''}`}
                                    >
                                        <BookOpen size={18} className="text-slate-400" />
                                        <span className="font-medium text-slate-700">{c.title}</span>
                                        {c.id === selectedCourseId && <span className="ml-auto text-indigo-600">✓</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Hero - Progress Circle */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 mb-6 text-center">
                    <div className="relative w-48 h-48 mx-auto mb-6">
                        {/* Background circle */}
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle
                                cx="50"
                                cy="50"
                                r="42"
                                fill="none"
                                stroke="#E2E8F0"
                                strokeWidth="8"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="42"
                                fill="none"
                                stroke={progressPercent === 100 ? "#F59E0B" : "#6366F1"}
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={`${progressPercent * 2.64} 264`}
                                className="transition-all duration-1000"
                            />
                        </svg>
                        {/* Percentage text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-6xl font-black ${progressPercent === 100 ? 'text-amber-500' : 'text-indigo-600'}`}>
                                {progressPercent}
                            </span>
                            <span className="text-xl font-bold text-slate-400">%</span>
                        </div>
                    </div>

                    <p className="text-xl font-bold text-slate-800 mb-2">
                        เรียนจบไปแล้ว{' '}
                        <span className="text-indigo-600">{completedVideos.length}</span>
                        {' '}จาก{' '}
                        <span className="text-slate-600">{videoLessons.length}</span>
                        {' '}คลิป
                    </p>

                    {progressPercent === 100 && (
                        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full font-bold mt-2">
                            <span className="text-xl">🏆</span>
                            <span>เรียนจบครบ 100% แล้ว!</span>
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                {lastWatchedLesson && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 shadow-sm border border-amber-100 mb-6">
                        <div className="flex items-center gap-2 text-amber-700 mb-3">
                            <Clock size={18} />
                            <span className="font-bold text-sm">กิจกรรมล่าสุด</span>
                        </div>
                        <p className="text-xl font-bold text-slate-800 mb-1">{lastWatchedLesson.title}</p>
                        <p className="text-slate-500 text-sm">
                            อัปเดตล่าสุด: {formatDate(lastUpdated)}
                        </p>
                    </div>
                )}

                {/* Chapter List */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            📚 สารบัญบทเรียน
                        </h3>
                        <p className="text-slate-500 text-sm mt-1">รายการคลิปวิดีโอทั้งหมดในคอร์สนี้</p>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {videoLessons.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <p className="text-4xl mb-2">📭</p>
                                <p>ยังไม่มีบทเรียนในคอร์สนี้</p>
                            </div>
                        ) : (
                            videoLessons.map((lesson, index) => {
                                const isCompleted = completedLessons.includes(lesson.id);
                                const isInProgress = !isCompleted && index <= completedVideos.length;

                                return (
                                    <div
                                        key={lesson.id}
                                        className="flex items-center gap-4 p-4 hover:bg-slate-50 transition"
                                    >
                                        <div className="flex-shrink-0">
                                            {isCompleted ? (
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                                    <CheckCircle2 className="text-emerald-600" size={24} />
                                                </div>
                                            ) : isInProgress ? (
                                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                                    <PlayCircle className="text-amber-600" size={24} />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <Lock className="text-slate-400" size={20} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium truncate ${isCompleted ? 'text-slate-800' : isInProgress ? 'text-slate-700' : 'text-slate-400'}`}>
                                                {lesson.title}
                                            </p>
                                        </div>

                                        <div className="flex-shrink-0">
                                            {isCompleted ? (
                                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                                    ดูจบแล้ว ✅
                                                </span>
                                            ) : isInProgress ? (
                                                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                                                    รอดู
                                                </span>
                                            ) : (
                                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                                                    ยังไม่ถึง
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-slate-400 text-sm pb-8">
                    <p>📊 ข้อมูลจาก KruHeem Math School</p>
                    <p className="mt-1">อัปเดตแบบ Real-time เมื่อนักเรียนเข้าเรียน</p>
                </div>
            </main>
        </div>
    );
}
