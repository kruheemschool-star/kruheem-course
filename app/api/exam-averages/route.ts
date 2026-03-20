import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Cache for 5 minutes

/**
 * API Route: GET /api/exam-averages
 * Aggregates exam results from ALL users to compute global averages.
 * Returns: overall average %, per-category averages, average time per question.
 */
export async function GET() {
    try {
        // Get all users
        const usersSnap = await getDocs(collection(db, "users"));
        
        let totalPercent = 0;
        let totalExams = 0;
        let totalDuration = 0;
        let totalDurationExams = 0;
        let totalAvgTime = 0;
        let totalAvgTimeExams = 0;
        const catMap: Record<string, { totalPercent: number; count: number }> = {};
        const tagMap: Record<string, { totalPercent: number; count: number }> = {};

        // Iterate through each user's examResults
        const userIds = usersSnap.docs.map(d => d.id);
        
        // Process in batches to avoid overwhelming
        for (const uid of userIds) {
            try {
                const resultsSnap = await getDocs(collection(db, "users", uid, "examResults"));
                resultsSnap.docs.forEach(doc => {
                    const data = doc.data();
                    if (typeof data.percent === 'number') {
                        totalPercent += data.percent;
                        totalExams++;
                    }
                    
                    // Duration tracking
                    if (typeof data.durationSeconds === 'number' && data.durationSeconds > 0) {
                        totalDuration += data.durationSeconds;
                        totalDurationExams++;
                    }
                    if (typeof data.avgTimePerQuestion === 'number' && data.avgTimePerQuestion > 0) {
                        totalAvgTime += data.avgTimePerQuestion;
                        totalAvgTimeExams++;
                    }

                    // Category
                    const cat = data.category || "อื่นๆ";
                    if (!catMap[cat]) catMap[cat] = { totalPercent: 0, count: 0 };
                    if (typeof data.percent === 'number') {
                        catMap[cat].totalPercent += data.percent;
                        catMap[cat].count++;
                    }

                    // Tags
                    if (Array.isArray(data.tags)) {
                        data.tags.forEach((tag: string) => {
                            if (!tagMap[tag]) tagMap[tag] = { totalPercent: 0, count: 0 };
                            if (typeof data.percent === 'number') {
                                tagMap[tag].totalPercent += data.percent;
                                tagMap[tag].count++;
                            }
                        });
                    }
                });
            } catch {
                // Skip users with no results or permission issues
            }
        }

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
            totalUsers: userIds.length,
            categories,
            tags,
        });
    } catch (error) {
        console.error("Error computing exam averages:", error);
        return NextResponse.json({ error: "Failed to compute averages" }, { status: 500 });
    }
}
