"use client";
import { useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, increment } from "firebase/firestore";

export default function VisitorTracker() {
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        const recordVisit = async () => {
            // Use 'Asia/Bangkok' time to ensure consistency with the user's timezone
            const now = new Date();
            const dateInThailand = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
            const today = dateInThailand.toISOString().split("T")[0]; // YYYY-MM-DD

            const storageKey = `visited_${today}`;

            // Check if already counted in this session
            if (!sessionStorage.getItem(storageKey)) {
                sessionStorage.setItem(storageKey, "true");

                try {
                    const statsRef = doc(db, "stats", "daily_visits");

                    // Update stats
                    await setDoc(statsRef, {
                        [today]: increment(1),
                        total_visits: increment(1) // Global Total
                    }, { merge: true });

                } catch (error) {
                    console.error("Error recording visit:", error);
                }
            }
        };

        recordVisit();
    }, []);

    return null;
}
