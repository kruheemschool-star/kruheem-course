import { doc, setDoc, getDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Get date string in YYYY-MM-DD format
 */
export function getDateString(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
}

/**
 * Get array of last N days in YYYY-MM-DD format (most recent last)
 */
export function getLast7Days(): string[] {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(getDateString(date));
    }
    return days;
}

/**
 * Log learning activity when a lesson is completed
 * Stores: users/{uid}/activity/{YYYY-MM-DD}
 */
export async function logLearningActivity(userId: string): Promise<void> {
    if (!userId) return;

    const dateStr = getDateString();
    const activityRef = doc(db, 'users', userId, 'activity', dateStr);

    try {
        const activitySnap = await getDoc(activityRef);

        if (activitySnap.exists()) {
            // Increment lesson count for today
            await setDoc(activityRef, {
                lessonsCompleted: increment(1),
                lastUpdated: new Date(),
            }, { merge: true });
        } else {
            // Create new activity record for today
            await setDoc(activityRef, {
                lessonsCompleted: 1,
                date: dateStr,
                createdAt: new Date(),
                lastUpdated: new Date(),
            });
        }
    } catch (error) {
        console.error('Error logging learning activity:', error);
    }
}

/**
 * Fetch weekly activity data (last 7 days)
 * Returns array of lesson counts [day1, day2, ..., day7]
 */
export async function fetchWeeklyActivity(userId: string): Promise<number[]> {
    if (!userId) return [0, 0, 0, 0, 0, 0, 0];

    const days = getLast7Days();
    const activityPromises = days.map(async (dateStr) => {
        const activityRef = doc(db, 'users', userId, 'activity', dateStr);
        const activitySnap = await getDoc(activityRef);

        if (activitySnap.exists()) {
            return activitySnap.data().lessonsCompleted || 0;
        }
        return 0;
    });

    try {
        return await Promise.all(activityPromises);
    } catch (error) {
        console.error('Error fetching weekly activity:', error);
        return [0, 0, 0, 0, 0, 0, 0];
    }
}
