import { Metadata } from "next";
import Link from "next/link";
import { listCollection, getDocument } from "@/lib/firestoreRest";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Target, Award, ArrowRight, FileText } from "lucide-react";
import ExamListClient from "@/components/exam/ExamListClient";

// SEO Metadata
export const metadata: Metadata = {
    // layout ต่อท้าย "| KruHeem Course" ให้เองผ่าน title.template — ใส่ซ้ำที่นี่
    // แท็บกับผลค้นหา Google จะขึ้นชื่อแบรนด์สองรอบ
    title: "คลังข้อสอบคณิตศาสตร์ออนไลน์ (Practice Mode)",
    description: "ฝึกทำโจทย์คณิตศาสตร์ ป.1 - ม.6 จับเวลาจำลองสอบจริง พร้อมเฉลยละเอียด ตะลุยโจทย์ O-NET, A-Level เพื่อวัดระดับความรู้",
    keywords: ["ฝึกทำโจทย์คณิต", "คลังข้อสอบ", "จับเวลาทำข้อสอบ", "จำลองสอบ", "ตะลุยโจทย์", "ข้อสอบ A-Level"],
};

// ISR: 1 ชม. — เดิม 5 นาที = สแกน exams ทั้ง 103 doc ใหม่สูงสุด 288 รอบ/วัน
// (ตัวกิน reads อันดับ 1 ของทั้งเว็บ) การแก้ของแอดมินยังโผล่ทันทีเหมือนเดิม
// เพราะหน้าแอดมินยิง /api/revalidate-exams (revalidatePath + tag exams-feed) ทุกครั้งที่บันทึก
export const revalidate = 3600;

// 1. Fetch Data on Server (Metadata only - fast load)
// Reads via the Firestore REST API (see lib/firestoreRest). The Firebase
// *client* SDK was resolving with an EMPTY/partial snapshot for the `exams`
// collection inside this server component on Vercel, which got frozen into the
// ISR cache — so admin changes like flipping an exam to "free" (isFree) never
// reflected on the public page. The REST read is reliable in every runtime.
async function getEnrollmentCount() {
    try {
        const doc = await getDocument("public_stats/enrollments", { revalidate: 3600 });
        return (doc?.count as number | undefined) ?? 0;
    } catch (error) {
        console.error("Error fetching public enrollment count:", error);
        return 0;
    }
}

async function getExams() {
    try {
        // Project ONLY the small metadata fields — never `questions`. Each exam's
        // questions array is 250KB–900KB; pulling it for all 43 exams produces a
        // multi-MB response that blows past Next.js's 2MB fetch-cache limit (so it
        // can't be cached and refetches on every request). The per-exam count is
        // stored separately in the `questionCount` field, so we read that instead.
        const docs = await listCollection(
            "exams",
            [
                "title", "description", "level", "category", "difficulty",
                "themeColor", "coverImage", "tags", "isFree", "questionCount",
                "order", "createdAt", "updatedAt", "hidden",
            ],
            // 24 ชม. + tag — /api/revalidate-exams บัสต์ทันทีตอนแอดมินบันทึก
            { revalidate: 86400, tags: ["exams-feed"] }
        );

        const examList = docs
            .filter((d) => !d.hidden) // Hide exams marked as hidden
            .map((d) => {
                const questionCount = (d.questionCount as number | undefined) ?? 0;

                return {
                    id: d.id,
                    title: (d.title as string) || "",
                    description: (d.description as string) || "",
                    level: (d.level as string) || "",
                    category: (d.category as string) || "General",
                    difficulty: (d.difficulty as string) || "Medium",
                    themeColor: (d.themeColor as string) || "Blue",
                    coverImage: (d.coverImage as string) || "",
                    tags: (d.tags as string[]) || [],
                    isFree: (d.isFree as boolean) || false,
                    questionCount, // Only send count, not full questions
                    order: (d.order as number | undefined) ?? Number.MAX_SAFE_INTEGER,
                    // REST returns timestamps as ISO 8601 strings already.
                    createdAt: (d.createdAt as string) || null,
                    updatedAt: (d.updatedAt as string) || null,
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
    } catch (error) {
        console.error("Error fetching exams:", error);
        return [];
    }
}

export default async function ExamHubPage() {
    // 2. Await Data
    const [exams, enrollmentCount] = await Promise.all([
        getExams(), getEnrollmentCount(),
    ]);

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

                {/* PDF exam-paper shop banner — same minimal card structure as the
                    Practice Mode banner above, teal accent to set it apart */}
                <div className="relative w-full max-w-5xl mx-auto mt-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-14 md:px-16 md:py-20 text-center shadow-[0_10px_50px_-20px_rgba(15,23,42,0.15)]">
                    <div className="inline-flex items-center gap-2 mb-6 text-[11px] font-bold uppercase tracking-[0.22em] text-teal-600 dark:text-teal-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                        PDF Download
                    </div>

                    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                        อยากได้ข้อสอบเป็นไฟล์ PDF
                        <span className="block mt-1.5 text-teal-500">ไว้ปริ้นท์ทำที่บ้าน?</span>
                    </h2>

                    <p className="mt-5 mx-auto max-w-xl text-base md:text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
                        ชุดแนวข้อสอบพร้อมเฉลยละเอียด ดาวน์โหลดเก็บไว้ได้เลย
                    </p>

                    <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/exam-papers"
                            className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-base shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                        >
                            <FileText size={18} />
                            ดูชุดข้อสอบ PDF
                            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
