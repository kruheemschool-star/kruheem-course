import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Target, Award } from "lucide-react";
import ExamListClient from "@/components/exam/ExamListClient";
import { adminDb } from "@/lib/firebase-admin";

// SEO Metadata
export const metadata: Metadata = {
    title: "คลังข้อสอบคณิตศาสตร์ออนไลน์ (Practice Mode) | KruHeem Course",
    description: "ฝึกทำโจทย์คณิตศาสตร์ ป.1 - ม.6 จับเวลาจำลองสอบจริง พร้อมเฉลยละเอียด ตะลุยโจทย์ O-NET, A-Level เพื่อวัดระดับความรู้",
    keywords: ["ฝึกทำโจทย์คณิต", "คลังข้อสอบ", "จับเวลาทำข้อสอบ", "จำลองสอบ", "ตะลุยโจทย์", "ข้อสอบ A-Level"],
};

// Force dynamic rendering so that admin changes are reflected immediately
export const dynamic = 'force-dynamic';

// 1. Fetch Data on Server (Metadata only - fast load)
async function getEnrollmentCount() {
    try {
        const snapshot = await adminDb.collection("enrollments").where("status", "==", "approved").get();
        const uniqueEmails = new Set<string>();
        snapshot.docs.forEach((doc: any) => {
            const email = doc.data().userEmail;
            if (email) uniqueEmails.add(email);
        });
        return uniqueEmails.size > 0 ? uniqueEmails.size : snapshot.size;
    } catch (error) {
        console.error("Error fetching enrollment count:", error);
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
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans flex flex-col transition-colors">
            <Navbar />

            {/* 3. Pass Data to Client Component for Interactivity */}
            <div className="pt-24">
                <ExamListClient initialExams={exams} enrollmentCount={enrollmentCount} />
            </div>

            {/* Netflix-style Hero Banner (Moved to Bottom) */}
            <div className="py-12 px-4 md:px-8 bg-gradient-to-t from-white dark:from-slate-950 to-slate-50 dark:to-slate-900">
                <div className="relative w-full max-w-7xl mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-900 text-white min-h-[400px] flex items-center group transition-all duration-500 hover:shadow-indigo-500/20">
                    {/* Background Art */}
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900"></div>
                    <div className="absolute inset-0 opacity-30 mix-blend-overlay transition-transform duration-1000 group-hover:scale-105">
                        <Image
                            src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=3270&auto=format&fit=crop"
                            alt="Math Practice Background"
                            fill
                            className="object-cover object-center"
                            priority
                            sizes="(max-width: 768px) 100vw, 80vw"
                        />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent"></div>

                    {/* Content */}
                    <div className="relative z-10 p-8 md:p-16 max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-6 backdrop-blur-sm">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                            New Feature
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight drop-shadow-2xl">
                            โหมดฝึกฝนรายบท <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                                (Practice Mode)
                            </span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-xl leading-relaxed drop-shadow-md">
                            เจาะลึกทุกบทเรียน อัพสกิลคณิตศาสตร์ให้เก่งเวอร์! ฝึกฝนจุดอ่อน เสริมจุดแข็ง ด้วยระบบวิเคราะห์อัจฉริยะ 🧠✨
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                href="/practice"
                                className="px-8 py-4 bg-white text-slate-900 rounded-xl font-black text-lg flex items-center justify-center gap-3 hover:bg-amber-400 transition-colors shadow-lg hover:shadow-amber-400/50 hover:-translate-y-1 transform duration-200"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center">
                                    <Target size={18} fill="currentColor" />
                                </div>
                                เริ่มฝึกฝนทันที
                            </Link>
                            <button className="px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-white/20 transition-colors border border-white/10 hover:border-white/30">
                                <Award size={20} />
                                ดูสถิติของฉัน
                            </button>
                        </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute right-0 bottom-0 p-12 opacity-10 hidden md:block">
                        <div className="text-[12rem] font-black text-white leading-none select-none tracking-tighter">MATH</div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
