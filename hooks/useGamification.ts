'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, doc, getDoc, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUserAuth } from '@/context/AuthContext';
import {
    BadgeRank,
    BadgeInfo,
    UserGamificationProgress,
    getDynamicBadgeThresholds
} from '@/types/gamification';

interface CourseVideoProgress {
    courseId: string;
    courseTitle: string;
    totalVideos: number;
    completedVideos: number;
    isComplete: boolean;
}

export function useGamification() {
    const { user } = useUserAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [courseProgress, setCourseProgress] = useState<CourseVideoProgress[]>([]);
    const [totalCourses, setTotalCourses] = useState(0);

    // Fetch video progress for all enrolled courses
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchProgress = async () => {
            try {
                setLoading(true);

                // 1. Get user's enrollments (approved only)
                const enrollmentsQuery = query(
                    collection(db, 'enrollments'),
                    where('userId', '==', user.uid),
                    where('status', '==', 'approved')
                );
                const enrollmentsSnap = await getDocs(enrollmentsQuery);
                const enrolledCourseIds = enrollmentsSnap.docs.map(d => d.data().courseId);

                if (enrolledCourseIds.length === 0) {
                    setCourseProgress([]);
                    setTotalCourses(0);
                    setLoading(false);
                    return;
                }

                // 2. Get all courses count (for total badge thresholds)
                const allCoursesSnap = await getDocs(collection(db, 'courses'));
                setTotalCourses(allCoursesSnap.size);

                // 3. Fetch lessons for enrolled courses (VIDEO type only)
                const lessonsQuery = query(collectionGroup(db, 'lessons'));
                const lessonsSnap = await getDocs(lessonsQuery);

                const videoLessonsByCourse: Record<string, { id: string; title: string }[]> = {};
                lessonsSnap.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    const courseId = docSnap.ref.parent.parent?.id;

                    // Only count VIDEO lessons
                    if (courseId && enrolledCourseIds.includes(courseId) && data.type === 'video') {
                        if (!videoLessonsByCourse[courseId]) {
                            videoLessonsByCourse[courseId] = [];
                        }
                        videoLessonsByCourse[courseId].push({ id: docSnap.id, title: data.title });
                    }
                });

                // 4. Fetch user's progress for each course
                const progressPromises = enrolledCourseIds.map(async (courseId) => {
                    const progressRef = doc(db, 'users', user.uid, 'progress', courseId);
                    const progressSnap = await getDoc(progressRef);

                    // Get course title
                    const courseDoc = await getDoc(doc(db, 'courses', courseId));
                    const courseTitle = courseDoc.data()?.title || 'Unknown Course';

                    const videoLessons = videoLessonsByCourse[courseId] || [];
                    const totalVideos = videoLessons.length;

                    if (progressSnap.exists()) {
                        const completedIds: string[] = progressSnap.data().completed || [];
                        // Only count completed VIDEO lessons
                        const completedVideos = completedIds.filter(id =>
                            videoLessons.some(v => v.id === id)
                        ).length;

                        return {
                            courseId,
                            courseTitle,
                            totalVideos,
                            completedVideos,
                            isComplete: totalVideos > 0 && completedVideos >= totalVideos,
                        };
                    }

                    return {
                        courseId,
                        courseTitle,
                        totalVideos,
                        completedVideos: 0,
                        isComplete: false,
                    };
                });

                const results = await Promise.all(progressPromises);
                setCourseProgress(results);

            } catch (err) {
                console.error('Error fetching gamification progress:', err);
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchProgress();
    }, [user]);

    // Calculate gamification stats
    const gamificationData = useMemo((): UserGamificationProgress => {
        const completedCourseIds = courseProgress
            .filter(c => c.isComplete)
            .map(c => c.courseId);

        const completedCount = completedCourseIds.length;
        const badges = getDynamicBadgeThresholds(totalCourses);

        // Find current rank
        let currentRank: BadgeRank = 'bronze';
        for (let i = badges.length - 1; i >= 0; i--) {
            if (completedCount >= badges[i].minCourses) {
                currentRank = badges[i].rank;
                break;
            }
        }

        // Find next rank
        const currentIndex = badges.findIndex(b => b.rank === currentRank);
        const nextBadge = badges[currentIndex + 1] || null;

        // Calculate progress to next rank
        let progressToNext = 0;
        let coursesNeededForNext = 0;
        if (nextBadge) {
            const prevThreshold = badges[currentIndex].minCourses;
            const nextThreshold = nextBadge.minCourses;
            const range = nextThreshold - prevThreshold;
            const progress = completedCount - prevThreshold;
            progressToNext = range > 0 ? Math.round((progress / range) * 100) : 0;
            coursesNeededForNext = nextThreshold - completedCount;
        } else {
            progressToNext = 100; // Legendary achieved!
        }

        return {
            completedCourses: completedCount,
            totalCourses,
            currentRank,
            nextRank: nextBadge?.rank || null,
            progressToNext,
            coursesNeededForNext,
            completedCourseIds,
        };
    }, [courseProgress, totalCourses]);

    // Get badges with dynamic thresholds
    const badges = useMemo(() => {
        return getDynamicBadgeThresholds(totalCourses);
    }, [totalCourses]);

    return {
        loading,
        error,
        courseProgress,
        gamificationData,
        badges,
        totalCourses,
    };
}
