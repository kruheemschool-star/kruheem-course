"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useUserAuth } from "@/context/AuthContext";
import GrandSlamPage from "./GrandSlamPage";
import { getGrandSlamContent } from "./grandSlamContent";

// SVG Icons for Content

const StarIcon = () => (
    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
);

export default function CourseSalesPage() {
    const { id } = useParams();
    const courseId = typeof id === 'string' ? id : "";
    const { user, isAdmin, googleSignIn } = useUserAuth();

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
    // Curriculum Accordion State
    const [openChapterIndex, setOpenChapterIndex] = useState<number | null>(null);
    const [openGiftedPartIndex, setOpenGiftedPartIndex] = useState<number | null>(null);

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

    const [attendanceStatus, setAttendanceStatus] = useState<'none' | 'good' | 'warning' | 'critical'>('none');

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

                    // ✅ Check Attendance
                    if (data.lastAccessedAt && data.status === 'approved') {
                        const lastAccess = data.lastAccessedAt.toDate();
                        const now = new Date();
                        const diffTime = Math.abs(now.getTime() - lastAccess.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays > 7) setAttendanceStatus('critical');
                        else if (diffDays > 3) setAttendanceStatus('warning');
                        else setAttendanceStatus('good');
                    } else {
                        setAttendanceStatus('none');
                    }

                } else {
                    setEnrollmentStatus('none');
                    setAttendanceStatus('none');
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

    // Check if this course should use the new Grand Slam Offer page
    const grandSlamContent = getGrandSlamContent(course.title);
    if (grandSlamContent) {
        // Show the Grand Slam page to everyone
        return (
            <GrandSlamPage
                content={grandSlamContent}
                courseId={courseId}
                courseTitle={course.title}
                enrollmentStatus={enrollmentStatus}
                attendanceStatus={attendanceStatus}
                user={user}
                onLogin={handleLogin}
            />
        );
    }



    const isM2Term2 = course.title.includes("ม.2") && course.title.includes("เทอม 2");
    const isM2Term1 = course.title.includes("ม.2") && course.title.includes("เทอม 1");
    const isM3Term1 = course.title.includes("ม.3") && course.title.includes("เทอม 1");
    const isM3Term2 = course.title.includes("ม.3") && course.title.includes("เทอม 2");
    const isM4Term1 = course.title.includes("ม.4") && course.title.includes("เทอม 1");
    const isM4Term2 = course.title.includes("ม.4") && course.title.includes("เทอม 2");
    const isM5Term1 = course.title.includes("ม.5") && course.title.includes("เทอม 1");
    const isM5Term2 = course.title.includes("ม.5") && course.title.includes("เทอม 2");
    const isM6Term1 = course.title.includes("ม.6") && course.title.includes("เทอม 1");
    const isM6Term2 = course.title.includes("ม.6") && course.title.includes("เทอม 2");
    const isRuleOfThree = course.title.includes("บัญญัติไตรยางค์");
    const isGrade6Entrance = course.title.includes("ป.6") || course.title.includes("สอบเข้า ม.1") || course.title.includes("Gifted");
    const isMasteringEquations = course.title.includes("สมการ");



    let content;

    if (isMasteringEquations) {
        content = {
            hero: {
                blobs: ["bg-blue-200/40", "bg-indigo-200/40"],
            },
            painPoint: {
                title: "ใครแก้สมการไม่เป็น... จบจากคอร์สนี้ 'แก้ได้คล่อง' แน่นอน! 🚀",
                subtitle: "คอร์สที่จะเปลี่ยนยาขมอย่าง 'สมการ' ให้กลายเป็นขนมหวาน สำหรับน้องๆ ป.4 - มัธยม",
                blobs: ["bg-blue-100/30", "bg-indigo-100/30"],
                problemBox: {
                    title: "ปัญหาเหล่านี้จะหมดไป!",
                    icon: "🔓",
                    items: [
                        { icon: "😵", text: "เจอตัวแปร x, y แล้วไปไม่เป็น" },
                        { icon: "🐢", text: "ย้ายข้างผิดๆ ถูกๆ เครื่องหมายเปลี่ยนหรือไม่เปลี่ยน?" },
                        { icon: "📝", text: "ทำโจทย์ปัญหาไม่ได้ ตีความไม่ออก" },
                        { icon: "📉", text: "พื้นฐานไม่แน่น เรียนเนื้อหาที่ยากขึ้นไม่รู้เรื่อง" }
                    ],
                    bg: "bg-white/50"
                },
                solutionBox: {
                    title: "💡 สิ่งที่จะได้รับจากคอร์สนี้",
                    icon: "💡",
                    desc: "ปูพื้นฐานตั้งแต่ศูนย์ จนถึงระดับเซียน ด้วยเทคนิคที่เข้าใจง่ายและใช้ได้จริง",
                    items: [
                        { icon: "✅", text: "เพิ่มทักษะการคิดวิเคราะห์และแก้ไขปัญหา" },
                        { icon: "✅", text: "เสริมพื้นฐานที่แข็งแกร่งด้านคณิตศาสตร์" },
                        { icon: "✅", text: "เตรียมพร้อมสำหรับการเรียนในระดับที่สูงขึ้น" },
                        { icon: "✅", text: "เพิ่มความมั่นใจในการสอบแข่งขันและในโรงเรียน" }
                    ],
                    bg: "bg-indigo-50/50",
                    border: "border-indigo-200/60"
                }
            },
            curriculum: [
                {
                    id: 1,
                    title: "Level 1-5: ปูพื้นฐานการแก้สมการ",
                    desc: "เริ่มต้นจากศูนย์ เข้าใจหลักการย้ายข้างและตัวแปร",
                    color: "bg-blue-100/70",
                    iconColor: "text-blue-500",
                    content: [
                        "Level 1: สมการที่มีบวก ลบ เลขตัวเดียว",
                        "Level 2: เทคนิคย้ายข้างบวก ลบ เพื่อลดขั้นตอน",
                        "Level 3: สมการที่มีตัวเลขอยู่หน้าตัวแปร",
                        "Level 4: แก้สมการที่มีเลขคูณ หาร ตัวแปร",
                        "Level 5: แก้สมการที่มีตัวแปรเป็นตัวส่วน"
                    ]
                },
                {
                    id: 2,
                    title: "Level 6-10: เทคนิคการย้ายข้างและโจทย์ผสม",
                    desc: "ซับซ้อนขึ้น แต่จัดการได้ด้วยเทคนิคพิเศษ",
                    color: "bg-indigo-100/70",
                    iconColor: "text-indigo-500",
                    content: [
                        "Level 6: เทคนิคการย้ายข้างไปคูณหรือหาร",
                        "Level 7: เทคนิคการย้ายข้างไปคูณและหารพร้อมกัน",
                        "Level 8: เทคนิคการคูณไขว้",
                        "Level 9: เทคนิคการกลับเศษส่วน",
                        "Level 10: การแก้สมการผสม บวก ลบ คูณ หาร"
                    ]
                },
                {
                    id: 3,
                    title: "Level 11-15: เศษส่วนและทศนิยม",
                    desc: "จัดการตัวเลขที่ยุ่งยากให้ง่ายขึ้น",
                    color: "bg-purple-100/70",
                    iconColor: "text-purple-500",
                    content: [
                        "Level 11: สมการที่มีเศษส่วน",
                        "Level 12: เทคนิคกำจัดตัวส่วนด้วย ค.ร.น.",
                        "Level 13: การบวก ลบ สมการที่มีทศนิยม",
                        "Level 14: การคูณ หาร สมการที่มีทศนิยม",
                        "Level 15: เทคนิคเปลี่ยนทศนิยมให้เป็นจำนวนเต็ม"
                    ]
                },
                {
                    id: 4,
                    title: "Level 16-19: เทคนิคขั้นสูง",
                    desc: "ลำดับการคำนวณและโจทย์ที่ซับซ้อน",
                    color: "bg-violet-100/70",
                    iconColor: "text-violet-500",
                    content: [
                        "Level 16: ลำดับการคำนวณ",
                        "Level 17: สมการที่มีตัวแปรมากกว่า 1 ตำแหน่ง",
                        "Level 18: สมการที่มีเครื่องหมายลบหน้าวงเล็บ",
                        "Level 19: สมการจำนวนติดลบ"
                    ]
                }
            ],
            importance: [
                {
                    title: "📝 โจทย์เยอะจุใจ 400+ ข้อ",
                    desc: "ฝึกฝนจนชำนาญ ด้วยแบบฝึกหัดที่คัดสรรมาอย่างดี ครอบคลุมทุกรูปแบบ",
                    color: "bg-blue-50 text-blue-700 border-blue-200"
                },
                {
                    title: "📱 เรียนได้ทุกที่ ทุกเวลา",
                    desc: "เรียนซ้ำได้ไม่จำกัดตลอด 5 ปีเต็ม พร้อมเอกสารดาวน์โหลดฟรี (เรียนผ่านกลุ่ม Facebook)",
                    color: "bg-indigo-50 text-indigo-700 border-indigo-200"
                }
            ],
            choices: {
                oldPath: "กลัวสมการ เจอโจทย์แล้วหนี พื้นฐานไม่แน่นทำให้เรียนเรื่องอื่นไม่รู้เรื่องตามไปด้วย เสียคะแนนในห้องสอบเพราะแก้สมการไม่เป็น",
                newPath: "มองสมการเป็นเรื่องง่าย แก้โจทย์ได้อย่างมั่นใจ เป็นพื้นฐานสำคัญที่จะต่อยอดไปสู่คณิตศาสตร์บทอื่นๆ ได้อย่างฉลุย ผลการเรียนดีขึ้นอย่างเห็นได้ชัด",
                colors: {
                    old: "bg-slate-100",
                    new: "bg-indigo-100",
                    button: "bg-indigo-600 hover:bg-indigo-700"
                }
            }
        };
    } else if (isRuleOfThree) {
        content = {
            hero: {
                blobs: ["bg-orange-200/40", "bg-yellow-200/40"],
            },
            painPoint: {
                title: "บัญญัติไตรยางค์ คือบทแจกแต้ม... ถ้าน้องๆ \"คิดเป็น!\" 🔥",
                subtitle: "แต่ถ้ายัง \"งง\" ว่าโจทย์ 2 ชั้น, 3 ชั้น ต่างกันยังไง? อันไหนคูณไขว้ อันไหนคูณตรง? นั่นเพราะเขากำลัง \"ท่องจำ\" ไม่ใช่ \"เข้าใจแก่น\" ของมัน!",
                blobs: ["bg-orange-100/30", "bg-yellow-100/30"],
                problemBox: {
                    title: "อาการเหล่านี้... เป็นกันอยู่ไหม?",
                    icon: "🤯",
                    items: [
                        { icon: "😵", text: "งงโจทย์ 2 ชั้น vs 3 ชั้น: แยกไม่ออกว่าต้องทำยังไง" },
                        { icon: "❓", text: "สับสนวิธีคูณ: อันไหนคูณไขว้ อันไหนคูณตรง?" },
                        { icon: "🏗️", text: "เจอโจทย์ \"คนงาน-เวลา-สร้างบ้าน\": สมองดับทันที" },
                        { icon: "🦜", text: "ท่องจำสูตร: แต่ไม่เข้าใจที่มาที่ไป พลิกแพลงไม่ได้" }
                    ],
                    bg: "bg-white/50"
                },
                solutionBox: {
                    title: "🔑 ปลดล็อก \"วิธีคิด\" ด้วยอาวุธลับจาก \"คณิตครูฮีม\"",
                    icon: "🔑",
                    desc: "ลืมการท่องสูตรที่น่าเบื่อ... เพราะเอกสารชุดนี้จะสอนให้ \"คิดเป็น\" คณิตศาสตร์ไม่ยาก ยากเฉพาะคนที่ไม่ลงมือทำ",
                    items: [
                        { icon: "❤️", text: "เข้าใจหัวใจ 2 ดวง: แปรผันตรง vs แปรผกผัน (จับถูกก็จบ!)" },
                        { icon: "⛰️", text: "ไต่ระดับความโหด: จาก 1 ชั้น สู่ 3 ชั้น แบบ Step-by-step" },
                        { icon: "🎁", text: "ข้อเสนอคุ้มที่สุด: เรียนได้ 5 ปีเต็ม! วนซ้ำได้ไม่จำกัด" }
                    ],
                    bg: "bg-orange-50/50",
                    border: "border-orange-200/60"
                }
            },
            curriculum: [
                {
                    id: 1,
                    title: "Level 1: บัญญัติไตรยางค์ 1 ชั้น",
                    desc: "ปูพื้นฐานให้แน่น เข้าใจแก่นของบัญญัติไตรยางค์",
                    color: "bg-orange-100/70",
                    iconColor: "text-orange-500",
                    content: [
                        "ความหมายของบัญญัติไตรยางค์",
                        "การแปรผันตรง (Direct Variation)",
                        "การแปรผกผัน (Inverse Variation)",
                        "เทคนิคการคูณไขว้ vs คูณตรง",
                        "โจทย์ปัญหาพื้นฐาน"
                    ]
                },
                {
                    id: 2,
                    title: "Level 2: บัญญัติไตรยางค์ 2 ชั้น",
                    desc: "หลักการ: \"เทียบทีละอย่าง\"",
                    color: "bg-amber-100/70",
                    iconColor: "text-amber-500",
                    content: [
                        "การวิเคราะห์โจทย์ 2 ชั้น",
                        "หลักการเทียบทีละอย่าง",
                        "โจทย์ปัญหาซับซ้อนขึ้น",
                        "เทคนิคการตัดทอนเศษส่วน"
                    ]
                },
                {
                    id: 3,
                    title: "Level 3: บัญญัติไตรยางค์ 3 ชั้น",
                    desc: "หลักการ: \"เปลี่ยนทีละอย่าง\"",
                    color: "bg-yellow-100/70",
                    iconColor: "text-yellow-500",
                    content: [
                        "การวิเคราะห์โจทย์ 3 ชั้น (คน-งาน-เวลา)",
                        "หลักการเปลี่ยนทีละอย่าง",
                        "โจทย์ปราบเซียน",
                        "ตะลุยโจทย์ข้อสอบแข่งขัน"
                    ]
                }
            ],
            importance: [
                {
                    title: "❤️ แปรผันตรง (เพิ่ม-เพิ่ม)",
                    desc: "(ซื้อของเยอะ = จ่ายเยอะ) เทคนิค: จับ \"คูณไขว้\" จบ!",
                    icon: "📈",
                    color: "bg-green-50 text-green-700 border-green-200"
                },
                {
                    title: "💔 แปรผกผัน (เพิ่ม-ลด)",
                    desc: "(คนงานเยอะ = เวลาเสร็จเร็ว) เทคนิค: จับ \"คูณตรง\" จบ!",
                    icon: "📉",
                    color: "bg-rose-50 text-rose-700 border-rose-200"
                }
            ],
            choices: {
                oldPath: "ท่องจำสูตรแบบนกแก้วนกขุนทอง เจอโจทย์พลิกแพลงก็ไปไม่เป็น สับสนวิธีคิด เสียคะแนนง่ายๆ ในบทที่ควรจะได้เต็ม",
                newPath: "เข้าใจแก่นของบัญญัติไตรยางค์ วิเคราะห์โจทย์เป็นระบบ มองออกทันทีว่าต้องใช้วิธีไหน ทำโจทย์ได้ทุกรูปแบบอย่างมั่นใจ เก็บแต้มเต็มๆ",
                colors: {
                    old: "bg-stone-100",
                    new: "bg-orange-100",
                    button: "bg-orange-500 hover:bg-orange-600"
                }
            }
        };
    } else if (isGrade6Entrance) {
        content = {
            hero: {
                blobs: ["bg-orange-200/40", "bg-rose-200/40"],
            },
            painPoint: {
                title: "🔥 คอร์ส ป.6 สอบเข้าชั้น ม.1 (ฉบับสมบูรณ์) 🔥",
                subtitle: "ปูพื้นฐานใหม่ตั้งแต่ ป.4-6 เพิ่มเติมเนื้อหา ม.1-3 และตะลุยข้อสอบ Gifted ครบจบในคอร์สเดียว! 🏆",
                blobs: ["bg-orange-100/30", "bg-rose-100/30"],
                problemBox: {
                    title: "ทำไมต้องเรียนคอร์สนี้? 🏫",
                    icon: "🤔",
                    items: [
                        { icon: "🧱", text: "ปูพื้นฐานใหม่แกะกล่อง: เริ่มจากศูนย์ก็เก่งได้ (เนื้อหา ป.4-6)" },
                        { icon: "🚀", text: "เนื้อหาล้ำหน้า: เพิ่มเติม ม.1-3 ที่จำเป็นสำหรับสอบแข่งขัน" },
                        { icon: "📝", text: "แนวข้อสอบจริง: คัดจาก สสวท. และสมาคมคณิตศาสตร์" },
                        { icon: "🧩", text: "ครบทุกสนาม: สอบเข้าห้องเรียนพิเศษ, Gifted, หรือห้องธรรมดา" }
                    ],
                    bg: "bg-white/50"
                },
                solutionBox: {
                    title: "สิ่งที่น้องๆ จะได้รับ 🎁",
                    icon: "🎁",
                    desc: "การลงทุนที่คุ้มค่าที่สุดเพื่ออนาคต! เนื้อหาเข้มข้น + เทคนิคแพรวพราว + เวลาเรียนจุใจ",
                    items: [
                        { icon: "📚", text: "เนือหาอัดแน่น: Foundation 16 บท + Advanced 6 Parts (40 บท)" },
                        { icon: "🔥", text: "โจทย์เยอะจุใจ: พิเศษ! เพิ่มแนวข้อสอบเข้าห้อง Gifted อีก 40 แนว" },
                        { icon: "⏳", text: "เรียนยาวสะใจ: อายุคอร์ส 5 ปีเต็ม! ทบทวนได้ไม่จำกัด" },
                        { icon: "🧠", text: "เทคนิคคิดลัด: มองโจทย์ออก ตอบได้ไว ใช้ได้จริงในห้องสอบ" }
                    ],
                    bg: "bg-orange-50/50",
                    border: "border-orange-200/60"
                }
            },
            curriculum: [
                {
                    id: 0,
                    title: "📚 FOUNDATION: ปูพื้นฐานแน่นปึ้ก 16 บท",
                    desc: "เก็บตกทุกจุดอ่อน เสริมทุกจุดแข็ง ด้วยเนื้อหา ป.4-6 ที่ครบถ้วน",
                    color: "bg-blue-100/70",
                    iconColor: "text-blue-500",
                    content: [
                        "บทที่ 1: จำนวนนับและการบวก ลบ คูณ และหาร",
                        "บทที่ 2: สมการและการแก้สมการ",
                        "บทที่ 3: ตัวประกอบของจำนวนนับ",
                        "บทที่ 4: มุมและส่วนของเส้นตรง",
                        "บทที่ 5: เส้นขนาน",
                        "บทที่ 6: ทิศทางและแผนผัง",
                        "บทที่ 7: เศษส่วน",
                        "บทที่ 8: การบวก ลบ คูณ และหารทศนิยม",
                        "บทที่ 9: การหารทศนิยม",
                        "บทที่ 10: รูปสี่เหลี่ยม",
                        "บทที่ 11: รูปสามเหลี่ยม",
                        "บทที่ 12: รูปวงกลม",
                        "บทที่ 13: บทประยุกต์",
                        "บทที่ 14: รูปทรงและปริมาตร",
                        "บทที่ 15: แผนภูมิและกราฟ",
                        "บทที่ 16: ความน่าจะเป็น"
                    ]
                },
                {
                    id: 1,
                    title: "PART 1: รากฐานคณิตศาสตร์และทักษะการคำนวณ 🧮",
                    desc: "ปูพื้นฐานการคำนวณให้แม่นยำ รวดเร็ว และเป็นระบบ",
                    color: "bg-emerald-100/70",
                    iconColor: "text-emerald-500",
                    content: [
                        "บทที่ 1: หลักการคำนวณ (Order of Operations) – แนวโจทย์คำนวณซ้อนที่ทดสอบความแม่นยำและลำดับการคิด",
                        "บทที่ 2: เลขยกกำลัง (Exponents) – แนวโจทย์ที่ต้องใช้สมบัติเลขยกกำลังเพื่อลดความซับซ้อนและหาคำตอบ",
                        "บทที่ 3: ตัวประกอบ (Factoring) – แนวโจทย์การวิเคราะห์โครงสร้างตัวเลขและหาจำนวนตัวประกอบทั้งหมด",
                        "บทที่ 4: ห.ร.ม. และ ค.ร.น. (GCD & LCM) – แนวโจทย์ประยุกต์เกี่ยวกับการแบ่งกลุ่ม, การนัดหมาย, และการหาจุดร่วม",
                        "บทที่ 5: แบบรูปและความสัมพันธ์ (Number Patterns) – แนวโจทย์วิเคราะห์ลำดับตัวเลขเพื่อหาพจน์ถัดไปหรือพจน์ทั่วไป",
                        "บทที่ 6: ลำดับฟีโบนักชี (Fibonacci Sequence) – แนวโจทย์เฉพาะทางที่ใช้วัดความเข้าใจลำดับพิเศษ",
                        "บทที่ 7: ลำดับและอนุกรมเลขคณิต (Arithmetic Sequences) – แนวโจทย์การหาพจน์ที่หายไปและผลรวมของอนุกรม",
                        "บทที่ 8: การนับจำนวนและการหารลงตัว (Divisibility) – แนวโจทย์การนับจำนวนตามเงื่อนไขการหารที่กำหนด"
                    ]
                },
                {
                    id: 2,
                    title: "PART 2: เศษส่วน ทศนิยม และอนุกรมขั้นสูง 📈",
                    desc: "จัดการกับตัวเลขที่ซับซ้อนและอนุกรมยากๆ ได้อย่างอยู่หมัด",
                    color: "bg-teal-100/70",
                    iconColor: "text-teal-500",
                    content: [
                        "บทที่ 9: เศษส่วนซ้อน (Continued Fractions) – แนวโจทย์การแก้สมการเศษส่วนที่มีโครงสร้างซับซ้อน",
                        "บทที่ 10: อนุกรมเทเลสโกปิก (Telescopic Series) – แนวโจทย์อนุกรมขั้นสูงที่ต้องใช้เทคนิคการหักล้างพจน์",
                        "บทที่ 11: การแยกเศษส่วนย่อย (Partial Fractions) – แนวโจทย์การเขียนเศษส่วนในรูปผลบวกของเศษส่วนอื่น",
                        "บทที่ 12: ทศนิยมซ้ำ (Repeating Decimals) – แนวโจทย์การหาเลขโดดในตำแหน่งไกลๆ และการแปลงกลับเป็นเศษส่วน"
                    ]
                },
                {
                    id: 3,
                    title: "PART 3: สมการและการแก้โจทย์ปัญหา ⚖️",
                    desc: "เปลี่ยนโจทย์ปัญหาภาษาไทยให้เป็นภาษาคณิตศาสตร์",
                    color: "bg-green-100/70",
                    iconColor: "text-green-500",
                    content: [
                        "บทที่ 13: สมการเชิงเส้นตัวแปรเดียว (Linear Equations) – แนวโจทย์ปัญหาที่ต้องเปลี่ยนข้อความยาวๆ ให้เป็นสมการเพื่อหาคำตอบ",
                        "บทที่ 14: ระบบสมการสองตัวแปร (Systems of Equations) – แนวโจทย์ที่มีตัวไม่ทราบค่าสองตัว เช่น ปัญหาสัตว์, เหรียญ, หรืออายุ"
                    ]
                },
                {
                    id: 4,
                    title: "PART 4: คณิตศาสตร์ประยุกต์ในชีวิตจริง 📊",
                    desc: "ประยุกต์ใช้คณิตศาสตร์กับสถานการณ์รอบตัว",
                    color: "bg-cyan-100/70",
                    iconColor: "text-cyan-500",
                    content: [
                        "บทที่ 15: อัตราส่วนและสัดส่วน (Ratio and Proportion) – แนวโจทย์ของผสม, แผนที่ย่อส่วน, และการแบ่งตามอัตราส่วน",
                        "บทที่ 16: ร้อยละและเปอร์เซ็นต์ (Percentages) – แนวโจทย์การคำนวณร้อยละในสถานการณ์ต่างๆ",
                        "บทที่ 17: กำไร-ขาดทุน (Profit & Loss) – แนวโจทย์การซื้อขาย, การตั้งราคา, การลดราคา, และภาษี",
                        "บทที่ 18: ดอกเบี้ย (Simple Interest) – แนวโจทย์การคำนวณดอกเบี้ยเงินฝากและเงินกู้เบื้องต้น"
                    ]
                },
                {
                    id: 5,
                    title: "PART 5: เรขาคณิตและการให้เหตุผล 📐",
                    desc: "มองภาพให้ออก วิเคราะห์รูปทรงให้เป็น",
                    color: "bg-indigo-100/70",
                    iconColor: "text-indigo-500",
                    content: [
                        "บทที่ 19: ทฤษฎีบทพีทาโกรัส (Pythagorean Theorem) – แนวโจทย์การหาระยะทางหรือความยาวด้านในสามเหลี่ยมมุมฉาก",
                        "บทที่ 20: สามเหลี่ยมคล้าย (Similar Triangles) – แนวโจทย์การวัดระยะทางโดยอ้อมที่ต้องใช้การคิดเชิงสัดส่วน",
                        "บทที่ 21: การวัดรูปหลายเหลี่ยม (Polygon Measurement) – แนวโจทย์หาพื้นที่และเส้นรอบรูปของรูปทรงพื้นฐาน",
                        "บทที่ 22: รูปหลายเหลี่ยมด้านเท่า (Regular Polygons) – แนวโจทย์การหาขนาดมุมภายในและพื้นที่ของรูปทรงสมมาตร",
                        "บทที่ 23: รูปหลายเหลี่ยมที่มีด้านขนาน (Parallel-sided Polygons) – แนวโจทย์การหาพื้นที่สี่เหลี่ยมคางหมูและรูปประกอบ",
                        "บทที่ 24: ทฤษฎีบทวงกลม (Circle Theorems) – แนวโจทย์การให้เหตุผลเพื่อหามุมและความยาวส่วนโค้งในวงกลม",
                        "บทที่ 25: รูปหลายเหลี่ยมในวงกลม (Polygons and Circles) – แนวโจทย์ผสมผสานระหว่างความรู้เรื่องวงกลมและรูปหลายเหลี่ยม",
                        "บทที่ 26: รูปทรงประกอบ (Composite Shapes) – แนวโจทย์หาเส้นรอบรูปและพื้นที่ของรูปที่เกิดจากการตัดหรือต่อกัน",
                        "บทที่ 27: มุมและเส้นขนาน (Angles and Parallel Lines) – แนวโจทย์การไล่มุมโดยใช้สมบัติของเส้นขนานเป็นเครื่องมือหลัก",
                        "บทที่ 28: รูปทรงสามมิติ (3D Shapes) – แนวโจทย์การหาพื้นที่ผิวและปริมาตรของปริซึมและทรงกระบอก"
                    ]
                },
                {
                    id: 6,
                    title: "PART 6: กลยุทธ์และเทคนิคพิชิตข้อสอบ 🎯",
                    desc: "เทคนิคขั้นเทพสำหรับกวาดคะแนนในบทที่ยากที่สุด",
                    color: "bg-purple-100/70",
                    iconColor: "text-purple-500",
                    content: [
                        "บทที่ 29: การหาพื้นที่แรเงา (Shaded Areas) – แนวโจทย์รูปทรงประกอบที่ต้องใช้เทคนิคการบวก-ลบพื้นที่",
                        "บทที่ 30: เรขาคณิตวิเคราะห์เบื้องต้น (Coordinate Geometry) – แนวโจทย์หาพื้นที่โดยใช้พิกัดของจุดยอดเป็นเครื่องมือ",
                        "บทที่ 31: ปริมาตรทรงพีระมิด กรวย ทรงกลม (Volume of 3D Shapes) – แนวโจทย์การคำนวณปริมาตรของรูปทรงสามมิติขั้นสูง",
                        "บทที่ 32: แผนภูมิวงกลม (Pie Charts) – แนวโจทย์การวิเคราะห์และแปรผลข้อมูลจากแผนภูมิ",
                        "บทที่ 33: ความน่าจะเป็น (Probability) – แนวโจทย์การคำนวณโอกาสของเหตุการณ์จากการทดลองสุ่ม",
                        "บทที่ 34: การคิดย้อนกลับ (Reverse Thinking) – แนวโจทย์ที่ให้ผลลัพธ์มาแล้วให้หาค่าเริ่มต้น",
                        "บทที่ 35: อัตราเร็ว ระยะทาง และเวลา (Speed, Distance & Time) – แนวโจทย์การเดินทาง เช่น รถไฟวิ่งสวนกันหรือไล่ตามกัน",
                        "บทที่ 36: โจทย์การเดินทางมาพบกัน (Meeting Up Problems) – แนวโจทย์คำนวณหาเวลาและตำแหน่งที่วัตถุสองชิ้นจะมาพบกัน",
                        "บทที่ 37: โจทย์การเดินทางไล่ทัน (Catching Up Problems) – แนวโจทย์คำนวณหาเวลาและตำแหน่งที่วัตถุหนึ่งจะไล่ทันอีกวัตถุหนึ่ง",
                        "บทที่ 38: ปริศนานาฬิกา (Clock Problems) – แนวโจทย์เชาว์ปัญญาเรื่องมุมและตำแหน่งของเข็มนาฬิกา",
                        "บทที่ 39: โจทย์ตารางเวลา (Timetable Problems) – แนวโจทย์วิเคราะห์เงื่อนไขจากตารางเพื่อหาคำตอบ",
                        "บทที่ 40: โจทย์ปัญหาการทำงาน (Work Problems) – แนวโจทย์เกี่ยวกับอัตราการทำงานของคนหรือเครื่องจักร"
                    ]
                }
            ],
            importance: [
                {
                    title: "การลงทุนที่คุ้มค่าที่สุด 💎",
                    desc: "คอร์สเดียวครบ จบทุกเนื้อหาที่ต้องรู้ ไม่ต้องเสียเงินเรียนหลายที่ เฉลี่ยเพียงวันละไม่กี่บาทแต่ได้ความรู้ติดตัวไปตลอด",
                    color: "bg-emerald-50 text-emerald-800 border-emerald-200"
                },
                {
                    title: "มั่นใจได้ 100% 🏆",
                    desc: "ด้วยเนื้อหาที่ครอบคลุมและเทคนิคที่พิสูจน์แล้ว ช่วยให้น้องๆ สอบติดโรงเรียนในฝันมาแล้วมากมาย เตรียมตัวดีมีชัยไปกว่าครึ่ง",
                    color: "bg-orange-50 text-orange-800 border-orange-200"
                }
            ],
            choices: {
                oldPath: "เรียนแบบสะเปะสะปะ จับต้นชนปลายไม่ถูก ไม่รู้ขอบเขตข้อสอบ อ่านเองก็ไม่เข้าใจ ท่องจำสูตรแต่ประยุกต์ไม่เป็น พอเจอข้อสอบพลิกแพลงก็ไปไม่เป็น เสียโอกาสสอบติดเพราะเตรียมตัวไม่ตรงจุด",
                newPath: "เดินตามแผนที่วางไว้อย่างเป็นระบบ ปูพื้นฐานแน่น เข้าใจแก่นของเนื้อหา ฝึกทำโจทย์หลากหลายรูปแบบจนชำนาญ มีเทคนิคลัดช่วยลดเวลา มั่นใจทุกครั้งที่จรดปากกาทำข้อสอบ",
                colors: {
                    old: "bg-gray-100",
                    new: "bg-orange-100",
                    button: "bg-orange-600 hover:bg-orange-700"
                }
            }
        };
    } else if (isM6Term2) {
        // --- M.6 Term 2 Data ---
        content = {
            hero: {
                blobs: ["bg-[#FFFECB]/40", "bg-[#37AFE1]/40"],
            },
            painPoint: {
                title: "อย่าให้ \"เทอมสุดท้าย\" ต้องมาเสียใจ! 🚀",
                subtitle: "เปลี่ยนบทเรียนสุดปราบเซียนอย่าง \"สถิติ\" และ \"ความน่าจะเป็น\" ให้กลายเป็นบทเก็บคะแนนเต็ม พร้อมสร้างความได้เปรียบโค้งสุดท้ายในสนามสอบ TCAS",
                blobs: ["bg-[#FFFECB]/30", "bg-[#37AFE1]/30"],
                problemBox: {
                    title: "โค้งสุดท้ายแล้วยังกังวลเรื่องพวกนี้ไหม?",
                    icon: "😰",
                    items: [
                        { icon: "😵", text: "สถิติสูตรเยอะ: ค่ากลาง, การกระจาย, ตำแหน่งข้อมูล... สูตรไหนใช้ตอนไหน สับสนไปหมด" },
                        { icon: "📊", text: "ตารางแจกแจงความถี่: สร้างยังไง? อ่านค่าจากตารางไม่เป็น หาค่า Z ไม่คล่อง" },
                        { icon: "🎲", text: "ความน่าจะเป็นสุดซับซ้อน: โจทย์ปัญหาตีความยาก, กฎการนับ (nPr, nCr) ใช้ผิดตลอด" },
                        { icon: "🧠", text: "สมองเบลอ: เนื้อหาเทอม 2 ก็ต้องเก็บ ของเก่า ม.4-5 ก็ต้องทวน จะสอบแล้วยังไม่พร้อมเลย" }
                    ],
                    bg: "bg-white/50"
                },
                solutionBox: {
                    title: "🔥 เปลี่ยนความกังวลเป็นความมั่นใจ! คอร์ส \"คณิตเพิ่ม ม.6 เทอม 2\" โดยครูฮีม!",
                    icon: "🔥",
                    desc: "ครูฮีมจะพาน้องๆ สรุปเนื้อหาที่สำคัญทั้งหมด เจาะลึกคอนเซ็ปต์ที่เข้าใจยากให้ง่ายขึ้น พร้อมสอนเทคนิคทำโจทย์ A-Level ที่ใช้ได้จริง เพื่อให้น้องๆ เดินเข้าห้องสอบได้อย่างมั่นใจที่สุด!",
                    items: [
                        { icon: "✅", text: "เคลียร์ทุกเนื้อหา ม.6 เทอม 2 แบบละเอียด เข้าใจจริง" },
                        { icon: "✅", text: "ตะลุยโจทย์ A-Level ที่เชื่อมโยงกับบทเรียนโดยตรง" },
                        { icon: "✅", text: "วางแผนการอ่าน และทบทวนอย่างเป็นระบบ ทำทันแน่นอน" }
                    ],
                    bg: "bg-[#FFFECB]/50",
                    border: "border-[#37AFE1]/60"
                }
            },
            curriculum: [
                {
                    id: 1,
                    title: "สถิติและการวิเคราะห์ข้อมูล",
                    desc: "เปลี่ยนเรื่องปวดหัวให้เป็นบทเก็บคะแนนสอบ",
                    color: "bg-[#37AFE1]/70",
                    iconColor: "text-[#37AFE1]",
                    content: [
                        "การวิเคราะห์และนำเสนอข้อมูล",
                        "[EP.1] การวิเคราะห์และนำเสนอข้อมูลเชิงคุณภาพ",
                        "[EP.2] การวิเคราะห์และนำเสนอข้อมูลเชิงปริมาณ (ฮิสโทแกรม, แผนภาพกล่อง)",
                        "ค่ากลางของข้อมูล",
                        "[EP.3] ค่าเฉลี่ยเลขคณิต (Arithmetic Mean)",
                        "[EP.4] มัธยฐาน (Median) และ ฐานนิยม (Mode)",
                        "[EP.5] การเลือกใช้ค่ากลางที่เหมาะสม และโจทย์ประยุกต์",
                        "ตำแหน่งและการกระจายของข้อมูล",
                        "[EP.6] ตำแหน่งของข้อมูล (ควอร์ไทล์, เดไซล์, เปอร์เซ็นไทล์)",
                        "[EP.7] พิสัย, พิสัยระหว่างควอร์ไทล์, ส่วนเบี่ยงเบนมาตรฐาน",
                        "[EP.8] ความแปรปรวน (Variance) และการเปรียบเทียบการกระจาย",
                        "[EP.9] การสำรวจความคิดเห็น และเทคนิคการสุ่มตัวอย่าง",
                        "[EP.10] ตะลุยโจทย์ A-Level เรื่องสถิติ ชุดที่ 1",
                        "[EP.11] ตะลุยโจทย์ A-Level เรื่องสถิติ ชุดที่ 2"
                    ]
                },
                {
                    id: 2,
                    title: "ตัวแปรสุ่มและการแจกแจงความน่าจะเป็น",
                    desc: "อัปเกรดความเข้าใจเรื่องความน่าจะเป็น สู่ระดับมหาวิทยาลัย",
                    color: "bg-[#4CC9FE]/70",
                    iconColor: "text-[#4CC9FE]",
                    content: [
                        "ตัวแปรสุ่มและค่าคาดหมาย",
                        "[EP.12] ตัวแปรสุ่มชนิดไม่ต่อเนื่อง และฟังก์ชันความน่าจะเป็น",
                        "[EP.13] ค่าคาดหมายและความแปรปรวนของตัวแปรสุ่ม",
                        "การแจกแจงความน่าจะเป็น",
                        "[EP.14] การแจกแจงเอกรูปไม่ต่อเนื่อง (Uniform Distribution)",
                        "[EP.15] การแจกแจงทวินาม (Binomial Distribution) และการทดลองของแบร์นูลลี",
                        "[EP.16] การแจกแจงปกติ (Normal Distribution) และเส้นโค้งปกติ",
                        "[EP.17] การหาค่ามาตรฐาน (Z-score) และการใช้ตารางค่า Z",
                        "[EP.18] การประมาณทวินามด้วยการแจกแจงปกติ",
                        "[EP.19] ตะลุยโจทย์ A-Level เรื่องการแจกแจงความน่าจะเป็น ชุดที่ 1",
                        "[EP.20] ตะลุยโจทย์ A-Level เรื่องการแจกแจงความน่าจะเป็น ชุดที่ 2"
                    ]
                }
            ],
            choices: {
                oldPath: "ปล่อยให้ความกดดันและความไม่พร้อมถาโถม... พยายามอ่านเองทั้งหมดแต่จับต้นชนปลายไม่ถูก ไม่รู้ว่าควรเน้นบทไหน ทบทวนไม่ทัน ทำข้อสอบเก่าก็ยังทำไม่ค่อยได้ สุดท้ายเดินเข้าห้องสอบแบบวัดดวง ทำได้แค่ไหนเอาแค่นั้น... แล้วก็ต้องยอมรับผลคะแนนที่ออกมา พร้อมกับความเสียดายที่ว่า \"ถ้าย้อนเวลากลับไปได้ จะเตรียมตัวให้ดีกว่านี้\" แต่ก็สายเกินไปเสียแล้ว",
                newPath: "เลือกเส้นทางของคนสำเร็จ ที่วางแผนมาอย่างดี... ใช้เครื่องมือที่ถูกต้องเพื่อทำความเข้าใจเนื้อหา ม.6 อย่างทะลุปรุโปร่ง พร้อมทบทวนเนื้อหาเก่าไปในตัว เรียนรู้เทคนิคการทำข้อสอบจากผู้มีประสบการณ์ เดินเข้าห้องสอบอย่างมั่นใจเต็มร้อย ทำคะแนนได้ตามเป้า คว้าคณะและมหาวิทยาลัยในฝันมาครองได้สำเร็จ แล้วภูมิใจกับความพยายามของตัวเองในวันนี้",
                colors: {
                    old: "bg-[#FFFECB]/40",
                    new: "bg-[#37AFE1]/40",
                    button: "bg-[#37AFE1] hover:bg-[#2a8ab5]"
                }
            }
        };
    } else if (isM6Term1) {
        // --- M.6 Term 1 Data ---
        content = {
            hero: {
                blobs: ["bg-[#F8FAB4]/40", "bg-[#FFC7A7]/40"],
            },
            painPoint: {
                title: "อย่าให้ \"เทอมสุดท้าย\" ต้องมาเสียใจ! 🚀",
                subtitle: "เปลี่ยนบทเรียนชี้ชะตาอย่าง \"แคลคูลัส\" และ \"ลำดับอนุกรม\" ให้กลายเป็นบททำคะแนน พร้อมคว้าความได้เปรียบในสนามสอบ TCAS",
                blobs: ["bg-[#F8FAB4]/30", "bg-[#FFC7A7]/30"],
                problemBox: {
                    title: "โค้งสุดท้ายแล้วยังกังวลเรื่องพวกนี้ไหม?",
                    icon: "😰",
                    items: [
                        { icon: "🤯", text: "แคลคูลัสสุดโหด: เจอ Limit, Diff, Integrate แล้วไปไม่เป็นเลย เนื้อหาเยอะและซับซ้อนมาก" },
                        { icon: "➗", text: "อนุกรมชวนงง: Σ คืออะไร? อนุกรมลู่เข้า ลู่ออกดูยังไง โจทย์ประยุกต์เยอะจนท้อ" },
                        { icon: "⏳", text: "เวลาไม่พอ: ต้องอ่านทั้งเนื้อหาใหม่ ม.6 แถมยังต้องทวนของเก่า ม.4-ม.5 อีก จะเริ่มตรงไหนก่อนดี" },
                        { icon: "😥", text: "หมดไฟ: รู้สึกว่าอ่านเท่าไหร่ก็ไม่ทันเพื่อน กดดัน เครียด จนไม่อยากอ่านต่อแล้ว" }
                    ],
                    bg: "bg-white/50"
                },
                solutionBox: {
                    title: "🔥 เปลี่ยนความกังวลเป็นความมั่นใจ! คอร์ส \"คณิตเพิ่ม ม.6 เทอม 1\" โดยครูฮีม!",
                    icon: "🔥",
                    desc: "ครูฮีมจะพาน้องๆ สรุปเนื้อหาที่สำคัญทั้งหมด เจาะลึกคอนเซ็ปต์ที่เข้าใจยากให้ง่ายขึ้น พร้อมสอนเทคนิคทำโจทย์ A-Level ที่ใช้ได้จริง เพื่อให้น้องๆ เดินเข้าห้องสอบได้อย่างมั่นใจที่สุด!",
                    items: [
                        { icon: "✅", text: "เคลียร์ทุกเนื้อหา ม.6 เทอม 1 แบบละเอียด เข้าใจจริง" },
                        { icon: "✅", text: "ตะลุยโจทย์ A-Level ที่เชื่อมโยงกับบทเรียนโดยตรง" },
                        { icon: "✅", text: "วางแผนการอ่าน และทบทวนอย่างเป็นระบบ ทำทันแน่นอน" }
                    ],
                    bg: "bg-[#F8FAB4]/50",
                    border: "border-[#F08787]/60"
                }
            },
            curriculum: [
                {
                    id: 1,
                    title: "ลำดับและอนุกรม",
                    desc: "บทพื้นฐานสำคัญของแคลคูลัสและสถิติ",
                    color: "bg-[#FEE2AD]/70",
                    iconColor: "text-[#FEE2AD]",
                    content: [
                        "ลำดับเบื้องต้น",
                        "[ตอนที่ 1] ลำดับคืออะไร",
                        "[ตอนที่ 2] วิธีการหาพจน์ถัดไปของลำดับ",
                        "[ตอนที่ 3] เทคนิคการหาพจน์ที่ n",
                        "[ตอนที่ 4] เทคนิคการหาพจน์ที่ n",
                        "[ตอนที่ 5] เทคนิคการหาพจน์ที่ n",
                        "[ตอนที่ 6] การใช้ฟังก์ชันพหุนามหาพจน์ทั่วไป",
                        "[ตอนที่ 7] การใช้ฟังก์ชันพหุนามหาพจน์ทั่วไป",
                        "ลำดับเลขคณิต",
                        "[ตอนที่ 8] ลำดับเลขคณิต",
                        "[ตอนที่ 9] สูตรลำดับเลขคณิต",
                        "[ตอนที่ 10] การหาพจน์ที่ n ของลำดับเลขคณิต",
                        "[ตอนที่ 11] ตัวอย่างการใช้สูตรลำดับเลขคณิต",
                        "[ตอนที่ 12] การหาพจน์ที่ n ของลำดับเลขคณิต",
                        "[ตอนที่ 13] การหาพจน์ที่ n ของลำดับเลขคณิต",
                        "[ตอนที่ 14] วิธีหาพจน์ที่ต้องการ",
                        "[ตอนที่ 15] การหาค่า n",
                        "[ตอนที่ 16] วิธีหาพจน์ที่ต้องการ",
                        "[ตอนที่ 17] วิธีหาพจน์ที่ต้องการ",
                        "[ตอนที่ 18] เทคนิคการหาจำนวนพจน์ที่หารลงตัว",
                        "[ตอนที่ 19] เทคนิคการหาจำนวนพจน์ที่หารลงตัว",
                        "[ตอนที่ 20] เทคนิคการหาจำนวนพจน์ที่หารลงตัว",
                        "[ตอนที่ 21] โจทย์ปัญหาลำดับเลขคณิต",
                        "ลำดับเรขาคณิต",
                        "[ตอนที่ 22] ลำดับเรขาคณิต",
                        "[ตอนที่ 23] การหา 5 พจน์แรกของลำดับเรขาคณิต",
                        "[ตอนที่ 24] สูตรของลำดับเรขาคณิต",
                        "[ตอนที่ 25] สูตรของลำดับเรขาคณิต",
                        "[ตอนที่ 26] การหาพจน์ที่ต้องการของลำดับเรขาคณิต",
                        "[ตอนที่ 27] โจทย์ปัญหาของลำดับเรขาคณิต",
                        "[ตอนที่ 28] โจทย์ปัญหาของลำดับเรขาคณิต",
                        "[ตอนที่ 29] โจทย์ปัญหาของลำดับเรขาคณิต",
                        "อนุกรมเลขคณิต",
                        "[ตอนที่ 30] อนุกรมเลขคณิต",
                        "[ตอนที่ 31] เทคนิคการทำโจทย์อนุกรมเลขคณิต",
                        "[ตอนที่ 32] เทคนิคการทำโจทย์อนุกรมเลขคณิต",
                        "[ตอนที่ 33] เทคนิคการทำโจทย์อนุกรมเลขคณิต",
                        "[ตอนที่ 34] เทคนิคการทำโจทย์อนุกรมเลขคณิต",
                        "[ตอนที่ 35] เทคนิคการทำโจทย์อนุกรมเลขคณิต",
                        "[ตอนที่ 36] เทคนิคการทำโจทย์อนุกรมเลขคณิต",
                        "[ตอนที่ 37] เทคนิคการทำโจทย์อนุกรมเลขคณิต",
                        "อนุกรมเรขาคณิต",
                        "[ตอนที่ 38] อนุกรมเรขาคณิต",
                        "[ตอนที่ 39] เทคนิคการทำโจทย์อนุกรมเลขาคณิต",
                        "[ตอนที่ 40] เทคนิคการทำโจทย์อนุกรมเลขาคณิต",
                        "[ตอนที่ 41] เทคนิคการทำโจทย์อนุกรมเลขาคณิต",
                        "[ตอนที่ 42] เทคนิคการทำโจทย์อนุกรมเลขาคณิต",
                        "[ตอนที่ 43] เทคนิคการทำโจทย์อนุกรมเลขาคณิต",
                        "[ตอนที่ 44] เทคนิคการทำโจทย์อนุกรมเลขาคณิต",
                        "[ตอนที่ 45] เทคนิคการทำโจทย์อนุกรมเลขาคณิต",
                        "[ตอนที่ 46] เทคนิคการทำโจทย์อนุกรมเลขาคณิต"
                    ]
                },
                {
                    id: 2,
                    title: "แคลคูลัสเบื้องต้น",
                    desc: "หัวใจสำคัญของการสอบ A-Level และคณิตศาสตร์ในมหาวิทยาลัย",
                    color: "bg-[#F8FAB4]/70",
                    iconColor: "text-[#F8FAB4]",
                    content: [
                        "ลิมิตและความต่อเนื่อง",
                        "[EP.1] แนวคิดพื้นฐานของลิมิต และทฤษฎีบทเกี่ยวกับลิมิต",
                        "[EP.2] เทคนิคการหาลิมิตของฟังก์ชันในรูปแบบไม่กำหนด (0/0)",
                        "[EP.3] การหาลิมิตซ้าย-ขวา และลิมิตที่ค่าอนันต์",
                        "[EP.4] ความต่อเนื่องของฟังก์ชัน (Continuity) และการตรวจสอบ",
                        "อนุพันธ์ของฟังก์ชัน (Derivatives)",
                        "[EP.5] การหาอนุพันธ์โดยใช้นิยาม (อัตราการเปลี่ยนแปลงเฉลี่ย)",
                        "[EP.6] สูตรการหาอนุพันธ์ของฟังก์ชันพีชคณิต (สูตร Diff ที่ต้องจำ)",
                        "[EP.7] การหาอนุพันธ์ของฟังก์ชันผลคูณและผลหาร",
                        "[EP.8] กฎลูกโซ่ (Chain Rule) สำหรับหาอนุพันธ์ของฟังก์ชันประกอบ",
                        "[EP.9] การหาอนุพันธ์อันดับสูง",
                        "การประยุกต์ของอนุพันธ์",
                        "[EP.10] การสร้างสมการเส้นสัมผัสและเส้นตั้งฉากเส้นโค้ง",
                        "[EP.11] ฟังก์ชันเพิ่ม ฟังก์ชันลด และการหาค่าวิกฤต",
                        "[EP.12] การหาค่าสูงสุดสัมพัทธ์และต่ำสุดสัมพัทธ์",
                        "[EP.13] โจทย์ปัญหาค่าสูงสุด-ต่ำสุด (Optimization) ที่ออกสอบบ่อย",
                        "ปริพันธ์ของฟังก์ชัน (Integrals)",
                        "[EP.14] ปริพันธ์ไม่จำกัดเขต (Indefinite Integral) และสูตรพื้นฐาน",
                        "[EP.15] เทคนิคการอินทิเกรตเบื้องต้น",
                        "[EP.16] ปริพันธ์จำกัดเขต (Definite Integral) และทฤษฎีบทหลักมูลของแคลคูลัส",
                        "[EP.17] การหาพื้นที่ที่ปิดล้อมด้วยเส้นโค้งและแกน X",
                        "[EP.18] การหาพื้นที่ระหว่างเส้นโค้ง",
                        "[EP.19] ตะลุยโจทย์ A-Level เรื่องแคลคูลัส ชุดที่ 1",
                        "[EP.20] ตะลุยโจทย์ A-Level เรื่องแคลคูลัส ชุดที่ 2"
                    ]
                }
            ],
            choices: {
                oldPath: "ปล่อยให้ความกดดันและความไม่พร้อมถาโถม... พยายามอ่านเองทั้งหมดแต่จับต้นชนปลายไม่ถูก ไม่รู้ว่าควรเน้นบทไหน ทบทวนไม่ทัน ทำข้อสอบเก่าก็ยังทำไม่ค่อยได้ สุดท้ายเดินเข้าห้องสอบแบบวัดดวง ทำได้แค่ไหนเอาแค่นั้น... แล้วก็ต้องยอมรับผลคะแนนที่ออกมา พร้อมกับความเสียดายที่ว่า \"ถ้าย้อนเวลากลับไปได้ จะเตรียมตัวให้ดีกว่านี้\" แต่ก็สายเกินไปเสียแล้ว",
                newPath: "เลือกเส้นทางของคนสำเร็จ ที่วางแผนมาอย่างดี... ใช้เครื่องมือที่ถูกต้องเพื่อทำความเข้าใจเนื้อหา ม.6 อย่างทะลุปรุโปร่ง พร้อมทบทวนเนื้อหาเก่าไปในตัว เรียนรู้เทคนิคการทำข้อสอบจากผู้มีประสบการณ์ เดินเข้าห้องสอบอย่างมั่นใจเต็มร้อย ทำคะแนนได้ตามเป้า คว้าคณะและมหาวิทยาลัยในฝันมาครองได้สำเร็จ แล้วภูมิใจกับความพยายามของตัวเองในวันนี้",
                colors: {
                    old: "bg-[#FFC7A7]/40",
                    new: "bg-[#F8FAB4]/40",
                    button: "bg-[#F08787] hover:bg-[#d44d4d]"
                }
            }
        };
    } else if (isM5Term2) {
        // --- M.5 Term 2 Data ---
        content = {
            hero: {
                blobs: ["bg-[#FFA673]/40", "bg-[#03A6A1]/40"],
            },
            painPoint: {
                title: "อย่าให้ \"คณิต ม.5 เทอม 2\" มาฉุดเกรด! 🚀",
                subtitle: "เก็บเนื้อหาสำคัญให้ครบ เปลี่ยนเรื่องยากให้เป็นเรื่องง่าย พร้อมทำคะแนนสอบปลายภาคและสร้างความมั่นใจก่อนขึ้น ม.6",
                blobs: ["bg-[#FFE3BB]/30", "bg-[#FFFDEB]/30"],
                problemBox: {
                    title: "เรียน ม.5 เทอม 2 แล้วเจอความท้าทายแบบนี้ใช่ไหม?",
                    icon: "😰",
                    items: [
                        { icon: "🤯", text: "เนื้อหาใหม่สุดท้าทาย: จำนวนเชิงซ้อน, ความน่าจะเป็น... เรื่องพวกนี้คืออะไร?" },
                        { icon: "😨", text: "โจทย์ซับซ้อนขึ้น: โจทย์ประยุกต์เยอะมาก วิเคราะห์ผิดนิดเดียวคือตอบผิดเลย" },
                        { icon: "😵", text: "ต้องจำสูตรเยอะ: หลักการนับเบื้องต้นมีหลายกรณี ต้องเลือกใช้สูตรให้ถูก" },
                        { icon: "📉", text: "เวลาเหลือน้อยลง: เผลอแป๊บเดียวจะขึ้น ม.6 แล้ว เนื้อหายังเก็บไม่ครบเลย" }
                    ],
                    bg: "bg-white/50"
                },
                solutionBox: {
                    title: "💥 หมดห่วง! สร้างความได้เปรียบก่อนเข้า ม.6 คอร์ส \"พิชิตคณิตเพิ่ม ม.5 เทอม 2\" โดยครูฮีม!",
                    icon: "💥",
                    desc: "เปลี่ยนเทอมสุดท้ายที่แสนวุ่นวาย ให้กลายเป็นการเตรียมตัวที่แข็งแกร่ง! ครูฮีมจะพาน้องๆ เจาะลึกเนื้อหาสำคัญ สอนเทคนิคการวิเคราะห์โจทย์และเลือกใช้สูตรอย่างแม่นยำ",
                    items: [
                        { icon: "✅", text: "อธิบายละเอียดเห็นภาพ เข้าใจที่มาของแต่ละเรื่อง ไม่ใช่แค่จำไปสอบ" },
                        { icon: "✅", text: "ตะลุยโจทย์ประยุกต์ ครอบคลุมทุกแนวข้อสอบที่ต้องเจอ" },
                        { icon: "✅", text: "สร้างความมั่นใจเต็มร้อย พร้อมสำหรับสอบปลายภาค และต่อยอดสู่สนามสอบ A-Level" }
                    ],
                    bg: "bg-[#FFE3BB]/50",
                    border: "border-[#03A6A1]/60"
                }
            },
            curriculum: [
                {
                    id: 1,
                    title: "จำนวนเชิงซ้อน (Complex Numbers)",
                    desc: "ขยายขอบเขตของจำนวนไปอีกขั้น",
                    color: "bg-[#03A6A1]/70",
                    iconColor: "text-[#03A6A1]",
                    content: [
                        "พื้นฐานจำนวนเชิงซ้อน",
                        "[EP.1] ความลับของ i",
                        "[EP.2] เทคนิคการหาค่า i ยกกำลัง n",
                        "[EP.3]  การหาค่า i ยกกำลัง n เรียงกัน",
                        "การดำเนินการเบื้องต้น",
                        "[EP.4] การเท่ากันของจำนวนเชิงซ้อน",
                        "[EP.5] วิธีการบวกและการคูณจำนวนเชิงซ้อน",
                        "[EP.6] เทคนิคการหาสังยุคของจำนวนเชิงซ้อน",
                        "[EP.7] ตัวอย่างการหาสังยุค",
                        "[EP.8] เทคนิคการหารจำนวนเชิงซ้อน",
                        "[EP.9] แบบฝึกหัดการหารจำนวนเชิงซ้อน",
                        "[EP.10] แบบฝึกหัดการหารจำนวนเชิงซ้อน",
                        "[EP.11] เทคนิคการหาอินเวอร์สของจำนวนเชิงซ้อน",
                        "ค่าสัมบูรณ์และรูปเชิงขั้ว",
                        "[EP.12] เทคนิคค่าสัมบูรณ์ของจำนวนเชิงซ้อน",
                        "[EP.13] ตัวอย่างการหาค่าสัมบูรณ์ของจำนวนเชิงซ้อน",
                        "[EP.14] ตัวอย่างการหาค่าสัมบูรณ์ของจำนวนเชิงซ้อน",
                        "[EP.15] วิธีเปลี่ยนเชิงซ้อนเป็นเชิงขั้ว",
                        "[EP.16] วิธีเปลี่ยนเชิงซ้อนเป็นเชิงขั้ว",
                        "[EP.17] กฏของ CIS",
                        "[EP.18] ตัวอย่างที่ต้องทำให้ได้เรื่องกฏของ CIS",
                        "[EP.19] ตัวอย่างที่ต้องทำให้ได้เรื่องกฏของ CIS",
                        "รากที่ n และสมการพหุนาม",
                        "[EP.20] 3 ขั้นตอนในการหารากที่ n",
                        "[EP.21] ตัวอย่างการหารากที่ n",
                        "[EP.22] เบื้องต้นเกี่ยวกับการแก้สมการพหุนาม",
                        "[EP.23] การแก้สมการพหุนาม กำลัง 3 โดยการดึงตัวร่วม",
                        "[EP.24] 3 ขั้นตอนของการแก้สมการพหุนาม",
                        "[EP.25] วิธีการแก้สมการพหุนามกำลัง 4 ขึ้นไป",
                        "[EP.26] เทคนิคการใช้คู่คำตอบสร้างสมการพหุนาม",
                        "[EP.27] เทคนิคการใช้คู่คำตอบสร้างสมการพหุนาม",
                        "สรุปแนวโจทย์",
                        "[สรุปแนวโจทย์ EP.1] แนวโจทย์เกี่ยวกับค่า i",
                        "[สรุปแนวโจทย์ EP.2] การบวก ลบ คูณ หาร จำนวนเชิงซ้อน",
                        "[สรุปแนวโจทย์ EP.3] บาร์ อินเวอร์ส ค่าสัมบูรณ์",
                        "[สรุปแนวโจทย์ EP.4] พิกัดเชิงขั้ว EP.1",
                        "[สรุปแนวโจทย์ EP.5] พิกัดเชิงขั้ว EP.2",
                        "[สรุปแนวโจทย์ EP.6] พิกัดเชิงขั้ว EP.3",
                        "[สรุปแนวโจทย์ EP.7] สมการพหุนาม"
                    ]
                },
                {
                    id: 2,
                    title: "ความน่าจะเป็น (Probability)",
                    desc: "วิเคราะห์โอกาสและความเป็นไปได้",
                    color: "bg-[#FFA673]/70",
                    iconColor: "text-[#FFA673]",
                    content: [
                        "หลักการนับเบื้องต้น",
                        "[EP.1] เทคนิคของกฎการคูณ",
                        "[EP.2] เทคนิคของกฎการบวก",
                        "[EP.3] ตัวอย่างกฎการบวก+กฎการบวก",
                        "[EP.4] เทคนิคการโฟกัสไปที่คนเลือกตัดสินใจ",
                        "[EP.5] ตัวอย่างกฎการคูณ",
                        "[EP.6] ตัวอย่างการหาจำนวนวิธีทั้งหมดเมื่อแบ่งเป็นกรณีต่างๆ",
                        "[EP.7] เทคนิคการเลือกคณะกรรมการ",
                        "[EP.8] เทคนิคการเจัดอักษร",
                        "[EP.9] หลักในการสร้าจำนวนเลข",
                        "[EP.10] ปัญหาการสร้างจำนวนเลขที่นักเรียนต้องเจอ",
                        "[EP.11] วิธีการสร้างตัวเลขให้มากกว่าค่าที่โจทย์กำหนด",
                        "การเรียงสับเปลี่ยน",
                        "[EP.12] วิธีการหาแฟคทอเรียล",
                        "[EP.13] วิธีการเรียงสับเปลี่ยนแนวเส้นตรง",
                        "[EP.14] เทคนิคการเรียงของที่ติดกัน",
                        "[EP.15] เทคนิคการเรียงของที่แยกกัน",
                        "[EP.16] วิธีการเรียงของที่ซ้ำกัน",
                        "[EP.17] วิธีการเรียงของที่ซ้ำกัน",
                        "[EP.18] วิธีใช้ P ในการเรียงของ",
                        "[EP.19] เทคนิคลัดในการหาค่า P อย่างรวดเร็ว",
                        "[EP.20] ตัวอย่างโจทย์การใช้ค่า P",
                        "[EP.21] วิธีการจัดเรียงแนววงกลม",
                        "[EP.22] เทคนิคการนั่งสลับกันแบบวงกลม",
                        "[EP.23] เทคนิคการจัดแบบให้นั่งตรงข้ามกัน",
                        "[EP.24] เทคนิคการจัดวงกลมโดยต้องนั่งติดกัน",
                        "[EP.25] แนวการทำโจทย์การจัดเรียงแนววงกลม",
                        "การจัดหมู่และทฤษฎีบททวินาม",
                        "[EP.26] เทคนิคการหาค่า c อย่างรวดเร็ว",
                        "[EP.27] ข้อควรรู้ของ c",
                        "[EP.28] เทคนิคการจัดหมู่ที่แตกต่างกันด้วย c",
                        "[EP.29] แนวโจทย์การจัดหมู่ที่แตกต่างกันด้วย c",
                        "[EP.30] แนวโจทย์การจัดหมู่ที่แตกต่างกันด้วย c",
                        "[EP.31] เทคนิคการลบ",
                        "[EP.32] เทคนิคการลบ",
                        "[EP.33] สิ่งที่ต้องรู้เกี่ยวกับทวินาม",
                        "[EP.34] เทคนิคการกระจายด้วยทวินาม",
                        "[EP.35] แนวโจทย์ทวินาม",
                        "[EP.36] แนวโจทย์ทวินาม",
                        "[EP.37] การกาสัมประสิทธิ์ทวินาม",
                        "[EP.38] เทคนิคการหาพจน์ทั่วไป",
                        "[EP.39] เทคนิคการหาพจน์ทั่วไป",
                        "พื้นฐานความน่าจะเป็น",
                        "[EP.40] สิ่งที่ต้องรู้เกี่ยวกับความน่าจะเป็น",
                        "[EP.41] แนวโจทย์ความน่าจะเป็น",
                        "[EP.42] แนวโจทย์ความน่าจะเป็น",
                        "[EP.43] แนวโจทย์ความน่าจะเป็น",
                        "[EP.44] แนวโจทย์ความน่าจะเป็น",
                        "กฎของความน่าจะเป็น",
                        "[EP.45] กฎข้อที่ 1 ของความน่าจะเป็น",
                        "[EP.46] แนวโจทย์กฎข้อที่ 1 ของความน่าจะเป็น",
                        "[EP.47] แนวโจทย์กฎข้อที่ 2 ของความน่าจะเป็น",
                        "[EP.48] แนวโจทย์กฎข้อที่ 2 ของความน่าจะเป็น",
                        "[EP.49] แนวโจทย์กฎข้อที่ 3 ความน่าจะเป็นของเหตุการณ์ที่ไม่เกิดขึ้นร่วมกัน",
                        "[EP.50] โจทย์ความน่าจะเป็น+เซต",
                        "[EP.51] โจทย์ความน่าจะเป็น+เซต",
                        "[EP.52] โจทย์ความน่าจะเป็น+เซต"
                    ]
                }
            ],
            choices: {
                oldPath: "ปล่อยให้เนื้อหา ม.5 เทอม 2 ที่ซับซ้อน กลายเป็นดินพอกหางหมู... อ่านหนังสือไม่ทัน เนื้อหาเยอะเกินไป พอใกล้สอบก็ค่อยมาปั่นอ่าน สุดท้ายเข้าห้องสอบไปก็จำสูตรสับสน ทำโจทย์ประยุกต์ไม่ได้... แล้วบอกตัวเองว่า \"ค่อยไปสู้เต็มที่ตอน ม.6\" โดยปล่อยให้ความไม่มั่นใจสะสมไปเรื่อยๆ",
                newPath: "เลือกเส้นทางของคนสำเร็จ ที่เคลียร์เนื้อหาสำคัญได้ครบถ้วน... เปลี่ยนเรื่องที่ซับซ้อนให้เข้าใจง่าย ทำคะแนนสอบปลายภาคได้อย่างยอดเยี่ยม มีเวลาเหลือไปทบทวนบทเรียนเก่าๆ เดินเข้าสู่ ม.6 อย่างมั่นใจ สร้างความได้เปรียบก่อนใครในสนามสอบ A-Level ไม่ต้องไปเหนื่อยวิ่งตามเพื่อนตอนโค้งสุดท้าย",
                colors: {
                    old: "bg-[#FFC7A7]/40",
                    new: "bg-[#03A6A1]/40",
                    button: "bg-[#FF4F0F] hover:bg-[#d44d4d]"
                }
            }
        };
    } else if (isM5Term1) {
        // --- M.5 Term 1 Data ---
        content = {
            hero: {
                blobs: ["bg-[#FEE2AD]/40", "bg-[#FFC7A7]/40"],
            },
            painPoint: {
                title: "อย่าให้ \"คณิต ม.5 เทอม 1\" มาตัดโอกาสคณะในฝัน! 🚀",
                subtitle: "เปลี่ยนบทเรียนสุดโหดอย่าง \"ตรีโกณมิติ\" และ \"เวกเตอร์\" ให้เป็นเรื่องกล้วยๆ ทำคะแนนสอบให้พุ่งทะยาน และสร้างความได้เปรียบในการสอบ A-Level",
                blobs: ["bg-[#FEE2AD]/30", "bg-[#FFC7A7]/30"],
                problemBox: {
                    title: "ขึ้น ม.5 แล้วยังเจอเรื่องพวกนี้อยู่ไหม?",
                    icon: "😰",
                    items: [
                        { icon: "😵‍💫", text: "ตรีโกณมิติสุดโหด: สูตรเยอะจนจำไม่ไหว วงกลมหนึ่งหน่วยคืออะไร? ทำไมต้องมี sin, cos, tan เต็มไปหมด" },
                        { icon: "🤔", text: "เมทริกซ์ที่ไม่คุ้นเคย: เจอตัวเลขในวงเล็บใหญ่ๆ บวก ลบ คูณ กันยังไง แล้ว det, inverse คืออะไรอีก" },
                        { icon: "🧭", text: "เวกเตอร์ 3 มิติ: แค่ 2 มิติก็ยากแล้ว นี่ยังต้องจินตนาการภาพ 3 มิติอีก แค่คิดก็ปวดหัว" },
                        { icon: "⏳", text: "หมดไฟอ่านหนังสือ: เนื้อหายากและเยอะขึ้นมาก จนไม่รู้จะเริ่มตรงไหน รู้สึกว่า TCAS ช่างไกลเกินเอื้อม" }
                    ],
                    bg: "bg-white/50"
                },
                solutionBox: {
                    title: "🔥 เปลี่ยนเรื่องยากให้เป็นเรื่องง่าย! คอร์ส \"คณิตเพิ่ม ม.5 เทอม 1\" โดยครูฮีม!",
                    icon: "🔥",
                    desc: "มาทำลายกำแพงความกลัว! ครูฮีมจะพาน้องๆ เจาะลึกเนื้อหา ม.5 ตั้งแต่พื้นฐาน สรุปสูตรตรีโกณฯ ที่ต้องใช้จริง สอนเทคนิคการคำนวณเมทริกซ์ และพาจินตนาการภาพเวกเตอร์ 3 มิติอย่างเป็นขั้นตอน",
                    items: [
                        { icon: "✅", text: "เข้าใจถึงแก่น ไม่ใช่แค่ท่องจำสูตร แต่รู้ที่มาและประยุกต์เป็น" },
                        { icon: "✅", text: "ตะลุยโจทย์จริง ครบทุกแนว ตั้งแต่พื้นฐานจนถึงข้อสอบแข่งขัน" },
                        { icon: "✅", text: "สร้างความมั่นใจ พิชิตเกรด 4 ที่โรงเรียน และพร้อมสำหรับสนามสอบ TCAS" }
                    ],
                    bg: "bg-[#FEE2AD]/50",
                    border: "border-[#F08787]/60"
                }
            },
            curriculum: [
                {
                    id: 1,
                    title: "ฟังก์ชันตรีโกณมิติ",
                    desc: "บทพื้นฐานสำคัญสู่ฟิสิกส์และแคลคูลัส",
                    color: "bg-[#F08787]/70",
                    iconColor: "text-[#F08787]",
                    content: [
                        "พื้นฐานและวงกลมหนึ่งหน่วย",
                        "ตอนที่ 1 สามเหลี่ยมมุมฉากกับตรีโกณ",
                        "ตอนที่ 2 วงกลมหนึ่งหน่วยกับตรีโกณ",
                        "ตอนที่ 3  มุมทวนเข็มและมุมตามเข็ม",
                        "ตอนที่ 4  มุมในรูปของพาย",
                        "ตอนที่ 5  ตำแหน่งของพายในวงกลม",
                        "ตอนที่ 6  เทคนิคการหาค่าตรีโกณจากวงกลม",
                        "ตอนที่ 7 เทคนิคการทำโจทย์การหาค่าตรีโกณ",
                        "การยุบมุมและการหาค่าฟังก์ชัน",
                        "ตอนที่ 8 การยุบมุมแนวนอน",
                        "ตอนที่ 9 เทคนิคการแยกพาย",
                        "ตอนที่ 10 เทคนิคแยกแล้วยุบ",
                        "ตอนที่ 11 การยุบมุมแนวตั้ง",
                        "ตอนที่ 12 การหาค่ามุมลบ",
                        "ตอนที่ 13 โจทย์การหาค่าตรีโกณ",
                        "ตอนที่ 14 โจทย์การหาค่าตรีโกณ",
                        "ตอนที่ 15 โจทย์การหาค่าตรีโกณ",
                        "ตอนที่ 16 โจทย์การหาค่าตรีโกณ",
                        "สามเหลี่ยมในควอดรันด์และการประยุกต์",
                        "ตอนที่ 17 สามเหลี่ยมในควอดรันด์",
                        "ตอนที่ 18 โจทย์สามเหลี่ยมในควอดรันด์",
                        "ตอนที่ 19 โจทย์สามเหลี่ยมในควอดรันด์",
                        "ตอนที่ 20 โจทย์สามเหลี่ยมในควอดรันด์",
                        "ตอนที่ 21 โจทย์สามเหลี่ยมในควอดรันด์",
                        "ตอนที่ 22 โจทย์สามเหลี่ยมในควอดรันด์",
                        "ตอนที่ 23 โจทย์สามเหลี่ยมในควอดรันด์",
                        "ตอนที่ 24 เทคนิคการประยุกต์ของสามเหลี่ยมมุมฉาก",
                        "ตอนที่ 25 โจทย์การประยุกต์ของสามเหลี่ยมมุมฉาก",
                        "ตอนที่ 26 โจทย์การประยุกต์ของสามเหลี่ยมมุมฉาก",
                        "กราฟของฟังก์ชันตรีโกณมิติ",
                        "ตอนที่ 27 ส่วนประกอบของกราาฟ",
                        "ตอนที่ 28 กราฟของ sin",
                        "ตอนที่ 29 กราฟของ cos",
                        "ตอนที่ 30 เทคนิคการวาดกราฟ",
                        "ตอนที่ 31 เทคนิคการวาดกราฟ",
                        "ตอนที่ 32 เทคนิคการวาดกราฟแบบเลื่อนแกน",
                        "ตอนที่ 33 เทคนิคการวาดกราฟแบบเลื่อนแกน",
                        "ตอนที่ 34 โจทย์การหาแอมพลิจูดและคาบ",
                        "ตอนที่ 35 กราฟ cosec sec tan cot",
                        "เอกลักษณ์และสูตรมุมประกอบ",
                        "ตอนที่ 36 สูตรแม่",
                        "ตอนที่ 37 โจทย์สูตรแม่",
                        "ตอนที่ 38 โจทย์สูตรแม่",
                        "ตอนที่ 39 โจทย์สูตรแม่",
                        "ตอนที่ 40 โจทย์สูตรแม่",
                        "ตอนที่ 41 โจทย์สูตรแม่",
                        "สูตรมุมประกอบ",
                        "ตอนที่ 42 สูตรมุมประกอบ",
                        "ตอนที่ 43 โจทย์สูตรมุมประกอบ",
                        "ตอนที่ 44 โจทย์สูตรมุมประกอบ",
                        "ตอนที่ 45 โจทย์สูตรมุมประกอบ",
                        "ตอนที่ 46 Co-function เติมให้เต็ม 90 องศา",
                        "ตอนที่ 47 โจทย์สูตรมุมประกอบ",
                        "ตอนที่ 48 โจทย์สูตรมุมประกอบ",
                        "ตอนที่ 49 โจทย์สูตรมุมประกอบ",
                        "สูตรมุมหลายเท่าและผลบวก/ผลคูณ",
                        "ตอนที่ 50 มุม 2 เท่า",
                        "ตอนที่ 51 มุม 2 เท่า",
                        "ตอนที่ 52 เทคนิคเรื่องมุมครึ่งเท่า",
                        "ตอนที่ 53 โจทย์มุมครึ่งเท่า",
                        "ตอนที่ 54 เทคนิคการทำโจทย์มุม3เท่า",
                        "ตอนที่ 55 ผลบวก ผลต่าง ผลคูณของมุม",
                        "ตอนที่ 56 เทคนิคการทำฌจทย์ผลบวก ผลต่าง ผลคูณของมุม",
                        "ตอนที่ 57 เทคนิคการทำโจทย์ผลบวก ผลต่าง ผลคูณของมุม",
                        "อินเวอร์สของฟังก์ชันตรีโกณมิติ (Arc-functions)",
                        "ตอนที่ 58 arc คืออะไร",
                        "ตอนที่ 59 โดเมนและเรนจ์ที่ทำให้หา arc ได้",
                        "ตอนที่ 60 เทคนิคการกำจัด arc",
                        "ตอนที่ 61 เทคนิคหาarcติดลบ",
                        "ตอนที่ 62 เทคนิคโจทย์หาarcติดลบ",
                        "ตอนที่ 63 3เทคนิคการหามมุมarcที่ไม่คุ้นเคย",
                        "ตอนที่ 64 แนวโจทย์การหามุม arc ที่ไม่คุ้นเคย",
                        "ตอนที่ 65 แนวโจทย์การหามุม arc ที่ไม่คุ้นเคย",
                        "การแก้สมการตรีโกณมิติ",
                        "ตอนที่ 66 วิธีการแก้สมการตรีโกณมิติ",
                        "ตอนที่ 67 แนวโจทย์การแก้สมการตรีโกณมิติ",
                        "ตอนที่ 68 แนวโจทย์การแก้สมการตรีโกณมิติ",
                        "ตอนที่ 69 แนวโจทย์การแก้สมการตรีโกณมิติ",
                        "ตอนที่ 70 แนวโจทย์การแก้สมการตรีโกณมิติ",
                        "ตอนที่ 71 แนวโจทย์การแก้สมการตรีโกณมิติ",
                        "ตอนที่ 72 แนวโจทย์การแก้สมการตรีโกณมิติ",
                        "ตอนที่ 73 แนวโจทย์การแก้สมการตรีโกณมิติ"
                    ]
                },
                {
                    id: 2,
                    title: "เมทริกซ์",
                    desc: "เครื่องมือสำคัญในการแก้ระบบสมการและวิทยาการข้อมูล",
                    color: "bg-[#FFC7A7]/70",
                    iconColor: "text-[#FFC7A7]",
                    content: [
                        "ความรู้เบื้องต้นและพีชคณิตของเมทริกซ์",
                        "[ตอนที่ 1] 3 เรื่องที่ต้องรู้เกี่ยวกับเมทริกซ์",
                        "[ตอนที่ 2] พิชคณิตของเมทริกซ์",
                        "[ตอนที่ 3] การเท่ากันของเมทริกซ์",
                        "[ตอนที่ 4] ทรานสโพสของเมทริกซ์",
                        "[ตอนที่ 5] ตัวอย่างทรานสโพสของเมทริกซ์",
                        "[ตอนที่ 6] เทคนิคการคูณเมทริกซ์",
                        "[ตอนที่ 7] สมบัติการบวกและการคูณเมทริกซ์",
                        "[ตอนที่ 8] เฉลยแบบฝึกหัดความรู้พื้นฐานของเมทริกซ์",
                        "[ตอนที่ 9] เฉลยแบบฝึกหัดความรู้พื้นฐานของเมทริกซ์",
                        "ดีเทอร์มิแนนต์",
                        "[ตอนที่ 10] เทคนิคการหา det",
                        "[ตอนที่ 11] ตัวอย่างการหาา det 3x3",
                        "[ตอนที่ 12] วิธีการแก้สมการ det",
                        "[ตอนที่ 13] วิธีการหาไมเนอร์",
                        "[ตอนที่ 14] วิธีการหา co-factor",
                        "[ตอนที่ 15] วิธีการหา det ด้วย co-factor",
                        "[ตอนที่ 16] สมบัติของ det ที่ต้องรู้",
                        "อินเวอร์สการคูณของเมทริกซ์",
                        "[ตอนที่ 17] การหาอินเวอร์สของเมทริกซ์",
                        "[ตอนที่ 18] การหาอินเวอร์สของเมทริกซ์มิติ 3x3",
                        "[ตอนที่ 19] สมบัติของอินเวอร์ส",
                        "[ตอนที่ 20] เทคนิคการแก้โจทยอินเวอร์ส",
                        "[ตอนที่ 21] เทคนิคการแก้โจทยอินเวอร์ส",
                        "การประยุกต์ใช้เมทริกซ์แก้ระบบสมการ",
                        "[ตอนที่ 22] เทคนิคการดำเนินการตามแถว",
                        "[ตอนที่ 23] แก้สมการที่ไม่มีคำตอบ ด้วยเมทริกซ์แต่งเติม",
                        "[ตอนที่ 24] แก้สมการที่มีคำตอบเป็นอนันต์  ด้วยเมทริกซ์แต่งเติม",
                        "[ตอนที่ 25] เทคนิคการหาอินเวอร์สด้วย การดำเนินการตามแถว",
                        "[ตอนที่ 26] กฎของคราเมอร์"
                    ]
                },
                {
                    id: 3,
                    title: "เวกเตอร์ในสามมิติ",
                    desc: "เข้าใจปริมาณที่มีทั้งขนาดและทิศทาง",
                    color: "bg-[#FEE2AD]/70",
                    iconColor: "text-[#FEE2AD]",
                    content: [
                        "ความรู้เบื้องต้นเกี่ยวกับเวกเตอร์",
                        "ตอนที่ 1 รู้จักระบบพิกัดฉากสองมิติและสามมิติ",
                        "ตอนที่ 2 สิ่งที่ต้องรู้เกี่ยวกับเวกเตอร์",
                        "ตอนที่ 3 เทคนิคการบวกเวกเตอร์",
                        "ตอนที่ 4 เทคนิคการบวกเวกเตอร์แบบตัวติดตัดทิ้ง",
                        "ตอนที่ 5 เทคนิคการลบเวกเตอร์",
                        "ตอนที่ 6 โจทย์การบวกและลบเวกเตอร์",
                        "ตอนที่ 7 โจทย์การบวกและลบเวกเตอร์",
                        "ตอนที่ 8 โจทย์การบวกและลบเวกเตอร์",
                        "ตอนที่ 9 แนวโจทย์สามเหลี่ยมฐานอัตราส่วน",
                        "ตอนที่ 10 การคูณเวกเตอร์ด้วยสเกลาร์",
                        "ตอนที่ 11  แนวโจทย์การคูณเวกเตอร์ด้วยสเกลาร์",
                        "ตอนที่ 12  แนวโจทย์การคูณเวกเตอร์ด้วยสเกลาร์",
                        "ตอนที่ 13  แนวโจทย์การคูณเวกเตอร์ด้วยสเกลาร์",
                        "เวกเตอร์ในระบบพิกัดฉาก",
                        "ตอนที่ 14  เวกเตอร์ในระบบพิกัดฉาก",
                        "ตอนที่ 15 เทคนิคการหาเวกเตอร์ในระบบพิกัดฉาก",
                        "ตอนที่ 16 เทคนิคการบวกและการลบเวกเตอร์",
                        "ตอนที่ 17 เทคนิคการบวกและการลบเวกเตอร์",
                        "ตอนที่ 18 การคูณเวกเตอร์ด้วยสเกลาร์",
                        "ตอนที่ 19 โจทย์การคูณเวกเตอร์ด้วยสเกลาร์",
                        "ตอนที่ 20 โจทย์การคูณเวกเตอร์ด้วยสเกลาร์",
                        "ตอนที่ 21 การขนานกันของเวกเตอร์",
                        "ตอนที่ 22 แนวโจทย์การขนานกันของเวกเตอร์",
                        "ตอนที่ 23 แนวโจทย์การขนานกันของเวกเตอร์",
                        "ตอนที่ 24 ขนาดของเวกเตอร์",
                        "ตอนที่ 25 แนวโจทย์ขนาดของเวกเตอร์",
                        "ตอนที่ 26 เวกเตอร์หนึ่งหน่วย",
                        "ตอนที่ 27 แนวโจทย์เวกเตอร์หนึ่งหน่วย",
                        "ตอนที่ 28 แนวโจทย์เวกเตอร์หนึ่งหน่วย",
                        "ตอนที่ 29 โคไซน์แสดงทิศทาง",
                        "ตอนที่ 30 การตรวจสอบการขนานด้วยโคไซน์แสดงทิศทาง",
                        "ผลคูณเชิงสเกลาร์ (Dot Product)",
                        "ตอนที่ 31 ผลคูณเชิงสเกลลาร์",
                        "ตอนที่ 32 ผลคูณเชิงสเกลาร์แบบมีมุม",
                        "ตอนที่ 33 แนวโจทย์ผลคูณเชิงสเกลาร์",
                        "ตอนที่ 34 แนวโจทย์ผลคูณเชิงสเกลาร์",
                        "ตอนที่ 35 เทคนิคการหามุมจากการ dot",
                        "ตอนที่ 36 แนวโจทย์เทคนิคการหามุมจากการ dot",
                        "ตอนที่ 37 แนวโจทย์เทคนิคการหามุมจากการ dot",
                        "ตอนที่ 38 แนวโจทย์เทคนิคการหามุมจากการ dot",
                        "ตอนที่ 39 สูตรพิฆาต",
                        "ตอนที่ 40 แนวโจทย์สูตรพิฆาต",
                        "ตอนที่ 41 แนวโจทย์สูตรพิฆาต",
                        "ตอนที่ 42 แนวโจทย์สูตรพิฆาต",
                        "ตอนที่ 43 แนวโจทย์สูตรพิฆาต",
                        "ตอนที่ 44 แนวโจทย์สูตรพิฆาต",
                        "ตอนที่ 45 แนวโจทย์สูตรพิฆาต",
                        "ตอนที่ 46 แนวโจทย์สูตรพิฆาต",
                        "ผลคูณเชิงเวกเตอร์และการประยุกต์",
                        "ตอนที่ 47 ผลคูณเชิงเวกเตอร์",
                        "ตอนที่ 48 ผลคูณเชิงเวกเตอร์",
                        "ตอนที่ 49 เทคนิคที่ 2 ผลคูณเชิงเวกเตอร์",
                        "ตอนที่ 50 เทคนิคที่ 3 ผลคูณเชิงเวกเตอร์",
                        "ตอนที่ 51 เทคนิคที่การหาพื้นที่สี่เหลี่ยมด้านขนาน",
                        "ตอนที่ 52 เทคนิคที่การหาพื้นที่สี่เหลี่ยมด้านขนาน",
                        "ตอนที่ 53 เทคนิคที่การหาพื้นที่สามเหลี่ยมด้านขนาน",
                        "ตอนที่ 54 เทคนิคที่การหาพื้นที่สามเหลี่ยมด้านขนาน",
                        "ตอนที่ 55 เทคนิคที่การหาพื้นที่สามเหลี่ยมด้านขนาน",
                        "ตอนที่ 56 ผลคูณเชิงสเกลาร์ของสามเวกเตอร์",
                        "ตอนที่ 57 แนวโจทย์ผลคูณเชิงสเกลาร์ของสามเวกเตอร์",
                        "ตอนที่ 58 เทคนิคการหาปริมาตรสี่เหลี่ยมด้านขนาน",
                        "ตอนที่ 59 แนวโจทย์การหาปริมาตรสี่เหลี่ยมด้านขนาน"
                    ]
                }
            ],
            choices: {
                oldPath: "ปล่อยให้ตัวเองงงกับเนื้อหา ม.5 ที่เป็นหัวใจของการสอบเข้ามหาวิทยาลัย... ใช้เวลาเป็นวันๆ กับการท่องสูตรตรีโกณฯ ที่มีเป็นร้อยสูตร พยายามทำความเข้าใจเวกเตอร์ 3 มิติแต่ก็ยังมองภาพไม่ออก พอใกล้สอบก็ค่อยมาปั่นอ่านข้ามคืน สุดท้ายก็จำได้บ้างไม่ได้บ้าง เข้าห้องสอบไปก็เจอโจทย์ประยุกต์ที่ไม่เคยเห็น ทำได้แค่ถอนใจแล้วปล่อยคะแนนให้เลยตามเลย... แล้วบอกตัวเองว่า \"ไว้ค่อยไปสู้ตอน ม.6\" โดยที่ไม่รู้เลยว่าได้ทิ้งคะแนนก้อนใหญ่ไปแล้ว",
                newPath: "เลือกเส้นทางของคนสำเร็จ ที่เข้าใจเนื้อหาอย่างแท้จริง ไม่ใช่แค่ท่องจำ... เปลี่ยนวิชาที่เคย \"เกลียด\" ให้กลายเป็นวิชา \"ทำคะแนน\" ใช้เทคนิคที่ถูกต้องเพื่อเคลียร์เนื้อหาได้ในเวลาที่สั้นลง มีเวลาเหลือไปทำกิจกรรมที่ชอบ พอถึงเวลาสอบก็แค่ทบทวนเบาๆ เดินเข้าห้องสอบอย่างมั่นใจ เจอโจทย์แบบไหนก็ทำได้ คว้าเกรด 4 มาแบบสบายๆ พร้อมสร้างความได้เปรียบมหาศาลในสนามสอบ TCAS ตั้งแต่วันนี้ ไม่ต้องไปเหนื่อยวิ่งตามใครตอน ม.6",
                colors: {
                    old: "bg-[#FFC7A7]/40",
                    new: "bg-[#F08787]/40",
                    button: "bg-[#F08787] hover:bg-[#d44d4d]"
                }
            }
        };
    } else if (isM4Term2) {
        // --- M.4 Term 2 Data ---
        content = {
            hero: {
                blobs: ["bg-[#B4E50D]/40", "bg-[#FF9B2F]/40"],
            },
            painPoint: {
                title: "อย่าให้ \"คณิต ม.4 เทอม 2\" มาทำให้เกรดตก! 🚀",
                subtitle: "เปลี่ยนบทเรียนที่ซับซ้อนให้เป็นเรื่องง่าย ทำคะแนนให้พุ่งทะยาน และสร้างพื้นฐานที่แข็งแกร่งสำหรับพิชิต A-Level ในอนาคต",
                blobs: ["bg-[#F0FDF4]/30", "bg-[#FFF7ED]/30"],
                problemBox: {
                    title: "เรียนมาครึ่งทางแล้วยังเจอเรื่องพวกนี้อยู่ใช่ไหม?",
                    icon: "😰",
                    items: [
                        { icon: "🤔", text: "เนื้อหาเชื่อมโยง: ความสัมพันธ์ ฟังก์ชัน Expo-Log คืออะไร? ทำไมมันดูต่อยอดจากเทอมที่แล้วเยอะจัง" },
                        { icon: "📈", text: "กราฟเยอะมาก: ต้องวาดกราฟและวิเคราะห์กราฟเต็มไปหมดจนเริ่มสับสน" },
                        { icon: "😵", text: "สูตรประยุกต์: ไม่ใช่แค่จำสูตรได้ แต่ต้องพลิกแพลงและแก้สมการซับซ้อนเป็น" },
                        { icon: "📉", text: "เริ่มท้อใจ: รู้สึกว่าคณิต ม.ปลาย ยากขึ้นเรื่อยๆ จนหมดกำลังใจในการอ่านหนังสือ" }
                    ],
                    bg: "bg-white/50"
                },
                solutionBox: {
                    title: "💥 มาลุยต่อ! พิชิตเกรด 4 เทอม 2 คอร์ส \"คณิตเพิ่ม ม.4 เทอม 2\" โดยครูฮีม!",
                    icon: "💥",
                    desc: "เปลี่ยนความท้อให้เป็นพลัง! ครูฮีมจะพาน้องๆ เจาะลึกเนื้อหาที่ซับซ้อนให้เข้าใจง่ายเหมือนปอกกล้วย สอนเทคนิคการจำสูตร การวาดกราฟ และการแก้โจทย์ประยุกต์อย่างเป็นขั้นตอน",
                    items: [
                        { icon: "✅", text: "เจาะลึกเนื้อหาเข้มข้น เข้าใจที่มาและการนำไปใช้จริง" },
                        { icon: "✅", text: "สอนเทคนิคลัด ที่ใช้ได้จริงในห้องสอบ ประหยัดเวลาทำข้อสอบ" },
                        { icon: "✅", text: "สร้างความได้เปรียบ ในการเตรียมตัวสอบ A-Level ตั้งแต่เนิ่นๆ" }
                    ],
                    bg: "bg-[#F0FDF4]/50",
                    border: "border-[#B4E50D]/60"
                }
            },
            curriculum: [
                {
                    id: 1,
                    title: "ความสัมพันธ์และฟังก์ชัน",
                    desc: "ประตูสู่แคลคูลัสและคณิตศาสตร์ขั้นสูง",
                    color: "bg-[#78C841]/70",
                    iconColor: "text-[#78C841]",
                    content: [
                        "คู่อันดับและผลคูณคาร์ทีเซียน",
                        "[EP.1] วิธีการหาคู่อันดับและผลคูณคาร์ทีเซียน และสิ่งที่ต้องระวัง",
                        "[EP.2] 2 เรื่องที่จำเป็นต้องรู้ก่อนเริ่มหาความสัมพันธ์จากผลคูณคาร์ทีเซียน",
                        "โดเมนและเรนจ์",
                        "[EP.3] เทคนิคการหาโดเมนและเรนจ์ แบบง่ายๆ",
                        "[EP.4] การหาโดเมน เรนจ์ในรูปของสมการ และการตรวจสอบ 4 ข้อจำกัดที่ต้องระวัง",
                        "[EP.5] เทคนิคการหาโดเมนและเรนจ์ในรูปเศษส่วน",
                        "[EP.6] เทคนิคการหาโดเมนและเรนจ์ในรูปรากที่ n",
                        "[EP.7] เทคนิคการหาโดเมนและเรนจ์ในรูปรากที่ n",
                        "[EP.8] ตัวอย่างการหาโดเมนและเรนจ์ในรูปรากที่ n",
                        "[EP.9] เทคนิคการหาโดเมนและเรนจ์ในรูปค่าสัมบูรณ์",
                        "[EP.10] เทคนิคการหาโดเมนและเรนจ์ในรูปเลขยกกำลัง",
                        "[EP.11] เทคนิคการหาโดเมนและเรนจ์ในรูปของกราฟ",
                        "อินเวอร์สของความสัมพันธ์",
                        "[EP.12] วิธีการหาอินเวอร์สของความสัมพันธ์แบบแจกแจงสมาชิก",
                        "[EP.13] วิธีการหาอินเวอร์สของความสัมพันธ์แบบบอกเงื่อนไข",
                        "[EP.14] โจทย์ตัวอย่างกาารหาอินเวอร์สของความสัมพันธ์แบบบอกเงื่อนไข",
                        "[EP.15] วิธีการหาอินเวอร์สจากกราฟ",
                        "[EP.16] วิธีการหาโดเมนและเรนจ์ของตัวผกผัน",
                        "[EP.17] วิธีการหาโดเมนและเรนจ์ของตัวผกผัน",
                        "การตรวจสอบฟังก์ชัน",
                        "[EP.18] เทคนิคการตรวจสอบฟังก์ชันแบบแจกแจงสมาชิก",
                        "[EP.19] วิธีมองและตรวจสอบฟังก์ชันแบบแผนภาพ",
                        "[EP.20] การตรวจสอบฟังก์ชันที่เป็นกราฟ",
                        "[EP.21] วิธีการตรวจสอบฟังก์ชันแบบบอกเงื่อนไข",
                        "[EP.22] วิธีการตรวจสอบฟังก์ชันแบบบอกเงื่อนไข",
                        "ชนิดของฟังก์ชันและเทคนิคการหาค่า",
                        "[EP.23] วิธีและสิ่งที่ต้องรู้ของสัญลักษณ์ที่เกี่ยวกับฟังก์ชัน",
                        "[EP.24] เทคนิคการจำแนกฟังก์ชัน",
                        "[EP.25] ตัวอย่างการจำแนกฟังก์ชัน",
                        "[EP.26] เทคนิคการตรวจสอบฟังก์ชันเพิ่ม ฟังก์ชันลดจากกราฟ",
                        "[EP.27] ตัวอย่างเทคนิคการตรวจสอบฟังก์ชันเพิ่ม ฟังก์ชันลดจากกราฟ",
                        "[EP.28] เทคนิคการตรวจสอบฟังก์ชันเพิ่ม ฟังก์ชันลดจากการเปรียบเทียบ",
                        "[EP.29] เทคนิคการตรวจสอบฟังก์ชันเพิ่ม ฟังก์ชันลดโดยใช้นิยาม",
                        "[EP.30] เทคนิคการตรวจสอบฟังก์ชันเพิ่ม ฟังก์ชันลดโดยใช้นิยาม",
                        "[EP.31] เทคนิคพิเศษการหาค่าฟังก์ชัน",
                        "[EP.32] แนวโจทย์พื้นฐานการหาค่าฟังก์ชัน",
                        "[EP.33] แนวโจทย์ขั้นสูงการหาค่าฟังก์ชัน",
                        "[EP.34] แนวโจทย์ขั้นสูงการหาค่าฟังก์ชัน",
                        "[EP.35] เทคนิคการหาค่าฟังก์ชันแบบซับซ้อน",
                        "[EP.36] เทคนิคการหาค่าฟังก์ชันแบบซับซ้อน",
                        "[EP.37] เทคนิคการหาค่าฟังก์ชันแบบซับซ้อน",
                        "พีชคณิตและฟังก์ชันประกอบ",
                        "[EP.38] เทคนิคการหาค่าฟังก์ชันซ้อนฟังก์ชัน",
                        "[EP.39] เทคนิคการหาค่าฟังก์ชันซ้อนฟังก์ชัน",
                        "[EP.40] การหาฟังก์ชันซ้อนฟังก์ชัน",
                        "[EP.41] การหาฟังก์ชันซ้อนฟังก์ชัน",
                        "[EP.42] เรื่องสำคัญที่ต้องรู้ของพีชคณิตของฟังก์ชัน",
                        "[EP.43] เทคนิคพีชคณิตของฟังก์ชันแบบบอกงื่อนไข",
                        "[EP.44] สรุปแนวโจทย์พีชคณิตของฟังก์ชัน",
                        "[EP.45] สรุปแนวโจทย์พีชคณิตของฟังก์ชัน",
                        "[EP.46] สรุปแนวโจทย์พีชคณิตของฟังก์ชัน",
                        "อินเวอร์สของฟังก์ชันและฟังก์ชันประกอบขั้นสูง",
                        "[EP.47] ความลับของตัวผกผันของฟังก์ชัน",
                        "[EP.48] เทคนิคการทำโจทย์ตัวผกผันของฟังก์ชัน",
                        "[EP.49] เทคนิคการทำโจทย์ตัวผกผันของฟังก์ชัน",
                        "[EP.50] เทคนิคการทำโจทย์ตัวผกผันของฟังก์ชัน",
                        "[EP.51] เทคนิคการทำโจทย์ตัวผกผันของฟังก์ชัน",
                        "[EP.52] เทคนิคการทำโจทย์ตัวผกผันของฟังก์ชัน",
                        "[EP.53] เทคนิคการทำโจทย์ตัวผกผันของฟังก์ชัน",
                        "[EP.54] สิ่งที่จำเป็นต้องรู้ของฟังชันประกอบ",
                        "[EP.55] เทคนิคฟังชันประกอบแบบบอกเงื่อนไข",
                        "[EP.56] แนวโจทย์ฟังชันประกอบที่ต้องรู้",
                        "[EP.57] วิธีการหาฟังชันประกอบ 3 ฟังก์ชัน",
                        "[EP.58] สรุปแนวโจทย์การหาฟังชันประกอบ 3 ฟังก์ชัน"
                    ]
                },
                {
                    id: 2,
                    title: "ฟังก์ชันเอกซ์โพเนนเชียลและลอการิทึม",
                    desc: "บทที่ออกสอบ A-Level เยอะที่สุด!",
                    color: "bg-[#B4E50D]/70",
                    iconColor: "text-[#B4E50D]",
                    content: [
                        "เลขยกกำลังและราก",
                        "[EP.1] พื้นฐาน 5 ข้อ ที่ต้องรู้เรื่องเลขยกกำลัง",
                        "[EP.2] ทฤษฎีบททั้ง 7 ของเลขยกกำลัง",
                        "[EP.3] ปัญหาของศูนย์",
                        "[EP.4] เทคนิคเลขยกกำลังโดยใช้กฏทั้ง7",
                        "[EP.5] เทคนิคการทำเลขยกกำลังให้เป็นรูปอย่างง่าย",
                        "[EP.6] จะเกิดอะไรขึ้นเมื่อมี n เป็นเลขชี้กำลัง",
                        "[EP.7] วิธีการหารากที่สอง",
                        "[EP.8] สิ่งที่ต้องรู้เกี่ยวกับสมบัติทั้ง 2 ของรากที่สอง",
                        "[EP.9] เทคนิคกำจัดกรณฑ์ออกจากตัวส่วน ด้วย Conjugate",
                        "[EP.10] เทคนิคกำจัดกรณฑ์ออกจากตัวส่วนและแนวโจทย์ที่สำคัญ",
                        "[EP.11] เทคนิค รูทคู่ รูทคี่",
                        "[EP.12] 2 เทคนิค รูทคู่ รูทคี่",
                        "[EP.13] เทคนิคการทำรูทให้เป็นรูปอย่างง่าย",
                        "[EP.14] เทคนิคการทำรูทให้เป็นรูปอย่างง่าย",
                        "[EP.15] เทคนิคการทำรูทให้เป็นรูปอย่างง่าย",
                        "[EP.16] การหารากที่ n ของจำนวนจริง",
                        "[EP.17] เทคนิคลับผลบวกและผลต่างของรูท",
                        "[EP.18] แนวโจทย์ที่ต้องของผลบวกและผลต่างของรูท",
                        "[EP.19] ผลคูณและผลหารของรูทที่n",
                        "[EP.20] ผลคูณและผลหารของรูทที่n",
                        "[EP.21] ผลคูณและผลหารของรูทที่n",
                        "[EP.22] เทคนิคการเปลี่ยนอันดับของรูท",
                        "[EP.23] เมื่อเลขชี้กำลังเป็นจำนวนตรรกยะต้องทำยังไง",
                        "[EP.24] เทคนิคลับการหาค่ารูทซ้อนรูท",
                        "[EP.25] รูปแบบพิเศษของรูทที่ต้องรู้",
                        "[EP.26] รูปแบบพิเศษของรูทที่ต้องรู้",
                        "[EP.27] เทคนิคการหารากที่สองในรูปแบบเฉพาะ",
                        "[EP.28] การแก้สมการรูท และทำไมการยกกำลังสอง ต้องตรวจคำตอบ",
                        "[EP.29] เทคนิคพิเศษเพียงข้อเดียวของการแก้สมการที่มีรูท 1 ตัว",
                        "[EP.30] แนวโจทย์การแก้สมการที่มีรูท 1 ตัว",
                        "[EP.31] 2 เทคนิคที่ต้องรู้ของการแก้สมการที่มีรูท 2 ตัว",
                        "[EP.32] ฝึกแนวโจทย์การแก้สมการที่มีรูท 2 ตัว",
                        "[EP.33] เทคนิคเพียงข้อเดียวของการแก้สมการที่มีรูท 3 ตัว",
                        "[EP.34] การแก้สมการที่มีรูท 4 ตัว โดยการย้ายข้าง สปส",
                        "ฟังก์ชันเอกซ์โพเนนเชียล",
                        "[EP.35] ชุดเลขเลขยกกำลังที่จำเป็นต้องรู้ ถ้ารู้จะคิดเลขได้ไวมาก",
                        "[EP.36] ฟังก์ชั่นเพิ่มและลดของExpo",
                        "[EP.37] เทคนิคการวิเคราะห์กราฟของฟังก์ชั่นExpo",
                        "[EP.38] 3 ความลับ การตรวจสอบฟังก์ชันเพิ่มและลดของฟังก์ชั่นExpo",
                        "[EP.39] เทคนิคการแก้สมการ Expo",
                        "[EP.40] แนวโจทย์ที่ต้องเจอเมื่อแก้สมการ Expo",
                        "[EP.41] 2 เทคนิคลับ สมการ Expo ที่แยกตัวประกอบได้",
                        "[EP.42] ฝึกแนวโจทย์สมการ Expo ที่แยกตัวประกอบได้",
                        "[EP.43] เทคนิคและการวิเคราะห์การแก้อสมการ Expo",
                        "[EP.44] สมการ Expo ที่แยกตัวประกอบได้",
                        "ฟังก์ชันลอการิทึม",
                        "[EP.45] สิ่งที่ต้องรู้เกี่ยวกับลอการึทึม",
                        "[EP.46] ฟังก์ชันเพิ่มและฟังก์ชันลดของลอการึทึมพร้อมรูปแบบของกราฟ",
                        "[EP.47] วิธีการเปรียบเทียบค่าของ Log อย่างรวดเร็ว",
                        "[EP.48] สมบัติของ Log ทั้ง 3 ข้อที่สำคัญ",
                        "[EP.49] สมบัติของ Log ข้อ 4 พร้อมแนวโจทย์",
                        "[EP.50] สมบัติของ Log ข้อ 5-6 ถ้าดูเป็นคู่จะจำง่าย",
                        "[EP.51] สมบัติของ Log ข้อ 7 ที่จะช่วยเปลี่ยนฐาน log ได้ไวที่สุด",
                        "[EP.52] สมบัติของ Log ข้อ 8 การตลบเศษส่วน",
                        "[EP.53] สมบัติของ Log ข้อ 9 เทคนิคการลบค่า log",
                        "[EP.54] สมบัติของ Log ข้อ 10 การสลับร่าง",
                        "[EP.55] เทคนิคการหาค่า mantissa และ characteristic",
                        "[EP.56] เทคนิคการหาค่า mantissa และ characteristic",
                        "[EP.57] เทคนิค AntiLog แบบเข้าใจง่าย",
                        "[EP.58] การ TakeLog เพื่อแก้สมการ Expo",
                        "[EP.59] แนวโจทย์การแก้สมการ Log โดยการทำลาย Log",
                        "[EP.60] วิธีการแก้สมการ Log โดยการทำลาย Logและข้อควรระวัง",
                        "[EP.61] แนวโจทย์การแก้สมการ Log โดยการทำลาย Log",
                        "[EP.62] แนวโจทย์การแก้สมการ Log โดยการทำลาย Log",
                        "[EP.63] 2 เรื่องต้องรู้เกี่ยวกับการแก้อสมการ Log พร้อมแนวโจทย์"
                    ]
                },
                {
                    id: 3,
                    title: "เรขาคณิตวิเคราะห์และภาคตัดกรวย",
                    desc: "เปลี่ยนรูปทรงและกราฟให้เป็นเรื่องง่าย",
                    color: "bg-[#FF9B2F]/70",
                    iconColor: "text-[#FF9B2F]",
                    content: [
                        "เรขาคณิตวิเคราะห์เบื้องต้น",
                        "[EP.1] เทคนิคที่ช่วยหาหาระยะห่างระหว่าจุดสองจุด",
                        "[EP.2] วิธีการหาจุดกึ่งกลางระหว่างจุด 2 จุด",
                        "[EP.3] สูตรลัดหาจุดที่แบ่งระยะทางเป็นอัตราส่วน",
                        "[EP.4] วิธีการหาเส้นรอบรูปเส้นมัธยฐาน จุดตัดเส้นมัธยฐานและสูตรกาหาพื้นที่",
                        "สมการเส้นตรง",
                        "[EP.5] เทคนิคที่ใช้ในการสร้างสมการเส้นตรง",
                        "[EP.6] สมการเส้นตรงทั้ง 3 ชนิดที่ต้องรู้",
                        "[EP.7] เทคนิคการหาจุดตัดและจุดผ่านของสมการเส้นตรง",
                        "[EP.8] วิธีการตรวจสอบเส้นตรงที่ขนานกัน",
                        "[EP.9] คุณสมบัติที่ต้องรู้ของความชันของเส้นตรงที่ตั้งฉากกัน",
                        "[EP.10] เทคนิคการหาระยะห่างระหว่างจุดกับเส้นตรงและความลับของพีทาโกรัส",
                        "[EP.11] สูตรลัดหาระยะห่างระหว่าเส้นตรงที่ขนานกัน",
                        "วงกลม",
                        "[EP.12] เทคนิคการหาจุดศูนย์กลางและรัศมีของวงกลม",
                        "[EP.13] 2 รูปสมการของสมการวงกลม",
                        "[EP.14] เทคนิคการทำโจทย์สมการวงกลม",
                        "[EP.15] เทคนิคการทำโจทย์สมการวงกลม",
                        "พาราโบลา",
                        "[EP.16] ส่วนประกอบของพาราโบลาที่ต้องรู้",
                        "[EP.17] โจทย์การหาส่วนประกอบของพาราโบลา",
                        "[EP.18] เทคนิคการสร้างสมการพาราโบลา",
                        "[EP.19] รูปแบบที่ต้องรู้ของโจทย์พาราโบลา",
                        "วงรี",
                        "[EP.20] ส่วนประกอบของวงรี และความสัมพันธ์แบบละเอียด",
                        "[EP.21] ตัวอย่างการหาส่วนประกอบของวงรี",
                        "[EP.22] ตัวอย่างการหาจุดโฟฟกัสและจุดยอด",
                        "[EP.23] เทคนิคการสร้างสมการวงรี และชี้จุดที่โจทย์จะถาม",
                        "[EP.24] เทคนิคการสร้างสมการวงรี ด้วยโครงร่าง xy",
                        "[EP.25] เทคนิคการสร้างสมการวงรีจากความเยื้องสู่จุดศูนย์กลาง",
                        "ไฮเพอร์โบลา",
                        "[EP.26] วิธีการดูว่าเป็นไฮเปอร์โบลาแบบไหน",
                        "[EP.27] รายละเอียดของไฮเปอร์โบลาและจุดต่างๆที่ต้องรู้",
                        "[EP.28] สมการเส้นกำกับ Asymptote ",
                        "[EP.29] เทคนิคการทำโจทย์ไฮเปอร์โบลา",
                        "[EP.30] โจทย์การหารายละเอียดของไฮเปอร์โบลา",
                        "[EP.31]  โจทย์การหารายละเอียดของไฮเปอร์โบลา",
                        "[EP.32] เทคนิคการสร้างสมการไฮเปอร์โบลา ตอนที่ 1",
                        "[EP.33] เทคนิคการสร้างสมการไฮเปอร์โบลา ตอนที่ 2",
                        "[EP.34] เทคนิคการสร้างสมการไฮเปอร์โบลา ตอนที่ 3"
                    ]
                }
            ],
            choices: {
                oldPath: "ปล่อยให้ตัวเองงงกับเนื้อหา ม.4 ที่ยากขึ้นจนตามไม่ทัน... ใช้เวลาหลังเลิกเรียนไปกับการบ้านกองโต อ่านหนังสือแบบไม่ได้วางแผน พอใกล้สอบก็ค่อยมาปั่นอ่านข้ามคืน สุดท้ายก็จำได้บ้างไม่ได้บ้าง เข้าห้องสอบไปก็เจอโจทย์ประยุกต์ที่ไม่เคยเห็น ทำได้แค่ถอนใจแล้วปล่อยคะแนนให้เลยตามเลย... แล้วบอกตัวเองว่า \"เทอมหน้าเอาใหม่\" วนไปเรื่อยๆ จนถึง ม.6 โดยที่ยังไม่รู้เลยว่าจะยื่นคะแนนเข้าคณะในฝันได้ไหม",
                newPath: "เลือกเส้นทางของคนสำเร็จ ที่เข้าใจเนื้อหาอย่างแท้จริง ไม่ใช่แค่ท่องจำ... เปลี่ยนวิชาที่เคย \"เกลียด\" ให้กลายเป็นวิชา \"ทำคะแนน\" ใช้เทคนิคที่ถูกต้องเพื่อเคลียร์เนื้อหาได้ในเวลาที่สั้นลง มีเวลาเหลือไปทำกิจกรรมที่ชอบ พอถึงเวลาสอบก็แค่ทบทวนเบาๆ เดินเข้าห้องสอบอย่างมั่นใจ เจอโจทย์แบบไหนก็ทำได้ คว้าเกรด 4 มาแบบสบายๆ พร้อมปูทางสู่คณะและมหาวิทยาลัยในฝันตั้งแต่วันนี้ ไม่ต้องไปเหนื่อยวิ่งตามใครตอน ม.6",
                colors: {
                    old: "bg-[#FF9B2F]/40",
                    new: "bg-[#78C841]/40",
                    button: "bg-[#FB4141] hover:bg-[#d44d4d]"
                }
            }
        };
    } else if (isM4Term1) {
        // --- M.4 Term 1 Data ---
        content = {
            hero: {
                blobs: ["bg-[#FFD63A]/40", "bg-[#FFA955]/40"],
            },
            painPoint: {
                title: "อย่าให้ \"คณิต ม.4\" เป็นจุดเปลี่ยนที่น่ากลัว! 🚀",
                subtitle: "ปูพื้นฐานให้แน่นตั้งแต่เทอมแรก เปลี่ยน \"ความไม่เข้าใจ\" ให้เป็น \"ความมั่นใจ\" พิชิตเกรด 4 และเตรียมพร้อมสู่ทุกสนามสอบระดับประเทศ",
                blobs: ["bg-[#F0FFFD]/30", "bg-[#FFFDEB]/30"],
                problemBox: {
                    title: "เพิ่งขึ้น ม.4 แล้วเจอความท้าทายแบบนี้อยู่ใช่ไหม?",
                    icon: "😰",
                    items: [
                        { icon: "🤯", text: "เนื้อหานามธรรม: เซต ตรรกศาสตร์ จำนวนจริง... ทำไมคณิต ม.ปลายมันเข้าใจยากจัง?" },
                        { icon: "😨", text: "ปรับตัวไม่ทัน: วิธีการเรียนการสอนเปลี่ยนไป เนื้อหาลึกและซับซ้อนกว่า ม.ต้น หลายเท่าตัว" },
                        { icon: "😵", text: "พิสูจน์เยอะ: ไม่ใช่แค่คำนวณหาคำตอบ แต่ต้องเข้าใจที่มาและพิสูจน์ทฤษฎีบทต่างๆ ได้" },
                        { icon: "📉", text: "กังวลเรื่องอนาคต: รู้ว่าเกรด ม.ปลาย สำคัญต่อการเข้ามหาวิทยาลัย แต่ไม่รู้จะเริ่มเตรียมตัวยังไง" }
                    ],
                    bg: "bg-white/50"
                },
                solutionBox: {
                    title: "หมดห่วง! วางรากฐานสู่มหาวิทยาลัย คอร์ส \"พิชิตคณิตเพิ่ม ม.4 เทอม 1\" โดยครูฮีม!",
                    icon: "💥",
                    desc: "เปลี่ยนจุดสตาร์ทที่น่ากังวล ให้กลายเป็นการเริ่มต้นที่แข็งแกร่งที่สุด! ครูฮีมจะพาน้องๆ ตีสนิทกับเนื้อหาใหม่ๆ ปูพื้นฐานให้แน่น สอนเทคนิคการคิดวิเคราะห์และแก้โจทย์ซับซ้อนอย่างเป็นระบบ",
                    items: [
                        { icon: "✅", text: "อธิบายเนื้อหาละเอียด เข้าใจถึงแก่น ไม่ใช่แค่ท่องจำสูตร" },
                        { icon: "✅", text: "สอนเชื่อมโยงความรู้ จาก ม.ต้น สู่ ม.ปลาย อย่างราบรื่น" },
                        { icon: "✅", text: "สร้างความมั่นใจเต็มร้อย พร้อมสำหรับสอบเก็บคะแนน และวางรากฐานสู่ A-Level" }
                    ],
                    bg: "bg-[#FFFDEB]/50",
                    border: "border-[#FFD63A]/60"
                }
            },
            curriculum: [
                {
                    id: 1,
                    title: "เซต (Sets)",
                    desc: "ภาษาของคณิตศาสตร์สมัยใหม่",
                    color: "bg-[#6DE1D2]/70",
                    iconColor: "text-[#6DE1D2]",
                    content: [
                        "พื้นฐานของเซต",
                        "[EP1] 2 วิธีในการเขียนเซต",
                        "[EP2] สัญลักษณ์แทนเซตจำนวน",
                        "[EP3] ชนิดของเซตที่ต้องรู้",
                        "[EP4] ตัวอย่างเพื่อความเข้าใจเรื่องพื้นฐานเซต",
                        "[EP5] เทคนิคเซตที่เท่ากัน เทียบเท่ากัน",
                        "[EP6] เฉลยแบบฝึกหัดเรื่องพื้นฐานของเซต ตอนที่ 1",
                        "[EP7] เฉลยแบบฝึกหัดเรื่องพื้นฐานของเซต ตอนที่ 2",
                        "สับเซตและเพาเวอร์เซต",
                        "[EP8] เทคนิคการหาสับเซต",
                        "[EP9] ตัวอย่างสับเซต",
                        "[EP10] เฉลยแบบฝึกหัดเรื่องสับเซต ตอนที่ 1",
                        "[EP11] เฉลยแบบฝึกหัดเรื่องสับเซต ตอนที่ 2",
                        "[EP12] เทคนิคการหาเพาเวอร์เซต",
                        "[EP13] วิธีการหาเพาเวอร์เซตซ้อนๆ",
                        "[EP14] เฉลยแบบฝึกหัดเรื่องเพาเวอร์เซต",
                        "การดำเนินการของเซตและแผนภาพเวนน์-ออยเลอร์",
                        "[EP15] แผนภาพเวนน์ ออยเลอร์",
                        "[EP16] เทคนิคหาพื้นที่แรเงาแผนภาพเวนน์ ออยเลอร์",
                        "[EP17] เทคนิคเพิ่มเติมแผนภาพเวนน์ ออยเลอร์",
                        "[EP18] เฉลยแบบฝึกหัดการดำเนินการเกี่ยวกับเซต ตอนที่ 1",
                        "[EP19] เฉลยแบบฝึกหัดการดำเนินการเกี่ยวกับเซต ตอนที่ 2",
                        "[EP20] กฎที่ต้องรู้เกี่ยวกับเซต",
                        "การหาจำนวนสมาชิกและโจทย์ปัญหา",
                        "[EP21] สูตรการหาจำนวนสมาชิกภายในเซต",
                        "[EP22] เทคนิคการใช้แผนภาพในการหาจำนวนสมาชิก",
                        "[EP23] เฉลยแบบฝึกหัดการหาจำนวนสมาชิกของเซต ตอนที่ 1",
                        "[EP24] เฉลยแบบฝึกหัดการหาจำนวนสมาชิกของเซต ตอนที่ 2",
                        "[EP25] เทคนิคการใช้แผนภาพแก้โจทย์ปัญหา",
                        "[EP26] ตัวอย่างการใช้แผนภาพแก้โจทย์ปัญหา ตอนที่ 1",
                        "[EP27] ตัวอย่างการใช้แผนภาพแก้โจทย์ปัญหา ตอนที่ 2",
                        "[EP28] เฉลยแบบฝึกหัดการใช้แผนภาพแก้โจทย์ปัญหา ตอนที่ 1",
                        "[EP29] เฉลยแบบฝึกหัดการใช้แผนภาพแก้โจทย์ปัญหา ตอนที่ 2",
                        "[EP30] เฉลยแบบฝึกหัดการใช้แผนภาพแก้โจทย์ปัญหา ตอนที่ 3"
                    ]
                },
                {
                    id: 2,
                    title: "ตรรกศาสตร์เบื้องต้น (Introduction to Logic)",
                    desc: "ศิลปะแห่งการให้เหตุผลอย่างสมบูรณ์",
                    color: "bg-[#FFD63A]/70",
                    iconColor: "text-[#FFD63A]",
                    content: [
                        "ประพจน์และการเชื่อมประพจน์",
                        "[EP.1] ประพจน์คืออะไร",
                        "[EP.2] ความเข้าใจผิดเกี่ยวกับประพจน์",
                        "[EP.3] สัญลักษณ์ที่ใช้แทนประพจน์",
                        "[EP.4] ตัวเชื่อมทั้ง 5 แบบ",
                        "[EP.5] จุดเด่นของตัวเชื่อมแต่ละแบบ",
                        "[EP.6] เทคนิคการสร้างตารางค่าความจริง",
                        "การหาค่าความจริง",
                        "[EP.7] การหาค่าความจริงเมื่อรู้ครบทุกพจน์",
                        "[EP.8] การหาค่าความจริงเมื่อรู้บางพจน์",
                        "[EP.9] กำหนดค่าความจริงของประพจน์หลัก แล้วหาประพจน์ย่อยๆ",
                        "สมมูลและสัจนิรันดร์",
                        "[EP.10] ประพจน์ที่สมมูลกัน",
                        "[EP.11] การใช้ตารางหาสมมูล",
                        "[EP.12] สูตรสมมูลขั้นเทพ",
                        "[EP.13] เทคนิคการแก้โจทย์สมมูล",
                        "[EP.14] โจทย์ตัวอย่าเรื่องสมมูล ตอนที่ 1",
                        "[EP.15] โจทย์ตัวอย่าเรื่องสมมูล ตอนที่2",
                        "[EP.16] สัจนิรันดร์ คืออะไร",
                        "[EP.17] การตรวจสอบสัจนิรันดร์โดยใช้ตารางค่าความจริง",
                        "[EP.18] การตรวจสอบสัจนิรันดร์โดยใช้การสมมุติเท็จ",
                        "[EP.19] ตัวอย่างโจทย์การสมมุติเท็จ",
                        "[EP.20] สัจนิรันดร์ของตัวเชื่อม และ",
                        "[EP.21] เทคนิคตรวจสอบสัจนิรันดร์ด้วย สมมูล",
                        "การอ้างเหตุผล",
                        "[EP.22] เทคนิคการแก้ปัญหาเรื่องการอ้างเหตุผล",
                        "[EP.23] ฝึกโจทย์การอ้างเหตุผล ตอนที่1",
                        "[EP.24] ฝึกโจทย์การอ้างเหตุผล ตอนที่2",
                        "ตัวบ่งปริมาณ",
                        "[EP.25] ประโยคเปิด",
                        "[EP.26] ตัวบ่งปริมาณ",
                        "[EP.27] ประโยคเปิด 2 ตัว",
                        "[EP.28] ค่าความจริงของประโยคที่มีตัวบ่งปริมาณ 1 ตัว",
                        "[EP.29] ลุยโจทย์ตัวบ่งปริมาณ",
                        "[EP.30] สมมูลของประโยคที่มีตัวบ่งปริมาณ",
                        "[EP.31] นิเสธของตัวบ่งปริมาณ",
                        "[EP.32] เทคนิคการทำโจทย์ที่มีตัวบ่งปริมาณ 2 ตัว",
                        "[EP.33] เทคนิคการทำโจทย์ที่มีตัวบ่งปริมาณ 2 ตัว",
                        "[EP.34] เทคนิคการทำโจทย์ที่มีตัวบ่งปริมาณ 2 ตัว",
                        "[EP.35] เทคนิคการทำโจทย์ที่มีตัวบ่งปริมาณ 2 ตัว",
                        "[EP.36] เทคนิคการทำโจทย์ที่มีตัวบ่งปริมาณ 2 ตัว",
                        "[EP.37] เทคนิคการทำโจทย์ที่มีตัวบ่งปริมาณ 2 ตัว"
                    ]
                },
                {
                    id: 3,
                    title: "จำนวนจริง (Real Numbers)",
                    desc: "รากฐานของพีชคณิตและแคลคูลัส",
                    color: "bg-[#FFA955]/70",
                    iconColor: "text-[#FFA955]",
                    content: [
                        "สมบัติของจำนวนจริง",
                        "[EP.1] แผนผังของจำนวนต่างๆ",
                        "[EP.2] 5 สมบัติของจำนวนจริง ที่ต้องรู้",
                        "[EP.3] 5 สมบัติการบวกและการคูณ ที่สำคัญมาก แต่หลายคนมักละเลย",
                        "[EP.4] ตัวอย่างสมบัติของจำนวนจริง ถ้าได้ลองทำ จะเข้าใจในทันที",
                        "[EP.5] 9 หัวใจสำคัญของการลบและการหาร",
                        "ทฤษฎีบทเศษเหลือและพหุนาม",
                        "[EP.6] เทคนิคการใช้ทฤษฎีบทเศษเหลืออย่างเป็นระบบและข้อควรระวัง",
                        "[EP.7] ทำโจทย์ทฤษฎีบทเศษเหลือไม่ได้ใช่ไหม ถ้าทำตามนี้ปัญหาจะหายไป",
                        "[EP.8] เทคนิคการใช้ทฤษฎีตัวประกอบ ถ้าไม่เข้าใจเรื่องนี้ถือเป็นจุดตาย",
                        "[EP.9] 4 ตัวอย่างทฤษฎีตัวประกอบ ที่จะช่วยให้หายกังวล",
                        "[EP.10] 2 เทคนิคที่ต้องรู้ในการหารพหุนาม",
                        "[EP.11] ตัวอย่างการหารพหุนาม และข้อควรระวัง",
                        "[EP.12] ถ้าทำตามขั้นตอนนี้การแยกตัวประกอบพหุนามจะไม่ใช่ปัญหาอีกต่อไป",
                        "[EP.13] ตัวอย่างการแยกตัวประกอบพหุนาม",
                        "[EP.14] ตัวอย่างการแยกตัวประกอบพหุนาม",
                        "การแก้สมการและอสมการพหุนาม",
                        "[EP.15] วิธีการแก้สมการกำลัง 3 ด้วยการดึงตัวร่วม",
                        "[EP.16] เทคนิคการแก้สมการด้วยทบเศษเหลือและการหารสังเคราะห์",
                        "[EP.17] ตัวอย่างการแก้สมการพหุนาม",
                        "[EP.18] ตัวอย่างการแก้สมการพหุนาม",
                        "[EP.19] ตัวอย่างการแก้สมการพหุนาม",
                        "[EP.20] ตัวอย่างการแก้สมการพหุนาม",
                        "[EP.21] เทคนิคการดูช่วงคำตอบของอสมการ",
                        "[EP.22] เทคนิคการแก้อสมการ",
                        "[EP.23] ต้องทำอย่างไรเมื่อเจอ - x ในอสมการ",
                        "[EP.24] เมื่อเจอ x ยกกำลังเลขคู่",
                        "[EP.25] เทคนิคการจัดรูป",
                        "[EP.26] เทคนิคการตัดวงเล็บที่เป็นบวกทิ้ง",
                        "[EP.27] เทคนิคอสมการกับเศษส่วน",
                        "[EP.28] โจทย์อสมการกับเศษส่วน",
                        "[EP.29] โจทย์อสมการกับเศษส่วน",
                        "[EP.30] โจทย์อสมการกับเศษส่วน",
                        "[EP.31] โจทย์อสมการกับเศษส่วน",
                        "[EP.32] เทคนิคอสมการโดยการดึงตัวร่วม",
                        "ค่าสัมบูรณ์",
                        "[EP.33] วิธีถอดค่าสัมบูรณ์",
                        "[EP.34] วิธีการแก้สมการที่ติดค่าสัมบูรณ์",
                        "[EP.35] สมการที่มีค่าสัมบูรณ์ทั้งสองข้าง",
                        "[EP.36] การแก้สมการค่าสัมบูรณ์ที่ต้องตรวจสอบคำตอบ",
                        "[EP.37] การแก้สมการค่าสัมบูรณ์ที่ต้องตรวจสอบคำตอบ",
                        "[EP.38] เทคนิคที่ 1 การแก้อสมการค่าสัมบูรณ์",
                        "[EP.39] เทคนิคที่ 1 การแก้อสมการค่าสัมบูรณ์",
                        "[EP.40] เทคนิคที่ 1 การแก้อสมการค่าสัมบูรณ์",
                        "[EP.41] เทคนิคที่ 1 การแก้อสมการค่าสัมบูรณ์",
                        "[EP.42] เทคนิคที่ 1 การแก้อสมการค่าสัมบูรณ์",
                        "[EP.43] เทคนิคที่ 2 การแก้อสมการค่าสัมบูรณ์",
                        "[EP.44] เทคนิคที่ 2 การแก้อสมการค่าสัมบูรณ์",
                        "[EP.45] เทคนิคที่ 2 การแก้อสมการค่าสัมบูรณ์"
                    ]
                }
            ],
            choices: {
                oldPath: "ปล่อยให้ตัวเองงงกับเนื้อหา ม.4 ที่ยากขึ้นจนตามไม่ทัน... ใช้เวลาหลังเลิกเรียนไปกับการบ้านกองโต อ่านหนังสือแบบไม่ได้วางแผน พอใกล้สอบก็ค่อยมาปั่นอ่านข้ามคืน สุดท้ายก็จำได้บ้างไม่ได้บ้าง เข้าห้องสอบไปก็เจอโจทย์ประยุกต์ที่ไม่เคยเห็น ทำได้แค่ถอนใจแล้วปล่อยคะแนนให้เลยตามเลย... แล้วบอกตัวเองว่า \"เทอมหน้าเอาใหม่\" วนไปเรื่อยๆ จนถึง ม.6 โดยที่ยังไม่รู้เลยว่าจะยื่นคะแนนเข้าคณะในฝันได้ไหม",
                newPath: "เลือกเส้นทางของคนสำเร็จ ที่เข้าใจเนื้อหาอย่างแท้จริง ไม่ใช่แค่ท่องจำ... เปลี่ยนวิชาที่เคย \"เกลียด\" ให้กลายเป็นวิชา \"ทำคะแนน\" ใช้เทคนิคที่ถูกต้องเพื่อเคลียร์เนื้อหาได้ในเวลาที่สั้นลง มีเวลาเหลือไปทำกิจกรรมที่ชอบ พอถึงเวลาสอบก็แค่ทบทวนเบาๆ เดินเข้าห้องสอบอย่างมั่นใจ เจอโจทย์แบบไหนก็ทำได้ คว้าเกรด 4 มาแบบสบายๆ พร้อมปูทางสู่คณะและมหาวิทยาลัยในฝันตั้งแต่วันนี้ ไม่ต้องไปเหนื่อยวิ่งตามใครตอน ม.6",
                colors: {
                    old: "bg-[#FFD63A]/30",
                    new: "bg-[#6DE1D2]/40",
                    button: "bg-[#F75A5A] hover:bg-[#d44d4d]"
                }
            }
        };
    } else if (isM2Term2) {
        // --- M.2 Term 2 Data ---
        content = {
            hero: {
                blobs: ["bg-[#FFDCDC]/40", "bg-[#E5989B]/40", "bg-[#FFB4A2]/40"],
            },
            painPoint: {
                title: "อย่าให้ \"เทอม 2\" ต้องสะดุด! 🚀",
                subtitle: "เนื้อหาพีชคณิตและเรขาคณิตสุดเข้มข้น เปลี่ยน \"จุดอ่อน\" ให้เป็น \"เกรด 4\" ที่ภาคภูมิใจ",
                blobs: ["bg-[#FFDCDC]/30", "bg-[#E5989B]/30"],
                problemBox: {
                    title: "เปิดเทอม 2 มาแล้วเจอแบบนี้อยู่ใช่ไหม?",
                    icon: "😰",
                    items: [
                        { icon: "🤯", text: "พีชคณิตสุดงง: การแยกตัวประกอบคืออะไร? ทำไมต้องทำ? แล้วสมการกำลังสองแก้ยังไง?" },
                        { icon: "🤔", text: "เรขาคณิตพิสูจน์: เส้นขนานทำไมต้องพิสูจน์เยอะแยะ? จำมุมต่างๆ ไม่ได้เลย" },
                        { icon: "📊", text: "สถิติข้อมูลเยอะ: ค่ากลาง แผนภาพกล่อง คืออะไร? ข้อมูลมากมายจนแยกไม่ออก" },
                        { icon: "📉", text: "พื้นฐานเทอม 1 ไม่แน่น: ยังไม่คล่องเรื่องพหุนาม พอมาเจอเรื่องใหม่ก็ไปต่อไม่ได้" }
                    ],
                    bg: "bg-white/50"
                },
                solutionBox: {
                    title: "ปิดทุกจุดอ่อน! คอร์สนี้ช่วยได้",
                    icon: "💥",
                    desc: "ครูฮีมจะเปลี่ยนพีชคณิตที่ซับซ้อนให้เป็นเรื่องกล้วยๆ และทำให้เรขาคณิตกลายเป็นเรื่องสนุก",
                    items: [
                        { icon: "✅", text: "สอนเทคนิคแยกตัวประกอบ แบบเข้าใจง่าย เห็นโจทย์แล้วรู้ทันที" },
                        { icon: "✅", text: "พิสูจน์เส้นขนานแบบเป็นระบบ ไม่ต้องจำเยอะ แต่เน้นความเข้าใจ" },
                        { icon: "✅", text: "สรุปสถิติให้กระชับ แปลงข้อมูลที่น่าเบื่อให้เป็นภาพที่ชัดเจน" }
                    ],
                    bg: "bg-[#FFDCDC]/50",
                    border: "border-[#E5989B]/60"
                }
            },
            curriculum: [
                {
                    id: 1,
                    title: "การแยกตัวประกอบของพหุนามดีกรีสอง",
                    desc: "ทักษะสำคัญในการแก้ปัญหาพีชคณิต",
                    color: "bg-[#FFDCDC]/70",
                    iconColor: "text-[#E5989B]",
                    content: ["การแยกตัวประกอบโดยใช้สมบัติการแจกแจง", "การแยกตัวประกอบของพหุนามดีกรีสองในรูป x² + bx + c", "การแยกตัวประกอบของพหุนามดีกรีสองในรูป ax² + bx + c", "การแยกตัวประกอบโดยใช้เทคนิคผลต่างของกำลังสอง และกำลังสองสมบูรณ์"]
                },
                {
                    id: 2,
                    title: "สมการกำลังสองตัวแปรเดียว",
                    desc: "การแก้สมการเพื่อหาคำตอบของปัญหา",
                    color: "bg-[#FFD6BA]/70",
                    iconColor: "text-[#FFB4A2]",
                    content: ["ความหมายของสมการกำลังสองตัวแปรเดียว", "การแก้สมการโดยใช้การแยกตัวประกอบ", "การแก้สมการโดยใช้สูตร (Quadratic Formula)", "โจทย์ปัญหาเกี่ยวกับสมการกำลังสอง"]
                },
                {
                    id: 3,
                    title: "เส้นขนาน (Parallel Lines)",
                    desc: "รากฐานของเรขาคณิตและการพิสูจน์",
                    color: "bg-[#E5989B]/60",
                    iconColor: "text-[#B5838D]",
                    content: ["เส้นขนานและมุมภายใน", "เส้นขนานและมุมแย้ง", "เส้นขนานและมุมภายนอกกับมุมภายใน", "การให้เหตุผลและพิสูจน์ทฤษฎีบทเกี่ยวกับเส้นขนาน"]
                },
                {
                    id: 4,
                    title: "สถิติ (Statistics)",
                    desc: "การวิเคราะห์และนำเสนอข้อมูล",
                    color: "bg-[#B5838D]/60",
                    iconColor: "text-[#6D4C41]",
                    content: ["การนำเสนอและแปลความหมายข้อมูล (ฮิสโทแกรม, แผนภาพกล่อง)", "ค่ากลางของข้อมูล (ค่าเฉลี่ยเลขคณิต, มัธยฐาน, ฐานนิยม)", "การเลือกใช้ค่ากลางที่เหมาะสมกับข้อมูล", "การวิเคราะห์และสรุปผลจากข้อมูล"]
                }
            ],
            importance: [
                {
                    title: "1. การแยกตัวประกอบของพหุนามดีกรีสอง",
                    desc: "คือการ \"ย้อนกลับ\" ของการคูณพหุนาม เป็นเครื่องมืออันทรงพลังที่ช่วยให้เราแกะโครงสร้างของสมการที่ซับซ้อนออกมาได้ เป็นหัวใจของการแก้ \"สมการกำลังสอง\" ในบทถัดไป",
                    color: "bg-[#FFDCDC]/60"
                },
                {
                    title: "2. สมการกำลังสองตัวแปรเดียว",
                    desc: "คือการนำทักษะการแยกตัวประกอบมาใช้ \"หาคำตอบ\" ที่ซ่อนอยู่ในปัญหาต่างๆ ซึ่งมักจะอยู่ในรูปแบบของกราฟพาราโบลา เป็นพื้นฐานสำคัญของเรื่องฟังก์ชันและกราฟใน ม.ปลาย",
                    color: "bg-[#FFD6BA]/60"
                },
                {
                    title: "3. เส้นขนาน (Parallel Lines)",
                    desc: "คือการเรียนรู้ \"ภาษาแห่งเหตุผล\" ผ่านรูปทรงเรขาคณิต ทำให้เราเข้าใจการคิดอย่างเป็นระบบและตรรกะ ผ่านการพิสูจน์คุณสมบัติต่างๆ เป็นพื้นฐานที่ขาดไม่ได้ในการพิสูจน์เรื่องความคล้าย",
                    color: "bg-[#E5989B]/60"
                },
                {
                    title: "4. สถิติ (Statistics)",
                    desc: "คือ \"ศิลปะในการเล่าเรื่องด้วยตัวเลข\" ทำให้เราสามารถสรุปและทำความเข้าใจข้อมูลจำนวนมหาศาล เพื่อใช้ในการตัดสินใจได้อย่างถูกต้อง เป็นประตูสู่โลกของ \"วิทยาศาสตร์ข้อมูล\" (Data Science)",
                    color: "bg-[#B5838D]/60"
                }
            ],
            choices: {
                oldPath: "ปล่อยให้ความสับสนและความกังวลกัดกินหัวใจของน้องต่อไป... ทุกๆ วันที่ผ่านไปคือการปล่อยให้เขาเผชิญหน้ากับโจทย์ที่ไม่เข้าใจอยู่ลำพัง ความมั่นใจที่เคยมีค่อยๆ เลือนหายไป",
                newPath: "เลือกระบบที่พิสูจน์แล้วว่าได้ผลจริง ประหยัดเวลาไปหลายร้อยชั่วโมง สร้างความมั่นใจให้ลูกด้วยแผนการที่ชัดเจน และเปลี่ยนอนาคตการเรียนคณิตศาสตร์ของพวกเขาไปตลอดกาล",
                colors: {
                    old: "bg-[#FFDCDC]/30",
                    new: "bg-[#E5989B]/40",
                    button: "bg-[#E5989B] hover:bg-[#d4878a]"
                }
            }
        };
    } else if (isM2Term1) {
        // --- M.2 Term 1 Data ---
        content = {
            hero: {
                blobs: ["bg-[#BBDEFB]/40", "bg-[#90CAF9]/40", "bg-[#64B5F6]/40"],
            },
            painPoint: {
                title: "อย่าให้ \"คณิต ม.2\" มาดับฝัน! 🚀",
                subtitle: "เนื้อหาเข้มข้นขึ้นอีกระดับ เปลี่ยน \"ความกังวล\" ให้เป็น \"ความมั่นใจ\" ตั้งแต่เทอมแรก",
                blobs: ["bg-[#E3F2FD]/30", "bg-[#BBDEFB]/30"],
                problemBox: {
                    title: "เพิ่งก้าวจาก ม.1 ขึ้น ม.2 แล้วเจอแบบนี้อยู่ใช่ไหม?",
                    icon: "😰",
                    items: [
                        { icon: "😵", text: "เนื้อหาซับซ้อน: บทเรียนยากขึ้นมาก โจทย์ปัญหาเริ่มประยุกต์หลายเรื่องจนตามไม่ทัน" },
                        { icon: "😥", text: "เริ่มท้อแท้: รู้สึกว่าคณิตศาสตร์ไม่ใช่ทางของเรา ทำคะแนนได้ไม่ดีเท่าที่ควร" },
                        { icon: "😭", text: "ไม่มีเวลาทบทวน: การบ้านเยอะ กิจกรรมแน่น จนไม่มีเวลามานั่งทำความเข้าใจบทเรียนเก่าๆ" },
                        { icon: "📉", text: "กลัวเกรดฉุด: กังวลว่าเกรดวิชาคณิตจะดึงเกรดเฉลี่ยทั้งหมดให้ตกลง" }
                    ],
                    bg: "bg-white/50"
                },
                solutionBox: {
                    title: "หยุดความกังวลไว้ตรงนี้! คอร์สนี้ช่วยได้",
                    icon: "💥",
                    desc: "อัปเกรดความเข้าใจทางคณิตศาสตร์ไปอีกขั้น! ครูฮีมจะเปลี่ยนเรื่องยากให้กลายเป็นเรื่องง่าย ด้วยเทคนิคการสอนที่เน้นภาพและความเข้าใจ ไม่ใช่แค่การจำสูตร",
                    items: [
                        { icon: "✅", text: "เชื่อมโยงเนื้อหาเก่า-ใหม่ ให้เห็นภาพรวม ไม่ต้องกลัวลืมของเก่า" },
                        { icon: "✅", text: "ตะลุยโจทย์ประยุกต์ สอนวิธีคิดเป็นขั้นตอน แก้ปัญหาโจทย์ซับซ้อนได้" },
                        { icon: "✅", text: "ปูทางสู่ ม.3 และสนามสอบเข้า ม.4 อย่างมั่นคงและมั่นใจ" }
                    ],
                    bg: "bg-[#E3F2FD]/50",
                    border: "border-[#BBDEFB]/60"
                }
            },
            curriculum: [
                {
                    id: 1,
                    title: "ทฤษฎีบทพีทาโกรัส",
                    desc: "แก้โจทย์ปัญหาได้อย่างมั่นใจ",
                    color: "bg-[#E3F2FD]/70",
                    iconColor: "text-[#BBDEFB]",
                    content: ["การเตรียมความพร้อมก่อนรู้จักทฤษฎีบทพีทาโกรัส", "ความสัมพันธ์ระหว่างความยาวด้านทั้งสามของสามเหลี่ยมมุมฉาก", "บทกลับของทฤษฎีบทพีทาโกรัส", "การนำความรู้ไปใช้แก้ปัญหา (โจทย์ปัญหาและการประยุกต์)"]
                },
                {
                    id: 2,
                    title: "ความรู้เบื้องต้นเกี่ยวกับจำนวนจริง",
                    desc: "เข้าใจระบบจำนวนทั้งหมด",
                    color: "bg-[#D1ECFC]/70",
                    iconColor: "text-[#90CAF9]",
                    content: ["จำนวนตรรกยะ (เศษส่วน, ทศนิยมซ้ำ)", "จำนวนอตรรกยะ (ทศนิยมไม่ซ้ำ, ค่าพาย, รากที่ถอดไม่ลงตัว)", "รากที่สอง และการหารากที่สอง", "รากที่สาม และการหารากที่สาม", "การนำความรู้ไปใช้แก้ปัญหา"]
                },
                {
                    id: 3,
                    title: "สมบัติของเลขยกกำลัง",
                    desc: "จัดการกับจำนวนมหาศาล",
                    color: "bg-[#BBDEFB]/70",
                    iconColor: "text-[#64B5F6]",
                    content: ["การดำเนินการของเลขยกกำลัง (การคูณ, การหาร)", "สมบัติอื่น ๆ ของเลขยกกำลัง (เลขชี้กำลังเป็นศูนย์, ติดลบ)", "สัญกรณ์วิทยาศาสตร์ (Scientific Notation)", "การนำความรู้ไปใช้แก้ปัญหาเกี่ยวกับจำนวนที่มีค่ามาก ๆ หรือน้อยมาก ๆ"]
                },
                {
                    id: 4,
                    title: "พหุนาม (Polynomials)",
                    desc: "ก้าวแรกสู่โลกพีชคณิต",
                    color: "bg-[#90CAF9]/70",
                    iconColor: "text-[#42A5F5]",
                    content: ["เอกนาม และการบวก-ลบเอกนาม", "พหุนาม และการบวก-ลบพหุนาม", "การคูณพหุนาม", "การหารพหุนามด้วยเอกนาม", "การนำความรู้ไปใช้แก้ปัญหา"]
                },
                {
                    id: 5,
                    title: "ปริซึมและทรงกระบอก",
                    desc: "มองเห็นคณิตศาสตร์ใน 3 มิติ",
                    color: "bg-[#64B5F6]/70",
                    iconColor: "text-[#2196F3]",
                    content: ["พื้นที่ผิวของปริซึมและทรงกระบอก", "ปริมาตรของปริซึมและทรงกระบอก", "การเปรียบเทียบหน่วยปริมาตร", "การนำความรู้ไปใช้แก้ปัญหา (โจทย์ปัญหาเกี่ยวกับความจุและวัสดุ)"]
                },
                {
                    id: 6,
                    title: "การแปลงทางเรขาคณิต",
                    desc: "คณิตศาสตร์แห่งการเคลื่อนไหว",
                    color: "bg-[#42A5F5]/70",
                    iconColor: "text-[#1E88E5]",
                    content: ["การเลื่อนขนาน (Translation)", "การสะท้อน (Reflection)", "การหมุน (Rotation)", "การนำความรู้ไปประยุกต์ใช้ในการสร้างสรรค์ลวดลายและงานศิลปะ"]
                }
            ],
            importance: [
                {
                    title: "1. ทฤษฎีบทพีทาโกรัส",
                    desc: "คือ \"กฎแห่งสามเหลี่ยมมุมฉาก\" เป็นทฤษฎีบทคลาสสิกที่เชื่อมโยงเรขาคณิต (รูปทรง) เข้ากับพีชคณิต (ตัวเลข) ทำให้เราสามารถคำนวณหาระยะทางหรือด้านที่ไม่ทราบค่าได้ เป็นพื้นฐานสำคัญที่สุดของเรื่อง \"ตรีโกณมิติ\" ใน ม.3",
                    color: "bg-[#E3F2FD]/60"
                },
                {
                    title: "2. ความรู้เบื้องต้นเกี่ยวกับจำนวนจริง",
                    desc: "คือการ \"จัดระเบียบจักรวาลของตัวเลข\" ทำให้เรารู้ว่าตัวเลขทุกตัวที่เราใช้ในชีวิตประจำวัน ไม่ว่าจะแปลกแค่ไหน ล้วนมีที่มาที่ไปและมีคุณสมบัติเฉพาะตัว เป็นรากฐานของพีชคณิตทั้งหมด",
                    color: "bg-[#D1ECFC]/60"
                },
                {
                    title: "3. สมบัติของเลขยกกำลัง",
                    desc: "คือ \"ภาษาย่อ\" ของการคูณ ทำให้เราสามารถเขียนและคำนวณตัวเลขที่ใหญ่มาก หรือเล็กมาก ได้อย่างง่ายดาย เป็นพื้นฐานโดยตรงของ \"ฟังก์ชันเอกซ์โพเนนเชียลและลอการิทึม\" ใน ม.ปลาย",
                    color: "bg-[#BBDEFB]/60"
                },
                {
                    title: "4. พหุนาม (Polynomials)",
                    desc: "คือ \"ตัวต่อเลโก้\" ของพีชคณิต เป็นการเรียนรู้โครงสร้างของนิพจน์ทางคณิตศาสตร์ เพื่อเตรียมพร้อมสำหรับการสร้างและแก้สมการที่ซับซ้อนขึ้น เป็นพื้นฐานที่ขาดไม่ได้สำหรับเทอม 2",
                    color: "bg-[#90CAF9]/60"
                },
                {
                    title: "5. ปริซึมและทรงกระบอก",
                    desc: "คือการ \"นำเรขาคณิตออกจากกระดาษ\" สู่โลกแห่งความเป็นจริง ทำให้เราสามารถวัดและคำนวณสิ่งของที่มีความกว้าง, ความยาว, และความสูงได้ สำคัญมากในงานวิศวกรรมและสถาปัตยกรรม",
                    color: "bg-[#64B5F6]/60"
                },
                {
                    title: "6. การแปลงทางเรขาคณิต",
                    desc: "คือการ \"เรียนรู้กฎของการเคลื่อนที่\" ทำให้เข้าใจว่ารูปทรงต่าง ๆ สามารถเปลี่ยนตำแหน่งได้อย่างไรโดยที่ยังคงคุณสมบัติเดิมไว้ เป็นแนวคิดเบื้องหลังของ \"เวกเตอร์\" และ \"เมทริกซ์\"",
                    color: "bg-[#42A5F5]/60"
                }
            ],
            choices: {
                oldPath: "ปล่อยให้ความสับสนและความกังวลกัดกินหัวใจของน้องต่อไป... ทุกๆ วันที่ผ่านไปคือการปล่อยให้เขาเผชิญหน้ากับโจทย์ที่ไม่เข้าใจอยู่ลำพัง ความมั่นใจที่เคยมีค่อยๆ เลือนหายไป กลายเป็นความกลัวที่จะยกมือถาม",
                newPath: "เลือกระบบที่พิสูจน์แล้วว่าได้ผลจริง ประหยัดเวลาไปหลายร้อยชั่วโมง สร้างความมั่นใจให้ลูกด้วยแผนการที่ชัดเจน และเปลี่ยนอนาคตการเรียนคณิตศาสตร์ของพวกเขาไปตลอดกาล นี่ไม่ใช่แค่การลงทุนเพื่อการสอบ แต่คือการลงทุนเพื่อทักษะที่จะติดตัวเขาไปตลอดชีวิต",
                colors: {
                    old: "bg-[#E3F2FD]/30",
                    new: "bg-[#BBDEFB]/40",
                    button: "bg-[#64B5F6] hover:bg-[#42A5F5]"
                }
            }
        };
    } else if (isM3Term1) {
        // --- M.3 Term 1 Data ---
        content = {
            hero: {
                blobs: ["bg-[#CDC1FF]/40", "bg-[#EEA5A6]/40", "bg-[#A594F9]/40"],
            },
            painPoint: {
                title: "อย่าให้ \"คณิต ม.3\" มาดับฝัน! 🚀",
                subtitle: "โค้งสุดท้ายก่อนเข้า ม.4 เปลี่ยน \"ความไม่พร้อม\" ให้เป็น \"ความมั่นใจ\" พิชิตทุกสนามสอบ",
                blobs: ["bg-[#F5EFFF]/30", "bg-[#E5D9F2]/30"],
                problemBox: {
                    title: "ม.3 แล้วเจอความท้าทายแบบนี้อยู่ใช่ไหม?",
                    icon: "😰",
                    items: [
                        { icon: "🤯", text: "เนื้อหาซับซ้อน: สมการกำลังสอง อสมการ ความคล้าย... เรื่องใหม่ๆ ยากขึ้นจนตั้งตัวไม่ทัน" },
                        { icon: "😨", text: "กดดันเรื่องสอบเข้า: ต้องเตรียมตัวสอบเข้า ม.4 แต่พื้นฐานยังไม่แน่นพอ กังวลว่าจะทำข้อสอบไม่ได้" },
                        { icon: "😵", text: "โจทย์ประยุกต์เยอะ: เจอโจทย์ปัญหายาวๆ แล้วไม่รู้จะเริ่มยังไง แปลงเป็นสมการไม่ถูก" },
                        { icon: "📉", text: "กลัวเกรดตก: กังวลว่าเกรดเทอมนี้จะฉุดเกรดเฉลี่ยสะสม (GPAX) ซึ่งสำคัญต่อการยื่นเข้า ม.4" }
                    ],
                    bg: "bg-white/50"
                },
                solutionBox: {
                    title: "หมดห่วง! เตรียมพร้อมสู่สนามสอบ ม.4",
                    icon: "💥",
                    desc: "เปลี่ยนโค้งสุดท้ายที่น่ากังวล ให้เป็นการเตรียมตัวที่แข็งแกร่งที่สุด! ครูฮีมจะปูพื้นฐานให้แน่น สอนเทคนิคแก้โจทย์ยากให้เป็นเรื่องง่าย พร้อมพาตะลุยข้อสอบจริง",
                    items: [
                        { icon: "✅", text: "สรุปเนื้อหาเข้มข้น เข้าใจง่าย ใช้ได้จริง ไม่ต้องเสียเวลาอ่านเอง" },
                        { icon: "✅", text: "สอนแก้โจทย์สมการกำลังสอง และโจทย์ปัญหาทุกรูปแบบอย่างเป็นระบบ" },
                        { icon: "✅", text: "สร้างความมั่นใจเต็มร้อย พร้อมสำหรับสอบเก็บคะแนน, O-NET และสอบเข้า ม.4" }
                    ],
                    bg: "bg-[#F5EFFF]/50",
                    border: "border-[#E5D9F2]/60"
                }
            },
            curriculum: [
                {
                    id: 1,
                    title: "อสมการเชิงเส้นตัวแปรเดียว",
                    desc: "แก้ปัญหาโจทย์อสมการอย่างมืออาชีพ",
                    color: "bg-[#E5D9F2]/70",
                    iconColor: "text-[#8E7AB5]",
                    content: ["ทบทวนความรู้เบื้องต้นเกี่ยวกับอสมการ", "การแก้อสมการเชิงเส้นตัวแปรเดียว", "การแก้โจทย์ปัญหาเกี่ยวกับอสมการเชิงเส้นตัวแปรเดียว"]
                },
                {
                    id: 2,
                    title: "การแยกตัวประกอบของพหุนามที่มีดีกรีสูงกว่าสอง",
                    desc: "ทลายกำแพงโจทย์พหุนามที่ซับซ้อน",
                    color: "bg-[#CDC1FF]/70",
                    iconColor: "text-[#A594F9]",
                    content: ["การแยกตัวประกอบของพหุนามที่อยู่ในรูปผลบวกและผลต่างของกำลังสาม", "การแยกตัวประกอบของพหุนามโดยการจัดหมู่หรือใช้วิธีทำเป็นกำลังสองสมบูรณ์"]
                },
                {
                    id: 3,
                    title: "สมการกำลังสองตัวแปรเดียว",
                    desc: "หัวใจสำคัญของพีชคณิต ม.ต้น",
                    color: "bg-[#B784B7]/70",
                    iconColor: "text-[#B784B7]",
                    content: ["การแก้สมการกำลังสองโดยใช้การแยกตัวประกอบ", "การแก้สมการกำลังสองโดยใช้กำลังสองสมบูรณ์", "การแก้สมการกำลังสองโดยใช้สูตร", "การแก้โจทย์ปัญหาเกี่ยวกับสมการกำลังสอง"]
                },
                {
                    id: 4,
                    title: "ความคล้าย (Similarity)",
                    desc: "มองโลกผ่านเลนส์ของสัดส่วน",
                    color: "bg-[#E493B3]/70",
                    iconColor: "text-[#E493B3]",
                    content: ["รูปหลายเหลี่ยมที่คล้ายกัน", "สามเหลี่ยมที่คล้ายกัน และเงื่อนไขของความคล้าย (ม.ม.ม., ด.ม.ด., ด.ด.ด.)", "การนำความรู้ไปใช้แก้ปัญหา (การวัดระยะทางและความสูงโดยทางอ้อม)"]
                },
                {
                    id: 5,
                    title: "กราฟของฟังก์ชันกำลังสอง",
                    desc: "เข้าใจภาพของสมการ",
                    color: "bg-[#EEA5A6]/70",
                    iconColor: "text-[#EEA5A6]",
                    content: ["ลักษณะทั่วไปของกราฟพาราโบลา", "การวาดกราฟของฟังก์ชันกำลังสอง", "ค่าสูงสุดหรือค่าต่ำสุดของฟังก์ชันกำลังสอง", "การนำความรู้ไปใช้แก้โจทย์ปัญหา"]
                },
                {
                    id: 6,
                    title: "สถิติ (3)",
                    desc: "อ่านข้อมูลผ่านแผนภาพกล่อง",
                    color: "bg-[#A594F9]/70",
                    iconColor: "text-[#A594F9]",
                    content: ["ทำความรู้จักแผนภาพกล่องและส่วนประกอบต่างๆ", "ขั้นตอนการสร้างแผนภาพกล่องจากข้อมูล", "การอ่านและแปลความหมายการกระจายของข้อมูลจากแผนภาพกล่อง"]
                }
            ],
            importance: [
                {
                    title: "1. อสมการเชิงเส้นตัวแปรเดียว",
                    desc: "คือการเรียนรู้ \"เงื่อนไขและขอบเขต\" ในทางคณิตศาสตร์ ไม่ใช่แค่การหาคำตอบที่ตายตัว แต่คือการหา \"ช่วงของคำตอบ\" ที่เป็นไปได้ทั้งหมด",
                    color: "bg-[#E5D9F2]/60"
                },
                {
                    title: "2. การแยกตัวประกอบของพหุนามที่มีดีกรีสูงกว่าสอง",
                    desc: "คือการ \"ถอดรหัส\" สมการที่ซับซ้อนให้กลายเป็นส่วนประกอบย่อยๆ ที่ง่ายต่อการจัดการ เป็นทักษะสำคัญที่ทำให้นักคณิตศาสตร์แก้ปัญหายากๆ ได้",
                    color: "bg-[#CDC1FF]/60"
                },
                {
                    title: "3. สมการกำลังสองตัวแปรเดียว",
                    desc: "คือ \"ประตูสู่โลกของฟังก์ชัน\" และกราฟพาราโบลา เป็นสมการที่อธิบายปรากฏการณ์ในธรรมชาติได้มากมาย เช่น การเคลื่อนที่ของวัตถุภายใต้แรงโน้มถ่วง",
                    color: "bg-[#B784B7]/60"
                },
                {
                    title: "4. ความคล้าย (Similarity)",
                    desc: "คือการเรียนรู้เรื่อง \"สัดส่วนและมาตราส่วน\" ในเชิงเรขาคณิต ทำให้เราสามารถย่อ-ขยาย หรือเปรียบเทียบขนาดของวัตถุที่แตกต่างกันได้อย่างแม่นยำ",
                    color: "bg-[#E493B3]/60"
                },
                {
                    title: "5. กราฟของฟังก์ชันกำลังสอง",
                    desc: "คือการเปลี่ยน \"สมการพีชคณิต\" ที่เป็นนามธรรม ให้กลายเป็น \"รูปภาพ\" ที่มองเห็นและเข้าใจได้ง่าย ทำให้เราวิเคราะห์หาจุดสูงสุด-ต่ำสุด และแนวโน้มของข้อมูลได้",
                    color: "bg-[#EEA5A6]/60"
                },
                {
                    title: "6. สถิติ (3)",
                    desc: "คือการ \"ถ่ายภาพเอ็กซ์เรย์\" ของข้อมูล ทำให้เราเห็นการกระจายตัว, ค่ากลาง, และข้อมูลที่ผิดปกติ (outliers) ได้อย่างชัดเจนและรวดเร็วในภาพเดียว เป็นเครื่องมือของนักวิเคราะห์ข้อมูลมืออาชีพ",
                    color: "bg-[#A594F9]/60"
                }
            ],
            choices: {
                oldPath: "ปล่อยให้ความสับสนและความกังวลกัดกินหัวใจของน้องต่อไป... ทุกๆ วันที่ผ่านไปคือการปล่อยให้เขาเผชิญหน้ากับโจทย์ที่ไม่เข้าใจอยู่ลำพัง ความมั่นใจที่เคยมีค่อยๆ เลือนหายไป กลายเป็นความกลัวที่จะยกมือถาม ปล่อยให้ช่องว่างระหว่างเขากับเพื่อนร่วมห้องถ่างกว้างขึ้นเรื่อยๆ จนตามไม่ทัน และที่น่าเสียดายที่สุด คือการปล่อยให้โอกาสทองในการสร้างอนาคตทางการศึกษาที่ดีที่สุด... ค่อยๆ หลุดลอยไปกับความท้อแท้",
                newPath: "เลือกระบบที่พิสูจน์แล้วว่าได้ผลจริง ประหยัดเวลาไปหลายร้อยชั่วโมง สร้างความมั่นใจให้ลูกด้วยแผนการที่ชัดเจน และเปลี่ยนอนาคตการเรียนคณิตศาสตร์ของพวกเขาไปตลอดกาล นี่ไม่ใช่แค่การลงทุนเพื่อการสอบ แต่คือการลงทุนเพื่อทักษะที่จะติดตัวเขาไปตลอดชีวิต",
                colors: {
                    old: "bg-[#E5D9F2]/30",
                    new: "bg-[#CDC1FF]/40",
                    button: "bg-[#B784B7] hover:bg-[#A594F9]"
                }
            }
        };
    } else if (isM3Term2) {
        // --- M.3 Term 2 Data ---
        content = {
            hero: {
                blobs: ["bg-[#B3C8CF]/40", "bg-[#E5E1DA]/40", "bg-[#89A8B2]/40"],
            },
            painPoint: {
                title: "อย่าให้ \"คณิต ม.3 เทอม 2\" มาดับฝัน! 🚀",
                subtitle: "เทอมสุดท้ายก่อนเข้า ม.4! เปลี่ยน \"ความกังวล\" เป็น \"ความพร้อม\" พิชิตเกรด 4 และทุกสนามสอบ",
                blobs: ["bg-[#F1F0E8]/30", "bg-[#E5E1DA]/30"],
                problemBox: {
                    title: "เทอมสุดท้ายแล้ว เจอความท้าทายแบบนี้อยู่ใช่ไหม?",
                    icon: "😰",
                    items: [
                        { icon: "🤯", text: "เนื้อหาหลากหลาย: ทั้งพีชคณิต เรขาคณิต ตรีโกณมิติ... หลายเรื่องเชื่อมกันจนเริ่มสับสน" },
                        { icon: "📐", text: "โจทย์ตรีโกณมิติ: เจอ sin, cos, tan แล้วไปไม่เป็น ไม่รู้จะใช้ค่าไหนแก้ปัญหา" },
                        { icon: "😵", text: "เรขาคณิต 3 มิติ: นึกภาพตามไม่ออก คำนวณพื้นที่ผิว-ปริมาตรผิดบ่อย ๆ" },
                        { icon: "📉", text: "เกรดคืออนาคต: กังวลว่าเกรดเทอมสุดท้ายจะฉุด GPAX ซึ่งสำคัญมากต่อการยื่นเข้า ม.4 โรงเรียนดัง" }
                    ],
                    bg: "bg-white/50"
                },
                solutionBox: {
                    title: "หมดห่วง! ปิดเทอม ม.3 อย่างสวยงาม",
                    icon: "💥",
                    desc: "เปลี่ยนเทอมสุดท้ายที่น่ากังวล ให้เป็นการเตรียมตัวที่แข็งแกร่งที่สุด! ครูฮีมจะสรุปเนื้อหาให้กระชับ สอนเทคนิคแก้โจทย์ยากให้เป็นเรื่องง่าย พร้อมพาตะลุยข้อสอบจริง",
                    items: [
                        { icon: "✅", text: "เข้าใจตรีโกณมิติ พิชิตโจทย์การวัดระยะทางและความสูง" },
                        { icon: "✅", text: "เชี่ยวชาญเรขาคณิต 3 มิติ คำนวณพื้นที่ผิวและปริมาตรได้อย่างแม่นยำ" },
                        { icon: "✅", text: "สร้างความมั่นใจเต็มร้อย พร้อมสำหรับสอบปลายภาค, O-NET และสอบเข้า ม.4" }
                    ],
                    bg: "bg-[#F1F0E8]/50",
                    border: "border-[#E5E1DA]/60"
                }
            },
            curriculum: [
                {
                    id: 1,
                    title: "ระบบสมการเชิงเส้นสองตัวแปร",
                    desc: "ไขปริศนาโจทย์ปัญหาด้วย 2 สมการ",
                    color: "bg-[#E5E1DA]/70",
                    iconColor: "text-[#89A8B2]",
                    content: ["การแก้ระบบสมการโดยใช้กราฟ", "การแก้ระบบสมการโดยการแทนค่าและการกำจัดตัวแปร", "การแก้โจทย์ปัญหาระบบสมการเชิงเส้น"]
                },
                {
                    id: 2,
                    title: "วงกลม",
                    desc: "เข้าใจสมบัติของรูปทรงที่สมบูรณ์แบบที่สุด",
                    color: "bg-[#B3C8CF]/70",
                    iconColor: "text-[#504B38]",
                    content: ["มุมในส่วนโค้งของวงกลมและมุมที่จุดศูนย์กลาง", "คอร์ดของวงกลม", "เส้นสัมผัสวงกลม"]
                },
                {
                    id: 3,
                    title: "พีระมิด กรวย และทรงกลม",
                    desc: "คำนวณพื้นที่ผิวและปริมาตรในโลก 3 มิติ",
                    color: "bg-[#E5E1DA]/70",
                    iconColor: "text-[#89A8B2]",
                    content: ["การหาพื้นที่ผิวและปริมาตรของพีระมิด", "การหาพื้นที่ผิวและปริมาตรของกรวย", "การหาพื้นที่ผิวและปริมาตรของทรงกลม", "การแก้โจทย์ปัญหาประยุกต์"]
                },
                {
                    id: 4,
                    title: "อัตราส่วนตรีโกณมิติ",
                    desc: "วัดความสูงตึกโดยไม่ต้องปีน",
                    color: "bg-[#B3C8CF]/70",
                    iconColor: "text-[#504B38]",
                    content: ["ทำความรู้จัก Sin, Cos และ Tan", "อัตราส่วนตรีโกณมิติของมุม 30, 45 และ 60 องศา", "การนำอัตราส่วนตรีโกณมิติไปใช้แก้ปัญหา"]
                },
                {
                    id: 5,
                    title: "ความน่าจะเป็น",
                    desc: "ศาสตร์แห่งการทำนายอนาคต",
                    color: "bg-[#E5E1DA]/70",
                    iconColor: "text-[#89A8B2]",
                    content: ["การทดลองสุ่มและเหตุการณ์", "การหาความน่าจะเป็นของเหตุการณ์", "การนำความน่าจะเป็นไปใช้ในการตัดสินใจ"]
                }
            ],
            importance: [
                {
                    title: "1. ระบบสมการเชิงเส้นสองตัวแปร",
                    desc: "คือการเรียนรู้วิธีจัดการกับ \"หลายเงื่อนไขพร้อมกัน\" ซึ่งเป็นทักษะการแก้ปัญหาที่ซับซ้อนในชีวิตจริง เป็นพื้นฐานของ \"เมทริกซ์\" และ \"พีชคณิตเชิงเส้น\"",
                    color: "bg-[#E5E1DA]/60"
                },
                {
                    title: "2. วงกลม",
                    desc: "คือการเรียนรู้ \"ความสัมพันธ์เชิงมุมและระยะทาง\" ในรูปทรงเรขาคณิต ซึ่งเป็นพื้นฐานของตรรกะและการพิสูจน์ และ \"เรขาคณิตวิเคราะห์\" (ภาคตัดกรวย)",
                    color: "bg-[#B3C8CF]/60"
                },
                {
                    title: "3. พีระมิด กรวย และทรงกลม",
                    desc: "คือการพัฒนามิติสัมพันธ์ (Spatial Reasoning) และการประยุกต์ใช้สูตรเพื่อแก้ปัญหาในโลก 3 มิติที่เราอาศัยอยู่ เป็นพื้นฐานสำคัญของ \"แคลคูลัส\"",
                    color: "bg-[#E5E1DA]/60"
                },
                {
                    title: "4. อัตราส่วนตรีโกณมิติ",
                    desc: "คือเครื่องมือมหัศจรรย์ในการ \"วัดสิ่งที่วัดไม่ได้โดยตรง\" โดยอาศัยความสัมพันธ์ระหว่างมุมและด้านของสามเหลี่ยมมุมฉาก เป็นประตูสู่โลกของ \"ฟังก์ชันตรีโกณมิติ\"",
                    color: "bg-[#B3C8CF]/60"
                },
                {
                    title: "5. ความน่าจะเป็น",
                    desc: "คือการเรียนรู้วิธี \"วัดความไม่แน่นอน\" และใช้ข้อมูลในการตัดสินใจอย่างมีหลักการ แทนการเดาสุ่ม เป็นพื้นฐานสำคัญของ \"สถิติเชิงอนุมาน\" และ \"Data Science\"",
                    color: "bg-[#E5E1DA]/60"
                }
            ],
            choices: {
                oldPath: "ปล่อยให้ความสับสนและความกังวลกัดกินหัวใจของน้องต่อไป... ทุกๆ วันที่ผ่านไปคือการปล่อยให้เขาเผชิญหน้ากับโจทย์ที่ไม่เข้าใจอยู่ลำพัง ความมั่นใจที่เคยมีค่อยๆ เลือนหายไป กลายเป็นความกลัวที่จะยกมือถาม ปล่อยให้ช่องว่างระหว่างเขากับเพื่อนร่วมห้องถ่างกว้างขึ้นเรื่อยๆ จนตามไม่ทัน",
                newPath: "เลือกระบบที่พิสูจน์แล้วว่าได้ผลจริง ประหยัดเวลาไปหลายร้อยชั่วโมง สร้างความมั่นใจให้ลูกด้วยแผนการที่ชัดเจน และเปลี่ยนอนาคตการเรียนคณิตศาสตร์ของพวกเขาไปตลอดกาล นี่ไม่ใช่แค่การลงทุนเพื่อการสอบ แต่คือการลงทุนเพื่อทักษะที่จะติดตัวเขาไปตลอดชีวิต",
                colors: {
                    old: "bg-[#E5E1DA]/30",
                    new: "bg-[#B3C8CF]/40",
                    button: "bg-[#89A8B2] hover:bg-[#7a96a0]"
                }
            }
        };
    } else {
        // --- M.1 Term 1 Data (Default) ---
        content = {
            hero: {
                blobs: ["bg-purple-200/40", "bg-blue-200/40", "bg-pink-200/40"],
            },
            painPoint: {
                title: "อย่าให้ \"คณิต ม.1\" มาดับฝัน! 🚀",
                subtitle: "ก้าวแรกที่สำคัญที่สุดในสนามมัธยม เปลี่ยน \"ตัวถ่วง\" ให้เป็น \"ตัวท็อป\" ตั้งแต่เทอมแรก",
                blobs: ["bg-[#BFF6C3]/30", "bg-[#E0FBE2]/30"],
                problemBox: {
                    title: "เพิ่งขึ้น ม.1 แล้วเจอแบบนี้?",
                    icon: "😰",
                    items: [
                        { icon: "😵", text: "เรียนไม่เข้าใจ: ที่โรงเรียนสอนเร็วมาก ฟังไม่ทัน พื้นฐานเก่าก็ยังไม่แน่น" },
                        { icon: "😥", text: "เสียความมั่นใจ: เพื่อนๆ ทำได้ แต่เรายังงงอยู่เลย จนไม่กล้าถาม ไม่กล้าตอบ" },
                        { icon: "😭", text: "การบ้านคือยาขม: เจอโจทย์ซับซ้อนแล้วมึนตึ้บ ทำไม่ได้จนอยากจะร้องไห้" }
                    ],
                    bg: "bg-white/50"
                },
                solutionBox: {
                    title: "ลืมภาพจำเก่าๆ ไปได้เลย!",
                    icon: "💥",
                    desc: "นี่ไม่ใช่แค่คอร์สสอนการบ้าน แต่คือการ \"ติดอาวุธทางปัญญา\" ให้น้องๆ พร้อมรับมือกับสนามสอบ ม.ต้น อย่างมั่นใจเต็มร้อย!",
                    items: [
                        { icon: "✅", text: "ปูพื้นฐานใหม่ให้แน่นเปรี๊ยะ! เข้าใจที่มาที่ไป ไม่ใช่แค่ท่องจำสูตร" },
                        { icon: "✅", text: "ใช้เทคนิคลัดเฉพาะตัว ที่เปลี่ยนโจทย์ยากๆ ให้คิดในใจได้ง่ายๆ" },
                        { icon: "✅", text: "สร้างบรรยากาศสนุกๆ เรียนแล้วไม่เบื่อ อยากเรียนต่อจนจบ!" }
                    ],
                    bg: "bg-[#E0FBE2]/50",
                    border: "border-[#BFF6C3]/60"
                }
            },
            curriculum: [
                {
                    id: 1,
                    title: "จำนวนเต็ม",
                    desc: "เข้าใจพื้นฐานของตัวเลขที่ควรรู้",
                    color: "bg-[#D6EDF9]/70",
                    iconColor: "text-[#A3D7F3]",
                    content: ["ความหมายและประเภทของจำนวนเต็ม", "การเปรียบเทียบจำนวนเต็ม", "การบวกและการลบจำนวนเต็ม", "การคูณและการหารจำนวนเต็ม", "สมบัติของจำนวนเต็มและนำไปใช้ในการแก้ปัญหา"]
                },
                {
                    id: 2,
                    title: "การสร้างทางเรขาคณิต",
                    desc: "สร้างรูปเรขาคณิตตามโจทย์ที่กำหนด",
                    color: "bg-[#BDDEF0]/70",
                    iconColor: "text-[#99CBE8]",
                    content: ["การสร้างพื้นฐานทางเรขาคณิตด้วยวงเวียนและสันตรง", "การสร้างส่วนของเส้นตรงและมุมให้มีขนาดเท่ากับที่กำหนด", "การสร้างเส้นตั้งฉากและเส้นแบ่งครึ่งส่วนของเส้นตรง", "การสร้างเส้นแบ่งครึ่งมุม", "การนำความรู้ไปใช้ในการสร้างรูปเรขาคณิตอื่นๆ"]
                },
                {
                    id: 3,
                    title: "เลขยกกำลัง",
                    desc: "พื้นฐานสำคัญสู่การคำนวณที่ซับซ้อน",
                    color: "bg-[#A2D3E9]/70",
                    iconColor: "text-[#7FC1DE]",
                    content: ["ความหมายของเลขยกกำลัง", "การเขียนตัวเลขในรูปสัญกรณ์วิทยาศาสตร์", "การบวก ลบ คูณ และหารเลขยกกำลัง", "การนำความรู้ไปใช้แก้โจทย์ปัญหาในชีวิตจริง"]
                },
                {
                    id: 4,
                    title: "ทศนิยมและเศษส่วน",
                    desc: "พลิกแพลงการคำนวณได้อย่างคล่องแคล่ว",
                    color: "bg-[#87C3E2]/70",
                    iconColor: "text-[#BDD8E8]",
                    content: ["ทศนิยมและการเปรียบเทียบทศนิยม", "การบวก ลบ คูณ หาร ทศนิยม", "เศษส่วนและการเปรียบเทียบเศษส่วน", "การบวก ลบ คูณ หาร เศษส่วน", "ความสัมพันธ์ระหว่างทศนิยมและเศษส่วน"]
                }
            ],
            importance: [
                {
                    title: "1. จำนวนเต็ม (Integers)",
                    desc: "บทเรียนเรื่อง จำนวนเต็ม ไม่ได้มีแค่การบวก ลบ คูณ หารธรรมดา แต่เป็น **พื้นฐานของทุกสิ่ง** ในวิชาคณิตศาสตร์เลยครับ ในชีวิตประจำวันเราก็ใช้จำนวนเต็มอยู่ตลอดเวลา",
                    color: "bg-[#D6EDF9]/60"
                },
                {
                    title: "2. การสร้างทางเรขาคณิต",
                    desc: "การสร้างทางเรขาคณิตคือการใช้ **วงเวียน** 🧭 และ **ไม้บรรทัด** 📏 เพื่อสร้างรูปทรงต่างๆ เรื่องนี้ไม่ใช่แค่การวาดรูปให้สวย แต่เป็นการฝึกให้เรา **คิดอย่างมีเหตุผล**",
                    color: "bg-[#BDDEF0]/60"
                },
                {
                    title: "3. เลขยกกำลัง (Exponents)",
                    desc: "เลขยกกำลัง คือการเขียนตัวเลขจำนวนมากๆ ให้สั้นลง เรื่องนี้สำคัญเพราะช่วยให้การคำนวณตัวเลขที่ใหญ่มากๆ หรือเล็กมากๆ เป็นเรื่องง่าย",
                    color: "bg-[#A2D3E9]/60"
                },
                {
                    title: "4. ทศนิยมและเศษส่วน",
                    desc: "ทศนิยม และ เศษส่วน เป็นวิธีแสดงจำนวนที่ไม่ใช่จำนวนเต็ม การเข้าใจสองเรื่องนี้จะช่วยให้คุณคำนวณได้อย่าง **คล่องแคล่ว** และ **แม่นยำ**",
                    color: "bg-[#87C3E2]/60"
                }
            ],
            choices: {
                oldPath: "ปล่อยให้ความสับสนและความกังวลกัดกินหัวใจของน้องต่อไป... ทุกๆ วันที่ผ่านไปคือการปล่อยให้เขาเผชิญหน้ากับโจทย์ที่ไม่เข้าใจอยู่ลำพัง ความมั่นใจที่เคยมีค่อยๆ เลือนหายไป กลายเป็นความกลัวที่จะยกมือถาม",
                newPath: "เลือกระบบที่พิสูจน์แล้วว่าได้ผลจริง ประหยัดเวลาไปหลายร้อยชั่วโมง สร้างความมั่นใจให้ลูกด้วยแผนการที่ชัดเจน และเปลี่ยนอนาคตการเรียนคณิตศาสตร์ของพวกเขาไปตลอดกาล",
                colors: {
                    old: "bg-[#ACE1AF]/30",
                    new: "bg-[#B0EBB4]/40",
                    button: "bg-[#ACE1AF] hover:bg-[#9ad69d]"
                }
            }
        };
    }

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 selection:bg-indigo-100 selection:text-indigo-900 transition-colors">

            <Navbar />

            {/* 1. Hero Section (Glassmorphism + Pastel) */}
            <header className="relative pt-32 pb-10 md:pb-16 overflow-hidden font-sans">
                {/* Pastel Background with Mesh Gradient */}
                <div className="absolute inset-0 bg-[#Fdfbf7] z-0">
                    <div className={`absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full blur-3xl mix-blend-multiply animate-blob ${content.hero.blobs[0]}`}></div>
                    <div className={`absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000 ${content.hero.blobs[1]}`}></div>
                    <div className={`absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-4000 ${content.hero.blobs[2]}`}></div>
                </div>

                <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row gap-16 items-center relative z-10">
                    <div className="flex-1 space-y-8 text-center md:text-left">

                        {/* Category Badge (Glass) */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/50 bg-white/30 backdrop-blur-md shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></span>
                            <span className="text-sm font-bold text-slate-600 tracking-wide uppercase">
                                {course.category || "คอร์สแนะนำ"}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-5xl md:text-7xl font-black leading-relaxed tracking-tight text-slate-800 drop-shadow-sm">
                            {course.title}
                        </h1>

                        {/* Buttons & Price */}
                        <div className="flex flex-col items-center md:items-start gap-6 pt-2">
                            {enrollmentStatus === 'approved' ? (
                                <div className="w-full">
                                    {/* Attendance Banner */}
                                    {(() => {
                                        // Helper to render banner based on status
                                        // We use the state 'attendanceStatus' calculated in useEffect
                                        if (attendanceStatus === 'critical') {
                                            return (
                                                <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-4 animate-in slide-in-from-left-4 fade-in duration-500">
                                                    <div className="p-3 bg-white rounded-full text-2xl shadow-sm">🚨</div>
                                                    <div>
                                                        <h3 className="font-bold text-rose-700 text-lg">หายไปนานเลยนะ!</h3>
                                                        <p className="text-rose-600 text-sm mt-1">ไม่ได้เข้าเรียนมาเกิน 7 วันแล้ว เดี๋ยวลืมเนื้อหานะครับ กลับมาลุยต่อเถอะ!</p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        if (attendanceStatus === 'warning') {
                                            return (
                                                <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-4 animate-in slide-in-from-left-4 fade-in duration-500">
                                                    <div className="p-3 bg-white rounded-full text-2xl shadow-sm">⚡</div>
                                                    <div>
                                                        <h3 className="font-bold text-amber-700 text-lg">อย่าลืมแวะมาทบทวนนะ</h3>
                                                        <p className="text-amber-600 text-sm mt-1">ไม่ได้เข้าเรียนมาเกิน 3 วันแล้ว แวะมาดูคลิปสั้นๆ สักหน่อยก็ยังดีครับ</p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        if (attendanceStatus === 'good') {
                                            return (
                                                <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-start gap-4 animate-in slide-in-from-left-4 fade-in duration-500">
                                                    <div className="p-3 bg-white rounded-full text-2xl shadow-sm">🔥</div>
                                                    <div>
                                                        <h3 className="font-bold text-emerald-700 text-lg">สุดยอดมาก! ขยันสุดๆ</h3>
                                                        <p className="text-emerald-600 text-sm mt-1">เข้าเรียนสม่ำเสมอแบบนี้ เกรด 4 วิชาคณิตศาสตร์รออยู่แน่นอนครับ!</p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    <Link href={`/learn/${courseId}`}>
                                        <button className="w-full md:w-auto group relative px-10 py-5 rounded-2xl font-bold text-xl text-white overflow-hidden transition-all hover:-translate-y-1 shadow-xl shadow-green-200">
                                            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                                            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-20 transition-opacity"></div>
                                            <div className="relative flex items-center justify-center gap-3">
                                                <span>เข้าสู่ห้องเรียน</span>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                            </div>
                                        </button>
                                    </Link>
                                </div>
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
                                            className="group relative px-10 py-5 rounded-2xl font-bold text-xl text-white overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-200/50"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-90"></div>
                                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                                            <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 blur-sm"></div>

                                            <div className="relative flex items-center gap-3">
                                                <span>สมัครเรียนทันที</span>
                                                <div className="flex items-center gap-2">
                                                    {course.fullPrice > 0 && (
                                                        <span className="text-xs text-blue-100 line-through decoration-blue-200/50">฿{course.fullPrice.toLocaleString()}</span>
                                                    )}
                                                    <span className="bg-white/20 border border-white/20 px-2 py-0.5 rounded text-sm backdrop-blur-sm">
                                                        {course.price ? `฿${course.price.toLocaleString()}` : 'ฟรี'}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>

                                        {/* Free Trial Button (Glassmorphism Low Emphasis) */}
                                        <Link href={`/learn/${courseId}`}>
                                            <button className="px-10 py-5 rounded-2xl font-bold text-xl text-slate-600 bg-white/30 border border-white/60 backdrop-blur-md hover:bg-white/50 hover:border-white transition-all duration-300 shadow-lg shadow-slate-200/30 flex items-center gap-2 group">
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
                                        <img src={course.image} alt={course.title} className="w-full h-auto object-cover" loading="lazy" />
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

            {/* Main wrapper (No Overlap) */}
            <main className="relative z-10 bg-[#F8F9FD] pb-10 overflow-hidden">

                {/* Pain Point & Solution Section */}
                {/* Pain Point & Solution Section */}
                <section className="max-w-5xl mx-auto px-6 py-12">
                    <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white/50 p-8 md:p-12 text-center relative overflow-hidden">
                        {/* Pastel Blob Backgrounds */}
                        <div className={`absolute top-0 left-0 w-64 h-64 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 ${content.painPoint.blobs[0]}`}></div>
                        <div className={`absolute bottom-0 right-0 w-64 h-64 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 ${content.painPoint.blobs[1]}`}></div>

                        <h2 className="text-4xl md:text-5xl font-black text-slate-800 leading-relaxed mb-6 relative z-10">
                            {content.painPoint.title}
                        </h2>
                        <p className="text-xl text-slate-600 mb-12 font-medium relative z-10">{content.painPoint.subtitle}</p>

                        <div className="text-left grid md:grid-cols-2 gap-10 items-start relative z-10">
                            {/* Pain Points */}
                            <div className={`${content.painPoint.problemBox.bg} rounded-3xl p-6 border border-white/60 shadow-sm`}>
                                <h3 className="font-bold text-2xl text-slate-700 mb-6 flex items-center gap-2">
                                    <span className="text-3xl">{content.painPoint.problemBox.icon}</span> {content.painPoint.problemBox.title}
                                </h3>
                                <ul className="space-y-5">
                                    {content.painPoint.problemBox.items.map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-2xl flex-shrink-0">{item.icon}</span>
                                            <span className="text-lg text-slate-600">{item.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {/* The Solution */}
                            <div className={`${content.painPoint.solutionBox.bg} rounded-3xl p-6 border ${content.painPoint.solutionBox.border} shadow-sm`}>
                                <h3 className="font-bold text-2xl text-slate-700 mb-6 flex items-center gap-2">
                                    <span className="text-3xl">{content.painPoint.solutionBox.icon}</span> {content.painPoint.solutionBox.title}
                                </h3>
                                <p className="text-lg text-slate-600 mb-6 font-medium">{content.painPoint.solutionBox.desc}</p>
                                <ul className="space-y-4">
                                    {content.painPoint.solutionBox.items.map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-2xl text-green-600 font-bold">{item.icon}</span>
                                            <span className="text-lg text-slate-700">{item.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Curriculum Section */}
                {/* Curriculum Section */}
                <section className="max-w-4xl mx-auto px-6 py-12">
                    <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] shadow-lg p-8 md:p-12 border border-white/50">
                        <h2 className="text-4xl font-bold text-center text-slate-800 mb-4">เนื้อหาที่จะได้เรียนในเทอมนี้ 📚</h2>
                        <p className="text-center text-lg text-slate-500 mb-12">เนื้อหาฉบับปรับปรุง สสวท. ปี 60 (ปรับปรุงล่าสุด)</p>

                        <div className="space-y-4">
                            {content.curriculum.map((chapter, index) => (
                                <div key={chapter.id} className={`rounded-2xl overflow-hidden transition-all duration-300 ${chapter.color}`}>
                                    <button
                                        onClick={() => setOpenChapterIndex(openChapterIndex === index ? null : index)}
                                        className="w-full p-5 flex items-center justify-between text-left"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={`w-12 h-12 bg-white shadow-sm rounded-2xl flex items-center justify-center font-bold text-xl ${chapter.iconColor}`}>
                                                {chapter.id}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-xl text-slate-800">{chapter.title}</h3>
                                                <p className="text-slate-600 text-base">{chapter.desc}</p>
                                            </div>
                                        </div>
                                        <svg
                                            className={`w-6 h-6 text-slate-500 transition-transform duration-300 ${openChapterIndex === index ? 'rotate-180' : ''}`}
                                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </button>
                                    <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${openChapterIndex === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                        <div className="overflow-hidden">
                                            <div className="px-5 pb-5 pt-0 pl-[5.5rem]">
                                                <ul className="list-disc text-slate-700 space-y-3 text-lg">
                                                    {chapter.content && chapter.content.map((item: any, i: number) => (
                                                        <li key={i}>{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Bonus Section (Gifted) */}


                {/* Importance of Each Chapter */}
                {/* Importance of Each Chapter */}
                {content.importance && (
                    <section className="max-w-5xl mx-auto px-6 py-12">
                        <h2 className="text-4xl font-bold text-center text-slate-800 mb-6">แต่ละบทสำคัญอย่างไร? 🤔</h2>
                        <p className="text-center text-lg text-slate-500 mb-12">มาดูกันว่าแต่ละบทจะเปิดประตูสู่โลกใบไหนให้คุณ</p>

                        <div className="grid md:grid-cols-2 gap-6">
                            {content.importance.map((item, i) => (
                                <div key={i} className={`${item.color} backdrop-blur-md rounded-3xl p-8 border border-white/50 hover:shadow-lg transition-all`}>
                                    <h3 className="text-2xl font-bold mb-4 text-slate-800">{item.title}</h3>
                                    <p className="text-slate-600 leading-relaxed text-lg">
                                        {item.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Choices Section */}
                {/* Choices Section */}
                <section className="max-w-6xl mx-auto px-6 py-16">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">ทางเลือกมีแค่ 2 ทาง... <br className="md:hidden" />อยู่ที่คุณจะเลือก</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Choice 1 */}
                        <div className={`${content.choices.colors.old} backdrop-blur-md rounded-[2rem] p-8 md:p-10 border border-white/50 relative overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl`}>
                            <h3 className="text-3xl font-bold text-slate-700 mb-8">ทางเลือกที่ 1: เส้นทางเดิม</h3>
                            <p className="text-slate-600 leading-relaxed text-xl">
                                {content.choices.oldPath}
                            </p>
                        </div>

                        {/* Choice 2 */}
                        <div className={`${content.choices.colors.new} backdrop-blur-md rounded-[2rem] p-8 md:p-10 border border-white/50 relative overflow-hidden flex flex-col justify-between shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl`}>
                            <div>
                                <h3 className="text-3xl font-bold text-slate-800 mb-8">ทางเลือกที่ 2: เส้นทางสู่ความสำเร็จ</h3>
                                <p className="text-slate-700 leading-relaxed text-xl mb-10">
                                    {content.choices.newPath}
                                </p>
                            </div>

                            <button
                                onClick={handlePaymentClick}
                                className={`w-full py-5 rounded-xl ${content.choices.colors.button} text-white font-bold text-2xl shadow-lg transition-all transform hover:scale-105 active:scale-95 border border-white/30`}
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
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-6 leading-relaxed">
                            🔥 ถามตรง-ตอบเคลียร์! <br className="hidden md:block" />เรื่องที่ใจอยากรู้ ก่อนตัดสินใจลุย 🔥
                        </h2>
                        <p className="text-slate-600 text-xl">
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
                                        <span className="text-xl">{faq.q}</span>
                                        <span className="text-slate-500 font-bold text-xl flex-shrink-0 mt-0.5">{openFaqIndex === i ? "−" : "+"}</span>
                                    </button>
                                    <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${openFaqIndex === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                        <div className="overflow-hidden">
                                            <div className="px-6 pb-6 pt-2 text-slate-700 leading-relaxed border-t border-black/5 text-lg">
                                                {faq.a}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-12 text-center bg-indigo-50 rounded-2xl p-8 border border-indigo-100">
                        <p className="text-xl font-medium text-indigo-900 mb-4">
                            อย่าปล่อยให้ "ความลังเล" ขโมยโอกาสเกรด 4 ของน้องไป
                        </p>
                        <p className="text-slate-600 text-lg">
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