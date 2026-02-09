"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, onSnapshot, QuerySnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Settings } from "lucide-react"; // Re-import Settings for Edit Profile button

// Helpers
const formatDate = (date: any) => {
    if (!date) return "-";
    try {
        const d = date.toDate ? date.toDate() : new Date(date.seconds ? date.seconds * 1000 : date);
        if (isNaN(d.getTime())) return "-";
        return d.toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: '2-digit' });
    } catch (e) {
        return "-";
    }
};

const getProgressColor = (percent: number) => {
    if (percent === 100) return "bg-gradient-to-r from-yellow-400 to-amber-500";
    if (percent >= 80) return "bg-gradient-to-r from-emerald-400 to-green-500";
    if (percent >= 20) return "bg-gradient-to-r from-sky-400 to-indigo-500";
    if (percent > 0) return "bg-gradient-to-r from-rose-500 to-orange-500";
    return "bg-slate-300 dark:bg-slate-600"; // 0%
};

const getDaysRemaining = (expiryDate: any) => {
    if (!expiryDate) return null;
    try {
        const now = new Date();
        const expiry = expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate.seconds ? expiryDate.seconds * 1000 : expiryDate);
        if (isNaN(expiry.getTime())) return null;

        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    } catch (e) {
        return null;
    }
};

// Types
interface Course {
    id: string;
    title: string;
    image?: string;
    category?: string;
    status?: string; // from enrollment
    expiryDate?: any;
    startedAt?: any; // Added
    totalLessons?: number;
    isAdminView?: boolean;
}

interface Progress {
    completed: number;
    total: number;
    percent: number;
}

// Module-level guard to prevent multiple fetches during remounts


