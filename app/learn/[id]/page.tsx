"use client"
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy, setDoc, onSnapshot, where, serverTimestamp } from "firebase/firestore";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUserAuth } from "@/context/AuthContext";
import Certificate from "@/app/components/Certificate";
import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";
import { ExamSystem } from "@/components/exam/ExamSystem";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { LearnPageSkeleton } from "@/components/skeletons/LearnPageSkeleton";
import { Menu, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react';
import { LessonSidebar } from "@/components/learn/LessonSidebar";
import { LessonContent } from "@/components/learn/LessonContent";
import { Lesson } from "@/components/learn/types";
import { CheckIcon } from "@/components/learn/Icons";
// ✅ Now using imported versions from "@/components/ContentRenderer"






export default function CoursePlayer() {
    const { id } = useParams();
    // ... (start of component)
    const searchParams = useSearchParams();
    const lessonIdParam = searchParams.get('lessonId');
    const courseId = typeof id === 'string' ? id : "";
    const { user, isAdmin, loading: authLoading } = useUserAuth();

    const [dataLoading, setDataLoading] = useState(true);

    const [course, setCourse] = useState<any>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
    const [openSections, setOpenSections] = useState<string[]>([]);

    const [completedLessons, setCompletedLessons] = useState<string[]>([]);
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);

    // ✅ State สำหรับ Sidebar
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [searchQuery, setSearchQuery] = useState(""); // ✅ Search State

    // ✅ State สำหรับเก็บสถานะการลงทะเบียน (Approved หรือไม่)
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [isExpired, setIsExpired] = useState(false);
    const [enrollmentDocId, setEnrollmentDocId] = useState<string | null>(null); // ✅ Cache enrollment doc ID
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null); // ✅ Toast State

    // ✅ State สำหรับ Mobile Menu
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showCertificate, setShowCertificate] = useState(false);

    // Toast Timer
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // 1. Check Enrollment
    useEffect(() => {
        let isMounted = true; // ✅ Guard against state updates on unmounted component

        if (!authLoading && user && courseId) {
            const checkEnrollment = async () => {
                try {
                    // ✅ เช็คสิทธิ์การเรียน (Enrollment Status)
                    const q = query(
                        collection(db, "enrollments"),
                        where("userId", "==", user.uid),
                        where("courseId", "==", courseId),
                        where("status", "==", "approved") // ต้องอนุมัติแล้วเท่านั้น
                    );
                    const snapshot = await getDocs(q);

                    if (!isMounted) return; // ✅ Check before state update

                    if (!snapshot.empty) {
                        const enrollmentData = snapshot.docs[0].data();
                        const docId = snapshot.docs[0].id;

                        // Check Expiration
                        if (enrollmentData.accessType !== 'lifetime' && enrollmentData.expiryDate) {
                            const expiry = enrollmentData.expiryDate.toDate ? enrollmentData.expiryDate.toDate() : new Date(enrollmentData.expiryDate);
                            if (expiry < new Date()) {
                                setIsExpired(true);
                                setIsEnrolled(false);
                                return;
                            }
                        }

                        setIsEnrolled(true); // 🎉 มีสิทธิ์เรียน
                        setEnrollmentDocId(docId); // ✅ Cache document ID for heartbeat

                        // ✅ Update Last Accessed Time
                        const enrollRef = doc(db, "enrollments", docId);
                        await setDoc(enrollRef, {
                            lastAccessedAt: serverTimestamp()
                        }, { merge: true }).catch(() => { }); // Silent fail
                    }
                } catch (error) {
                    console.error("Error checking enrollment:", error);
                }
            };
            checkEnrollment();
        }

        return () => { isMounted = false; };
    }, [user, courseId, authLoading]);

    // ✅ Reset Quiz State when lesson changes
    useEffect(() => {
        setSelectedAnswer(null);
        setIsAnswered(false);
    }, [activeLesson?.id]);

    // ✅ Heartbeat: Separate useEffect using cached enrollmentDocId (no duplicate query!)
    useEffect(() => {
        if (!enrollmentDocId || !user) return;

        let isMounted = true;

        const interval = setInterval(async () => {
            if (!isMounted) return;
            try {
                const enrollRef = doc(db, "enrollments", enrollmentDocId);
                await setDoc(enrollRef, { lastAccessedAt: serverTimestamp() }, { merge: true }).catch(() => { });
            } catch (err) {
                console.error("Heartbeat error:", err);
            }
        }, 5 * 60 * 1000); // 5 minutes

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [enrollmentDocId, user]);

    useEffect(() => {
        if (!courseId) return;
        const fetchData = async () => {
            try {
                const courseDoc = await getDoc(doc(db, "courses", courseId));
                if (courseDoc.exists()) setCourse(courseDoc.data());

                // ✅ Fetch all lessons and sort in memory to support custom ordering
                const q = query(collection(db, "courses", courseId, "lessons"));
                const querySnapshot = await getDocs(q);

                const lessonList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lesson[];

                // ✅ Sort by order first, then createdAt
                lessonList.sort((a: any, b: any) => {
                    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
                    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;

                    if (orderA !== orderB) return orderA - orderB;

                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    return timeA - timeB;
                });

                setLessons(lessonList);
            } catch (error) {
                console.error("Error:", error);
            } finally {
                setDataLoading(false);
            }
        };
        fetchData();
    }, [courseId]);

    // ✅ Filter visible lessons
    const visibleLessons = useMemo(() => {
        return lessons.filter(l => !l.isHidden || isAdmin);
    }, [lessons, isAdmin]);

    // ✅ Set initial active lesson based on VISIBLE lessons
    // ✅ Set initial active lesson based on VISIBLE lessons OR Query Param
    useEffect(() => {
        if (visibleLessons.length === 0) return;

        if (lessonIdParam) {
            const target = visibleLessons.find(l => l.id === lessonIdParam);
            if (target && target.id !== activeLesson?.id) {
                setActiveLesson(target);
                if (target.headerId) {
                    setOpenSections(prev => prev.includes(target.headerId!) ? prev : [...prev, target.headerId!]);
                }
            }
        } else if (!activeLesson) {
            const firstLearnable = visibleLessons.find(l => l.type !== 'header');
            if (firstLearnable) setActiveLesson(firstLearnable);
        }
    }, [visibleLessons, lessonIdParam]);

    useEffect(() => {
        if (user && courseId) {
            const progressRef = doc(db, "users", user.uid, "progress", courseId);
            const unsubscribeProgress = onSnapshot(progressRef, (docSnap) => {
                if (docSnap.exists()) {
                    setCompletedLessons(docSnap.data().completed || []);
                }
            });
            return () => unsubscribeProgress();
        } else {
            setCompletedLessons([]);
        }
    }, [user, courseId]);

    const progressPercent = useMemo(() => {
        if (visibleLessons.length === 0) return 0;
        const learnableLessons = visibleLessons.filter(l => l.type !== 'header');
        const totalLearnable = learnableLessons.length;
        if (totalLearnable === 0) return 0;
        const validCompletedCount = completedLessons.filter(id => learnableLessons.some(l => l.id === id)).length;
        const percent = (validCompletedCount / totalLearnable) * 100;
        return Math.min(100, Math.round(percent));
    }, [visibleLessons, completedLessons]);

    const changeLesson = (lesson: Lesson | null) => {
        if (lesson?.id === activeLesson?.id) return;
        setActiveLesson(lesson);
        setSelectedAnswer(null);
        setIsAnswered(false);
    }

    const markAsComplete = async (lessonId: string) => {
        if (!user) return;
        const newCompleted = [...completedLessons];
        if (!newCompleted.includes(lessonId)) {
            newCompleted.push(lessonId);
            await setDoc(doc(db, "users", user.uid, "progress", courseId), { completed: newCompleted, lastUpdated: new Date() }, { merge: true });
        }
    };

    const handleNextLesson = async () => {
        if (!activeLesson || !user) return;
        await markAsComplete(activeLesson.id);

        const currentIndex = visibleLessons.findIndex(l => l.id === activeLesson.id);
        let nextIndex = currentIndex + 1;
        while (nextIndex < visibleLessons.length && visibleLessons[nextIndex].type === 'header') {
            nextIndex++;
        }
        if (nextIndex < visibleLessons.length) {
            changeLesson(visibleLessons[nextIndex]);
        } else {
            alert("🎉 ยินดีด้วย! คุณเรียนจบคอร์สแล้ว");
        }
    };

    const toggleSection = (headerId: string) => {
        if (openSections.includes(headerId)) setOpenSections(openSections.filter(id => id !== headerId));
        else setOpenSections([...openSections, headerId]);
    };

    // ✅ Separate Exam Lessons (For Prominent Display)
    const examLessons = useMemo(() => {
        return visibleLessons.filter(l => l.type === 'html');
    }, [visibleLessons]);

    // ✅ Group lessons by header (Exclude Exams from main list)
    const groupedLessons = useMemo(() => {
        // Filter out exams
        const regularLessons = visibleLessons.filter(l => l.type !== 'html');

        const headers = visibleLessons.filter(l => l.type === 'header');
        let groups = headers.map(header => ({ header, items: [] as Lesson[] }));
        const uncategorizedItems: Lesson[] = [];

        // ✅ Search Filter Logic
        const query = searchQuery.trim().toLowerCase();

        regularLessons.forEach(lesson => {
            if (lesson.type === 'header') return;

            // ✅ Filter by Search
            if (query && !lesson.title.toLowerCase().includes(query)) return;

            if (lesson.headerId) {
                const group = groups.find(g => g.header.id === lesson.headerId);
                if (group) {
                    group.items.push(lesson);
                } else {
                    uncategorizedItems.push(lesson);
                }
            } else {
                uncategorizedItems.push(lesson);
            }
        });

        if (uncategorizedItems.length > 0) {
            groups.push({
                header: { id: 'uncategorized', title: 'บทเรียนอื่นๆ', type: 'header' } as Lesson,
                items: uncategorizedItems
            });
        }

        // ✅ Hide empty groups if searching, but show all groups (even empty) if not searching (to preserve structure)
        if (query) {
            groups = groups.filter(g => g.items.length > 0);
        }

        return groups;
    }, [visibleLessons, searchQuery]);

    // ✅ ฟังก์ชันเช็คสิทธิ์ (อัปเดตใหม่)
    const isLessonUnlocked = (lesson: Lesson) => {
        if (!lesson || lesson.type === 'header') return true;

        // 1. Admin เข้าได้เสมอ
        if (isAdmin) return true;

        // 2. ถ้าลงทะเบียนแล้ว (Approved) เข้าได้
        if (isEnrolled) return true;

        // 3. ถ้าเป็นบทเรียนฟรี เข้าได้
        if (lesson.isFree) return true;

        return false; // นอกนั้นล็อก
    };

    // ✅ Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input or textarea
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'n') {
                e.preventDefault();
                handleNextLesson();
            } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'p') {
                e.preventDefault();
                // Find previous lesson
                if (!activeLesson) return;
                const currentIndex = visibleLessons.findIndex(l => l.id === activeLesson.id);
                let prevIndex = currentIndex - 1;
                while (prevIndex >= 0 && visibleLessons[prevIndex].type === 'header') {
                    prevIndex--;
                }
                if (prevIndex >= 0) {
                    changeLesson(visibleLessons[prevIndex]);
                }
            } else if (e.key.toLowerCase() === 'm') {
                // Toggle Mobile Menu
                e.preventDefault();
                setIsMobileMenuOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeLesson, visibleLessons, user]);

    // ✅ เช็คสิทธิ์บทเรียนปัจจุบัน
    const canWatchCurrent = activeLesson ? isLessonUnlocked(activeLesson) : false;

    const currentVideoId = canWatchCurrent ? (activeLesson ? activeLesson.videoId : course.videoId) : "";
    const isHeaderMode = activeLesson?.type === 'header';

    if (authLoading || dataLoading) return <LearnPageSkeleton />;
    if (!course) return <div className="min-h-screen bg-white flex items-center justify-center">ไม่พบคอร์สเรียนนี้</div>;

    return (
        <div className="h-[100dvh] bg-[#F3F4F6] dark:bg-slate-950 font-sans flex overflow-hidden relative">
            {/* ✅ Certificate Modal */}
            {showCertificate && user && course && (
                <Certificate
                    studentName={user.displayName || "Student"}
                    courseTitle={course.title}
                    onClose={() => setShowCertificate(false)}
                />
            )}

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}

            {/* Sidebar (Responsive) */}
            <LessonSidebar
                isSidebarCollapsed={isSidebarCollapsed}
                isMobileMenuOpen={isMobileMenuOpen}
                course={course}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                activeLesson={activeLesson}
                progressPercent={progressPercent}
                examLessons={examLessons}
                groupedLessons={groupedLessons}
                openSections={openSections}
                toggleSection={toggleSection}
                changeLesson={changeLesson}
                completedLessons={completedLessons}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isLessonUnlocked={isLessonUnlocked}
                isEnrolled={isEnrolled}
                isAdmin={isAdmin}
                user={user}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative bg-white dark:bg-slate-950 min-w-0">
                <header className="h-16 md:h-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 flex justify-between items-center px-4 md:px-10 sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {/* Hamburger Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                        </button>

                        {/* ✅ Desktop Sidebar Toggle */}
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className="hidden md:flex w-10 h-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 transition-colors mr-2"
                            title={isSidebarCollapsed ? "ขยายแถบด้านข้าง" : "ย่อแถบด้านข้าง"}
                            aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                        </button>

                        <div className="min-w-0">
                            <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Current Lesson</p>
                            <h1 className="text-base md:text-2xl font-extrabold text-gray-800 dark:text-white truncate">{activeLesson?.title || "Loading..."}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* ✅ Certificate Button (Always Show) */}
                        {/* ✅ Certificate Button (Refined & Minimal) */}
                        <button
                            onClick={() => {
                                if (progressPercent === 100) {
                                    setShowCertificate(true);
                                } else {
                                    alert(`🔒 ยังไม่ปลดล็อกไอเทม!\n\nน้องๆ ต้องเรียนให้ครบ 100% ก่อนนะครับ ถึงจะรับใบประกาศนียบัตรสุดเท่ได้!\n(ตอนนี้ทำภารกิจไปแล้ว ${progressPercent}%)`);
                                }
                            }}
                            className={`hidden md:flex items-center justify-center gap-2 h-10 px-6 rounded-full font-bold text-sm transition-all border
                            ${progressPercent === 100
                                    ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 hover:shadow-sm'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-amber-200 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10'
                                }`}
                        >
                            <span className="text-base">{progressPercent === 100 ? '🏆' : '🔒'}</span>
                            <span>รับใบประกาศนียบัตร</span>
                        </button>

                        {user && canWatchCurrent && !isHeaderMode && !(activeLesson?.type === 'html' && (activeLesson.htmlCode?.trim().startsWith('[') || activeLesson.htmlCode?.trim().startsWith('{'))) && (
                            <button
                                onClick={handleNextLesson}
                                className="flex items-center justify-center gap-2 h-10 px-6 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 rounded-full font-bold text-sm transition-all shadow-sm group"
                            >
                                {completedLessons.includes(activeLesson?.id || "") ?
                                    <><span className="whitespace-nowrap">เรียนจบแล้ว</span> <CheckIcon /></> :
                                    <><span className="whitespace-nowrap">บันทึกและไปต่อ</span> <span className="group-hover:translate-x-1 transition">→</span></>
                                }
                            </button>
                        )}
                    </div>
                </header>

                <LessonContent
                    activeLesson={activeLesson}
                    canWatchCurrent={canWatchCurrent}
                    isHeaderMode={isHeaderMode}
                    isEnrolled={isEnrolled}
                    isAdmin={isAdmin}
                    isExpired={isExpired}
                    currentVideoId={currentVideoId}
                    selectedAnswer={selectedAnswer}
                    isAnswered={isAnswered}
                    setSelectedAnswer={setSelectedAnswer}
                    setIsAnswered={setIsAnswered}
                    markAsComplete={markAsComplete}
                    handleNextLesson={handleNextLesson}
                />
            </main>
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full text-white font-bold shadow-2xl z-[60] animate-in fade-in slide-in-from-bottom-4 flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {toast.type === 'success' ? <div className="p-1 bg-white/20 rounded-full">✓</div> : "!"}
                    {toast.msg}
                </div>
            )}
        </div>
    );
}