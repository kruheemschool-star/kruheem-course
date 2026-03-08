"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, onSnapshot, QuerySnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Settings, ArrowLeft, Star, Copy, Gift, X, CheckCircle, BookOpen, BarChart3 } from "lucide-react";
import ReviewForm from "@/app/reviews/ReviewForm";

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


interface UserCoupon {
    code: string;
    discountAmount: number;
    isUsed: boolean;
    courseId?: string;
    source: string;
}

export default function MyCoursesPage() {
    const { user, userProfile, loading: authLoading } = useUserAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [progressMap, setProgressMap] = useState<Record<string, Progress>>({});
    const [lastSession, setLastSession] = useState<any>(null); // ✅ Smart Resume State
    const [loading, setLoading] = useState(true);
    const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
    const [reviewedCourseIds, setReviewedCourseIds] = useState<Set<string>>(new Set());
    const [reviewModal, setReviewModal] = useState<{ courseId: string; courseName: string } | null>(null);



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

    // Fetch user coupons & reviewed courses
    useEffect(() => {
        if (!user) return;
        const fetchCouponsAndReviews = async () => {
            try {
                // Fetch coupons
                const couponQ = query(collection(db, "coupons"), where("userId", "==", user.uid), where("source", "==", "review_reward"));
                const couponSnap = await getDocs(couponQ);
                const coupons = couponSnap.docs.map(d => d.data() as UserCoupon);
                setUserCoupons(coupons);

                // Fetch reviewed course IDs
                const reviewQ = query(collection(db, "reviews"), where("userId", "==", user.uid));
                const reviewSnap = await getDocs(reviewQ);
                const ids = new Set(reviewSnap.docs.map(d => d.data().courseId).filter(Boolean) as string[]);
                setReviewedCourseIds(ids);
            } catch (err) {
                console.error("Error fetching coupons/reviews:", err);
            }
        };
        fetchCouponsAndReviews();
    }, [user?.uid]);

    // Helper State for Progress Calculation
    const [rawProgressData, setRawProgressData] = useState<any[]>([]);
    const videoCountCacheRef = useRef<Record<string, { videoIds: string[], total: number }>>({});
    const cachedCourseIdsRef = useRef<string>('');

    // Effect to fetch video counts ONLY when courses change (not on every progress update)
    useEffect(() => {
        if (courses.length === 0) return;
        const courseIds = courses.map(c => c.id).sort().join(',');
        if (courseIds === cachedCourseIdsRef.current) return; // Already fetched for these courses

        const fetchVideoCounts = async () => {
            const videoCountMap: Record<string, { videoIds: string[], total: number }> = {};
            await Promise.all(courses.map(async (course) => {
                if (course.isAdminView) return;
                const lessonsSnap = await getDocs(collection(db, "courses", course.id, "lessons"));
                const videoLessons = lessonsSnap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter((l: any) => l.type === 'video' && !l.isHidden);
                videoCountMap[course.id] = { videoIds: videoLessons.map(l => l.id), total: videoLessons.length };
            }));
            videoCountCacheRef.current = videoCountMap;
            cachedCourseIdsRef.current = courseIds;
        };

        fetchVideoCounts();
    }, [courses]);

    // Effect to calculate progress map (runs when courses, progress, or cache updates)
    useEffect(() => {
        if (courses.length === 0 || Object.keys(videoCountCacheRef.current).length === 0) return;

        const pMap: Record<string, Progress> = {};
        const cache = videoCountCacheRef.current;

        courses.forEach(c => {
            const courseVideoData = cache[c.id] || { videoIds: [], total: 0 };
            pMap[c.id] = { completed: 0, total: courseVideoData.total, percent: 0 };
        });

        rawProgressData.forEach(data => {
            const cId = data.id;
            const completedIds: string[] = data.completed || [];
            const courseVideoData = cache[cId] || { videoIds: [], total: 0 };
            const completedVideoCount = completedIds.filter(id => courseVideoData.videoIds.includes(id)).length;
            const total = courseVideoData.total;
            let percent = 0;
            if (total > 0) percent = Math.round((completedVideoCount / total) * 100);
            pMap[cId] = { completed: completedVideoCount, total, percent: percent > 100 ? 100 : percent };
        });

        setProgressMap(pMap);
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

                {/* Back Button */}
                <div className="mb-4">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors group">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        กลับหน้าแรก
                    </Link>
                </div>

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

                {/* 🎫 Coupon Section — show ALL coupons (unused + used history) */}
                {userCoupons.length > 0 && (
                    <CouponBanner coupons={userCoupons} />
                )}

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

                <CourseList
                    courses={courses}
                    progressMap={progressMap}
                    reviewedCourseIds={reviewedCourseIds}
                    onReview={(courseId, courseName) => setReviewModal({ courseId, courseName })}
                />
            </main>
            <Footer />

            {/* Review Modal */}
            {reviewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setReviewModal(null)}>
                    <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setReviewModal(null)}
                            className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white shadow-sm transition"
                        >
                            <X size={18} />
                        </button>
                        <ReviewForm
                            courseId={reviewModal.courseId}
                            courseName={reviewModal.courseName}
                            onReviewSubmitted={() => {
                                // Refresh coupons and reviews
                                if (user) {
                                    const fetchUpdated = async () => {
                                        const couponQ = query(collection(db, "coupons"), where("userId", "==", user.uid), where("source", "==", "review_reward"));
                                        const couponSnap = await getDocs(couponQ);
                                        setUserCoupons(couponSnap.docs.map(d => d.data() as UserCoupon));

                                        const reviewQ = query(collection(db, "reviews"), where("userId", "==", user.uid));
                                        const reviewSnap = await getDocs(reviewQ);
                                        setReviewedCourseIds(new Set(reviewSnap.docs.map(d => d.data().courseId).filter(Boolean) as string[]));
                                    };
                                    fetchUpdated();
                                }
                            }}
                        />
                    </div>
                </div>
            )}
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

            {/* Side Action Cards */}
            {user && (
                <div className="flex flex-row lg:flex-col gap-3 lg:w-56 shrink-0">
                    {/* Parent Dashboard */}
                    <Link
                        href={`/parent-dashboard/${user.uid}`}
                        className="group flex-1 relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-br from-violet-400 via-indigo-400 to-blue-500 shadow-sm hover:shadow-lg hover:shadow-indigo-200/40 dark:hover:shadow-indigo-900/30 transition-all duration-300 hover:-translate-y-0.5"
                    >
                        <div className="h-full bg-white dark:bg-slate-900 rounded-[calc(1rem-1px)] px-5 py-4 flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                <BarChart3 size={18} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                                    ติดตามผลการเรียน
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 leading-tight">
                                    สำหรับผู้ปกครอง
                                </p>
                            </div>
                        </div>
                    </Link>

                    {/* User Guide */}
                    <Link
                        href="/guide"
                        className="group flex-1 relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-br from-teal-400 via-emerald-400 to-cyan-500 shadow-sm hover:shadow-lg hover:shadow-teal-200/40 dark:hover:shadow-teal-900/30 transition-all duration-300 hover:-translate-y-0.5"
                    >
                        <div className="h-full bg-white dark:bg-slate-900 rounded-[calc(1rem-1px)] px-5 py-4 flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                <BookOpen size={18} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors leading-tight">
                                    คู่มือใช้งาน
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 leading-tight">
                                    วิธีใช้เว็บไซต์
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>
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

function CourseList({ courses, progressMap, reviewedCourseIds, onReview }: { courses: Course[], progressMap: Record<string, Progress>, reviewedCourseIds: Set<string>, onReview: (courseId: string, courseName: string) => void }) {
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
                        <CourseCard key={course.id} course={course} progress={progressMap[course.id]} isReviewed={reviewedCourseIds.has(course.id)} onReview={onReview} />
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

function CourseCard({ course, progress, isReviewed, onReview }: { course: Course, progress?: Progress, isReviewed: boolean, onReview: (courseId: string, courseName: string) => void }) {
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

                {/* Review Button — show when approved, not expired, not yet reviewed */}
                {isApproved && !isExpired && !isReviewed && (
                    <button
                        onClick={() => onReview(course.id, course.title)}
                        className="w-full mt-2 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 font-bold text-sm rounded-xl hover:from-amber-100 hover:to-orange-100 hover:shadow-md transition-all flex items-center justify-center gap-2"
                    >
                        <Star size={14} fill="currentColor" />
                        รีวิวเพื่อรับส่วนลด 100 บาท
                    </button>
                )}

                {/* Already reviewed badge */}
                {isReviewed && isApproved && (
                    <div className="w-full mt-2 py-2 text-center text-xs font-bold text-emerald-500 dark:text-emerald-400 flex items-center justify-center gap-1">
                        <CheckCircle size={12} /> รีวิวแล้ว — ขอบคุณ!
                    </div>
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

function CouponBanner({ coupons }: { coupons: UserCoupon[] }) {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const unusedCoupons = coupons.filter(c => !c.isUsed);
    const usedCoupons = coupons.filter(c => c.isUsed);

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                    <Gift size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <h3 className="font-black text-slate-800 dark:text-slate-100">คูปองของฉัน</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">โค้ดส่วนลดจากการรีวิว ดูย้อนหลังได้เสมอ</p>
                </div>
            </div>

            {/* Unused Coupons — ready to use */}
            {unusedCoupons.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                        <CheckCircle size={12} /> พร้อมใช้ ({unusedCoupons.length})
                    </p>
                    <div className="space-y-2">
                        {unusedCoupons.map((coupon, i) => (
                            <button
                                key={`unused-${i}`}
                                onClick={() => handleCopy(coupon.code)}
                                className="w-full flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-lg shrink-0">🎫</span>
                                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 tracking-wider truncate">{coupon.code}</span>
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full shrink-0">ลด {coupon.discountAmount} บาท</span>
                                </div>
                                <div className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full transition-all shrink-0 ${copiedCode === coupon.code ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600'}`}>
                                    {copiedCode === coupon.code ? (
                                        <><CheckCircle size={12} /> คัดลอกแล้ว</>
                                    ) : (
                                        <><Copy size={12} /> คัดลอก</>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Used Coupons — history */}
            {usedCoupons.length > 0 && (
                <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">ใช้แล้ว ({usedCoupons.length})</p>
                    <div className="space-y-2">
                        {usedCoupons.map((coupon, i) => (
                            <div
                                key={`used-${i}`}
                                className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 opacity-60"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-lg shrink-0 grayscale">🎫</span>
                                    <span className="font-mono font-bold text-slate-400 dark:text-slate-500 tracking-wider line-through truncate">{coupon.code}</span>
                                    <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full shrink-0">ลด {coupon.discountAmount} บาท</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full shrink-0">ใช้แล้ว</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}