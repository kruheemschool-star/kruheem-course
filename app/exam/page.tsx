import { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Target, Award } from "lucide-react";
import ExamListClient from "@/components/exam/ExamListClient";

// SEO Metadata
export const metadata: Metadata = {
    title: "คลังข้อสอบคณิตศาสตร์ออนไลน์ | KruHeem Course",
    description: "รวมข้อสอบคณิตศาสตร์ ป.1 - ม.6 และข้อสอบเข้ามหาลัย พร้อมเฉลยละเอียด ฝึกทำโจทย์ได้ทันที",
    keywords: ["ข้อสอบคณิตศาสตร์", "คลังข้อสอบ", "แบบฝึกหัดคณิต", "ข้อสอบ O-NET", "ข้อสอบ A-Level"],
};

export const dynamic = "force-dynamic";

// 1. Fetch Data on Server (No "use client")
async function getExams() {
    try {
        const q = query(collection(db, "exams"), orderBy("createdAt", "asc"));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            // Serialize data (convert Date objects to strings/numbers if needed for props)
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Fix: Convert Firestore Timestamp to plain string/number if necessary,
                    // but for basic display, Next.js can pass simple objects.
                    // If you have Timestamp fields like 'createdAt', better transform them:
                    createdAt: data.createdAt?.toDate?.().toISOString() || null,
                    updatedAt: data.updatedAt?.toDate?.().toISOString() || null
                };
            });
        }
        return [];
    } catch (error) {
        console.error("Error fetching exams:", error);
        return [];
    }
}

export default async function ExamHubPage() {
    // 2. Await Data
    const exams = await getExams();

    return (
        <div className="min-h-screen bg-[#FDFCF8] font-sans flex flex-col">
            <Navbar />

            {/* Netflix-style Hero Banner (Server Rendered) */}
            <div className="pt-24 pb-8 px-4 md:px-8 bg-gradient-to-b from-white to-[#FDFCF8]">
                <div className="relative w-full max-w-7xl mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-900 text-white min-h-[400px] flex items-center group transition-all duration-500 hover:shadow-indigo-500/20">
                    {/* Background Art */}
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900"></div>
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=3270&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay transition-transform duration-1000 group-hover:scale-105"></div>
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

            {/* 3. Pass Data to Client Component for Interactivity */}
            <ExamListClient initialExams={exams} />

            <Footer />
        </div>
    );
}
