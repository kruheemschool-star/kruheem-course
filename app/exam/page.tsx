import { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Target, Award, ArrowRight } from "lucide-react";
import ExamListClient from "@/components/exam/ExamListClient";
import { doc, getDoc } from "firebase/firestore";

// SEO Metadata
export const metadata: Metadata = {
    title: "คลังข้อสอบคณิตศาสตร์ออนไลน์ (Practice Mode) | KruHeem Course",
    description: "ฝึกทำโจทย์คณิตศาสตร์ ป.1 - ม.6 จับเวลาจำลองสอบจริง พร้อมเฉลยละเอียด ตะลุยโจทย์ O-NET, A-Level เพื่อวัดระดับความรู้",
    keywords: ["ฝึกทำโจทย์คณิต", "คลังข้อสอบ", "จับเวลาทำข้อสอบ", "จำลองสอบ", "ตะลุยโจทย์", "ข้อสอบ A-Level"],
};

// ISR: Cache for 5 minutes, admin changes reflect within 5 min
export const revalidate = 300;

// 1. Fetch Data on Server (Metadata only - fast load)
async function getEnrollmentCount() {
    try {
        const snap = await getDoc(doc(db, "public_stats", "enrollments"));
        if (snap.exists()) {
            return snap.data().count || 0;
        }
        return 0;
    } catch (error) {
        console.error("Error fetching public enrollment count:", error);
        return 0;
    }
}

async function getExams() {
    try {
        const q = query(collection(db, "exams"));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const examList = snapshot.docs
                .filter(doc => !doc.data().hidden) // Hide exams marked as hidden
                .map(doc => {
                const data = doc.data();

                // Count questions without sending full data
                let questionCount = 0;
                if (data.questions) {
                    if (typeof data.questions === 'string') {
                        try {
                            const parsed = JSON.parse(data.questions);
                            questionCount = Array.isArray(parsed) ? parsed.length : 0;
                        } catch (e) {
                            questionCount = 0;
                        }
                    } else if (Array.isArray(data.questions)) {
                        questionCount = data.questions.length;
                    }
                }

                return {
                    id: doc.id,
                    title: data.title || "",
                    description: data.description || "",
                    level: data.level || "",
                    category: data.category || "General",
                    difficulty: data.difficulty || "Medium",
                    themeColor: data.themeColor || "Blue",
                    coverImage: data.coverImage || "",
                    tags: data.tags || [],
                    isFree: data.isFree || false,
                    questionCount, // Only send count, not full questions
                    order: data.order ?? Number.MAX_SAFE_INTEGER,
                    createdAt: data.createdAt?.toDate?.().toISOString() || null,
                    updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
                };
            });

            // Sort by order field, fallback to createdAt ascending
            examList.sort((a, b) => {
                const orderA = a.order;
                const orderB = b.order;
                if (orderA !== orderB) return orderA - orderB;

                // Fallback to createdAt ascending
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeA - timeB;
            });

            return examList;
        }
        return [];
    } catch (error) {
        console.error("Error fetching exams:", error);
        return [];
    }
}


export default async function ExamHubPage() {
    // 2. Await Data
    const [exams, enrollmentCount] = await Promise.all([getExams(), getEnrollmentCount()]);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 bg-dot-pattern font-sans flex flex-col transition-colors">
            <Navbar />

            {/* 3. Pass Data to Client Component for Interactivity */}
            <div className="pt-24">
                <ExamListClient initialExams={exams} enrollmentCount={enrollmentCount} />
            </div>

            {/* Netflix-style Hero Banner (Moved to Bottom) */}
            <div className="py-12 px-4 md:px-8 bg-gradient-to-t from-white dark:from-slate-950 to-slate-50 dark:to-slate-900">
                {/* Minimal, clean Practice Mode banner — light, airy, no
                    image/heavy overlays; matches the page's light + dot bg */}
                <div className="relative w-full max-w-5xl mx-auto rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-14 md:px-16 md:py-20 text-center shadow-[0_10px_50px_-20px_rgba(15,23,42,0.15)]">
                    <div className="inline-flex items-center gap-2 mb-6 text-[11px] font-bold uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        New Feature
                    </div>

                    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                        โหมดฝึกฝนรายบท
                        <span className="block mt-1.5 text-amber-500">Practice Mode</span>
                    </h2>

                    <p className="mt-5 mx-auto max-w-xl text-base md:text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
                        เจาะลึกทุกบทเรียน ฝึกจุดอ่อน เสริมจุดแข็ง ด้วยระบบวิเคราะห์อัจฉริยะ — เก่งขึ้นแบบรู้ว่าต้องซ้อมตรงไหน
                    </p>

                    <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/practice"
                            className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-base shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                        >
                            <Target size={18} />
                            เริ่มฝึกฝนทันที
                            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        <button className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-slate-600 dark:text-slate-300 font-bold text-base hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <Award size={18} />
                            ดูสถิติของฉัน
                        </button>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