export default function MyCoursesPage() {
    const { user, userProfile, loading: authLoading } = useUserAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [progressMap, setProgressMap] = useState<Record<string, Progress>>({});
    const [lastSession, setLastSession] = useState<any>(null); // ✅ Smart Resume State
    const [loading, setLoading] = useState(true);



    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }

        let unsubscribeEnrollments: () => void;
        let unsubscribeProgress: () => void;
        let unsubscribeStates: () => void;

        const setupListeners = async () => {
            setLoading(true);
            try {
                // 1. Fetch Static Courses Data (Catalog)
                // We fetch this once because course metadata rarely changes in real-time context
                const coursesSnap = await getDocs(collection(db, "courses"));
                const allCoursesData = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course));

                // 2. Setup Real-time Listeners
                const uid = user.uid;

                // --- Listener A: Enrollments ---
                const enrollQuery = query(collection(db, "enrollments"), where("userId", "==", uid));
                unsubscribeEnrollments = onSnapshot(enrollQuery, (enrollSnap: QuerySnapshot<DocumentData>) => {
                    const enrollments = enrollSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as any));
                    const enrolledCourseIds = new Set(enrollments.map(e => e.courseId));
                    const isAdmin = user?.email === "kruheemschool@gmail.com";

                    let myCourses: Course[];

                    if (isAdmin) {
                        myCourses = allCoursesData.map(c => {
                            const enroll = enrollments.find(e => e.courseId === c.id);
                            return {
                                ...c,
                                status: enroll?.status || 'approved',
                                expiryDate: enroll?.expiryDate,
                                startedAt: enroll?.createdAt,
                                isAdminView: true
                            };
                        });
                    } else {
                        myCourses = allCoursesData
                            .filter(c => enrolledCourseIds.has(c.id))
                            .map(c => {
                                // Fix: Handle duplicate enrollments by finding the *best* one
                                const courseEnrollments = enrollments.filter(e => e.courseId === c.id);

                                courseEnrollments.sort((a, b) => {
                                    // 1. Priority to Approved
                                    if (a.status === 'approved' && b.status !== 'approved') return -1;
                                    if (b.status === 'approved' && a.status !== 'approved') return 1;
                                    // 2. Priority to Latest Date
                                    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                                });

                                const enroll = courseEnrollments[0];
                                let expiry = enroll?.expiryDate;
                                let start = enroll?.createdAt;

                                // Auto-generate expiry for legacy/manual enrollments if missing
                                if (start && !expiry) {
                                    const startDate = start.toDate ? start.toDate() : new Date(start.seconds * 1000);
                                    const expiryDate = new Date(startDate);
                                    expiryDate.setFullYear(expiryDate.getFullYear() + 5);
                                    expiry = expiryDate;
                                }
                                return { ...c, status: enroll?.status, expiryDate: expiry, startedAt: start };
                            });
                    }

                    setCourses(myCourses);

                    // Trigger video count fetch & progress calculation only when courses change
                    // Optimization: We could wrap this in a separate effect or function, but keep it here for simplicity of access to 'myCourses'
                    // The new useEffect below will handle this based on 'courses' state.
                    setLoading(false);
                });

                // --- Listener B: Progress ---
                unsubscribeProgress = onSnapshot(collection(db, "users", uid, "progress"), (snap: QuerySnapshot<DocumentData>) => {
                    // We need the latest 'courses' to calculate percentages correctly. 
                    // Since 'courses' state might update, we'll store raw progress data and effect will combine it, 
                    // OR we just trigger a recalculation.
                    // For simplicity in this structure, let's just save the raw docs and let a separate function handle the mapping if we want to be pure.
                    // HOWEVER, correctly linking 'progress' to 'courses' requires knowing video totals.
                    // Let's rely on the helper function `updateProgressMap` to re-run.
                    // A bit tricky with closures. 
                    // Better approach: Store raw progress in state, and have a useEffect([courses, rawProgress]) calculate the final map.
                    // But to minimize rewrite, let's just put the data in state.
                    const rawProgress = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    setRawProgressData(rawProgress);
                });

                // --- Listener C: Last Session (Resume) ---
                unsubscribeStates = onSnapshot(collection(db, "users", uid, "course_states"), (snap: QuerySnapshot<DocumentData>) => {
                    const states = snap.docs.map((d: any) => ({ courseId: d.id, ...d.data() } as any));
                    states.sort((a: any, b: any) => (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0));
                    if (states.length > 0) setLastSession(states[0]);
                });

            } catch (err) {
                console.error("Setup listeners error:", err);
                setLoading(false);
            }
        };

        setupListeners();

        return () => {
            if (unsubscribeEnrollments) unsubscribeEnrollments();
            if (unsubscribeProgress) unsubscribeProgress();
            if (unsubscribeStates) unsubscribeStates();
        };

    }, [user?.uid, authLoading]);

    // Helper State for Progress Calculation
    const [rawProgressData, setRawProgressData] = useState<any[]>([]);

    // Effect to Combine Courses + Raw Progress -> Progress Map
    useEffect(() => {
        const calculateProgress = async () => {
            if (courses.length === 0) return;

            // We need video totals. If we didn't fetch them yet, we need to.
            // This part was inside the main fetch. Let's re-implement it carefully.
            // To avoid re-fetching video counts every render, we should cache them. 
            // BUT for now, let's keep it robust.

            const pMap: Record<string, Progress> = {};

            // Optimize: Fetch video counts only for new courses?
            // For now, parallel fetch all (standard)
            const videoCountMap: Record<string, { videoIds: string[], total: number }> = {};

            await Promise.all(courses.map(async (course) => {
                // Optimization: Maybe use a cache variable outside component? Or assume static?
                // `courses` collection doesn't change often.
                // Let's fetch.
                if (course.isAdminView) return; // Admin view might not need progress? Or does it?

                // NOTE: This causes N reads every time courses update. 
                // Given the constraints, let's assume it's acceptable or we should optimize if lists are long.
                // For "My Courses", usually < 20 courses.

                // Use a simple local cache if possible or just fetch.
                const lessonsSnap = await getDocs(collection(db, "courses", course.id, "lessons"));
                const videoLessons = lessonsSnap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter((l: any) => l.type === 'video' && !l.isHidden);
                videoCountMap[course.id] = { videoIds: videoLessons.map(l => l.id), total: videoLessons.length };
            }));

            courses.forEach(c => {
                const courseVideoData = videoCountMap[c.id] || { videoIds: [], total: 0 };
                pMap[c.id] = { completed: 0, total: courseVideoData.total, percent: 0 };
            });

            rawProgressData.forEach(data => {
                const cId = data.id;
                const completedIds: string[] = data.completed || [];
                const courseVideoData = videoCountMap[cId] || { videoIds: [], total: 0 };
                const completedVideoCount = completedIds.filter(id => courseVideoData.videoIds.includes(id)).length;
                const total = courseVideoData.total;
                let percent = 0;
                if (total > 0) percent = Math.round((completedVideoCount / total) * 100);
                pMap[cId] = { completed: completedVideoCount, total, percent: percent > 100 ? 100 : percent };
            });

            setProgressMap(pMap);
        };

        calculateProgress();
    }, [courses, rawProgressData]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-950 font-sans pb-20">
                <Navbar />
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-slate-500">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans pb-20 transition-colors">
            <Navbar />
            <main className="container mx-auto px-4 py-8 pt-24 max-w-5xl">

                {/* Header Section */}
                <div className="mb-8 flex items-center gap-4">
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100">คอร์สเรียนของฉัน</h1>
                    {user?.email === "kruheemschool@gmail.com" && (
                        <span className="bg-rose-100 text-rose-600 text-xs font-bold px-3 py-1 rounded-full border border-rose-200 animate-pulse">
                            👁️ Admin View (See All)
                        </span>
                    )}
                </div>

                <ProfileHeader profile={userProfile || user} />

                <div className="h-8"></div>

                <div className="h-8"></div>

                {/* ✅ Resume Learning Compass (Visual Card) */}
                {lastSession && (
                    <div className="mb-12 w-full animate-in slide-in-from-top-4 duration-700 delay-200">
                        {(() => {
                            const resumeCourse = courses.find(c => c.id === lastSession.courseId);
                            // If course not found in list yet (loading or stale), fallback gracefully or just show icon
                            // But usually it should be there.

                            return (
                                <Link href={`/learn/${lastSession.courseId}?lessonId=${lastSession.lessonId}&t=${lastSession.timestamp}`}>
                                    <div className="group relative w-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-lg hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-500 overflow-hidden cursor-pointer">

                                        {/* Background Decoration */}
                                        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>

                                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">

                                            {/* Course Cover Image (Hero) */}
                                            <div className="w-full md:w-64 aspect-video rounded-2xl overflow-hidden shadow-md relative group-hover:shadow-lg transition-all duration-500 shrink-0 border border-slate-100 dark:border-slate-700">
                                                {resumeCourse?.image ? (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img src={resumeCourse.image} alt={resumeCourse.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-5xl">📚</div>
                                                )}

                                                {/* Play Button Overlay */}
                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[1px]">
                                                    <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md transform scale-50 group-hover:scale-100 transition-all duration-300">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-indigo-600 pl-1"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Info Content */}
                                            <div className="flex-1 min-w-0 text-center md:text-left space-y-3">
                                                <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider">
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                                        </span>
                                                        Resume History
                                                    </span>
                                                    <span className="text-slate-400 text-xs font-bold">•</span>
                                                    <span className="text-slate-500 dark:text-slate-400 text-xs font-bold font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                        {Math.floor(lastSession.timestamp / 60)}:{String(lastSession.timestamp % 60).padStart(2, '0')}
                                                    </span>
                                                </div>

                                                <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 leading-relaxed group-hover:text-indigo-600 transition-colors line-clamp-2">
                                                    {lastSession.lessonTitle}
                                                </h2>

                                                <div className="flex items-center justify-center md:justify-start gap-2 text-slate-500 dark:text-slate-400 font-medium text-sm">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></span>
                                                    <span className="line-clamp-1">{lastSession.courseTitle || resumeCourse?.title}</span>
                                                </div>
                                            </div>

                                            {/* CTA Arrow */}
                                            <div className="hidden md:flex items-center justify-center pr-4">
                                                <div className="w-16 h-16 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:border-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-indigo-200">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </Link>
                            );
                        })()}
                    </div>
                )}

                <CourseList courses={courses} progressMap={progressMap} />
            </main>
            <Footer />
        </div>
    );
}

