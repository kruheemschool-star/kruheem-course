import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";

// Dynamic route with the aggregate cached via unstable_cache — the old
// `export const revalidate = 1800` never cached Admin SDK reads, so every
// in-course exam submission re-scanned every user's lessonExamResults.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * API Route: GET /api/lesson-exam-averages
 * Aggregates in-course exam results (`users/{uid}/lessonExamResults/{lessonId}`)
 * from ALL users to build a per-lesson score histogram — powers the
 * "เก่งกว่า X% ของคนที่ทำชุดนี้" percentile on the learn ExamRunner result.
 *
 * Mirrors /api/exam-averages: Admin SDK + collectionGroup bypasses rules, ONE
 * query, no per-user data returned. Each user's `bestPercent` per lesson is the
 * representative score; binned into 10 buckets (0-9, 10-19, … 90-100).
 * .select() masks the read down to the 3 fields used — result docs also carry
 * heavy per-question detail that this aggregation never touches.
 */
async function computeLessonAverages() {
    const snap = await adminDb
        .collectionGroup("lessonExamResults")
        .select("lessonId", "bestPercent", "last.percent")
        .get();
    const perLesson: Record<string, { count: number; buckets: number[] }> = {};

    snap.docs.forEach((doc) => {
        const data = doc.data();
        const lid = typeof data.lessonId === "string" ? data.lessonId : "";
        const pct = typeof data.bestPercent === "number"
            ? data.bestPercent
            : (data.last && typeof data.last.percent === "number" ? data.last.percent : null);
        if (lid && pct !== null) {
            if (!perLesson[lid]) perLesson[lid] = { count: 0, buckets: new Array(10).fill(0) };
            perLesson[lid].count++;
            perLesson[lid].buckets[Math.min(9, Math.max(0, Math.floor(pct / 10)))]++;
        }
    });

    return { perLesson };
}

const getLessonAveragesCached = unstable_cache(computeLessonAverages, ["lesson-exam-averages-v1"], {
    revalidate: 21600,
});

export async function GET() {
    try {
        const data = await getLessonAveragesCached();
        return NextResponse.json(data, {
            headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
        });
    } catch (error) {
        console.error("Error computing lesson exam averages:", error);
        return NextResponse.json({ error: "Failed to compute lesson averages" }, { status: 500 });
    }
}
