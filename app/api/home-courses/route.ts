import { NextResponse } from "next/server";
import { listCollection } from "@/lib/firestoreRest";

// ISR metadata-only feed for the homepage course grid. Returns only the
// 6 fields app/page.tsx renders ({id,title,desc,category,image,price,
// fullPrice}) instead of every course's full document. No limit — the
// page groups every course by category into a full grid.
//
// Reads via the Firestore REST API (see lib/firestoreRest). The Firebase
// client SDK was resolving with an EMPTY snapshot for `courses` inside this
// route handler on Vercel, which got frozen into the ISR cache and blanked
// the grid even though all courses exist and are publicly readable.
export const revalidate = 300;

export async function GET() {
    try {
        const docs = await listCollection(
            "courses",
            ["title", "desc", "category", "image", "price", "fullPrice"],
            { revalidate: 300 }
        );
        const courses = docs.map((d) => ({
            id: d.id,
            title: (d.title as string) || "",
            desc: (d.desc as string) || "",
            category: (d.category as string) || "",
            image: (d.image as string) || "",
            price: (d.price as number | undefined) ?? 0,
            fullPrice: (d.fullPrice as number | undefined) ?? 0,
        }));
        return NextResponse.json({ courses });
    } catch (error) {
        console.error("Error fetching home courses:", error);
        return NextResponse.json({ courses: [] }, { status: 500 });
    }
}
