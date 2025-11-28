"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit, collectionGroup } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useUserAuth } from "@/context/AuthContext";

// --- Icons ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M21.731 2.269a2.625 2.625 0 113.71 3.71L9.6 18.833a1.125 1.125 0 01-.532.33L4.508 20.68a.375.375 0 01-.468-.468l1.516-4.549a1.125 1.125 0 01.33-.532L21.73 2.269zM9.75 16.5l-2 2 .75-3 1.25 1z" /></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" /></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" /></svg>;

export default function MyCoursesPage() {
    const { user, userProfile, updateProfile, loading: authLoading } = useUserAuth();
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [editingName, setEditingName] = useState("");
    const [editingAvatar, setEditingAvatar] = useState("");
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(true);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // --- Smart Search State ---
    const [allCourses, setAllCourses] = useState<any[]>([]);
    const [allLessons, setAllLessons] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // ✅ Load settings from LocalStorage
    useEffect(() => {
        const savedDismissed = localStorage.getItem("kruheem_dismissed_ids");
        if (savedDismissed) setDismissedIds(JSON.parse(savedDismissed));

        const savedShow = localStorage.getItem("kruheem_show_notifs");
        if (savedShow !== null) setShowNotifications(JSON.parse(savedShow));

        setIsLoaded(true);
    }, []);

    // ✅ Save settings to LocalStorage
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem("kruheem_dismissed_ids", JSON.stringify(dismissedIds));
            localStorage.setItem("kruheem_show_notifs", JSON.stringify(showNotifications));
        }
    }, [dismissedIds, showNotifications, isLoaded]);

    const handleDismiss = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDismissedIds(prev => [...prev, id]);
    };

    const handleOpenProfileModal = () => {
        setEditingName(userProfile?.displayName || user?.displayName || "");
        setEditingAvatar(userProfile?.avatar || "👦");
        setShowProfileModal(true);
    };

    const handleSaveProfile = async () => {
        if (!editingName.trim()) return alert("กรุณากรอกชื่อเล่น");
        setIsSavingProfile(true);
        try {
            await updateProfile({
                displayName: editingName,
                avatar: editingAvatar
            });
            setShowProfileModal(false);
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setIsSavingProfile(false);
        }
    };

    const AVATAR_CATEGORIES = {
        "ยอดนิยม": ["👦", "👧", "🧑", "👩", "😎", "🤓", "🤠", "🥳"],
        "สัตว์น่ารัก": ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🦄", "🐔", "🐧", "🐦", "🐤"],
        "มอนสเตอร์ & แฟนตาซี": ["👾", "👽", "🤖", "👻", "👺", "👹", "💀", "🦖", "🦕", "🐲", "🐉", "🧛", "🧟", "🧞", "🧜", "🧚"]
    };

    // Flatten for initial state check if needed, or just use categories in render
    const ALL_AVATARS = Object.values(AVATAR_CATEGORIES).flat();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
            return;
        }

        if (user) {
            const fetchCourses = async () => {
                try {
                    // 1. ดึงประวัติการสมัครทั้งหมดของ User นี้
                    const qEnroll = query(collection(db, "enrollments"), where("userId", "==", user.uid));
                    const snapshotEnroll = await getDocs(qEnroll);

                    const userEnrollments = snapshotEnroll.docs.map(d => ({ id: d.id, ...d.data() } as any));

                    // 2. ดึงข้อมูลคอร์สมาเทียบ
                    const qCourses = query(collection(db, "courses"));
                    const snapshotCourses = await getDocs(qCourses);

                    const coursesData = snapshotCourses.docs.map(doc => {
                        const courseData = doc.data();

                        // หา Enrollment ที่ตรงกับคอร์สนี้ (ถ้ามี)
                        const enrollment = userEnrollments.find((e: any) => e.courseId === doc.id);

                        return {
                            id: doc.id,
                            ...courseData,
                            status: enrollment ? enrollment.status : null, // approved, pending, suspended, rejected
                            enrollmentId: enrollment ? enrollment.id : null // เก็บ ID ใบสมัครไว้ใช้แก้
                        };
                    });

                    // กรองเอาเฉพาะคอร์สที่ User มีส่วนเกี่ยวข้อง
                    const myCourses = coursesData.filter((c: any) => c.status);
                    setEnrolledCourses(myCourses);
                    setAllCourses(coursesData); // เก็บข้อมูลคอร์สทั้งหมดไว้สำหรับค้นหา

                    // 3. Fetch All Lessons for Smart Search (Lazy fetch could be better, but for now fetch all)
                    const lessonsQuery = query(collectionGroup(db, "lessons"));
                    const lessonsSnapshot = await getDocs(lessonsQuery);
                    const lessons = lessonsSnapshot.docs.map(doc => {
                        // Hacky way to get courseId from ref parent
                        // ref.parent is "lessons" collection
                        // ref.parent.parent is "courses/{courseId}" doc
                        const courseId = doc.ref.parent.parent?.id;
                        return {
                            id: doc.id,
                            courseId,
                            ...doc.data()
                        };
                    });
                    setAllLessons(lessons);

                } catch (error) {
                    console.error("Error:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchCourses();
        }
    }, [user, authLoading, router]);

    // ✅ Fetch Notifications
    useEffect(() => {
        if (enrolledCourses.length > 0) {
            const fetchNotifications = async () => {
                try {
                    // Fetch recent notifications
                    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(20));
                    const snapshot = await getDocs(q);
                    const allNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

                    // Filter relevant notifications
                    const courseIds = enrolledCourses.map(c => c.id);
                    const relevant = allNotifs.filter(n => {
                        // 1. ประกาศทั่วไป (All)
                        if (n.target === 'all') return true;

                        // 2. ประกาศเฉพาะคอร์ส (Specific Courses) - แบบใหม่
                        if (n.target === 'specific_courses' && n.targetCourseIds) {
                            return n.targetCourseIds.some((id: string) => courseIds.includes(id));
                        }

                        // 3. ประกาศบทเรียนใหม่ (Legacy / Single Course)
                        if (n.target === 'enrolled_students' && n.courseId) {
                            return courseIds.includes(n.courseId);
                        }

                        return false;
                    });
                    setNotifications(relevant);
                } catch (error) {
                    console.error("Error fetching notifications:", error);
                }
            };
            fetchNotifications();
        }
    }, [enrolledCourses]);

    // ✅ Smart Search Logic
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const lowerQuery = searchQuery.toLowerCase();

        const results = allLessons.filter((lesson: any) => {
            return lesson.title?.toLowerCase().includes(lowerQuery);
        }).map((lesson: any) => {
            const course = allCourses.find(c => c.id === lesson.courseId);
            return {
                type: 'lesson',
                data: lesson,
                course: course,
                isEnrolled: course?.status === 'approved'
            };
        });

        // Also search courses
        const courseResults = allCourses.filter((course: any) => {
            return course.title?.toLowerCase().includes(lowerQuery);
        }).map((course: any) => ({
            type: 'course',
            data: null,
            course: course,
            isEnrolled: course.status === 'approved'
        }));

        setSearchResults([...courseResults, ...results]);
    }, [searchQuery, allLessons, allCourses]);

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">กำลังโหลดคอร์ส...</div>;

    return (
        <div className="min-h-screen bg-[#F5F2EB] font-sans selection:bg-amber-200 selection:text-amber-900 flex flex-col overflow-x-hidden">
            {/* Dynamic Mesh Gradient Background (Warm Paper Theme) */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-amber-200/40 rounded-full blur-[100px] mix-blend-multiply animate-blob"></div>
                <div className="absolute top-[10%] right-[-10%] w-[60vw] h-[60vw] bg-orange-200/40 rounded-full blur-[100px] mix-blend-multiply animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-[70vw] h-[70vw] bg-yellow-100/40 rounded-full blur-[100px] mix-blend-multiply animate-blob animation-delay-4000"></div>
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.05] mix-blend-overlay pointer-events-none"></div>
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                <Navbar />

                <div className="max-w-5xl mx-auto px-8 md:px-12 pb-24 pt-40 flex-grow w-full">

                    {/* ✅ Student Profile Card */}
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm mb-12 relative overflow-hidden group border border-slate-100">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-bl-full -mr-10 -mt-10 opacity-50"></div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                            <div className="relative">
                                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 p-1.5 shadow-lg transform group-hover:scale-105 transition-transform duration-500">
                                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden text-7xl md:text-8xl">
                                        {userProfile?.avatar ? (
                                            userProfile.avatar.startsWith("http") ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="leading-none select-none">{userProfile.avatar}</span>
                                            )
                                        ) : (
                                            <span className="leading-none select-none">{user?.displayName ? user.displayName[0] : "👦"}</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={handleOpenProfileModal}
                                    className="absolute bottom-0 right-0 group/edit"
                                    title="แก้ไขข้อมูลส่วนตัว"
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 bg-white rounded-full shadow-lg border-4 border-indigo-50 flex items-center justify-center transform group-hover/edit:scale-110 group-hover/edit:rotate-12 transition-all duration-300 z-10">
                                            {/* Colorful Pencil Icon */}
                                            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M14.0002 5.00004L19.0002 10M14.0002 5.00004L5.50024 13.5C5.10024 13.9 4.80024 14.4 4.60024 14.9L3.00024 19.5C2.90024 19.8 3.00024 20.1 3.30024 20.3C3.50024 20.5 3.80024 20.5 4.00024 20.5L8.60024 19.4C9.10024 19.3 9.60024 19 10.0002 18.6L18.5002 10M14.0002 5.00004L16.3002 2.70004C17.6002 1.40004 19.7002 1.40004 21.0002 2.70004C22.3002 4.00004 22.3002 6.10004 21.0002 7.40004L18.5002 10M18.5002 10L19.0002 10" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M14 5L19 10" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M3 21L4.5 16.5L7.5 19.5L3 21Z" fill="#F59E0B" />
                                            </svg>
                                        </div>
                                        {/* Tooltip Label */}
                                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-max opacity-0 group-hover/edit:opacity-100 transition-opacity duration-300 pointer-events-none">
                                            <div className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-xl relative">
                                                เปลี่ยนรูปโปรไฟล์
                                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            </div>
                            <div className="text-center md:text-left flex-1">
                                <div className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold mb-3 flex items-center gap-2 w-fit mx-auto md:mx-0">
                                    <span>🎓</span> นักเรียนของ KruHeem
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-2">
                                    สวัสดี, {userProfile?.displayName || user?.displayName || "นักเรียน"}! 👋
                                </h1>
                                <p className="text-slate-500 text-lg flex items-center gap-2 justify-center md:justify-start">
                                    พร้อมที่จะเรียนรู้คณิตศาสตร์ให้สนุกหรือยัง?
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ✅ Notifications Section */}
                    {notifications.length > 0 && (
                        <div className="mb-10 relative z-20">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                                    <span className="text-amber-500 bg-amber-100 p-2 rounded-full"><BellIcon /></span>
                                    อัปเดตล่าสุด
                                </h2>
                            </div>
                            <div className="space-y-3">
                                {notifications
                                    .filter(n => !dismissedIds.includes(n.id))
                                    .slice(0, 3)
                                    .map(notif => (
                                        <div key={notif.id} className="relative group">
                                            <Link href={notif.courseId ? `/learn/${notif.courseId}` : '#'} className={`block ${!notif.courseId ? 'cursor-default' : ''}`}>
                                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-amber-100 flex items-start gap-4 group-hover:shadow-md group-hover:border-indigo-200 transition relative overflow-hidden pr-12">
                                                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-indigo-50 to-transparent rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:opacity-100 transition"></div>

                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition ${notif.type === 'general' ? 'bg-orange-100 text-orange-500 group-hover:bg-orange-500 group-hover:text-white' : 'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white'}`}>
                                                        {notif.type === 'general' ? <span className="text-lg">📢</span> :
                                                            notif.lessonType === 'video' ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" /></svg>
                                                                : notif.lessonType === 'quiz' ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 9.75a3.75 3.75 0 117.5 0 .75.75 0 01-1.5 0 2.25 2.25 0 10-2.25 2.25v1.5a.75.75 0 01-1.5 0v-1.5a3.75 3.75 0 013.75-3.75zM9.75 17.25a.75.75 0 101.5 0 .75.75 0 00-1.5 0z" clipRule="evenodd" /></svg>
                                                                    : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.125 3C3.089 3 2.25 3.84 2.25 4.875V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V4.875C21.75 3.84 20.91 3 19.875 3H4.125zM12 9.75a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5H12zm-.75-2.25a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H12a.75.75 0 01-.75-.75zM6 12.75a.75.75 0 000 1.5h12a.75.75 0 000-1.5H6zm0 4.5a.75.75 0 000 1.5h12a.75.75 0 000-1.5H6z" clipRule="evenodd" /></svg>}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <p className="font-medium text-slate-800 text-sm pr-2 group-hover:text-indigo-600 transition">
                                                                {notif.type === 'general' ? notif.message : notif.lessonTitle}
                                                            </p>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${notif.type === 'general' ? 'bg-orange-50 text-orange-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                                                {notif.type === 'general' ? 'ประกาศ' : 'ใหม่!'}
                                                            </span>
                                                        </div>
                                                        {notif.courseTitle && <p className="text-xs text-slate-500 mt-1 truncate">ในคอร์ส: {notif.courseTitle}</p>}
                                                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                                            🕒 {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'เมื่อเร็วๆ นี้'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </Link>
                                            <button
                                                onClick={(e) => handleDismiss(e, notif.id)}
                                                className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-rose-50 text-slate-300 hover:text-rose-500 border border-transparent hover:border-rose-100 transition shadow-sm opacity-0 group-hover:opacity-100 z-10"
                                                title="ซ่อนประกาศนี้"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* ✅ Smart Search Bar */}
                    <div className="relative mb-12 z-30">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                <SearchIcon />
                            </div>
                            <input
                                type="text"
                                placeholder="ค้นหาบทเรียน, คอร์สเรียน, หรือเนื้อหาที่สนใจ..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-slate-700 font-medium placeholder:text-slate-400"
                            />
                        </div>

                        {/* Search Results Dropdown */}
                        {searchQuery && (
                            <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
                                    <span className="text-sm font-bold text-slate-500">ผลการค้นหา ({searchResults.length})</span>
                                    <button onClick={() => setSearchQuery("")} className="text-xs text-slate-400 hover:text-slate-600">ล้างคำค้นหา</button>
                                </div>

                                {searchResults.length > 0 ? (
                                    <div className="divide-y divide-slate-50">
                                        {searchResults.map((result, index) => (
                                            <Link
                                                key={index}
                                                href={result.isEnrolled ? (result.type === 'lesson' ? `/learn/${result.course.id}` : `/learn/${result.course.id}`) : `/course/${result.course.id}`}
                                                className="block p-4 hover:bg-indigo-50 transition group"
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${result.isEnrolled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        {result.type === 'lesson' ? (
                                                            result.data.type === 'video' ? <PlayIcon /> : <span className="text-xl">📄</span>
                                                        ) : (
                                                            <span className="text-xl">📘</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${result.type === 'lesson' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                                                {result.type === 'lesson' ? 'บทเรียน' : 'คอร์สเรียน'}
                                                            </span>
                                                            {!result.isEnrolled && (
                                                                <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                                                                    <LockIcon /> ยังไม่ได้ลงทะเบียน
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className="font-bold text-slate-800 truncate group-hover:text-indigo-700 transition">
                                                            {result.type === 'lesson' ? result.data.title : result.course.title}
                                                        </h4>
                                                        <p className="text-xs text-slate-500 truncate mt-0.5">
                                                            ในคอร์ส: {result.course?.title || "Unknown Course"}
                                                        </p>
                                                    </div>
                                                    <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" /></svg>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-slate-400">
                                        <div className="text-4xl mb-3">🔍</div>
                                        <p>ไม่พบข้อมูลที่ตรงกับคำค้นหา</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <h1 className="text-3xl font-black text-slate-800 mb-8 flex items-center gap-3">
                        📖 คอร์สเรียนของฉัน
                    </h1>

                    {/* รายชื่อคอร์ส (Grouped by Category) */}
                    {enrolledCourses.length > 0 ? (
                        <div className="space-y-12">
                            {Object.entries(enrolledCourses.reduce((acc: Record<string, any[]>, course) => {
                                const cat = course.category || "คอร์สเรียนทั่วไป";
                                if (!acc[cat]) acc[cat] = [];
                                acc[cat].push(course);
                                return acc;
                            }, {})).map(([category, courses]) => (
                                <div key={category} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <h2 className="text-2xl font-bold text-slate-700 mb-6 flex items-center gap-3">
                                        <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                                        {category}
                                        <span className="text-sm font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{courses.length} คอร์ส</span>
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {courses.map((course) => (
                                            <div key={course.id} className={`group bg-white rounded-[2.5rem] shadow-sm overflow-hidden transition-all duration-300 hover:-translate-y-2 flex flex-col ${course.status === 'pending' ? 'border-2 border-yellow-200' : 'hover:shadow-xl'}`}>

                                                <div className="aspect-video bg-slate-100 relative overflow-hidden">
                                                    {course.image ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img src={course.image} alt={course.title} className={`w-full h-full object-cover ${course.status !== 'approved' ? 'grayscale opacity-80' : ''}`} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-4xl">📘</div>
                                                    )}

                                                    {/* Badge สถานะ */}
                                                    {course.status === 'pending' && (
                                                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center backdrop-blur-[2px]">
                                                            <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow-md animate-pulse">รอตรวจสอบ</span>
                                                        </div>
                                                    )}
                                                    {course.status === 'suspended' && (
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                                                            <span className="bg-slate-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">พักการเรียน</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="p-6 flex flex-col flex-1">
                                                    <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2">{course.title}</h3>

                                                    <div className="mt-auto pt-4">
                                                        {course.status === 'approved' ? (
                                                            <Link href={`/learn/${course.id}`} className="w-full py-3 rounded-xl bg-[#D9E9CF] hover:bg-[#C8DDBB] text-emerald-800 font-bold flex items-center justify-center gap-2 transition shadow-sm">
                                                                <PlayIcon /> เข้าเรียน
                                                            </Link>
                                                        ) : course.status === 'pending' ? (
                                                            <Link
                                                                href={`/payment?courseId=${course.id}`}
                                                                className="w-full py-3 rounded-xl bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-bold flex items-center justify-center gap-2 transition border border-yellow-300 border-dashed"
                                                            >
                                                                <EditIcon /> แจ้งโอนใหม่ / ติดต่อแอดมิน
                                                            </Link>
                                                        ) : (
                                                            <button disabled className="w-full py-3 rounded-xl bg-slate-100 text-slate-400 font-bold cursor-not-allowed flex items-center justify-center gap-2">
                                                                🔒 ไม่สามารถเข้าเรียนได้
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400">
                            <div className="text-6xl mb-4">🎒</div>
                            <p className="text-lg font-medium mb-6">คุณยังไม่ได้ลงทะเบียนคอร์สเรียน</p>
                            <Link href="/" className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:bg-indigo-700 transition shadow-lg">
                                ดูคอร์สทั้งหมด
                            </Link>
                        </div>
                    )}
                </div>
                <Footer />
            </div>

            {/* ✅ Profile Edit Modal */}
            {showProfileModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowProfileModal(false)}></div>
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setShowProfileModal(false)}
                            className="absolute top-6 right-6 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
                        >
                            ✕
                        </button>

                        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">สร้างอวตารของคุณ</h2>

                        <div className="space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                            {/* Avatar Selection */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">เลือกตัวละครที่ชอบ</label>
                                <div className="space-y-6">
                                    {Object.entries(AVATAR_CATEGORIES).map(([category, avatars]) => (
                                        <div key={category}>
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{category}</h3>
                                            <div className="grid grid-cols-5 gap-3">
                                                {avatars.map((avatar) => (
                                                    <button
                                                        key={avatar}
                                                        onClick={() => setEditingAvatar(avatar)}
                                                        className={`aspect-square rounded-2xl flex items-center justify-center text-3xl transition-all ${editingAvatar === avatar ? 'bg-indigo-100 border-2 border-indigo-500 scale-110 shadow-md' : 'bg-slate-50 hover:bg-slate-100 border border-transparent hover:scale-105'}`}
                                                    >
                                                        {avatar}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Name Input */}
                            <div className="pt-4 border-t border-slate-100">
                                <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อเล่นของคุณ</label>
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-bold text-slate-700 text-center text-lg placeholder:font-normal"
                                    placeholder="เช่น น้องภู, น้องมีนา"
                                />
                            </div>

                            <button
                                onClick={handleSaveProfile}
                                disabled={isSavingProfile}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xl shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSavingProfile ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}