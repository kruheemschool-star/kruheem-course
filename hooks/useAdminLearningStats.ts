import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection, getDocs, query, where, doc, getDoc,
    collectionGroup, orderBy, limit, Timestamp
} from "firebase/firestore";

// --- Interfaces ---
export interface CourseCompletionData {
    courseId: string;
    title: string;
    totalLessons: number;
    totalStudents: number;
    completedStudents: number; // students who finished 100%
    avgProgress: number; // average % across all students
}

export interface EngagingLesson {
    lessonId: string;
    title: string;
    courseId: string;
    courseTitle: string;
    completionCount: number;
}

export interface DropOffPoint {
    courseId: string;
    courseTitle: string;
    lessonTitle: string;
    lessonIndex: number;
    totalLessons: number;
    studentsReachedHere: number;
    studentsTotal: number;
    dropOffPercent: number;
}

export interface ActiveStudent {
    userId: string;
    name: string;
    email: string;
    activeDays: number;
    lessonsCompleted: number;
    lastActive: Date | null;
    streak: number;
}

export interface LearningStatsResult {
    loading: boolean;
    overallCompletionRate: number;
    courseCompletionRates: CourseCompletionData[];
    averageActiveDays: number;
    activeStudentsTrend: { date: string; count: number }[];
    mostEngagingLessons: EngagingLesson[];
    dropOffPoints: DropOffPoint[];
    topActiveStudents: ActiveStudent[];
}

// Helper: get date string
function getDateStr(d: Date): string {
    return d.toISOString().split('T')[0];
}

// Helper: get last N days as strings
function getLastNDays(n: number): string[] {
    const days: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(getDateStr(d));
    }
    return days;
}

// Helper: process array in batches to avoid overwhelming Firestore
async function processBatch<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(fn));
        results.push(...batchResults);
    }
    return results;
}

