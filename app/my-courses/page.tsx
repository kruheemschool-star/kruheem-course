"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Settings } from "lucide-react"; // Re-import Settings for Edit Profile button

// Helpers
const formatDate = (date: any) => {
    if (!date) return "-";
    // Handle Firestore Timestamp
    const d = date.toDate ? date.toDate() : new Date(date.seconds ? date.seconds * 1000 : date);
    return d.toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: '2-digit' });
};

const getDaysRemaining = (expiryDate: any) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate.seconds ? expiryDate.seconds * 1000 : expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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

export default function MyCoursesPage() {
    const { user, userProfile, loading: authLoading } = useUserAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [progressMap, setProgressMap] = useState<Record<string, Progress>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                setLoading(true);
                const uid = user.uid;

                // 1. Parallel Fetch: Enrollments, All Courses, User Progress Collection
                const [enrollSnap, coursesSnap, progressSnap] = await Promise.all([
                    getDocs(query(collection(db, "enrollments"), where("userId", "==", uid))),
                    getDocs(collection(db, "courses")),
                    getDocs(collection(db, "users", uid, "progress"))
                ]);

                // 2. Process Enrollments
                const enrollments = enrollSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
                const enrolledCourseIds = new Set(enrollments.map(e => e.courseId));

                // 3. Process Courses (Logic: Admin vs Student)
                const allCoursesData = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
                // Fix: properties on userProfile might need specific typing, but user.email (Auth) is sufficient and safer.
                const isAdmin = user?.email === "kruheemschool@gmail.com";

                let myCourses: Course[];

                if (isAdmin) {
                    // Admin: Show ALL courses
                    myCourses = allCoursesData.map(c => {
                        const enroll = enrollments.find(e => e.courseId === c.id);
                        return {
                            ...c,
                            status: enroll?.status || 'approved', // Admin sees content as approved
                            expiryDate: enroll?.expiryDate,
                            startedAt: enroll?.createdAt, // Map enrollment date
                            isAdminView: true
                        };
                    });
                } else {
                    // Student: Show only Enrolled courses
                    myCourses = allCoursesData
                        .filter(c => enrolledCourseIds.has(c.id))
                        .map(c => {
                            const enroll = enrollments.find(e => e.courseId === c.id);

                            // Logic: Default 5 Years expiry if not present
                            let expiry = enroll?.expiryDate;
                            let start = enroll?.createdAt;

                            if (start && !expiry) {
                                // Calculate 5 years from start
                                const startDate = start.toDate ? start.toDate() : new Date(start.seconds * 1000);
                                const expiryDate = new Date(startDate);
                                expiryDate.setFullYear(expiryDate.getFullYear() + 5);
                                expiry = expiryDate;
                            }

                            return {
                                ...c,
                                status: enroll?.status,
                                expiryDate: expiry,
                                startedAt: start
                            };
                        });
                }

                setCourses(myCourses);

                // 4. Process Progress (Map by Course ID)
                const pMap: Record<string, Progress> = {};
                progressSnap.docs.forEach(doc => {
                    const data = doc.data();
                    const courseId = doc.id;
                    const completedCount = data.completed?.length || 0;

                    // Best effort total: use course.totalLessons or fallback
                    // We use 20 as a safe default if not defined, to prevent division by zero
                    // Ideally, totalLessons should be in the course document
                    const course = allCoursesData.find(c => c.id === courseId);
                    const total = course?.totalLessons || 20;
                    const percent = Math.round((completedCount / total) * 100);

                    pMap[courseId] = {
                        completed: completedCount,
                        total,
                        percent: percent > 100 ? 100 : percent
                    };
                });
                setProgressMap(pMap);

            } catch (err) {
                console.error("Error fetching my courses:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

    }, [user, authLoading]);

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

                <CourseList courses={courses} progressMap={progressMap} />
            </main>
            <Footer />
        </div>
    );
}

// --- Sub-components (Pure UI) ---

function ProfileHeader({ profile }: { profile: any }) {
    if (!profile) return null;
    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top-4 duration-500">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center text-4xl shadow-inner overflow-hidden">
                {profile.avatar?.startsWith('http') ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    <span className="select-none">{profile.displayName?.[0] || 'U'}</span>
                )}
            </div>
            <div className="text-center md:text-left">
                <div className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold mb-2">
                    🎓 นักเรียนของ KruHeem
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">{profile.displayName || 'นักเรียน'}</h2>
                <p className="text-slate-500 dark:text-slate-400">พร้อมที่จะเรียนรู้คณิตศาสตร์ให้สนุกหรือยัง?</p>

                {/* Edit Profile Link (Optional restoration) */}
                <Link href="/profile" className="mt-3 text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 justify-center md:justify-start transition">
                    <Settings size={14} /> แก้ไขข้อมูลส่วนตัว
                </Link>
            </div>
        </div>
    )
}

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

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
                <CourseCard key={course.id} course={course} progress={progressMap[course.id]} />
            ))}
        </div>
    )
}

function CourseCard({ course, progress }: { course: Course, progress?: Progress }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group">
            <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4 overflow-hidden relative">
                {course.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">📘</div>
                )}
                {course.status !== 'approved' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-bold px-2 py-1 bg-black/50 rounded-lg backdrop-blur-sm">
                            {course.status === 'pending' ? 'รอตรวจสอบ' : course.status}
                        </span>
                    </div>
                )}
            </div>

            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-2 line-clamp-2 h-14">{course.title}</h3>

            {progress && (course.status === 'approved') && (
                <div className="mb-4 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
                        <span>ความคืบหน้า</span>
                        <span className="text-indigo-600 dark:text-indigo-400">{progress.percent}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progress.percent}%` }}
                        ></div>
                    </div>
                    <p className="text-[10px] text-slate-400 text-right mt-1">{progress.completed}/{progress.total} บทเรียน</p>
                </div>
            )}

            <div className="mt-auto pt-2">
                {course.status === 'approved' ? (
                    <Link
                        href={`/learn/${course.id}`}
                        className="block w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-center transition shadow-md shadow-indigo-200 dark:shadow-indigo-900/20"
                    >
                        {progress && progress.percent > 0 ? 'เรียนต่อ' : 'เริ่มเรียน'}
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