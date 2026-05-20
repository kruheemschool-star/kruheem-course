import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// 30 minute ISR cache. Stats are aggregated across all users so a longer TTL is fine.
export const revalidate = 1800;

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
 *  - revalidate=1800 reduces re-aggregation frequency 6x vs the old 5-minute cache.
 *  - We never return user ids or any per-user data, only aggregates.
 */
export async function GET() {
    try {
        const resultsSnap = await adminDb.collectionGroup("examResults").get();

        let totalPercent = 0;
        let totalExams = 0;
        let totalDuration = 0;
        let totalDurationExams = 0;
        let totalAvgTime = 0;
        let totalAvgTimeExams = 0;
        const catMap: Record<string, { totalPercent: number; count: number }> = {};
        const tagMap: Record<string, { totalPercent: number; count: number }> = {};
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

        return NextResponse.json({
            globalAvgPercent,
            globalAvgDuration,
            globalAvgTimePerQ,
            totalExams,
            totalUsers: userIds.size,
            categories,
            tags,
        });
    } catch (error) {
        console.error("Error computing exam averages:", error);
        return NextResponse.json({ error: "Failed to compute averages" }, { status: 500 });
    }
}
