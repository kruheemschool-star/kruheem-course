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

                // 4. Fetch video lessons for each course (in parallel)
                const videoCountMap: Record<string, { videoIds: string[], total: number }> = {};

                await Promise.all(myCourses.map(async (course) => {
                    const lessonsSnap = await getDocs(collection(db, "courses", course.id, "lessons"));
                    const videoLessons = lessonsSnap.docs
                        .map(d => ({ id: d.id, ...d.data() }))
                        .filter((l: any) => l.type === 'video' && !l.isHidden);

                    videoCountMap[course.id] = {
                        videoIds: videoLessons.map(l => l.id),
                        total: videoLessons.length
                    };
                }));

                // 5. Process Progress (Map by Course ID)
                const pMap: Record<string, Progress> = {};

                // Initialize defaults for ALL enrolled courses
                myCourses.forEach(c => {
                    const courseVideoData = videoCountMap[c.id] || { videoIds: [], total: 0 };
                    pMap[c.id] = {
                        completed: 0,
                        total: courseVideoData.total,
                        percent: 0
                    };
                });

                // Overwrite with actual progress from Firestore
                progressSnap.docs.forEach(doc => {
                    const data = doc.data();
                    const courseId = doc.id;
                    const completedIds: string[] = data.completed || [];

                    const courseVideoData = videoCountMap[courseId] || { videoIds: [], total: 0 };

                    // Count only completed items that are videos
                    const completedVideoCount = completedIds.filter(id =>
                        courseVideoData.videoIds.includes(id)
                    ).length;

                    const total = courseVideoData.total;

                    let percent = 0;
                    if (total > 0) {
                        percent = Math.round((completedVideoCount / total) * 100);
                    }

                    pMap[courseId] = {
                        completed: completedVideoCount,
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
                            <img src={profile.avatar || profile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
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