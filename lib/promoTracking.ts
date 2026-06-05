import { doc, setDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getDateString } from "@/lib/activityTracking";

// Where homepage promotion click stats live. Covered by the existing public
// /stats/{statId} rule (same as the visitor counter), so no rules change.
export const PROMO_STATS_DOC = "promo_homepage";

/**
 * Fire-and-forget: count one click on the homepage promotion CTA.
 * Writes total_clicks + a per-day bucket. Never throws (analytics must not
 * block navigation).
 */
export async function logPromoClick(): Promise<void> {
    try {
        const today = getDateString();
        await setDoc(
            doc(db, "stats", PROMO_STATS_DOC),
            { total_clicks: increment(1), [`${today}_clicks`]: increment(1) },
            { merge: true },
        );
    } catch (e) {
        console.error("logPromoClick error:", e);
    }
}
