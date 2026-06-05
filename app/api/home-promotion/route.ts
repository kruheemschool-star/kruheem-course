import { NextResponse } from "next/server";
import { getDocument } from "@/lib/firestoreRest";

// ISR feed for the homepage promotion banner. Reads the single config doc
// settings/homepage_promotion via the Firestore REST API (server-safe — the
// client SDK is unreliable in Vercel route handlers). Returns { promo: null }
// when disabled / missing / on error, so the homepage renders nothing and the
// hero stays at the top. Short TTL so edits show up within ~a minute.
export const revalidate = 60;

export async function GET() {
    try {
        const doc = await getDocument("settings/homepage_promotion", { revalidate: 60 });
        if (!doc || doc.enabled !== true) {
            return NextResponse.json({ promo: null });
        }
        return NextResponse.json({
            promo: {
                enabled: true,
                imageUrl: (doc.imageUrl as string) || "",
                title: (doc.title as string) || "",
                subtitle: (doc.subtitle as string) || "",
                ctaText: (doc.ctaText as string) || "",
                ctaLink: (doc.ctaLink as string) || "",
            },
        });
    } catch (error) {
        console.error("Error fetching home promotion:", error);
        return NextResponse.json({ promo: null });
    }
}