// --- Sub-components (Pure UI) ---

function ProfileHeader({ profile }: { profile: any }) {
    const { user } = useUserAuth();
    if (!profile) return null;
    return (
        <div className="flex flex-col lg:flex-row gap-4 animate-in slide-in-from-top-4 duration-500">
            {/* Student Profile Card */}
            <div className="flex-1 bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center text-4xl shadow-inner overflow-hidden">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center text-4xl shadow-inner overflow-hidden">
                        {profile.avatar || profile.photoURL ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={profile.avatar || profile.photoURL} alt={profile.name || "User Avatar"} className="w-full h-full object-cover" />
                        ) : (
                            <span className="select-none">{profile.displayName?.[0] || 'U'}</span>
                        )}
                    </div>
                </div>
                <div className="text-center md:text-left">
                    <div className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold mb-2">
                        🎓 นักเรียนของ KruHeem
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">{profile.displayName || 'นักเรียน'}</h2>
                    {profile.caption ? (
                        <p className="text-slate-500 dark:text-slate-400 italic text-sm font-medium">"{profile.caption}"</p>
                    ) : (
                        <p className="text-slate-500 dark:text-slate-400">พร้อมที่จะเรียนรู้คณิตศาสตร์ให้สนุกหรือยัง?</p>
                    )}

                    {/* Edit Profile Link (Optional restoration) */}
                    <Link href="/profile" className="mt-3 text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 justify-center md:justify-start transition">
                        <Settings size={14} /> แก้ไขข้อมูลส่วนตัว
                    </Link>
                </div>
            </div>

            {/* Parent Dashboard Link Card */}
            {user && (
                <Link
                    href={`/parent-dashboard/${user.uid}`}
                    className="lg:w-72 bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all group flex flex-col items-center justify-center text-center gap-4"
                >
                    {/* Minimal Icon */}
                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                        📊
                    </div>

                    {/* Minimal Text */}
                    <p className="text-base font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        ติดตามผลการเรียน
                    </p>
                </Link>
            )}
        </div>
    )
}

