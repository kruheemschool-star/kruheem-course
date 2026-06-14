import { NextRequest, NextResponse } from "next/server";
import { listCollection } from "@/lib/firestoreRest";

// Dynamic: the read below is uncacheable (multi-MB, see below) and must always
// reflect the latest admin edits (e.g. an exam just flipped to "free").
export const dynamic = "force-dynamic";

// Reads via the Firestore REST API (see lib/firestoreRest). The Firebase
// *client* SDK was resolving with an EMPTY/partial snapshot for the `exams`
// collection inside this route handler on Vercel (it was returning only a
// handful of stale docs), which got frozen into the ISR cache — so admin
// changes like flipping an exam to "free" never showed up in search results.
//
// This read includes the full `questions` arrays (needed for matching question
// text), so the raw response is multi-MB — past Next.js's 2MB fetch-cache
// limit. We therefore read with `noStore` (no fetch caching) instead of fighting
// that limit. It's fine: ExamListClient only calls this route lazily the first
// time a user actually types in the search box, not on every page view.
// API Route for lazy loading exam questions for search
export async function GET(request: NextRequest) {
    try {
        const docs = await listCollection(
            "exams",
            [
                "title", "description", "level", "themeColor", "coverImage",
                "tags", "category", "isFree", "order", "createdAt", "questions",
                "hidden",
            ],
            { noStore: true }
        );

        if (docs.length === 0) {
            return NextResponse.json({ exams: [] });
        }

        const examsRaw = docs
            .filter((d) => !d.hidden) // Hide exams marked as hidden
            .map((d) => {
            // Parse questions
            let questions: any[] = [];
            if (d.questions) {
                if (typeof d.questions === 'string') {
                    try {
                        questions = JSON.parse(d.questions);
                    } catch (e) {
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
                questions: questions.map((q: any, idx: number) => ({
                    index: idx + 1,
                    question: q.question || "",
                })),
            };
        });

        examsRaw.sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            return a.createdAt - b.createdAt;
        });

        const exams = examsRaw.map(e => {
            const { order, createdAt, ...rest } = e;
            return rest;
        });

        return NextResponse.json({ exams });
    } catch (error) {
        console.error("Error fetching exam search data:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}

