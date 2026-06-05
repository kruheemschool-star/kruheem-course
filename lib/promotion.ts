import { getDocument } from "@/lib/firestoreRest";
import type { PromotionData } from "@/components/home/PromotionBanner";

const PROMO_DOC = "settings/homepage_promotion";

/**
 * Single source of truth for "should the homepage promotion show right now, and
 * with what content". Reads settings/homepage_promotion via the Firestore REST
 * API (server-safe) and returns the promo data, or null when it should NOT show:
 *   - disabled (enabled !== true)
 *   - empty (no title, subtitle or image) — avoids an empty card
 *   - outside its scheduled date window (startDate / endDate)
 * Used by both the homepage server component and /api/home-promotion so the two
 * never disagree.
 */
export async function getActivePromotion(): Promise<PromotionData | null> {
    try {
        const doc = await getDocument(PROMO_DOC, { revalidate: 30 });
        if (!doc || doc.enabled !== true) return null;

        const title = (doc.title as string) || "";
        const subtitle = (doc.subtitle as string) || "";
        const imageUrl = (doc.imageUrl as string) || "";
        if (!title && !subtitle && !imageUrl) return null; // never show an empty card

        const startDate = (doc.startDate as string) || "";
        const endDate = (doc.endDate as string) || "";
        const now = Date.now();
        if (startDate) {
            const s = new Date(startDate).getTime();
            if (Number.isFinite(s) && now < s) return null; // not started yet
        }
        if (endDate) {
            // A date-only value (YYYY-MM-DD) is treated as inclusive of that whole day.
            const e = new Date(endDate).getTime() + (endDate.length <= 10 ? 86_400_000 - 1 : 0);
            if (Number.isFinite(e) && now > e) return null; // already ended
        }

        return {
            enabled: true,
            imageUrl,
            title,
            subtitle,
            ctaText: (doc.ctaText as string) || "",
            ctaLink: (doc.ctaLink as string) || "",
            theme: (doc.theme as string) || "peach",
            bgStyle: doc.bgStyle === "glass" ? "glass" : "solid",
            badgeText: doc.badgeText as string | undefined,
            startDate,
            endDate,
            showCountdown: doc.showCountdown as boolean | undefined,
            version: (doc.updatedAt as string) || "",
        };
    } catch (e) {
        console.error("getActivePromotion error:", e);
        return null;
    }
}