// --- Sorting & Categorization Helpers ---

const getCourseCategory = (title: string): 'primary' | 'junior' | 'senior' | 'other' => {
    const t = title.toLowerCase();
    if (t.match(/ป\.|ประถม|gifted|สอบเข้า ม\.1/)) return 'primary';
    if (t.match(/ม\.1|ม\.2|ม\.3|เตรียมอุดม|mwit|สอบเข้า ม\.4/)) return 'junior';
    if (t.match(/ม\.4|ม\.5|ม\.6|a-level|tgat|tpat|cal|แคล/)) return 'senior';
    return 'other';
};

const getCourseWeight = (title: string): number => {
    const t = title.toLowerCase();
    // Primary
    if (t.includes('ป.1')) return 11;
    if (t.includes('ป.2')) return 12;
    if (t.includes('ป.3')) return 13;
    if (t.includes('ป.4')) return 14;
    if (t.includes('ป.5')) return 15;
    if (t.includes('ป.6')) return 16;
    if (t.match(/gifted|สอบเข้า ม\.1/)) return 19;

    // Junior
    if (t.includes('ม.1')) return 21;
    if (t.includes('ม.2')) return 22;
    if (t.includes('ม.3')) return 23;
    if (t.match(/เตรียมอุดม|mwit|สอบเข้า ม\.4/)) return 29;

    // Senior
    if (t.includes('ม.4')) return 41;
    if (t.includes('ม.5')) return 42;
    if (t.includes('ม.6')) return 43;
    if (t.match(/a-level|tgat|tpat|net|entrance/)) return 49;

    return 99; // Misc
};

