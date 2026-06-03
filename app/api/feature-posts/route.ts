import { NextResponse } from "next/server";
import { listCollection } from "@/lib/firestoreRest";

// ISR metadata-only feed for the homepage FeatureCarousel (posts). Returns
// only {id,title,coverImage} so a post's multi-MB `content` blob never
// reaches the browser.
//
// Reads via the Firestore REST API (see lib/firestoreRest). The Firebase
// client SDK was resolving with an EMPTY snapshot for `posts` inside this
// route handler on Vercel, which got frozen into the ISR cache, so the
// carousel lost its post slides.
export const revalidate = 300;

export async function GET() {
    try {
        const docs = await listCollection(
            "posts",
            ["title", "coverImage", "status", "createdAt"],
            { revalidate: 300 }
        );
        const posts = docs
            .map((d) => ({
                id: d.id,
                title: (d.title as string) || "",
                coverImage: (d.coverImage as string) || "",
                status: (d.status as string) || "published",
                createdAt: (d.createdAt as string) || "",
            }))
            .filter((p) => p.status === "published")
            // createdAt is an ISO 8601 string -> lexicographic compare == chronological
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 12)
            .map(({ id, title, coverImage }) => ({ id, title, coverImage }));
        return NextResponse.json({ posts });
    } catch (error) {
        console.error("Error fetching feature posts:", error);
        return NextResponse.json({ posts: [] }, { status: 500 });
    }
}
