"use client"
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy, setDoc, onSnapshot, where, serverTimestamp } from "firebase/firestore";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUserAuth } from "@/context/AuthContext";
import Certificate from "@/app/components/Certificate";

// Interface
interface Lesson {
    id: string;
    title: string;
    type: 'video' | 'header' | 'quiz' | 'text' | 'exercise' | 'html' | 'flashcard';
    videoId?: string;
    content?: string;
    htmlCode?: string;
    image?: string;
    isFree?: boolean;
    options?: string[];
    correctAnswer?: number;
    docUrl?: string;
    headerId?: string;
    isHidden?: boolean;
    order?: number;
    flashcardData?: { front: string, back: string }[];
}

// --- Icons ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>;
const QuestionIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>;
const TextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>;
const ExerciseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" /><path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" /></svg>;
const HtmlIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M14.447 3.027a.75.75 0 01.527.92l-4.5 16.5a.75.75 0 01-1.448-.394l4.5-16.5a.75.75 0 01.921-.526zM16.72 6.22a.75.75 0 011.06 0l5.25 5.25a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 11-1.06-1.06L21.44 12l-4.72-4.72a.75.75 0 010-1.06zm-9.44 0a.75.75 0 010 1.06L2.56 12l4.72 4.72a.75.75 0 01-1.06 1.06L.97 12.53a.75.75 0 010-1.06l5.25-5.25a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>;
const FlashcardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19.5 22.5a3 3 0 003-3v-9a3 3 0 00-3-3h-9a3 3 0 00-3 3v9a3 3 0 003 3h9z" /><path d="M4.5 19.5a3 3 0 003-3v-9a3 3 0 00-3-3h-9a3 3 0 00-3 3v9a3 3 0 003 3h9z" transform="rotate(180 12 12) translate(12 12)" opacity="0.5" /></svg>;

