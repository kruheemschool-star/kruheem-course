import { Metadata } from "next";
import Link from "next/link";
import { listCollection, getDocument } from "@/lib/firestoreRest";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Target, Award, ArrowRight } from "lucide-react";
import ExamListClient from "@/components/exam/ExamListClient";

// SEO Metadata
export const metadata: Metadata = {
    title: "คลังข้อสอบคณิตศาสตร์ออนไลน์ (Practice Mode) | KruHeem Course",
    description: "ฝึกทำโจทย์คณิตศาสตร์ ป.1 - ม.6 จับเวลาจำลองสอบจริง พร้อมเฉลยละเอียด ตะลุยโจทย์ O-NET, A-Level เพื่อวัดระดับความรู้",
    keywords: ["ฝึกทำโจทย์คณิต", "คลังข้อสอบ", "จับเวลาทำข้อสอบ", "จำลองสอบ", "ตะลุยโจทย์", "ข้อสอบ A-Level"],
};

// ISR: Cache for 5 minutes, admin changes reflect within 5 min
export const revalidate = 300;

// 1. Fetch Data on Server (Metadata only - fast load)
// Reads via the Firestore REST API (see lib/firestoreRest). The Firebase
// *client* SDK was resolving with an EMPTY/partial snapshot for the `exams`
// collection inside this server component on Vercel, which got frozen into the
// ISR cache — so admin changes like flipping an exam to "free" (isFree) never
// reflected on the public page. The REST read is reliable in every runtime.
async function getEnrollmentCount() {
    try {
        const doc = await getDocument("public_stats/enrollments", { revalidate: 300 });
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
            { revalidate: 300 }
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


// Countdown tracks for the "นับถอยหลังวันสอบ" card. The source of truth is the
// `examCalendar` collection, but its security rule is still waiting on a
// `firebase deploy` — so we read the admin-maintained MIRROR at
// `public_stats/examCalendar` (public_stats/* is already world-readable).
// scripts/sync-exam-calendar.js refreshes the mirror after any calendar edit.
// Returns [] on any failure — the card falls back to its built-in track list.
type RawTrack = Record<string, unknown>;
const toTrack = (d: RawTrack) => ({
    trackId: (d.trackId as string) || (d.id as string) || "",
    label: (d.label as string) || "",
    // Both the REST decoder and the mirror store timestamps as ISO strings.
    examAtIso: (d.examAt as string) || null,
    sourceUrl: (d.sourceUrl as string) || "",
    isEstimate: (d.isEstimate as boolean) ?? true,
    chaptersToMaster: (d.chaptersToMaster as number) || 9,
    hoursPerWeek: (d.hoursPerWeek as number) || 3,
    hasContent: (d.hasContent as boolean) || false,
    order: (d.order as number | undefined) ?? 99,
});

async function getExamCalendar() {
    // 1) Mirror doc — readable today under the existing public_stats rule.
    try {
        const doc = await getDocument("public_stats/examCalendar", { revalidate: 300 });
        const tracks = (doc?.tracks as RawTrack[] | undefined) ?? [];
        if (tracks.length > 0) {
            return tracks.map(toTrack).filter((t) => t.trackId && t.label)
                .sort((a, b) => a.order - b.order);
        }
    } catch (error) {
        console.error("Error fetching exam calendar mirror:", error);
    }
    // 2) Direct collection read — works once the examCalendar rule is deployed.
    try {
        const docs = await listCollection(
            "examCalendar",
            [
                "trackId", "label", "examAt", "sourceUrl", "isEstimate",
                "chaptersToMaster", "hoursPerWeek", "hasContent", "order",
            ],
            { revalidate: 300 }
        );
        return docs.map(toTrack).filter((t) => t.trackId && t.label)
            .sort((a, b) => a.order - b.order);
    } catch (error) {
        console.error("Error fetching exam calendar:", error);
        return [];
    }
}

export default async function ExamHubPage() {
    // 2. Await Data
    const [exams, enrollmentCount, calendarTracks] = await Promise.all([
        getExams(), getEnrollmentCount(), getExamCalendar(),
    ]);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 bg-dot-pattern font-sans flex flex-col transition-colors">
            <Navbar />

            {/* 3. Pass Data to Client Component for Interactivity */}
            <div className="pt-24">
                <ExamListClient initialExams={exams} enrollmentCount={enrollmentCount} calendarTracks={calendarTracks} />
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
