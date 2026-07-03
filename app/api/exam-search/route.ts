import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { gzipSync, gunzipSync } from "node:zlib";
import { listCollection, type FsDoc } from "@/lib/firestoreRest";

// Dynamic route, but the DATA is cached (see below) — each request runs this
// handler, which serves from the Next data cache and only hits Firestore when
// the cache is cold, expired (1 hour), or busted by /api/revalidate-exams.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Reads via the Firestore REST API (see lib/firestoreRest). The Firebase
// *client* SDK was resolving with an EMPTY/partial snapshot for the `exams`
// collection inside this route handler on Vercel (it was returning only a
// handful of stale docs), which got frozen into the ISR cache — so admin
// changes like flipping an exam to "free" never showed up in search results.
//
// The raw read includes the full `questions` arrays (needed for matching
// question text) and is multi-MB — past Next.js's 2MB per-entry cache limit —
// so the raw fetch stays `noStore`. What we CAN cache is the trimmed search
// index (question text only): gzipped it is a few hundred KB, well under the
// limit. Before this cache, every user's first keystroke in the search box
// cost a full multi-MB Firestore read (~20s response measured in prod).
// Freshness is preserved: admin changes POST /api/revalidate-exams, which
// calls revalidateTag("exams-feed") and busts this entry immediately.
async function buildSearchIndex(): Promise<{ exams: unknown[] }> {
    const docs = await listCollection(
        "exams",
        [
            "title", "description", "level", "themeColor", "coverImage",
            "tags", "category", "isFree", "order", "createdAt", "questions",
            "hidden",
        ],
        { noStore: true }
    );
    return { exams: trimForSearch(docs) };
}

// Cached, gzip-compressed search index. Stored as base64 so the entry is a
// plain JSON-serializable value.
const getSearchIndexGz = unstable_cache(
    async (): Promise<string> => {
        const index = await buildSearchIndex();
        return gzipSync(Buffer.from(JSON.stringify(index), "utf8")).toString("base64");
    },
    ["exam-search-index-v1"],
    { revalidate: 3600, tags: ["exams-feed"] }
);

export async function GET() {
    try {
        // Cached path: no Firestore reads on a warm cache.
        const gz = await getSearchIndexGz();
        const body = gunzipSync(Buffer.from(gz, "base64"));
        return new NextResponse(body, {
            headers: { "content-type": "application/json" },
        });
    } catch (cacheError) {
        // Fallback: exact pre-cache behavior (direct uncached read) so search
        // keeps working even if the data cache misbehaves (e.g. entry-size
        // limits). Logged so we can see it in Vercel logs if it ever happens.
        console.error("exam-search cache path failed, serving direct read:", cacheError);
        try {
            const index = await buildSearchIndex();
            return NextResponse.json(index);
        } catch (error) {
            console.error("Error fetching exam search data:", error);
            return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
        }
    }
}

function trimForSearch(docs: FsDoc[]): unknown[] {
    if (docs.length === 0) return [];

    const examsRaw = docs
            .filter((d) => !d.hidden) // Hide exams marked as hidden
            .map((d) => {
            // Parse questions
            let questions: { question?: string }[] = [];
            if (d.questions) {
                if (typeof d.questions === 'string') {
                    try {
                        questions = JSON.parse(d.questions);
                    } catch {
                        questions = [];
                    }
                } else if (Array.isArray(d.questions)) {
                    questions = d.questions;
                }
            }

            // Return only searchable fields (minimize payload).
            // Per-question payload is trimmed to { index, question } only —
            // explanation/options/tags were matched-against but never rendered
            // in search results, and were the bulk of an 8 MB response.
            // category/isFree added so the in-search category filter + free
            // badge in ExamListClient work (they were silently broken).
            return {
                id: d.id,
                title: (d.title as string) || "",
                description: (d.description as string) || "",
                level: (d.level as string) || "",
                themeColor: (d.themeColor as string) || "",
                coverImage: (d.coverImage as string) || "",
                tags: (d.tags as string[]) || [],
                category: (d.category as string) || "General",
                isFree: (d.isFree as boolean) || false,
                order: (d.order as number | undefined) ?? Number.MAX_SAFE_INTEGER,
                // REST returns timestamps as ISO 8601 strings already.
                createdAt: d.createdAt ? new Date(d.createdAt as string).getTime() : 0,
                questions: questions.map((q, idx) => ({
                    index: idx + 1,
                    question: q.question || "",
                })),
            };
        });

    examsRaw.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.createdAt - b.createdAt;
    });

    return examsRaw.map(e => {
        const { order, createdAt, ...rest } = e;
        return rest;
    });
}