function CourseList({ courses, progressMap }: { courses: Course[], progressMap: Record<string, Progress> }) {
    if (courses.length === 0) return (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
            <div className="text-6xl mb-4">🎒</div>
            <p className="text-lg font-medium mb-6">คุณยังไม่ได้ลงทะเบียนคอร์สเรียน</p>
            <Link href="/" className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:bg-indigo-700 transition shadow-lg">
                ดูคอร์สทั้งหมด
            </Link>
        </div>
    );

    // Group & Sort Courses
    const grouped = {
        primary: [] as Course[],
        junior: [] as Course[],
        senior: [] as Course[],
        other: [] as Course[]
    };

    courses.forEach(c => {
        const cat = getCourseCategory(c.title);
        grouped[cat].push(c);
    });

    // Sort function
    const sorter = (a: Course, b: Course) => getCourseWeight(a.title) - getCourseWeight(b.title);

    Object.values(grouped).forEach(list => list.sort(sorter));

    const renderSection = (title: string, icon: string, list: Course[], colorClass: string) => {
        if (list.length === 0) return null;
        return (
            <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className={`flex items-center gap-3 mb-6 pb-2 border-b-2 ${colorClass} border-opacity-20`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${colorClass.replace('border-', 'bg-').replace('-500', '-100')} ${colorClass.replace('border-', 'text-').replace('-500', '-600')}`}>
                        {icon}
                    </div>
                    <h2 className="text-xl font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">{title}</h2>
                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400">
                        {list.length} คอร์ส
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {list.map(course => (
                        <CourseCard key={course.id} course={course} progress={progressMap[course.id]} />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div>
            {renderSection("ระดับประถมศึกษา (Primary)", "🌱", grouped.primary, "border-emerald-500")}
            {renderSection("ระดับมัธยมต้น (Junior High)", "🌿", grouped.junior, "border-cyan-500")}
            {renderSection("ระดับมัธยมปลาย (Senior High)", "🌳", grouped.senior, "border-indigo-500")}
            {renderSection("คอร์สอื่นๆ (General)", "📚", grouped.other, "border-slate-400")}
        </div>
    );
}

function CourseCard({ course, progress }: { course: Course, progress?: Progress }) {
    const daysRemaining = getDaysRemaining(course.expiryDate);
    const isExpired = daysRemaining !== null && daysRemaining <= 0;

    // Status Logic
    const isApproved = course.status === 'approved';

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group ${isExpired ? 'opacity-75 grayscale-[0.5]' : ''}`}>
            <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4 overflow-hidden relative">
                {course.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">📘</div>
                )}

                {/* Status Overlays */}
                {!isApproved && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-bold px-2 py-1 bg-black/50 rounded-lg backdrop-blur-sm">
                            {course.status === 'pending' ? 'รอตรวจสอบ' : course.status}
                        </span>
                    </div>
                )}

                {/* Expiry Badge */}
                {isApproved && daysRemaining !== null && (
                    <div className="absolute top-2 right-2">
                        <ValidityBadge days={daysRemaining} />
                    </div>
                )}
            </div>

            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-2 line-clamp-2 h-14">{course.title}</h3>

            {/* Course Period Info */}
            {isApproved && (
                <div className="mb-3 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 py-1.5 px-3 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <span>
                        <span className="font-semibold text-slate-400">เริ่ม:</span> {formatDate(course.startedAt)}
                    </span>
                    <span>
                        <span className="font-semibold text-slate-400">หมดอายุ:</span> {formatDate(course.expiryDate)}
                    </span>
                </div>
            )}

            {progress && isApproved && (
                <div className="mb-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            เรียนไปแล้ว <span className="text-indigo-600 dark:text-indigo-400 text-sm">{progress.completed}</span> / {progress.total} คลิป
                        </span>
                        {progress.percent === 100 && (
                            <span className="text-amber-500 animate-bounce">👑</span>
                        )}
                    </div>

                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner p-[2px]">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm relative overflow-hidden group/bar ${getProgressColor(progress.percent)}`}
                            style={{ width: `${progress.percent === 0 ? 5 : progress.percent}%`, opacity: progress.percent === 0 ? 0.5 : 1 }}
                        >
                            {/* Shine Effect */}
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/30 to-transparent"></div>
                            {progress.percent > 0 && (
                                <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover/bar:animate-[shimmer_1.5s_infinite]"></div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] font-bold text-slate-400">ความคืบหน้า</span>
                        <span className={`text-xs font-black ${progress.percent === 100 ? 'text-amber-500' :
                            progress.percent >= 80 ? 'text-emerald-500' :
                                progress.percent === 0 ? 'text-slate-400' :
                                    'text-indigo-600'
                            }`}>
                            {progress.percent}%
                        </span>
                    </div>
                </div>
            )}

            <div className="mt-auto pt-2">
                {isApproved ? (
                    <Link
                        href={isExpired ? '#' : `/learn/${course.id}`}
                        onClick={(e) => isExpired && e.preventDefault()}
                        className={`block w-full py-3 font-bold rounded-xl text-center transition shadow-md ${isExpired
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-indigo-900/20'
                            }`}
                    >
                        {isExpired ? 'หมดอายุ' : (progress && progress.percent > 0 ? 'เรียนต่อ' : 'เริ่มเรียน')}
                    </Link>
                ) : (
                    <button disabled className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold rounded-xl cursor-not-allowed">
                        {course.status === 'pending' ? 'รออนุมัติ' : 'ไม่สามารถเข้าเรียนได้'}
                    </button>
                )}

            </div>
        </div>
    )
}

function ValidityBadge({ days }: { days: number }) {
    if (days <= 0) {
        return <span className="text-[10px] font-bold px-2 py-1 bg-rose-500 text-white rounded-md shadow-sm">หมดอายุ</span>;
    }
    if (days <= 7) {
        return <span className="text-[10px] font-bold px-2 py-1 bg-rose-500 text-white rounded-md shadow-sm animate-pulse">เหลือ {days} วัน</span>;
    }
    if (days <= 30) {
        return <span className="text-[10px] font-bold px-2 py-1 bg-amber-500 text-white rounded-md shadow-sm">เหลือ {days} วัน</span>;
    }
    return <span className="text-[10px] font-bold px-2 py-1 bg-emerald-500 text-white rounded-md shadow-sm">เหลือ {days} วัน</span>;
}