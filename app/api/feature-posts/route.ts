import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

// ISR metadata-only feed for the homepage FeatureCarousel (posts).
// The Firestore client SDK has no field projection, so reading post
// docs in the browser pulls every post's full `content` blob just to
// show 6 covers. Doing that read here (server, cached) and returning
// only {id,title,coverImage} keeps the multi-MB content off the client.
export const revalidate = 300;

export async function GET() {
    try {
        const snapshot = await getDocs(
            query(collection(db, "posts"), orderBy("createdAt", "desc"))
        );
        const posts = snapshot.docs
            .map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || "",
                    coverImage: data.coverImage || "",
                    status: data.status || "published",
                };
            })
            .filter((p) => p.status === "published")
            .slice(0, 12)
            .map(({ id, title, coverImage }) => ({ id, title, coverImage }));
        return NextResponse.json({ posts });
    } catch (error) {
        console.error("Error fetching feature posts:", error);
        return NextResponse.json({ posts: [] }, { status: 500 });
    }
}
