import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

// ISR metadata-only feed for the homepage course grid. Returns only the
// 6 fields app/page.tsx renders ({id,title,desc,category,image,price,
// fullPrice}) instead of every course's full document. No limit — the
// page groups every course by category into a full grid.
export const revalidate = 300;

export async function GET() {
    try {
        const snapshot = await getDocs(
            query(collection(db, "courses"), orderBy("createdAt", "desc"))
        );
        const courses = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title || "",
                desc: data.desc || "",
                category: data.category || "",
                image: data.image || "",
                price: data.price ?? 0,
                fullPrice: data.fullPrice ?? 0,
            };
        });
        return NextResponse.json({ courses });
    } catch (error) {
        console.error("Error fetching home courses:", error);
        return NextResponse.json({ courses: [] }, { status: 500 });
    }
}
