"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, limit, collectionGroup, addDoc, serverTimestamp, onSnapshot, updateDoc, doc, deleteDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, Paperclip, CheckCircle, Trash2, Clock, User, Send, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PollWidget from "@/components/PollWidget";
import { useUserAuth } from "@/context/AuthContext";
import ReviewForm from "@/app/reviews/ReviewForm";
import ErrorBoundary from "@/components/ErrorBoundary";
import { MyCoursesSkeleton } from "@/components/skeletons/MyCoursesSkeleton";

// --- Icons ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M21.731 2.269a2.625 2.625 0 113.71 3.71L9.6 18.833a1.125 1.125 0 01-.532.33L4.508 20.68a.375.375 0 01-.468-.468l1.516-4.549a1.125 1.125 0 01.33-.532L21.73 2.269zM9.75 16.5l-2 2 .75-3 1.25 1z" /></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" /></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" /></svg>;

// Import shared hooks
import { useDebounce } from "@/hooks/useDebounce";
// import { useGamification } from "@/hooks/useGamification"; // ❌ Removed for optimization
// import BadgeDisplay from "@/components/gamification/BadgeDisplay"; // ❌ Removed for optimization
// import ProgressBar from "@/components/gamification/ProgressBar"; // ❌ Removed for optimization
// import WeeklyProgressChart from "@/components/gamification/WeeklyProgressChart"; // ❌ Removed for optimization

