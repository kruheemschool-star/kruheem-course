import { NextResponse } from "next/server";
import { listCollection } from "@/lib/firestoreRest";

// ISR metadata-only feed for the homepage HomeReviewCarousel. Returns only
// the fields the carousel renders. Hidden reviews are filtered server-side,
// reproducing the client's `!isHidden` predicate (undefined/false -> visible,
// true -> hidden) so the visible set is unchanged.
//
// Reads via the Firestore REST API (see lib/firestoreRest) rather than the
// Firebase client SDK, which is unreliable inside Vercel route handlers.
export const revalidate = 300;

export async function GET() {
    try {
        const docs = await listCollection(
            "reviews",
            ["userName", "userPhoto", "rating", "comment", "courseName", "isHidden", "createdAt"],
            { revalidate: 300 }
        );
        const reviews = docs
            .map((d) => ({
                id: d.id,
                userName: (d.userName as string) || "",
                userPhoto: (d.userPhoto as string) || "",
                rating: (d.rating as number | undefined) ?? 0,
                comment: (d.comment as string) || "",
                courseName: (d.courseName as string) || "",
                isHidden: d.isHidden === true,
                createdAt: (d.createdAt as string) || "",
            }))
            .filter((r) => !r.isHidden)
            // createdAt is an ISO 8601 string -> lexicographic compare == chronological
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 60)
            .map(({ id, userName, userPhoto, rating, comment, courseName }) => ({
                id,
                userName,
                userPhoto,
                rating,
                comment,
                courseName,
            }));
        return NextResponse.json({ reviews });
    } catch (error) {
        console.error("Error fetching home reviews:", error);
        return NextResponse.json({ reviews: [] }, { status: 500 });
    }
}
