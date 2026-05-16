import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

// ISR: cache 5 minutes. The Firestore client SDK has no field projection,
// so reading exam docs always transfers the full `questions` blob. Doing
// that read here (server, cached) instead of in FeatureCarousel (client,
// every homepage load) keeps the ~8 MB off the user's connection — the
// client only ever receives the tiny { id, title, coverImage } list.
export const revalidate = 300;

// Metadata-only feed for the homepage FeatureCarousel.
// Same query/order the carousel used before (orderBy createdAt asc); no
// `hidden` filter — the carousel never filtered hidden, so omitting it
// keeps the rendered output byte-identical.
export async function GET() {
    try {
        const snapshot = await getDocs(
            query(collection(db, "exams"), orderBy("createdAt", "asc"))
        );

        const exams = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title || "",
                coverImage: data.coverImage || "",
            };
        });

        return NextResponse.json({ exams });
    } catch (error) {
        console.error("Error fetching feature exams:", error);
        return NextResponse.json({ exams: [] }, { status: 500 });
    }
}
