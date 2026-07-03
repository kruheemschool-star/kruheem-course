import { NextResponse } from "next/server";
import { listCollection } from "@/lib/firestoreRest";

// ISR: cache 1 hour. Reads via the Firestore REST API with server-side
// field projection (mask.fieldPaths), so each revalidation transfers only
// { title, coverImage, createdAt } per exam instead of the full documents
// with their multi-MB `questions` arrays (the client SDK used here before
// had no projection and pulled ~8 MB every refresh). The client keeps
// receiving the exact same tiny { id, title, coverImage } list.
//
// 1 hour (not 5 min) is safe because admin exam changes bust this cache
// on-demand: /api/revalidate-exams calls revalidateTag("exams-feed") +
// revalidatePath("/api/feature-exams"), so edits still appear instantly.
export const revalidate = 3600;

// Metadata-only feed for the homepage FeatureCarousel.
// Ordering matches the previous Firestore query (orderBy createdAt asc),
// including its behavior of excluding docs that have no createdAt field.
// No `hidden` filter — the carousel never filtered hidden, so omitting it
// keeps the rendered output byte-identical.
export async function GET() {
    try {
        const docs = await listCollection(
            "exams",
            ["title", "coverImage", "createdAt"],
            { revalidate: 3600, tags: ["exams-feed"] }
        );

        const exams = docs
            .filter((d) => d.createdAt != null)
            .map((d) => ({
                id: d.id,
                title: (d.title as string) || "",
                coverImage: (d.coverImage as string) || "",
                // REST returns timestamps as ISO 8601 strings (same as exam-search).
                createdAtMs: d.createdAt ? new Date(String(d.createdAt)).getTime() || 0 : 0,
            }))
            .sort((a, b) => a.createdAtMs - b.createdAtMs)
            .map(({ createdAtMs, ...rest }) => rest);

        return NextResponse.json({ exams });
    } catch (error) {
        console.error("Error fetching feature exams:", error);
        return NextResponse.json({ exams: [] }, { status: 500 });
    }
}
