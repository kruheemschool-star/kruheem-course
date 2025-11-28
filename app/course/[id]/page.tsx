"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useUserAuth } from "@/context/AuthContext";

// SVG Icons for Content
const CheckIcon = () => (
    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
);
const StarIcon = () => (
    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
);

export default function CourseSalesPage() {
    const { id } = useParams();
    const courseId = typeof id === 'string' ? id : "";
    const { user, googleSignIn } = useUserAuth();

    const [course, setCourse] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Payment States
    const [enrollmentStatus, setEnrollmentStatus] = useState<'none' | 'pending' | 'approved'>('none');
    const [isNavigating, setIsNavigating] = useState(false);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [slipPreview, setSlipPreview] = useState("");
    const [studentInfo, setStudentInfo] = useState({ fullName: "", tel: "", lineId: "" });

    // FAQ State
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

    // Review Images (1-19 .jpg)
    const reviewImages = Array.from({ length: 19 }, (_, i) => `/images/reviews/review${i + 1}.jpg`);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        if (user?.displayName && !studentInfo.fullName) {
            setStudentInfo(prev => ({ ...prev, fullName: user.displayName || "" }));
        }
    }, [user, studentInfo.fullName]);

    useEffect(() => {
        if (!courseId) return;
        const fetchData = async () => {
            try {
                const courseDoc = await getDoc(doc(db, "courses", courseId));
                if (courseDoc.exists()) setCourse(courseDoc.data());

                // Fetch lessons just to check if they exist or for future use, but currently unused in UI
                // Keeping it commented out or removing if truly unused.
                // const q = query(collection(db, "courses", courseId, "lessons"), orderBy("createdAt", "asc"));
                // const querySnapshot = await getDocs(q);
                // setLessons(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) { console.error("Error:", error); }
            finally { setLoading(false); }
        };
        fetchData();
    }, [courseId]);

    useEffect(() => {
        if (user && courseId) {
            const enrollRef = doc(db, "enrollments", `${user.uid}_${courseId}`);
            const unsubscribe = onSnapshot(enrollRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setEnrollmentStatus(data.status);
                    setStudentInfo(prev => ({
                        fullName: prev.fullName || data.studentName || "",
                        tel: prev.tel || data.studentTel || "",
                        lineId: prev.lineId || data.studentLine || ""
                    }));
                    if (data.slipUrl && !slipPreview) {
                        setSlipPreview(data.slipUrl);
                    }
                } else {
                    setEnrollmentStatus('none');
                }
            });
            return () => unsubscribe();
        }
    }, [user, courseId, slipPreview]);

    const handleLogin = async () => {
        try {
            await googleSignIn();
        } catch (error) { console.error("Login error", error); }
    };

    const handlePaymentClick = async () => {
        if (user) {
            setIsNavigating(true);
            await new Promise(resolve => setTimeout(resolve, 800));
            router.push("/payment");
        } else {
            handleLogin();
        }
    };

    if (loading) return <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center text-stone-500">กำลังโหลด...</div>;
    if (!course) return <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center text-stone-500">ไม่พบคอร์สเรียนนี้</div>;

    const descriptionPoints = (course.description || course.desc)
        ? (course.description || course.desc).split('\n').filter((line: string) => line.trim() !== "")
        : [];

    return (
        <div className="min-h-screen bg-[#F8F9FD] font-sans text-slate-800 selection:bg-indigo-100 selection:text-indigo-900">

            <Navbar />

            {/* 1. Hero Section (Glassmorphism + Pastel) */}
            <header className="relative pt-32 pb-20 md:pb-28 overflow-hidden font-sans sticky top-0 z-0">
                {/* Pastel Background with Mesh Gradient */}
                <div className="absolute inset-0 bg-[#Fdfbf7] z-0">
                    <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-200/40 rounded-full blur-3xl mix-blend-multiply animate-blob"></div>
                    <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000"></div>
                    <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-pink-200/40 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-4000"></div>
                </div>

                <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row gap-16 items-center relative z-10">
                    <div className="flex-1 space-y-8 text-center md:text-left">

                        {/* Category Badge (Glass) */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/50 bg-white/30 backdrop-blur-md shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></span>
                            <span className="text-xs font-bold text-slate-600 tracking-wide uppercase">
                                {course.category || "คอร์สแนะนำ"}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight text-slate-800 drop-shadow-sm">
                            {course.title}
                        </h1>

                        {/* Buttons & Price */}
                        <div className="flex flex-col items-center md:items-start gap-6 pt-2">
                            {enrollmentStatus === 'approved' ? (
                                <Link href={`/learn/${courseId}`}>
                                    <button className="group relative px-10 py-4 rounded-2xl font-bold text-lg text-white overflow-hidden transition-all hover:-translate-y-1 shadow-xl shadow-green-200">
                                        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="absolute inset-0 bg-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-20 transition-opacity"></div>
                                        <div className="relative flex items-center gap-3">
                                            <span>เข้าสู่ห้องเรียน</span>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                        </div>
                                    </button>
                                </Link>
                            ) : enrollmentStatus === 'pending' ? (
                                <button
                                    onClick={() => router.push("/payment")}
                                    className="px-8 py-4 rounded-2xl font-bold bg-white/40 border border-white/60 backdrop-blur-md text-amber-600 shadow-lg shadow-amber-100/50 flex items-center gap-3 transition-transform hover:scale-105"
                                >
                                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping"></div>
                                    รอตรวจสอบสถานะ
                                </button>
                            ) : (
                                <div className="flex flex-col gap-5 w-full md:w-auto">
                                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                        {/* Enroll Button (Glassmorphism High Emphasis) */}
                                        <button
                                            onClick={handlePaymentClick}
                                            className="group relative px-8 py-4 rounded-2xl font-bold text-lg text-white overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-200/50"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-90"></div>
                                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                                            <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 blur-sm"></div>

                                            <div className="relative flex items-center gap-3">
                                                <span>สมัครเรียนทันที</span>
                                                <span className="bg-white/20 border border-white/20 px-2 py-0.5 rounded text-sm backdrop-blur-sm">
                                                    {course.price ? `฿${course.price.toLocaleString()}` : 'ฟรี'}
                                                </span>
                                            </div>
                                        </button>

                                        {/* Free Trial Button (Glassmorphism Low Emphasis) */}
                                        <Link href={`/learn/${courseId}`}>
                                            <button className="px-8 py-4 rounded-2xl font-bold text-lg text-slate-600 bg-white/30 border border-white/60 backdrop-blur-md hover:bg-white/50 hover:border-white transition-all duration-300 shadow-lg shadow-slate-200/30 flex items-center gap-2 group">
                                                <span className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform shadow-sm">▶</span>
                                                ทดลองเรียน
                                            </button>
                                        </Link>
                                    </div>

                                    {course.price > 0 && (
                                        <div className="flex items-center justify-center md:justify-start gap-2 text-lg text-slate-600 font-medium bg-white/40 px-6 py-3 rounded-full backdrop-blur-sm border border-white/50 w-fit mx-auto md:mx-0 shadow-sm">
                                            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            <p>
                                                เฉลี่ยเพียงวันละ <span className="text-indigo-600 font-extrabold text-2xl">{(course.price / (5 * 365)).toFixed(2)}</span> บาท
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-full md:w-5/12">
                        <div className="relative group perspective-1000">
                            {/* Glass Card Container for Image */}
                            <div className="relative rounded-[2.5rem] p-3 bg-white/30 backdrop-blur-xl border border-white/50 shadow-2xl shadow-indigo-100/50 transform transition-all duration-500 hover:scale-[1.02] hover:-rotate-1">
                                <div className="relative rounded-[2rem] overflow-hidden shadow-inner">
                                    {course.image ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={course.image} alt={course.title} className="w-full h-auto object-cover" />
                                    ) : (
                                        <div className="w-full h-80 bg-indigo-50 flex items-center justify-center text-6xl">📚</div>
                                    )}

                                    {/* Play Overlay (Glass) */}
                                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                                        <div className="w-20 h-20 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center border border-white/60 shadow-xl transform scale-75 group-hover:scale-100 transition-all duration-300">
                                            <span className="text-white text-4xl ml-2 drop-shadow-md">▶</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CSS for Blob Animation */}
                <style jsx>{`
                    @keyframes blob {
                        0% { transform: translate(0px, 0px) scale(1); }
                        33% { transform: translate(30px, -50px) scale(1.1); }
                        66% { transform: translate(-20px, 20px) scale(0.9); }
                        100% { transform: translate(0px, 0px) scale(1); }
                    }
                    .animate-blob {
                        animation: blob 7s infinite;
                    }
                    .animation-delay-2000 {
                        animation-delay: 2s;
                    }
                    .animation-delay-4000 {
                        animation-delay: 4s;
                    }
                `}</style>
            </header>

            {/* Main wrapper (Overlapping Scroll Effect) */}
            <main className="relative z-10 bg-[#F8F9FD] rounded-t-[3rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] -mt-10 pb-10 overflow-hidden">

                {/* Decorative Top Line */}
                <div className="w-20 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-8"></div>

                {/* 2. Why this Course */}
                <section className="max-w-4xl mx-auto px-6 py-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-800 mb-4">สิ่งที่จะได้รับจากคอร์สนี้ 💡</h2>
                        <p className="text-slate-500">สรุปเนื้อหาเน้นๆ ที่จะเปลี่ยนเกรดของคุณให้พุ่งกระฉูด</p>
                    </div>

                    <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                        <div className="grid gap-4">
                            {descriptionPoints.map((point: string, index: number) => (
                                <div key={index} className="flex items-start gap-3">
                                    <div className="mt-1"><CheckIcon /></div>
                                    <p className="text-slate-600 leading-relaxed text-lg">{point}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 3. Example Docs */}
                {course.docUrl && (
                    <section className="bg-blue-50 py-16 border-y border-blue-100">
                        <div className="max-w-5xl mx-auto px-6 text-center">
                            <h2 className="text-2xl font-bold text-blue-900 mb-8">📄 พร้อมเอกสารประกอบการเรียนสีสวยสดใส</h2>
                            <div className="flex flex-wrap justify-center gap-6">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="w-48 h-64 bg-white shadow-lg rounded-lg border border-slate-200 flex items-center justify-center transform hover:-translate-y-2 transition duration-300">
                                        <span className="text-slate-300 text-4xl font-bold">PAGE {i}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-8 text-blue-600 font-medium">ดาวน์โหลดได้ทันทีเมื่อสมัครเรียน!</p>
                        </div>
                    </section>
                )}

                {/* 4. Two Choices Section */}
                <section className="max-w-6xl mx-auto px-6 py-16">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">ทางเลือกมีแค่ 2 ทาง... <br className="md:hidden" />อยู่ที่คุณจะเลือก</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Choice 1: Old Path (Pastel Blue/Gray) */}
                        <div className="bg-slate-50 rounded-3xl p-8 md:p-10 border border-slate-200 relative overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-slate-200/50">
                            <h3 className="text-2xl font-bold text-slate-700 mb-6">ทางเลือกที่ 1: เส้นทางเดิม</h3>
                            <p className="text-slate-600 leading-relaxed text-lg">
                                ปล่อยให้ความสับสนและความกังวลกัดกินหัวใจของน้องต่อไป... ทุกๆ วันที่ผ่านไปคือการปล่อยให้เขาเผชิญหน้ากับโจทย์ที่ไม่เข้าใจอยู่ลำพัง ความมั่นใจที่เคยมีค่อยๆ เลือนหายไป กลายเป็นความกลัวที่จะยกมือถาม ปล่อยให้ช่องว่างระหว่างเขากับเพื่อนร่วมห้องถ่างกว้างขึ้นเรื่อยๆ จนตามไม่ทัน และที่น่าเสียดายที่สุด คือการปล่อยให้โอกาสทองในการสร้างอนาคตทางการศึกษาที่ดีที่สุด... ค่อยๆ หลุดลอยไปกับความท้อแท้
                            </p>
                        </div>

                        {/* Choice 2: Path to Success (Pastel Blue/Indigo) */}
                        <div className="bg-blue-50 rounded-3xl p-8 md:p-10 border border-blue-200 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-blue-100 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-200/50">
                            <div>
                                <h3 className="text-2xl font-bold text-blue-900 mb-6">ทางเลือกที่ 2: เส้นทางสู่ความสำเร็จ</h3>
                                <p className="text-blue-800 leading-relaxed text-lg mb-8">
                                    เลือกระบบที่พิสูจน์แล้วว่าได้ผลจริง ประหยัดเวลาไปหลายร้อยชั่วโมง สร้างความมั่นใจให้ลูกด้วยแผนการที่ชัดเจน และเปลี่ยนอนาคตการเรียนคณิตศาสตร์ของพวกเขาไปตลอดกาล นี่ไม่ใช่แค่การลงทุนเพื่อการสอบ แต่คือการลงทุนเพื่อทักษะที่จะติดตัวเขาไปตลอดชีวิต
                                </p>
                            </div>

                            <button
                                onClick={handlePaymentClick}
                                className="w-full py-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xl shadow-lg shadow-blue-200 transition-all transform hover:scale-105 active:scale-95"
                            >
                                เลือกเส้นทางสู่ความสำเร็จ
                            </button>
                        </div>
                    </div>
                </section>

                {/* 5. Infinite Marquee Reviews */}
                <section className="w-full py-16 overflow-hidden bg-white">
                    <div className="text-center mb-12 px-4">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">
                            อย่าเชื่อแค่คำพูด... <span className="text-indigo-600">แต่จงเชื่อ "ผลลัพธ์"</span>
                        </h2>
                        <div className="w-24 h-1.5 bg-indigo-600 mx-auto rounded-full opacity-20"></div>
                    </div>

                    {/* Marquee Container */}
                    <div className="relative w-full overflow-hidden group">
                        {/* Gradient Masks for smooth fade edges */}
                        <div className="absolute left-0 top-0 bottom-0 w-20 md:w-40 bg-gradient-to-r from-white to-transparent z-10"></div>
                        <div className="absolute right-0 top-0 bottom-0 w-20 md:w-40 bg-gradient-to-l from-white to-transparent z-10"></div>

                        {/* Scrolling Track */}
                        <div className="flex gap-6 animate-marquee hover:[animation-play-state:paused]">
                            {/* First set of images */}
                            {reviewImages.map((img, i) => (
                                <div
                                    key={`set1-${i}`}
                                    className="flex-shrink-0 w-[280px] md:w-[350px] transition-transform duration-300 hover:scale-105 cursor-pointer"
                                    onClick={() => setSelectedImage(img)}
                                >
                                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden h-full">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={img}
                                            alt={`Review ${i + 1}`}
                                            className="w-full h-auto object-contain"
                                            loading="lazy"
                                            onError={(e) => {
                                                e.currentTarget.src = `https://placehold.co/400x300/indigo/white?text=Review+${i + 1}`;
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {/* Duplicate set for seamless loop */}
                            {reviewImages.map((img, i) => (
                                <div
                                    key={`set2-${i}`}
                                    className="flex-shrink-0 w-[280px] md:w-[350px] transition-transform duration-300 hover:scale-105 cursor-pointer"
                                    onClick={() => setSelectedImage(img)}
                                >
                                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden h-full">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={img}
                                            alt={`Review ${i + 1}`}
                                            className="w-full h-auto object-contain"
                                            loading="lazy"
                                            onError={(e) => {
                                                e.currentTarget.src = `https://placehold.co/400x300/indigo/white?text=Review+${i + 1}`;
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <style jsx>{`
                        @keyframes marquee {
                            0% { transform: translateX(0); }
                            100% { transform: translateX(-50%); }
                        }
                        .animate-marquee {
                            animation: marquee 200s linear infinite;
                            width: max-content;
                        }
                    `}</style>
                </section>

                {/* Lightbox Modal */}
                {selectedImage && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300"
                        onClick={() => setSelectedImage(null)}
                    >
                        <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
                            {/* Close Button */}
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="absolute -top-12 right-0 md:-right-12 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-md z-50 border border-white/30"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>

                            {/* Image Container */}
                            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/20 border border-white/10 bg-black transition-all duration-500 ease-out transform scale-100 opacity-100 animate-in zoom-in-90 fade-in slide-in-from-bottom-4">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={selectedImage}
                                    alt="Review Fullscreen"
                                    className="max-w-full max-h-[85vh] object-contain"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                    </div>
                )}
                {/* 5. FAQ */}
                <section className="max-w-3xl mx-auto px-6 pb-24 mt-32">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-4 leading-tight">
                            🔥 ถามตรง-ตอบเคลียร์! <br className="hidden md:block" />เรื่องที่ใจอยากรู้ ก่อนตัดสินใจลุย 🔥
                        </h2>
                        <p className="text-slate-600 text-lg">
                            มีความกังวลเหล่านี้อยู่ใช่ไหม? อ่านให้จบ แล้วจะพบว่า <span className="text-indigo-600 font-bold">"ทางออก"</span> ของเกรด 4 อยู่ใกล้แค่นี้!
                        </p>
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                q: "1️⃣ พื้นฐานไม่แน่นเลย จะเรียนทันเพื่อนไหม?",
                                a: "✅ ทันแน่นอน! เพราะเราเริ่มให้ใหม่ตั้งแต่ 'ศูนย์' ไม่ต้องกลัวว่าจะตามใครไม่ทัน ในคอร์สนี้ ครูจะรื้อฟื้นพื้นฐานที่จำเป็นให้ใหม่หมด ปูให้แน่นปึ้กก่อนขึ้นเนื้อหายาก ใครที่เคยหลับในห้อง หรือเรียนไม่รู้เรื่องมาก่อน มาเริ่มนับหนึ่งใหม่ที่นี่ รับรองเครื่องติดไว แซงเพื่อนทันแน่นอน!"
                            },
                            {
                                q: "2️⃣ คอร์สนี้ต่างจากที่อื่น หรือเรียนฟรีในยูทูปยังไง?",
                                a: "✅ ต่างที่ 'ความเข้าใจ' ไม่ใช่แค่ 'การจำ' ที่อื่นอาจสอนให้จำสูตรแล้วไปสอบ แต่ที่นี่ ครูสอนให้ \"เห็นภาพ\" ว่าทำไมต้องใช้สูตรนี้ มีเทคนิคเฉพาะตัวที่ สั้น กระชับ ตรงจุด ช่วยให้มองโจทย์ออกทันทีโดยไม่ต้องเสียเวลางม ประหยัดเวลาอ่านหนังสือไปได้มหาศาล!"
                            },
                            {
                                q: "3️⃣ ถ้าเรียนแล้วงง มีคำถาม จะไปถามใคร?",
                                a: "✅ ถามครูได้โดยตรง! ไม่ต้องเก็บความงงไว้ข้ามคืน หมดยุคเรียนกับวิดีโอแล้วถูกทิ้ง เรามีช่องทางพิเศษ (LINE/Facebook Group) สำหรับนักเรียนโดยเฉพาะ ติดตรงไหน แคปจอส่งมา ครูและทีมงานพร้อมอธิบายจนกว่าจะร้อง \"อ๋อ!\" ไม่ปล่อยผ่านแน่นอน"
                            },
                            {
                                q: "4️⃣ เรียนออนไลน์ น้องจะเบื่อไหม? จะมีสมาธิเหรอ?",
                                a: "✅ ลืมภาพการนั่งเรียนน่าเบื่อไปได้เลย! ไม่ใช่การอัดวิดีโอสอนยาวๆ ชวนง่วง 2 ชั่วโมง บทเรียนถูกย่อยมาเป็น คลิปสั้นๆ (Bite-sized) จบเป็นเรื่องๆ เหมือนดูซีรีส์ที่สนุกและได้ความรู้ กระตุ้นความสนใจตลอดเวลา รับรองว่า \"เรียนเพลินจนลืมเวลา\""
                            },
                            {
                                q: "5️⃣ ราคาแพงไปไหม? จะคุ้มค่าหรือเปล่า?",
                                a: "✅ คุ้มยิ่งกว่าคุ้ม! เพราะนี่คือการลงทุน 'ครั้งเดียว' ลองเทียบกับการจ้างครูมาสอนตัวต่อตัว (ชั่วโมงละ 300-500 บาท) เรียนแป๊บเดียวเงินหมด แต่คอร์สนี้ ราคาหารออกมาตกวันละไม่กี่บาท แต่ดูทวนซ้ำได้ตลอด 5 ปี! แถมได้เทคนิคที่ติดตัวไปจนสอบเข้ามหาวิทยาลัย ถูกกว่ากาแฟแก้วโปรด แต่เปลี่ยนอนาคตได้จริง!"
                            },
                            {
                                q: "6️⃣ ต้องใช้อุปกรณ์อะไรบ้าง ยุ่งยากไหม?",
                                a: "✅ ง่ายมาก! มีแค่มือถือเครื่องเดียวก็เรียนได้ จะเรียนผ่าน มือถือ, แท็บเล็ต, ไอแพด หรือคอมพิวเตอร์ ก็ได้หมด ระบบรองรับทุกอุปกรณ์ ขอแค่มีอินเทอร์เน็ต จะนั่งเรียนที่บ้าน หรือระหว่างรอผู้ปกครอง ก็หยิบขึ้นมาเก่งได้ทุกที่ ทุกเวลา"
                            },
                            {
                                q: "7️⃣ จะมั่นใจได้ยังไง ว่าเกรดน้องจะดีขึ้นจริง?",
                                a: "✅ พิสูจน์แล้วจากรุ่นพี่นับพันคน! ถ้าน้อง \"ดูคลิปครบ + ทำแบบฝึกหัดตาม\" ครูการันตีว่าคะแนนพุ่งแน่นอน เรามีรีวิวจากเด็กที่เคยสอบตก จนกลายเป็นท็อปห้องเพียบ! ขอแค่เปิดใจและลงมือทำตามที่ครูบอก ผลลัพธ์เปลี่ยน 100%"
                            },
                            {
                                q: "8️⃣ สมัครแล้ว จะได้เรียนทันทีเลยไหม?",
                                a: "✅ โอนปุ๊บ เรียนได้ปั๊บ! ไม่ต้องรอข้ามวัน ระบบของเราเป็นแบบอัตโนมัติ สมัครเสร็จปุ๊บ ระบบเปิดสิทธิ์ให้เข้าเรียนได้ทันทีภายใน 5 นาที! ไฟกำลังมา ต้องรีบคว้าไว้!"
                            },
                            {
                                q: "9️⃣ คอร์สนี้เหมาะกับใครบ้าง?",
                                a: "✅ เหมาะกับทุกคนที่ 'ไม่อยากแพ้' ในสนามสอบ ไม่ว่าจะเป็นน้องที่พื้นฐานอ่อน อยากปูใหม่ให้แน่น, น้องที่พอได้แล้ว แต่อยากได้เทคนิคทำโจทย์ไว หรือน้องที่เตรียมสอบเก็บคะแนน สอบกลางภาค-ปลายภาค หรือสอบเข้า ไม่ว่าต้นทุนมาเท่าไหร่ จบคอร์สนี้ \"เก่งขึ้น\" ทุกคน!"
                            }
                        ].map((faq, i) => {
                            const colors = [
                                "bg-rose-50 border-rose-100",
                                "bg-orange-50 border-orange-100",
                                "bg-amber-50 border-amber-100",
                                "bg-yellow-50 border-yellow-100",
                                "bg-lime-50 border-lime-100",
                                "bg-green-50 border-green-100",
                                "bg-emerald-50 border-emerald-100",
                                "bg-teal-50 border-teal-100",
                                "bg-cyan-50 border-cyan-100"
                            ];
                            const colorClass = colors[i % colors.length];

                            return (
                                <div key={i} className={`border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${colorClass}`}>
                                    <button
                                        onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                                        className={`w-full px-6 py-5 text-left font-bold text-slate-800 flex justify-between items-start gap-4 bg-transparent`}
                                    >
                                        <span className="text-lg">{faq.q}</span>
                                        <span className="text-slate-500 font-bold text-xl flex-shrink-0 mt-0.5">{openFaqIndex === i ? "−" : "+"}</span>
                                    </button>
                                    <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${openFaqIndex === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                        <div className="overflow-hidden">
                                            <div className="px-6 pb-6 pt-2 text-slate-700 leading-relaxed border-t border-black/5">
                                                {faq.a}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-12 text-center bg-indigo-50 rounded-2xl p-8 border border-indigo-100">
                        <p className="text-lg font-medium text-indigo-900 mb-2">
                            อย่าปล่อยให้ "ความลังเล" ขโมยโอกาสเกรด 4 ของน้องไป
                        </p>
                        <p className="text-slate-600">
                            ทุกคำถามเคลียร์ใจหมดแล้ว ที่เหลือคือ "การตัดสินใจของคุณ" <br />
                            คอร์สนี้ไม่ใช่แค่สอนเลข แต่คือการสร้าง "ความมั่นใจ" ใหม่ให้น้องตลอดชีวิต
                        </p>
                    </div>
                </section>

                <Footer />

                {/* Full-screen Page Transition Overlay */}
                <div className={`fixed inset-0 z-50 bg-white pointer-events-none transition-opacity duration-700 ease-in-out ${isNavigating ? 'opacity-100' : 'opacity-0'}`}></div>
            </main>
        </div>
    );
}