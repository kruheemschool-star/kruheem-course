import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";

// Dynamic route, but the aggregate is cached via unstable_cache below — the old
// `export const revalidate = 1800` never applied here (route-level revalidate
// does not cache Admin SDK reads inside a dynamic handler), so every student
// submit triggered a full collection-group scan of ALL users' results. With
// the cache, the scan runs at most once per 6h (or when the entry is cold).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * API Route: GET /api/exam-averages
 * Aggregates exam results from ALL users to compute global averages.
 * Returns: overall average %, per-category averages, average time per question.
 *
 * Implementation notes:
 *  - Uses Admin SDK + collectionGroup("examResults") so it is ONE Firestore query
 *    instead of the previous "list users -> for-each-user list subcollection" N+1
 *    pattern. That old path also could not actually read user subcollections via
 *    client SDK from the API route (security rules require isOwner|isAdmin), so
 *    in practice it was returning empty stats. Admin SDK bypasses rules.
 *  - .select() masks the query to the 7 fields actually aggregated — result docs
 *    also carry per-question answer arrays which are never used here and were
 *    the bulk of the egress.
 *  - We never return user ids or any per-user data, only aggregates.
 */
async function computeAverages() {
    const resultsSnap = await adminDb
        .collectionGroup("examResults")
        .select("percent", "durationSeconds", "avgTimePerQuestion", "examId", "attempts", "category", "tags")
        .get();

    let totalPercent = 0;
    let totalExams = 0;
    let totalDuration = 0;
    let totalDurationExams = 0;
    let totalAvgTime = 0;
    let totalAvgTimeExams = 0;
    const catMap: Record<string, { totalPercent: number; count: number }> = {};
    const tagMap: Record<string, { totalPercent: number; count: number }> = {};
    const examMap: Record<string, { count: number; buckets: number[]; sumPercent: number; attempts: number }> = {};
    const userIds = new Set<string>();

    resultsSnap.docs.forEach(doc => {
        const data = doc.data();

        // doc.ref.path === "users/{uid}/examResults/{id}"
        const uid = doc.ref.path.split("/")[1];
        if (uid) userIds.add(uid);

        if (typeof data.percent === "number") {
            totalPercent += data.percent;
            totalExams++;
        }

        // Duration tracking
        if (typeof data.durationSeconds === "number" && data.durationSeconds > 0) {
            totalDuration += data.durationSeconds;
            totalDurationExams++;
        }
        if (typeof data.avgTimePerQuestion === "number" && data.avgTimePerQuestion > 0) {
            totalAvgTime += data.avgTimePerQuestion;
            totalAvgTimeExams++;
        }

        // Per-exam score histogram (10 buckets) — powers percentile ranking
        // + avg%/attempts for the admin exam-stats dashboard (สถิติคลังข้อสอบ)
        const eid = typeof data.examId === "string" ? data.examId : "";
        if (eid && typeof data.percent === "number") {
            if (!examMap[eid]) examMap[eid] = { count: 0, buckets: new Array(10).fill(0), sumPercent: 0, attempts: 0 };
            examMap[eid].count++;
            examMap[eid].sumPercent += data.percent;
            // docs ก่อนเฟสวิเคราะห์ลึก (ก่อน 2026-07-18) ไม่มีฟิลด์ attempts → นับเป็น 1
            examMap[eid].attempts += typeof data.attempts === "number" ? data.attempts : 1;
            examMap[eid].buckets[Math.min(9, Math.max(0, Math.floor(data.percent / 10)))]++;
        }

        // Category
        const cat = data.category || "อื่นๆ";
        if (!catMap[cat]) catMap[cat] = { totalPercent: 0, count: 0 };
        if (typeof data.percent === "number") {
            catMap[cat].totalPercent += data.percent;
            catMap[cat].count++;
        }

        // Tags
        if (Array.isArray(data.tags)) {
            data.tags.forEach((tag: string) => {
                if (!tagMap[tag]) tagMap[tag] = { totalPercent: 0, count: 0 };
                if (typeof data.percent === "number") {
                    tagMap[tag].totalPercent += data.percent;
                    tagMap[tag].count++;
                }
            });
        }
    });

    const globalAvgPercent = totalExams > 0 ? Math.round(totalPercent / totalExams) : 0;
    const globalAvgDuration = totalDurationExams > 0 ? Math.round(totalDuration / totalDurationExams) : 0;
    const globalAvgTimePerQ = totalAvgTimeExams > 0 ? Math.round(totalAvgTime / totalAvgTimeExams) : 0;

    const categories = Object.entries(catMap).map(([name, d]) => ({
        name,
        avgPercent: d.count > 0 ? Math.round(d.totalPercent / d.count) : 0,
        count: d.count,
    }));

    const tags = Object.entries(tagMap).map(([name, d]) => ({
        name,
        avgPercent: d.count > 0 ? Math.round(d.totalPercent / d.count) : 0,
        count: d.count,
    }));

    // Shape stays backward-compatible: existing consumers read count+buckets;
    // avgPercent/attempts are additive (used by /admin/exam-stats).
    const perExam: Record<string, { count: number; buckets: number[]; avgPercent: number; attempts: number }> = {};
    Object.entries(examMap).forEach(([eid, d]) => {
        perExam[eid] = {
            count: d.count,
            buckets: d.buckets,
            avgPercent: d.count > 0 ? Math.round(d.sumPercent / d.count) : 0,
            attempts: d.attempts,
        };
    });

    return {
        globalAvgPercent,
        globalAvgDuration,
        globalAvgTimePerQ,
        totalExams,
        totalUsers: userIds.size,
        categories,
        tags,
        perExam,
    };
}

// Aggregates move slowly (they cover the whole result corpus), so 6h staleness
// is invisible to students while capping the scan at 4×/day instead of
// once per submit/dashboard view.
const getAveragesCached = unstable_cache(computeAverages, ["exam-averages-v1"], {
    revalidate: 21600,
});

export async function GET() {
    try {
        const data = await getAveragesCached();
        return NextResponse.json(data, {
            // Let the Vercel edge serve repeat hits without even invoking the
            // function: 1h shared cache + serve-stale-while-refreshing for a day.
            headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
        });
    } catch (error) {
        console.error("Error computing exam averages:", error);
        return NextResponse.json({ error: "Failed to compute averages" }, { status: 500 });
    }
}
