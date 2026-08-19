import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { gzipSync, gunzipSync } from "node:zlib";
import { listCollection, type FsDoc } from "@/lib/firestoreRest";

// Slim per-question index (question text + tags + keywords only) powering the
// /practice topic picker, and telling /exam/practice WHICH exam sets contain
// matches — so those pages stop downloading every full `exams` doc (67 reads,
// 17-60MB) per view. Mirrors /api/exam-search: the raw read stays noStore
// (multi-MB, past Next's 2MB cache-entry limit); what's cached is the gzipped
// trimmed index. Busted by /api/revalidate-exams via the shared "exams-feed" tag.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface PracticeIndexQuestion {
    question: string;
    tags?: string[];
    keywords?: string;
}

export interface PracticeIndexExam {
    id: string;
    title: string;
    questions: PracticeIndexQuestion[];
}

async function buildPracticeIndex(): Promise<{ exams: PracticeIndexExam[] }> {
    const docs: FsDoc[] = await listCollection("exams", ["title", "hidden", "questions"], { noStore: true });

    const exams = docs
        .filter((d) => !d.hidden) // hidden sets shouldn't feed practice — matches /exam
        .map((d) => {
            let questions: Record<string, unknown>[] = [];
            if (d.questions) {
                if (typeof d.questions === "string") {
                    try {
                        questions = JSON.parse(d.questions);
                    } catch {
                        questions = [];
                    }
                } else if (Array.isArray(d.questions)) {
                    questions = d.questions as Record<string, unknown>[];
                }
            }
            return {
                id: d.id,
                title: (d.title as string) || "",
                questions: questions.map((q) => {
                    // Omit empty tags/keywords instead of sending empty values —
                    // the index is downloaded on every /practice view.
                    const item: PracticeIndexQuestion = { question: (q.question as string) || "" };
                    if (Array.isArray(q.tags) && q.tags.length > 0) item.tags = q.tags as string[];
                    if (typeof q.keywords === "string" && q.keywords) item.keywords = q.keywords;
                    return item;
                }),
            };
        });

    return { exams };
}

// Cached, gzip-compressed (stored as base64 so the entry is JSON-serializable).
const getPracticeIndexGz = unstable_cache(
    async (): Promise<string> => {
        const index = await buildPracticeIndex();
        return gzipSync(Buffer.from(JSON.stringify(index), "utf8")).toString("base64");
    },
    ["practice-index-v1"],
    // 24 ชม. — เหตุผลเดียวกับ exam-search: rebuild = ดูดคลังทั้งก้อน
    { revalidate: 86400, tags: ["exams-feed"] }
);

export async function GET() {
    try {
        // Cached path: no Firestore reads on a warm cache.
        const gz = await getPracticeIndexGz();
        const body = gunzipSync(Buffer.from(gz, "base64"));
        return new NextResponse(body, {
            headers: { "content-type": "application/json" },
        });
    } catch (cacheError) {
        // Fallback: direct uncached read so practice keeps working even if the
        // data cache misbehaves (e.g. entry-size limits).
        console.error("practice-index cache path failed, serving direct read:", cacheError);
        try {
            return NextResponse.json(await buildPracticeIndex());
        } catch (error) {
            console.error("Error building practice index:", error);
            return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
        }
    }
}