export const useAdminLearningStats = () => {
    const [loading, setLoading] = useState(true);
    const [overallCompletionRate, setOverallCompletionRate] = useState(0);
    const [courseCompletionRates, setCourseCompletionRates] = useState<CourseCompletionData[]>([]);
    const [averageActiveDays, setAverageActiveDays] = useState(0);
    const [activeStudentsTrend, setActiveStudentsTrend] = useState<{ date: string; count: number }[]>([]);
    const [mostEngagingLessons, setMostEngagingLessons] = useState<EngagingLesson[]>([]);
    const [dropOffPoints, setDropOffPoints] = useState<DropOffPoint[]>([]);
    const [topActiveStudents, setTopActiveStudents] = useState<ActiveStudent[]>([]);

    useEffect(() => {
        fetchLearningStats();
    }, []);

    const fetchLearningStats = async () => {
        try {
            // 1. Get all approved enrollments
            const enrollSnap = await getDocs(
                query(collection(db, "enrollments"), where("status", "==", "approved"))
            );
            const enrollments = enrollSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

            // 2. Get unique courses and their lesson counts
            const courseIds = [...new Set(enrollments.map(e => e.courseId).filter(Boolean))];
            const courseMap: Record<string, { title: string; lessonIds: string[]; lessonTitles: Record<string, string>; lessonOrder: string[] }> = {};

            // Fetch courses in batches of 5 to avoid overwhelming Firestore
            await processBatch(courseIds, 5, async (courseId) => {
                try {
                    // Fetch course info AND lessons in parallel (2 queries at once instead of sequential)
                    const [courseDoc, lessonsSnap] = await Promise.all([
                        getDoc(doc(db, "courses", courseId)),
                        getDocs(collection(db, "courses", courseId, "lessons")),
                    ]);
                    const courseTitle = courseDoc.exists() ? (courseDoc.data().title || "ไม่ระบุ") : "ไม่ระบุ";
                    const lessons = lessonsSnap.docs
                        .map(d => ({ id: d.id, ...d.data() }))
                        .filter((l: any) => l.type !== 'header' && !l.isHidden) as any[];

                    // Sort by order then createdAt
                    lessons.sort((a: any, b: any) => {
                        const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
                        const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
                        if (orderA !== orderB) return orderA - orderB;
                        return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
                    });

                    const lessonTitles: Record<string, string> = {};
                    lessons.forEach(l => { lessonTitles[l.id] = l.title || 'ไม่ระบุ'; });

                    courseMap[courseId] = {
                        title: courseTitle,
                        lessonIds: lessons.map(l => l.id),
                        lessonTitles,
                        lessonOrder: lessons.map(l => l.id)
                    };
                } catch (err) {
                    console.error(`Error fetching course ${courseId}:`, err);
                }
            });

            // 3. Get all user progress documents
            // Group enrollments by userId
            const userCourseMap: Record<string, string[]> = {};
            const userInfoMap: Record<string, { name: string; email: string }> = {};

            enrollments.forEach(e => {
                if (!e.userId) return;
                if (!userCourseMap[e.userId]) userCourseMap[e.userId] = [];
                if (!userCourseMap[e.userId].includes(e.courseId)) {
                    userCourseMap[e.userId].push(e.courseId);
                }
                if (!userInfoMap[e.userId]) {
                    userInfoMap[e.userId] = {
                        name: e.userName || 'Unknown',
                        email: e.userEmail || ''
                    };
                }
            });

            const userIds = Object.keys(userCourseMap);

            // Fetch progress for each user-course pair (in batches of 10 users)
            const progressData: { userId: string; courseId: string; completed: string[] }[] = [];

            await processBatch(userIds, 10, async (userId) => {
                const courses = userCourseMap[userId];
                for (const courseId of courses) {
                    try {
                        const progressDoc = await getDoc(doc(db, "users", userId, "progress", courseId));
                        if (progressDoc.exists()) {
                            const data = progressDoc.data();
                            progressData.push({
                                userId,
                                courseId,
                                completed: data.completed || []
                            });
                        } else {
                            progressData.push({ userId, courseId, completed: [] });
                        }
                    } catch (err) {
                        progressData.push({ userId, courseId, completed: [] });
                    }
                }
            });

            // --- COMPUTE: Completion Rates ---
            const completionRates: CourseCompletionData[] = [];
            let totalProgressSum = 0;
            let totalProgressCount = 0;

            courseIds.forEach(courseId => {
                const course = courseMap[courseId];
                if (!course || course.lessonIds.length === 0) return;

                const courseProgress = progressData.filter(p => p.courseId === courseId);
                const totalStudents = courseProgress.length;
                if (totalStudents === 0) return;

                let sumPercent = 0;
                let completedStudents = 0;

                courseProgress.forEach(p => {
                    const validCompleted = p.completed.filter(id => course.lessonIds.includes(id));
                    const percent = (validCompleted.length / course.lessonIds.length) * 100;
                    sumPercent += percent;
                    if (percent >= 100) completedStudents++;
                });

                const avgProgress = sumPercent / totalStudents;
                totalProgressSum += sumPercent;
                totalProgressCount += totalStudents;

                completionRates.push({
                    courseId,
                    title: course.title,
                    totalLessons: course.lessonIds.length,
                    totalStudents,
                    completedStudents,
                    avgProgress: Math.round(avgProgress * 10) / 10
                });
            });

            completionRates.sort((a, b) => b.totalStudents - a.totalStudents);
            const overallRate = totalProgressCount > 0 ? totalProgressSum / totalProgressCount : 0;
            setOverallCompletionRate(Math.round(overallRate * 10) / 10);
            setCourseCompletionRates(completionRates);

            // --- COMPUTE: Most Engaging Lessons ---
            const lessonCompletionCount: Record<string, { count: number; title: string; courseId: string; courseTitle: string }> = {};

            progressData.forEach(p => {
                const course = courseMap[p.courseId];
                if (!course) return;
                p.completed.forEach(lessonId => {
                    const key = `${p.courseId}__${lessonId}`;
                    if (!lessonCompletionCount[key]) {
                        lessonCompletionCount[key] = {
                            count: 0,
                            title: course.lessonTitles[lessonId] || 'ไม่ระบุ',
                            courseId: p.courseId,
                            courseTitle: course.title
                        };
                    }
                    lessonCompletionCount[key].count++;
                });
            });

            const engagingLessons = Object.entries(lessonCompletionCount)
                .map(([key, val]) => ({
                    lessonId: key.split('__')[1],
                    title: val.title,
                    courseId: val.courseId,
                    courseTitle: val.courseTitle,
                    completionCount: val.count
                }))
                .sort((a, b) => b.completionCount - a.completionCount)
                .slice(0, 10);

            setMostEngagingLessons(engagingLessons);

            // --- COMPUTE: Drop-off Points ---
            const dropOffs: DropOffPoint[] = [];

            courseIds.forEach(courseId => {
                const course = courseMap[courseId];
                if (!course || course.lessonOrder.length < 2) return;

                const courseProgress = progressData.filter(p => p.courseId === courseId);
                const totalStudents = courseProgress.length;
                if (totalStudents < 2) return;

                // For each lesson in order, count how many students completed it
                const lessonReachCounts = course.lessonOrder.map(lessonId => {
                    return courseProgress.filter(p => p.completed.includes(lessonId)).length;
                });

                // Find the biggest drop-off between consecutive lessons
                let maxDrop = 0;
                let maxDropIndex = -1;

                for (let i = 0; i < lessonReachCounts.length - 1; i++) {
                    const drop = lessonReachCounts[i] - lessonReachCounts[i + 1];
                    if (drop > maxDrop) {
                        maxDrop = drop;
                        maxDropIndex = i + 1; // The lesson where they stopped
                    }
                }

                if (maxDropIndex >= 0 && maxDrop > 0) {
                    const prevCount = lessonReachCounts[maxDropIndex - 1] || totalStudents;
                    dropOffs.push({
                        courseId,
                        courseTitle: course.title,
                        lessonTitle: course.lessonTitles[course.lessonOrder[maxDropIndex]] || `บทที่ ${maxDropIndex + 1}`,
                        lessonIndex: maxDropIndex,
                        totalLessons: course.lessonOrder.length,
                        studentsReachedHere: lessonReachCounts[maxDropIndex],
                        studentsTotal: prevCount,
                        dropOffPercent: prevCount > 0 ? Math.round(((prevCount - lessonReachCounts[maxDropIndex]) / prevCount) * 100) : 0
                    });
                }
            });

            dropOffs.sort((a, b) => b.dropOffPercent - a.dropOffPercent);
            setDropOffPoints(dropOffs.slice(0, 8));

            // --- COMPUTE: Active Students (last 14 days, max 30 users, batched) ---
            const last14Days = getLastNDays(14);
            const last14Set = new Set(last14Days);
            const studentActivityMap: Record<string, { activeDays: number; totalLessons: number; lastActive: Date | null; streak: number; dailyDates: Set<string> }> = {};

            // Limit to max 30 users to avoid too many requests
            const activityUserIds = userIds.slice(0, 30);

            // Fetch ALL activity docs per user with 1 collection query instead of 14 individual getDoc calls
            // This reduces 420 reads → 30 reads (93% reduction)
            await processBatch(activityUserIds, 10, async (userId) => {
                try {
                    const actSnap = await getDocs(collection(db, "users", userId, "activity"));
                    const activityData: { date: string; lessons: number }[] = [];

                    actSnap.docs.forEach(d => {
                        // Only include docs within last 14 days
                        if (last14Set.has(d.id)) {
                            activityData.push({
                                date: d.id,
                                lessons: d.data().lessonsCompleted || 0
                            });
                        }
                    });

                    if (activityData.length > 0) {
                        const activeDays = activityData.length;
                        const totalLessons = activityData.reduce((sum, d) => sum + d.lessons, 0);
                        const sortedDates = activityData.map(d => d.date).sort().reverse();
                        const lastActive = sortedDates.length > 0 ? new Date(sortedDates[0]) : null;

                        // Calculate streak (consecutive days ending today or yesterday)
                        let streak = 0;
                        const dateSet = new Set(sortedDates);
                        const today = getDateStr(new Date());
                        const yesterday = getDateStr(new Date(Date.now() - 86400000));

                        if (dateSet.has(today) || dateSet.has(yesterday)) {
                            const startDate = dateSet.has(today) ? today : yesterday;
                            let checkDate = new Date(startDate);
                            while (dateSet.has(getDateStr(checkDate))) {
                                streak++;
                                checkDate.setDate(checkDate.getDate() - 1);
                            }
                        }

                        studentActivityMap[userId] = {
                            activeDays,
                            totalLessons,
                            lastActive,
                            streak,
                            dailyDates: new Set(activityData.map(d => d.date))
                        };
                    }
                } catch (_) { /* ignore */ }
            });

            // Top Active Students sorted by activeDays then lessonsCompleted
            const activeStudents: ActiveStudent[] = Object.entries(studentActivityMap)
                .map(([userId, data]) => ({
                    userId,
                    name: userInfoMap[userId]?.name || 'Unknown',
                    email: userInfoMap[userId]?.email || '',
                    activeDays: data.activeDays,
                    lessonsCompleted: data.totalLessons,
                    lastActive: data.lastActive,
                    streak: data.streak
                }))
                .sort((a, b) => {
                    if (b.activeDays !== a.activeDays) return b.activeDays - a.activeDays;
                    return b.lessonsCompleted - a.lessonsCompleted;
                })
                .slice(0, 10);

            setTopActiveStudents(activeStudents);

            // Average active days per student
            const allActiveDays = Object.values(studentActivityMap).map(s => s.activeDays);
            const avgDays = allActiveDays.length > 0
                ? allActiveDays.reduce((s, d) => s + d, 0) / allActiveDays.length
                : 0;
            setAverageActiveDays(Math.round(avgDays * 10) / 10);

            // Active students trend (daily count of unique active students over last 14 days)
            const trend = last14Days.map((dateStr: string) => {
                let count = 0;
                Object.values(studentActivityMap).forEach(s => {
                    if (s.dailyDates.has(dateStr)) count++;
                });
                return { date: dateStr, count };
            });
            setActiveStudentsTrend(trend);

        } catch (error) {
            console.error("Error fetching learning stats:", error);
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        overallCompletionRate,
        courseCompletionRates,
        averageActiveDays,
        activeStudentsTrend,
        mostEngagingLessons,
        dropOffPoints,
        topActiveStudents
    };
};
