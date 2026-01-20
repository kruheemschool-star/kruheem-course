"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

// Types
interface Course {
    id: string;
    title: string;
    image?: string;
    category?: string;
    status?: string; // from enrollment
    expiryDate?: any;
    totalLessons?: number;
}

interface Progress {
    completed: number;
    total: number;
    percent: number;
}

export default function MyCoursesV2Page() {
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

                console.log("🚀 V2: Starting Fetch Once...");

                // 1. Parallel Fetch: Enrollments, All Courses, User Progress Collection
                const [enrollSnap, coursesSnap, progressSnap] = await Promise.all([
                    getDocs(query(collection(db, "enrollments"), where("userId", "==", uid))),
                    getDocs(collection(db, "courses")),
                    getDocs(collection(db, "users", uid, "progress"))
                ]);

                console.log("✅ V2: Fetch Complete.");

                // 2. Process Enrollments
                const enrollments = enrollSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
                const enrolledCourseIds = new Set(enrollments.map(e => e.courseId));

                // 3. Process Courses (Filter by Enrollment)
                const allCoursesData = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
                const myCourses = allCoursesData
                    .filter(c => enrolledCourseIds.has(c.id))
                    .map(c => {
                        const enroll = enrollments.find(e => e.courseId === c.id);
                        return { ...c, status: enroll?.status, expiryDate: enroll?.expiryDate };
                    });

                setCourses(myCourses);

                // 4. Process Progress (Map by Course ID)
                const pMap: Record<string, Progress> = {};
                progressSnap.docs.forEach(doc => {
                    const data = doc.data();
                    const courseId = doc.id;
                    const completedCount = data.completed?.length || 0;

                    // Best effort total: use course.totalLessons or fallback
                    const course = allCoursesData.find(c => c.id === courseId);
                    const total = course?.totalLessons || 20; // Default fallback to avoid 0 division
                    const percent = Math.round((completedCount / total) * 100);

                    pMap[courseId] = {
                        completed: completedCount,
                        total,
                        percent: percent > 100 ? 100 : percent
                    };
                });
                setProgressMap(pMap);

            } catch (err) {
                console.error("❌ V2 Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

    }, [user, authLoading]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans pb-20">
                <Navbar />
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-slate-500">Loading V2 Sandbox...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            <Navbar />
            <main className="container mx-auto px-4 py-8 pt-24 max-w-5xl">

                {/* Header Section */}
                <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-3xl font-black text-slate-800">My Courses <span className="text-indigo-600 text-lg bg-indigo-50 px-2 py-1 rounded-lg ml-2">V2 Sandbox</span></h1>
                    <div className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full font-bold border border-green-200">
                        ✅ Fetch Once Mode
                    </div>
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
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top-4 duration-500">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center text-4xl shadow-inner">
                {profile.avatar?.startsWith('http') ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={profile.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                    <span className="select-none">{profile.displayName?.[0] || 'U'}</span>
                )}
            </div>
            <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold text-slate-800 mb-1">{profile.displayName || 'Student'}</h2>
                <p className="text-slate-500">ยินดีต้อนรับสู่หน้าระบบใหม่</p>
                <div className="mt-2 flex gap-2 justify-center md:justify-start">
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md">ID: {profile.uid ? profile.uid.substring(0, 8) : '...'}</span>
                </div>
            </div>
        </div>
    )
}

function CourseList({ courses, progressMap }: { courses: Course[], progressMap: Record<string, Progress> }) {
    if (courses.length === 0) return (
        <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 text-lg">ไม่พบคอร์สเรียนที่ลงทะเบียน</p>
            <Link href="/" className="text-indigo-600 font-bold hover:underline mt-2 inline-block">ดูคอร์สทั้งหมด</Link>
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
        <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group">
            <div className="aspect-video bg-slate-100 rounded-2xl mb-4 overflow-hidden relative">
                {course.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">📘</div>
                )}
                {course.status !== 'approved' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-bold px-2 py-1 bg-black/50 rounded-lg backdrop-blur-sm">
                            {course.status}
                        </span>
                    </div>
                )}
            </div>

            <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-2 h-14">{course.title}</h3>

            {progress && (
                <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                        <span>ความคืบหน้า</span>
                        <span className="text-indigo-600">{progress.percent}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progress.percent}%` }}
                        ></div>
                    </div>
                    <p className="text-[10px] text-slate-400 text-right mt-1">{progress.completed}/{progress.total} บทเรียน</p>
                </div>
            )}

            <div className="mt-auto">
                <Link
                    href={`/learn/${course.id}`}
                    className="block w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-center transition shadow-md shadow-indigo-200"
                >
                    {progress && progress.percent > 0 ? 'เรียนต่อ' : 'เริ่มเรียน'}
                </Link>
            </div>
        </div>
    )
}
