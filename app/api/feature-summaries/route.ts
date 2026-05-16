import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";

// ISR metadata-only feed for the homepage FeatureCarousel (summaries).
// Returns only {id,title,coverImage} so the full `content` blob isn't
// shipped to the browser. No orderBy (matches the existing summaries
// query convention — avoids any composite index).
export const revalidate = 300;

export async function GET() {
    try {
        const snapshot = await getDocs(query(collection(db, "summaries")));
        const summaries = snapshot.docs
            .map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || "",
                    coverImage: data.coverImage || "",
                    status: data.status || "",
                };
            })
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
