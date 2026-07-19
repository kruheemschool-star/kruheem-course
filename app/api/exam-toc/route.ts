import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { listCollection, type FsDoc } from "@/lib/firestoreRest";

// Lightweight table-of-contents feed for the exam-bank course sales page.
//
// The sales-page hero card shows a live, auto-scrolling list of every exam set
// in the คลังข้อสอบ. It must NOT pull the full `exams` docs — each doc's
// `questions` array is 250KB–900KB, so all 67 sets together are multi-MB. This
// endpoint projects ONLY the small metadata fields (title/level/questionCount/
// isFree/order) via the Firestore REST field mask, so the payload stays tiny
// and cacheable. Freshness: tagged "exams-feed", so /api/revalidate-exams busts
// it the moment the admin adds/hides/reorders an exam — same as /exam.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface ExamTocItem {
    id: string;
    title: string;
    level: string;
    category: string;
    questionCount: number;
    isFree: boolean;
}

const getToc = unstable_cache(
    async (): Promise<{ exams: ExamTocItem[] }> => {
        const docs: FsDoc[] = await listCollection(
            "exams",
            ["title", "level", "category", "questionCount", "isFree", "order", "createdAt", "hidden"],
            { revalidate: 3600 }
        );

        const exams = docs
            .filter((d) => !d.hidden) // hide exams flagged hidden — matches /exam
            .map((d) => ({
                id: d.id,
                // Titles are stored with hard line breaks (e.g. "แบบฝึกหัด\nสอบเข้า ม.1\nชุดที่ 1").
                // Collapse to a single line so the one-line TOC row renders cleanly.
                title: (((d.title as string) || "").replace(/\s+/g, " ").trim()),
                level: (d.level as string) || "",
                category: (d.category as string) || "",
                questionCount: (d.questionCount as number | undefined) ?? 0,
                isFree: (d.isFree as boolean) || false,
                order: (d.order as number | undefined) ?? Number.MAX_SAFE_INTEGER,
                createdAt: d.createdAt ? new Date(d.createdAt as string).getTime() : 0,
            }))
            .filter((e) => e.title)
            .sort((a, b) => (a.order !== b.order ? a.order - b.order : a.createdAt - b.createdAt))
            .map(({ order, createdAt, ...rest }) => rest);

        return { exams };
    },
    ["exam-toc-v1"],
    { revalidate: 3600, tags: ["exams-feed"] }
);

export async function GET() {
    try {
        return NextResponse.json(await getToc());
    } catch (error) {
        // Fail soft: the card falls back to its own default list rather than erroring.
        console.error("exam-toc failed:", error);
        return NextResponse.json({ exams: [] }, { status: 200 });
    }
}
