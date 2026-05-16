import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

// ISR metadata-only feed for the homepage HomeReviewCarousel.
// Returns only the fields the carousel renders. Hidden reviews are
// filtered server-side, exactly reproducing the client's
// `!((r as any).isHidden)` predicate (undefined/false -> visible,
// true -> hidden) so the visible set is unchanged.
export const revalidate = 300;

export async function GET() {
    try {
        const snapshot = await getDocs(
            query(collection(db, "reviews"), orderBy("createdAt", "desc"))
        );
        const reviews = snapshot.docs
            .map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    userName: data.userName || "",
                    userPhoto: data.userPhoto || "",
                    rating: data.rating || 0,
                    comment: data.comment || "",
                    courseName: data.courseName || "",
                    isHidden: data.isHidden === true,
                };
            })
            .filter((r) => !r.isHidden)
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
