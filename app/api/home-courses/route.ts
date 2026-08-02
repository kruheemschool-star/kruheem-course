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
// 15 นาที (เดิม 5) — คอร์สแก้ไม่บ่อย ลดรอบสแกน collection ลง 3 เท่า
export const revalidate = 900;

export async function GET() {
    try {
        const docs = await listCollection(
            "courses",
            // keywords เพิ่มมาเพื่อ RelatedCourses (จับคู่คอร์สท้ายบทสรุป) จะได้
            // ใช้ฟีดนี้ร่วมกัน แทนการ getDocs ทั้ง collection เองทุกวิว
            ["title", "desc", "category", "image", "price", "fullPrice", "keywords"],
            { revalidate: 900 }
        );
        const courses = docs.map((d) => ({
            id: d.id,
            title: (d.title as string) || "",
            desc: (d.desc as string) || "",
            category: (d.category as string) || "",
            image: (d.image as string) || "",
            price: (d.price as number | undefined) ?? 0,
            fullPrice: (d.fullPrice as number | undefined) ?? 0,
            keywords: (d.keywords as string[]) || [],
        }));
        return NextResponse.json({ courses });
    } catch (error) {
        console.error("Error fetching home courses:", error);
        return NextResponse.json({ courses: [] }, { status: 500 });
    }
}
