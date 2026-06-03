import { NextResponse } from "next/server";
import { listCollection } from "@/lib/firestoreRest";

// ISR metadata-only feed for the homepage FeatureCarousel (summaries).
// Returns only {id,title,coverImage} so the full `content` blob isn't
// shipped to the browser. No ordering (matches the existing summaries
// convention — avoids any composite index).
//
// Reads via the Firestore REST API (see lib/firestoreRest) rather than the
// Firebase client SDK, which is unreliable inside Vercel route handlers.
export const revalidate = 300;

export async function GET() {
    try {
        const docs = await listCollection(
            "summaries",
            ["title", "coverImage", "status"],
            { revalidate: 300 }
        );
        const summaries = docs
            .map((d) => ({
                id: d.id,
                title: (d.title as string) || "",
                coverImage: (d.coverImage as string) || "",
                status: (d.status as string) || "",
            }))
            // Preserve the exact current carousel filter (published or legacy no-status)
            .filter((s) => s.status === "published" || !s.status)
            .slice(0, 12)
            .map(({ id, title, coverImage }) => ({ id, title, coverImage }));
        return NextResponse.json({ summaries });
    } catch (error) {
        console.error("Error fetching feature summaries:", error);
        return NextResponse.json({ summaries: [] }, { status: 500 });
    }
}