export default function MyCoursesPage() {
    const { user, userProfile, isAdmin, updateProfile, loading: authLoading, daysSinceLastActive } = useUserAuth();
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewingCourse, setReviewingCourse] = useState<any>(null);
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

    // --- Welcome Message State ---
    const [welcomeMessage, setWelcomeMessage] = useState<{ title: string, msg: string, color: string, icon: string } | null>(null);

    // --- Smart Search State ---
    const [allCourses, setAllCourses] = useState<any[]>([]);
    const [allLessons, setAllLessons] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 300); // Debounce 300ms
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // --- Support Form State ---
    const [supportTickets, setSupportTickets] = useState<any[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [replyText, setReplyText] = useState("");
    const [replyFile, setReplyFile] = useState<File | null>(null);
    const [isSendingReply, setIsSendingReply] = useState(false);

    const [supportSubject, setSupportSubject] = useState("");
    const [supportMessage, setSupportMessage] = useState("");
    const [supportFile, setSupportFile] = useState<File | null>(null);
    const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
    const [supportViewMode, setSupportViewMode] = useState<'list' | 'form'>('list');

    // --- Progress Tracking State ---
    const [courseProgress, setCourseProgress] = useState<Record<string, { completed: number; total: number; percent: number; lastLessonId?: string }>>({});

    // --- Gamification ---
    // const { gamificationData, badges, loading: gamificationLoading } = useGamification(); // ❌ Removed for optimization

    // ✅ Load settings from LocalStorage
    useEffect(() => {
        const savedDismissed = localStorage.getItem("kruheem_dismissed_ids");
        if (savedDismissed) setDismissedIds(JSON.parse(savedDismissed));

        const savedShow = localStorage.getItem("kruheem_show_notifs");
        if (savedShow !== null) setShowNotifications(JSON.parse(savedShow));

        setIsLoaded(true);
    }, []);

    // ✅ Determine Welcome Message based on Days Absent
    useEffect(() => {
        if (daysSinceLastActive !== null) {
            if (daysSinceLastActive > 7) {
                setWelcomeMessage({
                    title: `ไม่ได้เจอกันนานเลยนะครับ! (${daysSinceLastActive} วัน)`,
                    msg: "ดีใจที่คุณกลับมา! อย่าลืมทบทวนบทเรียนบ่อยๆ นะครับ การเรียนอย่างสม่ำเสมอจะช่วยให้เก่งขึ้นไวมากครับ",
                    color: "bg-rose-100 border-rose-200 text-rose-800",
                    icon: "⏰"
                });
            } else if (daysSinceLastActive >= 3) {
                setWelcomeMessage({
                    title: `กลับมาแล้วสินะ! (หายไป ${daysSinceLastActive} วัน)`,
                    msg: "มาลุยกันต่อเลยครับ! ความพยายามอยู่ที่ไหน ความสำเร็จอยู่ที่นั่น",
                    color: "bg-orange-100 border-orange-200 text-orange-800",
                    icon: "🔥"
                });
            } else if (daysSinceLastActive >= 1) {
                setWelcomeMessage({
                    title: "ยินดีต้อนรับกลับครับ!",
                    msg: "พร้อมเรียนรู้วันนี้หรือยังครับ? ไปลุยกันเลย!",
                    color: "bg-indigo-100 border-indigo-200 text-indigo-800",
                    icon: "👋"
                });
            } else {
                // < 1 day (Came back same day)
                setWelcomeMessage(null);
            }
        }
    }, [daysSinceLastActive]);

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

    const handleSubmitSupport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supportSubject.trim() || !supportMessage.trim()) {
            alert("กรุณากรอกหัวข้อและรายละเอียด");
            return;
        }

        setIsSubmittingSupport(true);
        try {
            let attachmentUrl = "";
            if (supportFile) {
                const storageRef = ref(storage, `support/${user?.uid}/${Date.now()}_${supportFile.name}`);
                await uploadBytes(storageRef, supportFile);
                attachmentUrl = await getDownloadURL(storageRef);
            }

            await addDoc(collection(db, "support_tickets"), {
                userId: user?.uid,
                userName: userProfile?.displayName || user?.displayName || "Unknown",
                userEmail: user?.email,
                subject: supportSubject,
                message: supportMessage,
                attachmentUrl,
                status: "pending",
                createdAt: serverTimestamp()
            });

            alert("ส่งเรื่องแจ้งปัญหาเรียบร้อยแล้ว เจ้าหน้าที่จะรีบตรวจสอบครับ");
            setSupportSubject("");
            setSupportMessage("");
            setSupportFile(null);
            // fetchUserTickets(); // REFRESH DISABLED
        } catch (error) {
            console.error("Error submitting ticket:", error);
            alert("เกิดข้อผิดพลาดในการส่งเรื่อง");
        } finally {
            setIsSubmittingSupport(false);
        }
    };

    const AVATAR_CATEGORIES = {
        "ยอดนิยม": ["👦", "👧", "🧑", "👩", "😎", "🤓", "🤠", "🥳"],
        "สัตว์น่ารัก": ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🦄", "🐔", "🐧", "🐦", "🐤"],
        "มอนสเตอร์ & แฟนตาซี": ["👾", "👽", "🤖", "👻", "👺", "👹", "💀", "🦖", "🦕", "🐲", "🐉", "🧛", "🧟", "🧞", "🧜", "🧚"]
    };

    // Flatten for initial state check if needed, or just use categories in render
    const ALL_AVATARS = Object.values(AVATAR_CATEGORIES).flat();

    const [reviewedCourses, setReviewedCourses] = useState<Record<string, any>>({});

    // ... existing useEffect ...

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
            return;
        }

        // if (user) {
        //     const fetchCoursesAndReviews = async () => {
        //         try {
        //             // ...
        //         } catch (error) {
        //             console.error("Error:", error);
        //         } finally {
        //             setLoading(false);
        //         // FETCHING DISABLED
        //     };
        //     fetchCoursesAndReviews();
        //     fetchUserTickets();
        // }
        setLoading(false); // Force load for test
    }, [user, authLoading, router]);

    // const fetchUserTickets = async () => {
    //     if (!user) return;
    //     try {
    //         const q = query(collection(db, "support_tickets"), where("userId", "==", user.uid));
    //         const snapshot = await getDocs(q);
    //         const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    //         // Client-side sort to avoid index requirement
    //         tickets.sort((a, b) => {
    //             const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
    //             const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
    //             return dateB.getTime() - dateA.getTime();
    //         });
    //         setSupportTickets(tickets);
    //         if (tickets.length === 0) {
    //             setSupportViewMode('form');
    //         } else {
    //             setSupportViewMode('list');
    //         }
    //     } catch (error) {
    //         console.error("Error fetching tickets:", error);
    //     }
    // };

    // const handleDeleteTicket = async (e: React.MouseEvent, ticketId: string) => {
    //     e.stopPropagation();
    //     if (!confirm("คุณต้องการลบรายการแจ้งปัญหานี้ใช่หรือไม่?")) return;

    //     try {
    //         await deleteDoc(doc(db, "support_tickets", ticketId));
    //         // Note: Sub-collections (messages) are not automatically deleted in client SDK,
    //         // but for UI purposes, removing the parent is enough.
    //         // Ideally, use a Cloud Function for recursive delete.
    //         setSupportTickets(prev => prev.filter(t => t.id !== ticketId));
    //     } catch (error) {
    //         console.error("Error deleting ticket:", error);
    //         alert("เกิดข้อผิดพลาดในการลบรายการ");
    //     }
    // };

    // Real-time listener for messages when a ticket is selected
    useEffect(() => {
        if (!selectedTicket) return;

        let isMounted = true; // Guard to prevent state updates on unmounted component

        // 1. Listen to Messages
        // const qMessages = query(collection(db, "support_tickets", selectedTicket.id, "messages"), orderBy("createdAt", "asc"));
        // const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
        //     if (!isMounted) return;
        //     const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        //     setMessages(msgs);
        // });

        // 2. Listen to Ticket Status (for Read Receipts)
        // const unsubscribeTicket = onSnapshot(doc(db, "support_tickets", selectedTicket.id), (docSnap) => {
        //     if (!isMounted) return;
        //     if (docSnap.exists()) {
        //         const data = docSnap.data();
        //         // Update selectedTicket with latest data (especially lastAdminReadAt)
        //         setSelectedTicket((prev: any) => prev ? ({ ...prev, ...data }) : null);
        //     }
        // });

        // 3. Mark as read by user (Initial open)
        // updateDoc(doc(db, "support_tickets", selectedTicket.id), {
        //     lastUserReadAt: serverTimestamp()
        // }).catch(() => { }); // Ignore errors if component unmounts

        return () => {
            isMounted = false;
            // unsubscribeMessages();
            // unsubscribeTicket();
        };
    }, [selectedTicket?.id]);

    // const handleSendReply = async (e: React.FormEvent) => {
    //     e.preventDefault();
    //     if ((!replyText.trim() && !replyFile) || !selectedTicket) return;

    //     setIsSendingReply(true);
    //     try {
    //         let attachmentUrl = "";
    //         if (replyFile) {
    //             const storageRef = ref(storage, `support/user/${Date.now()}_${replyFile.name}`);
    //             await uploadBytes(storageRef, replyFile);
    //             attachmentUrl = await getDownloadURL(storageRef);
    //         }

    //         await addDoc(collection(db, "support_tickets", selectedTicket.id, "messages"), {
    //             text: replyText,
    //             attachmentUrl,
    //             sender: "user",
    //             createdAt: serverTimestamp()
    //         });
    //         setReplyText("");
    //         setReplyFile(null);
    //     } catch (error) {
    //         console.error("Error sending reply:", error);
    //         alert("ส่งข้อความไม่สำเร็จ");
    //     } finally {
    //         setIsSendingReply(false);
    //     }
    // };

    // ✅ Fetch Notifications (DISABLED FOR TEST)
    // useEffect(() => {
    //     if (!user) return;
    //
    //     const fetchNotifications = async () => {
    //        // ...
    //     };
    //     fetchNotifications();
    // }, [user?.uid, enrolledCourses]);

    // ✅ Smart Search Logic (with Debounce) (DISABLED FOR TEST)
    // useEffect(() => {
    //   // ...
    // }, [debouncedSearchQuery, allLessons, allCourses]);

    if (authLoading || loading) return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans">
            {/* Mesh Gradient Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-amber-200/40 dark:bg-indigo-900/30 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-blob"></div>
                <div className="absolute top-[10%] right-[-10%] w-[60vw] h-[60vw] bg-orange-200/40 dark:bg-purple-900/30 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000"></div>
            </div>
            <div className="relative z-10">
                <Navbar />
                <div className="max-w-7xl mx-auto px-6 md:px-12 pb-24 pt-40">
                    <MyCoursesSkeleton />
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-teal-200 selection:text-teal-900 flex flex-col overflow-x-hidden transition-colors">
            {/* Dynamic Mesh Gradient Background (Warm Paper Theme) */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-amber-200/40 dark:bg-indigo-900/30 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-blob"></div>
                <div className="absolute top-[10%] right-[-10%] w-[60vw] h-[60vw] bg-orange-200/40 dark:bg-purple-900/30 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-[70vw] h-[70vw] bg-yellow-100/40 dark:bg-slate-800/40 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-4000"></div>
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.05] dark:opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                <Navbar />

                <ErrorBoundary>
                    <div className="max-w-7xl mx-auto px-6 md:px-12 pb-24 pt-40 flex-grow w-full">

                        {/* ✅ Welcome Message (Last Active) */}
                        {welcomeMessage && (
                            <div className={`mb-8 p-6 rounded-[2rem] border-2 flex items-center md:items-start gap-6 shadow-sm animate-in slide-in-from-top-4 duration-500 ${welcomeMessage.color}`}>
                                <div className="text-5xl bg-white rounded-full w-20 h-20 flex items-center justify-center shadow-sm flex-shrink-0 border-4 border-white/50">
                                    {welcomeMessage.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-black text-2xl mb-2 tracking-tight">{welcomeMessage.title}</h3>
                                    <p className="font-medium opacity-90 leading-relaxed text-lg">{welcomeMessage.msg}</p>
                                </div>
                                <button
                                    onClick={() => setWelcomeMessage(null)}
                                    className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white/50 rounded-full transition"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        )}

                        {/* 🏆 Gamification Section - Achievement Progress - REMOVED FOR OPTIMIZATION */}
                        {/* {!gamificationLoading && gamificationData && badges.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                                    <BadgeDisplay badges={badges} gamificationData={gamificationData} />
                                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <ProgressBar gamificationData={gamificationData} badges={badges} />
                                    </div>
                                </div>
                                <div className="lg:col-span-1">
                                    <WeeklyProgressChart
                                        completedCourses={gamificationData.completedCourses}
                                        totalCourses={gamificationData.totalCourses}
                                    />
                                </div>
                            </div>
                        )} */}

                        {/* ✅ 4 Cards Grid Layout - PARTIALLY DISABLED */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">

                            {/* Card 1: Student Profile (ENABLED) */}
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden group h-full flex flex-col justify-center">
                                {/* ... Profile Content ... */}
                                <div className="absolute top-0 right-0 w-40 h-40 bg-slate-50 rounded-bl-full -mr-10 -mt-10 opacity-50"></div>
                                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
                                    <div className="relative flex-shrink-0">
                                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 p-1 shadow-lg transform group-hover:scale-105 transition-transform duration-500">
                                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden text-6xl">
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
                                    </div>
                                    <div className="text-center sm:text-left">
                                        <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold mb-2">
                                            🎓 นักเรียนของ KruHeem
                                        </div>
                                        <h1 className="text-2xl font-black text-slate-800 mb-1">
                                            {userProfile?.displayName || user?.displayName || "นักเรียน"}
                                        </h1>
                                        <p className="text-slate-500 text-sm">
                                            พร้อมที่จะเรียนรู้คณิตศาสตร์ให้สนุกหรือยัง?
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Search (DISABLED) */}
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col h-full opacity-50 pointer-events-none grayscale">
                                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    (Disabled for Test)
                                </h2>
                            </div>
                            {/* Notifications (DISABLED) */}
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 h-full opacity-50 pointer-events-none grayscale">
                                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    (Disabled for Test)
                                </h2>
                            </div>
                            {/* Support (DISABLED) */}
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 h-full opacity-50 pointer-events-none grayscale">
                                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    (Disabled for Test)
                                </h2>
                            </div>

                        </div>

                        {/* ✅ Courses List (DISABLED) */}
                        <h1 className="text-3xl font-black text-slate-800 mb-8 flex items-center gap-3 opacity-50">
                            📖 คอร์สเรียนของฉัน (Disabled)
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
                                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2 line-clamp-2">{course.title}</h3>

                                                        {/* Progress Bar */}
                                                        {course.status === 'approved' && courseProgress[course.id] && (
                                                            <div className="mb-3">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-[10px] font-bold text-slate-500">ความคืบหน้า</span>
                                                                    <span className={`text-[10px] font-bold ${courseProgress[course.id].percent === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                                                        {courseProgress[course.id].percent}%
                                                                    </span>
                                                                </div>
                                                                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full transition-all duration-700 ease-out rounded-full ${courseProgress[course.id].percent === 100 ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-indigo-400 to-purple-500'}`}
                                                                        style={{ width: `${courseProgress[course.id].percent}%` }}
                                                                    />
                                                                </div>
                                                                <p className="text-[9px] text-slate-400 mt-1 text-right">
                                                                    {courseProgress[course.id].completed}/{courseProgress[course.id].total} บทเรียน
                                                                </p>
                                                            </div>
                                                        )}

                                                        <div className="mt-auto pt-4">
                                                            {course.status === 'approved' ? (
                                                                <>
                                                                    {(() => {
                                                                        if (course.accessType === 'lifetime') {
                                                                            return (
                                                                                <div className="mb-3 flex justify-center">
                                                                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 shadow-sm flex items-center gap-1">
                                                                                        ♾️ เรียนได้ตลอดชีพ
                                                                                    </span>
                                                                                </div>
                                                                            );
                                                                        } else if (course.expiryDate) {
                                                                            const now = new Date();
                                                                            const expiry = course.expiryDate.toDate ? course.expiryDate.toDate() : new Date(course.expiryDate);
                                                                            const diffTime = expiry.getTime() - now.getTime();
                                                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                                                            if (diffDays <= 0) {
                                                                                return (
                                                                                    <div className="mb-3 flex justify-center">
                                                                                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100 flex items-center gap-1">
                                                                                            🔒 หมดอายุแล้ว ({expiry.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })})
                                                                                        </span>
                                                                                    </div>
                                                                                );
                                                                            } else {
                                                                                return (
                                                                                    <div className="mb-3 flex flex-col items-center gap-1">
                                                                                        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border shadow-sm flex items-center gap-1 ${diffDays < 30 ? 'text-orange-600 bg-orange-50 border-orange-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                                                                                            ⏳ เหลือเวลาเรียน {diffDays} วัน
                                                                                        </span>
                                                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                                                            หมดอายุ: {expiry.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                                                        </span>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                        }
                                                                        return null;
                                                                    })()}

                                                                    {(() => {
                                                                        const isExpired = course.expiryDate && course.accessType !== 'lifetime' && (course.expiryDate.toDate ? course.expiryDate.toDate() : new Date(course.expiryDate)) < new Date();

                                                                        if (isExpired) {
                                                                            return (
                                                                                <button disabled className="w-full py-3 rounded-xl bg-slate-100 text-slate-400 font-bold cursor-not-allowed flex items-center justify-center gap-2">
                                                                                    🔒 หมดอายุการใช้งาน
                                                                                </button>
                                                                            );
                                                                        }

                                                                        return (
                                                                            <div className="flex flex-col gap-2 w-full">
                                                                                {courseProgress[course.id]?.percent > 0 && courseProgress[course.id]?.lastLessonId ? (
                                                                                    <Link
                                                                                        href={`/learn/${course.id}?lessonId=${courseProgress[course.id].lastLessonId}`}
                                                                                        className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
                                                                                    >
                                                                                        <PlayIcon /> เรียนต่อจากที่ค้าง
                                                                                    </Link>
                                                                                ) : (
                                                                                    <Link
                                                                                        href={`/learn/${course.id}`}
                                                                                        className="w-full py-3 rounded-xl bg-[#D9E9CF] hover:bg-[#C8DDBB] text-emerald-800 font-bold flex items-center justify-center gap-2 transition shadow-sm"
                                                                                    >
                                                                                        <PlayIcon /> {courseProgress[course.id]?.percent === 0 ? 'เริ่มเรียน' : 'เข้าเรียน'}
                                                                                    </Link>
                                                                                )}
                                                                                {reviewedCourses[course.id] ? (
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setReviewingCourse({
                                                                                                ...course,
                                                                                                initialCouponCode: reviewedCourses[course.id].couponCode,
                                                                                                isCouponUsed: reviewedCourses[course.id].isCouponUsed
                                                                                            });
                                                                                            setShowReviewModal(true);
                                                                                        }}
                                                                                        className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm border ${reviewedCourses[course.id].isCouponUsed
                                                                                            ? "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                                                                                            : "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200"
                                                                                            }`}
                                                                                    >
                                                                                        {reviewedCourses[course.id].isCouponUsed ? "✔️ ใช้โค้ดแล้ว" : "🎟️ ดูโค้ดส่วนลด"}
                                                                                    </button>
                                                                                ) : (
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setReviewingCourse(course);
                                                                                            setShowReviewModal(true);
                                                                                        }}
                                                                                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-100 to-orange-100 text-orange-800 font-bold text-sm flex items-center justify-center gap-2 hover:from-amber-200 hover:to-orange-200 transition shadow-sm border border-orange-200/50"
                                                                                    >
                                                                                        🎁 รีวิวรับคูปอง
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </>
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
                    <PollWidget />
                </ErrorBoundary>
            </div>

            {/* ✅ Profile Edit Modal */}
            {
                showProfileModal && (
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
                )
            }
            {/* ✅ Chat Modal (User Side) */}
            {
                selectedTicket && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTicket(null)}></div>
                        <div className="bg-white rounded-[2rem] w-full max-w-lg h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative z-10">
                            {/* Modal Header */}
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h3 className="font-bold text-slate-800 truncate max-w-[200px]">{selectedTicket.subject}</h3>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selectedTicket.status === 'resolved' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                        {selectedTicket.status === 'resolved' ? 'แก้ไขแล้ว' : 'รอตรวจสอบ'}
                                    </span>
                                </div>
                                <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-slate-200 rounded-full transition">
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>

                            {/* Chat Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar">
                                {/* Original Ticket Message */}
                                <div className="flex justify-end">
                                    <div className="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-none max-w-[85%] shadow-sm">
                                        <p className="text-sm">{selectedTicket.message}</p>
                                        {selectedTicket.attachmentUrl && (
                                            <a href={selectedTicket.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-200 bg-indigo-700/50 px-2 py-1 rounded-lg hover:bg-indigo-700 transition">
                                                <Paperclip size={12} /> ไฟล์แนบ
                                            </a>
                                        )}
                                        <span className="text-[10px] text-indigo-200 block mt-1 text-right">
                                            {selectedTicket.createdAt?.toDate ? selectedTicket.createdAt.toDate().toLocaleString('th-TH') : 'เริ่มต้น'}
                                        </span>
                                    </div>
                                </div>

                                {/* Conversation */}
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`p-3 rounded-2xl max-w-[85%] shadow-sm ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'}`}>
                                            <p className="text-sm">{msg.text}</p>
                                            {msg.attachmentUrl && (
                                                <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className={`mt-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${msg.sender === 'user' ? 'bg-indigo-700/50 text-indigo-100 hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>
                                                    <Paperclip size={12} /> ไฟล์แนบ
                                                </a>
                                            )}
                                            <div className={`flex items-center gap-1 mt-1 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <span className={`text-[10px] ${msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString('th-TH') : 'เมื่อสักครู่'}
                                                </span>
                                                {msg.sender === 'user' && (
                                                    <span className="text-[10px] ml-1 font-bold">
                                                        {selectedTicket.lastAdminReadAt?.toDate && msg.createdAt?.toDate && selectedTicket.lastAdminReadAt.toDate() > msg.createdAt.toDate() ? (
                                                            <span className="text-green-300">อ่านแล้ว</span>
                                                        ) : (
                                                            <span className="text-indigo-300">ยังไม่อ่าน</span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Input Area (DISABLED) */}
                            {/* <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-slate-100 flex gap-2 items-end">
                                ...
                            </form> */}
                        </div>
                    </div>
                )
            }

            {/* ✅ Review Modal */}
            {
                showReviewModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReviewModal(false)}></div>
                        <div className="relative z-10 w-full max-w-lg animate-in fade-in zoom-in-95 duration-300">
                            {/* We wrap ReviewForm and add a close button */}
                            <div className="relative">
                                <ReviewForm
                                    courseId={reviewingCourse?.id}
                                    courseName={reviewingCourse?.title}
                                    initialCouponCode={reviewingCourse?.initialCouponCode}
                                    isCouponUsed={reviewingCourse?.isCouponUsed}
                                />
                                <button
                                    onClick={() => {
                                        setShowReviewModal(false);
                                        setReviewingCourse(null);
                                    }}
                                    className="absolute top-4 right-4 bg-white text-slate-800 w-10 h-10 rounded-full flex items-center justify-center transition shadow-lg hover:scale-110 active:scale-90 z-50 border-2 border-slate-100"
                                >
                                    <X size={24} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}