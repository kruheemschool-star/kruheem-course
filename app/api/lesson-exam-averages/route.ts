import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// 30 minute ISR cache. Aggregated across all users, so a longer TTL is fine.
export const revalidate = 1800;

/**
 * API Route: GET /api/lesson-exam-averages
 * Aggregates in-course exam results (`users/{uid}/lessonExamResults/{lessonId}`)
 * from ALL users to build a per-lesson score histogram — powers the
 * "เก่งกว่า X% ของคนที่ทำชุดนี้" percentile on the learn ExamRunner result.
 *
 * Mirrors /api/exam-averages: Admin SDK + collectionGroup bypasses rules, ONE
 * query, no per-user data returned. Each user's `bestPercent` per lesson is the
 * representative score; binned into 10 buckets (0-9, 10-19, … 90-100).
 */
export async function GET() {
    try {
        const snap = await adminDb.collectionGroup("lessonExamResults").get();
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

        return NextResponse.json({ perLesson });
    } catch (error) {
        console.error("Error computing lesson exam averages:", error);
        return NextResponse.json({ error: "Failed to compute lesson averages" }, { status: 500 });
    }
}