const FlashcardPlayer = ({ cards }: { cards: { front: string, back: string }[] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const handleNext = () => {
        if (currentIndex < cards.length - 1) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
        }
    };

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    return (
        <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
            {/* Progress Bar */}
            <div className="w-full flex justify-between text-slate-500 font-bold mb-4 px-2">
                <span>Card {currentIndex + 1} / {cards.length}</span>
                <span>{Math.round(((currentIndex + 1) / cards.length) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full mb-8 overflow-hidden">
                <div
                    className="h-full bg-yellow-400 transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
                ></div>
            </div>

            {/* Card Container */}
            <div
                className="perspective-1000 w-full aspect-[3/2] cursor-pointer group"
                onClick={handleFlip}
            >
                <div className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>

                    {/* Front Side */}
                    <div className="absolute w-full h-full backface-hidden bg-white rounded-[2rem] shadow-xl border-2 border-slate-100 flex flex-col items-center justify-center p-10 text-center hover:shadow-2xl hover:border-yellow-200 transition-all">
                        <span className="absolute top-6 left-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Question</span>
                        <h3 className="text-2xl md:text-4xl font-bold text-slate-800 leading-relaxed">
                            {cards[currentIndex].front}
                        </h3>
                        <p className="absolute bottom-6 text-slate-400 text-sm animate-pulse">Click to flip ↻</p>
                    </div>

                    {/* Back Side */}
                    <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-[2rem] shadow-xl border-2 border-yellow-200 flex flex-col items-center justify-center p-10 text-center">
                        <span className="absolute top-6 left-6 text-xs font-bold text-yellow-600 uppercase tracking-widest">Answer</span>
                        <h3 className="text-2xl md:text-4xl font-bold text-yellow-800 leading-relaxed">
                            {cards[currentIndex].back}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 mt-10">
                <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="p-4 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-slate-600"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>

                <div className="text-slate-400 font-medium text-sm">
                    Use arrows to navigate
                </div>

                <button
                    onClick={handleNext}
                    disabled={currentIndex === cards.length - 1}
                    className="p-4 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-slate-600"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
            </div>

            <style jsx>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
            `}</style>
        </div>
    );
};

export default function CoursePlayer() {
    const { id } = useParams();
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

    // ✅ State สำหรับเก็บสถานะการลงทะเบียน (Approved หรือไม่)
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [isExpired, setIsExpired] = useState(false);

    // ✅ State สำหรับ Mobile Menu
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showCertificate, setShowCertificate] = useState(false);

    // 1. Check Enrollment
    useEffect(() => {
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
                    if (!snapshot.empty) {
                        const enrollmentData = snapshot.docs[0].data();

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

                        // ✅ Update Last Accessed Time
                        const enrollRef = doc(db, "enrollments", snapshot.docs[0].id);
                        await setDoc(enrollRef, {
                            lastAccessedAt: serverTimestamp()
                        }, { merge: true });
                    }
                } catch (error) {
                    console.error("Error checking enrollment:", error);
                }
            };
            checkEnrollment();
        }
    }, [user, courseId, authLoading]);

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

    // ✅ Group lessons by header (Robust Logic matching Admin)
    const groupedLessons = useMemo(() => {
        const headers = visibleLessons.filter(l => l.type === 'header');
        const groups = headers.map(header => ({ header, items: [] as Lesson[] }));
        const uncategorizedItems: Lesson[] = [];

        visibleLessons.forEach(lesson => {
            if (lesson.type === 'header') return;
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

        return groups;
    }, [visibleLessons]);

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

    // ✅ เช็คสิทธิ์บทเรียนปัจจุบัน
    const canWatchCurrent = activeLesson ? isLessonUnlocked(activeLesson) : false;

    const currentVideoId = canWatchCurrent ? (activeLesson ? activeLesson.videoId : course.videoId) : "";
    const isHeaderMode = activeLesson?.type === 'header';

    if (authLoading || dataLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>;
    if (!course) return <div className="min-h-screen bg-white flex items-center justify-center">ไม่พบคอร์สเรียนนี้</div>;

    return (
        <div className="h-[100dvh] bg-[#F3F4F6] font-sans flex overflow-hidden relative">
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
            <aside className={`
                w-80 bg-white border-r border-gray-200 flex-shrink-0 h-full
                fixed inset-y-0 left-0 z-50 
                overflow-y-auto lg:overflow-hidden
                md:relative md:z-20 lg:flex lg:flex-col
                transition-transform duration-300 ease-in-out shadow-xl md:shadow-sm
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-5 border-b border-gray-100 bg-white z-10 flex flex-col items-center lg:flex-shrink-0">

                    {/* ปุ่มการ์ดย้อนกลับ */}
                    <Link href="/my-courses" className="w-full flex items-center justify-center gap-2 bg-white border-2 border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 px-4 py-3 rounded-2xl font-bold transition-all mb-6 shadow-sm group transform hover:-translate-y-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform text-indigo-400 group-hover:text-indigo-600"><path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" /></svg>
                        <span>กลับหน้ารวมคอร์ส</span>
                    </Link>

                    <div className="w-4/5 aspect-video rounded-xl overflow-hidden shadow-lg bg-gray-100 mb-4">
                        {course.image ?
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={course.image} alt="Cover" className="w-full h-full object-cover" /> :
                            <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>}
                    </div>
                    <h2 className="font-bold text-gray-800 text-center px-2 text-sm">{course?.title}</h2>
                    {user && (
                        <div className="mt-3 w-full px-2">
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <p className="text-[10px] text-gray-500 text-right mt-1 font-bold">{progressPercent}% COMPLETED</p>
                        </div>
                    )}

                    {/* ✅ Google Drive Link Button */}
                    {course?.docUrl && (
                        <a
                            href={course.docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 w-[90%] flex items-center justify-center gap-2 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 group-hover:scale-110 transition-transform">
                                <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
                                <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                            </svg>
                            เอกสารประกอบการเรียน
                        </a>
                    )}
                </div>

                <div className="lg:flex-1 lg:overflow-y-auto custom-scrollbar pb-20 lg:pb-0">
                    {groupedLessons.map((group: any) => {
                        const isOpen = openSections.includes(group.header.id);
                        return (
                            <div key={group.header.id} className="border-b border-gray-50">
                                <button onClick={() => toggleSection(group.header.id)} className="w-full flex flex-col p-4 bg-white hover:bg-gray-50 transition text-left group">
                                    <div className="flex items-center justify-between w-full mb-2">
                                        <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight truncate pr-2 flex-1">
                                            {group.header.title}
                                        </h3>
                                        <span className={`text-gray-400 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                                    </div>
                                </button>

                                <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                    <div className="overflow-hidden">
                                        <div className="bg-gray-50/50">
                                            {group.items.map((lesson: Lesson) => {
                                                const isUnlocked = isLessonUnlocked(lesson);
                                                const isActive = activeLesson?.id === lesson.id;
                                                const isCompleted = completedLessons.includes(lesson.id);
                                                return (
                                                    <button
                                                        key={lesson.id}
                                                        onClick={() => {
                                                            if (isUnlocked) {
                                                                changeLesson(lesson);
                                                                setIsMobileMenuOpen(false); // Close menu on selection
                                                            }
                                                        }}
                                                        disabled={!isUnlocked}
                                                        className={`w-full flex items-center gap-3 py-3 px-6 text-left border-l-4 transition hover:bg-gray-100
                                                    ${isActive ? 'border-green-500 bg-white shadow-sm' : 'border-transparent'}
                                                    ${!isUnlocked ? 'opacity-50 cursor-not-allowed' : ''}
                                                `}
                                                    >
                                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-300 bg-white'} ${lesson.type === 'exercise' ? 'rounded-none' : ''}`}>
                                                            {isCompleted && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`text-sm truncate ${isActive ? 'text-gray-800 font-bold' : 'text-gray-600'}`}>
                                                                {lesson.title}
                                                                {lesson.isHidden && <span className="text-[10px] text-gray-400 ml-2 font-normal">(Hidden)</span>}
                                                            </p>
                                                            <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                                                                {lesson.type === 'quiz' ? <QuestionIcon /> : lesson.type === 'text' ? <TextIcon /> : lesson.type === 'exercise' ? <ExerciseIcon /> : lesson.type === 'html' ? <HtmlIcon /> : lesson.type === 'flashcard' ? <FlashcardIcon /> : <PlayIcon />}
                                                                <span>{lesson.type === 'video' ? 'Video' : lesson.type === 'quiz' ? 'Quiz' : lesson.type === 'exercise' ? 'Exercise' : lesson.type === 'html' ? 'HTML' : lesson.type === 'flashcard' ? 'Flashcard' : 'Reading'}</span>
                                                            </div>
                                                        </div>
                                                        {!isUnlocked && <span className="ml-auto text-xs">🔒</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative bg-white min-w-0">
                <header className="h-16 md:h-20 bg-white/90 backdrop-blur-md border-b border-gray-100 flex justify-between items-center px-4 md:px-10 sticky top-0 z-30 shadow-sm">
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

                        <div className="min-w-0">
                            <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Current Lesson</p>
                            <h1 className="text-base md:text-2xl font-extrabold text-gray-800 truncate">{activeLesson?.title || "Loading..."}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* ✅ Certificate Button (Always Show) */}
                        <button
                            onClick={() => {
                                if (progressPercent === 100) {
                                    setShowCertificate(true);
                                } else {
                                    alert(`🔒 ยังไม่ปลดล็อกไอเทม!\n\nน้องๆ ต้องเรียนให้ครบ 100% ก่อนนะครับ ถึงจะรับใบประกาศนียบัตรสุดเท่ได้!\n(ตอนนี้ทำภารกิจไปแล้ว ${progressPercent}%)`);
                                }
                            }}
                            className={`hidden md:flex items-center gap-2 px-5 py-2.5 rounded-full font-bold shadow-lg transition
                            ${progressPercent === 100
                                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-orange-200 hover:scale-105 animate-pulse'
                                    : 'bg-white border-2 border-slate-200 text-slate-400 hover:border-yellow-400 hover:text-yellow-500 hover:bg-yellow-50'
                                }`}
                        >
                            <span className="text-xl">{progressPercent === 100 ? '🏆' : '🔒'}</span>
                            <span>รับใบประกาศนียบัตร</span>
                        </button>

                        {user && canWatchCurrent && !isHeaderMode && (
                            <button onClick={handleNextLesson} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 px-3 md:px-5 py-2 md:py-2.5 rounded-full font-bold transition-all shadow-sm hover:shadow-md group text-sm md:text-base">
                                {completedLessons.includes(activeLesson?.id || "") ? <><span className="hidden md:inline">เรียนจบแล้ว</span> <CheckIcon /></> : <><span className="hidden md:inline">บันทึกความคืบหน้าและไปตอนต่อไป</span> <span className="group-hover:translate-x-1 transition">→</span></>}
                            </button>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto bg-[#F9FAFB] relative">
                    {/* Summary Button (Floating) */}
                    {canWatchCurrent && !isHeaderMode && activeLesson?.type !== 'quiz' && (
                        <button
                            onClick={() => setIsNotesOpen(!isNotesOpen)}
                            className={`absolute top-6 right-6 z-30 flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all shadow-lg backdrop-blur-md border
                            ${activeLesson?.type === 'video'
                                    ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                                    : 'bg-white/60 border-white/40 text-slate-700 hover:bg-white/80'}
                        `}
                        >
                            <span>📝</span>
                            <span>สรุปเนื้อหา</span>
                        </button>
                    )}

                    {/* Notes Drawer */}
                    <div className={`absolute top-0 right-0 h-full w-full md:w-[400px] bg-white/80 backdrop-blur-2xl border-l border-white/40 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${isNotesOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}>
                        <div className="p-6 border-b border-white/30 flex justify-between items-center bg-white/20 backdrop-blur-sm sticky top-0 z-10">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">📝 สรุปเนื้อหา</h3>
                            <button onClick={() => setIsNotesOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 text-slate-700 leading-loose whitespace-pre-wrap text-sm font-medium">
                            {activeLesson?.content || <div className="text-center text-slate-500 italic py-10">ไม่มีบันทึกย่อสำหรับบทเรียนนี้</div>}
                        </div>
                    </div>

                    {isHeaderMode ? (
                        <div className="h-full flex items-center justify-center p-10">
                            {activeLesson?.image ?
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={activeLesson.image} alt="Header" className="max-w-full max-h-full rounded-xl shadow-2xl" />
                                : <div className="text-gray-400">No Cover Image</div>}
                        </div>
                    ) : canWatchCurrent ? (
                        activeLesson?.type === 'quiz' ? (
                            <div className="w-full min-h-full flex flex-col items-center justify-center py-10 px-4 bg-slate-100">
                                <div className="w-full max-w-3xl bg-white rounded-[2rem] shadow-xl border border-slate-200 p-8 md:p-12 text-center">
                                    <h2 className="text-3xl font-bold text-slate-800 mb-8">{activeLesson.title}</h2>
                                    <div className="space-y-4 text-left">
                                        {activeLesson.options?.map((opt: string, index: number) => {
                                            let btnClass = "border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 text-slate-600";
                                            if (isAnswered) {
                                                if (index === activeLesson.correctAnswer) btnClass = "bg-emerald-50 border-emerald-400 text-emerald-700";
                                                else if (selectedAnswer === index) btnClass = "bg-rose-50 border-rose-300 text-rose-600";
                                            } else if (selectedAnswer === index) btnClass = "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md";
                                            return <button key={index} onClick={() => !isAnswered && setSelectedAnswer(index)} className={`w-full p-5 rounded-2xl font-bold text-lg transition-all duration-200 ${btnClass}`}>{opt}</button>;
                                        })}
                                    </div>
                                    {!isAnswered ? (
                                        <button onClick={() => { setIsAnswered(true); if (selectedAnswer === activeLesson.correctAnswer) markAsComplete(activeLesson.id); }} disabled={selectedAnswer === null} className="mt-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-4 rounded-2xl font-bold text-xl shadow-lg shadow-indigo-200 hover:scale-105 transition disabled:opacity-50 disabled:hover:scale-100">ตรวจคำตอบ</button>
                                    ) : (
                                        <div className={`mt-10 p-6 rounded-2xl font-bold text-lg animate-in fade-in zoom-in duration-300 ${selectedAnswer === activeLesson.correctAnswer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                            {selectedAnswer === activeLesson.correctAnswer ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-5xl mb-2">🎉</span>
                                                    <span className="text-2xl">ถูกต้องครับ! เก่งมาก</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-5xl mb-2">😢</span>
                                                    <span className="text-2xl">ยังไม่ถูกนะครับ ลองใหม่นะ</span>
                                                    <button onClick={() => { setIsAnswered(false); setSelectedAnswer(null); }} className="mt-4 px-6 py-2 bg-white border border-rose-200 rounded-xl text-base hover:bg-rose-50 transition shadow-sm text-rose-600">🔄 ลองทำอีกครั้ง</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : activeLesson?.type === 'text' ? (
                            <div className="w-full min-h-full flex flex-col items-center justify-center py-10 px-4 bg-slate-100">
                                <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-xl border border-slate-200 p-8 md:p-14">
                                    {activeLesson.image && <img src={activeLesson.image} className="w-full mb-8 rounded-2xl shadow-md" />}
                                    <div className="prose prose-lg max-w-none text-slate-600 leading-loose whitespace-pre-wrap font-medium">{activeLesson.content}</div>
                                </div>
                            </div>
                        ) : activeLesson?.type === 'exercise' ? (
                            <div className="w-full min-h-full flex flex-col items-center justify-center py-10 px-4 bg-slate-100">
                                <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-xl border border-slate-200 p-12 text-center">
                                    <h2 className="text-3xl font-black text-slate-800 mb-8">{activeLesson.title}</h2>
                                    {activeLesson.docUrl ? (
                                        <a href={activeLesson.docUrl} target="_blank" className="inline-flex items-center gap-4 bg-emerald-500 text-white text-xl font-bold px-12 py-5 rounded-2xl shadow-lg shadow-emerald-200 hover:-translate-y-1 hover:shadow-xl transition-all">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" /><path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" /></svg>
                                            ดาวน์โหลดแบบฝึกหัด
                                        </a>
                                    ) : (
                                        <div className="text-slate-400 font-medium">ไม่พบไฟล์แบบฝึกหัด</div>
                                    )}
                                </div>
                            </div>
                        ) : activeLesson?.type === 'html' ? (
                            <div className="w-full min-h-full flex flex-col items-center justify-center py-10 px-4 bg-slate-100">
                                <div className="w-full max-w-5xl bg-white rounded-[2rem] shadow-xl border border-slate-200 p-8 md:p-12">
                                    <h2 className="text-3xl font-black text-slate-800 mb-6 border-b border-slate-100 pb-4">{activeLesson.title}</h2>
                                    {activeLesson.content && <div className="prose prose-lg max-w-none text-slate-600 mb-8 leading-loose whitespace-pre-wrap font-medium">{activeLesson.content}</div>}
                                    <div className="w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50" dangerouslySetInnerHTML={{ __html: activeLesson.htmlCode || "" }} />
                                </div>
                            </div>
                        ) : activeLesson?.type === 'flashcard' ? (
                            <div className="w-full min-h-full flex flex-col items-center justify-center py-10 px-4 bg-slate-100">
                                <div className="w-full max-w-4xl">
                                    <h2 className="text-3xl font-black text-slate-800 mb-8 text-center">{activeLesson.title}</h2>

                                    {activeLesson.flashcardData && activeLesson.flashcardData.length > 0 ? (
                                        <FlashcardPlayer cards={activeLesson.flashcardData} />
                                    ) : (
                                        <div className="text-center text-slate-400">ไม่พบข้อมูล Flashcard</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // Video Player
                            <div className="w-full h-full bg-black flex items-center justify-center">
                                <div className="w-full aspect-video max-h-full relative">
                                    <iframe src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=0&rel=0`} className="w-full h-full absolute inset-0" allowFullScreen></iframe>
                                </div>
                            </div>
                        )
                    ) : (
                        // Locked Screen
                        <div className="flex flex-col items-center justify-center h-full text-center p-10">
                            <div className="text-6xl mb-4">{isExpired ? '⏳' : '🔒'}</div>
                            <h2 className="text-2xl font-bold text-gray-800">{isExpired ? 'คอร์สหมดอายุแล้ว' : 'Lesson Locked'}</h2>
                            <p className="text-gray-500 mb-6">{isExpired ? 'ระยะเวลาการเรียนของคุณสิ้นสุดลงแล้ว กรุณาต่ออายุคอร์สเรียน' : 'กรุณาสมัครเรียนและรอการอนุมัติเพื่อเข้าถึงเนื้อหา'}</p>
                            <Link href="/payment" className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-orange-600 transition">
                                {isExpired ? 'ต่ออายุคอร์สเรียน' : 'แจ้งโอนเงิน / สมัครเรียน'}
                            </Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}