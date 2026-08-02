import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { listCollection } from "@/lib/firestoreRest";

// ฟีดรีวิวสำหรับหน้า /reviews — เดิมหน้านั้น getDocs ตรงจาก client สูงสุด 200
// เอกสารต่อการเปิด 1 ครั้ง (ใครก็ได้ ไม่ล็อกอิน) ตรงนี้อ่านฝั่งเซิร์ฟเวอร์ครั้ง
// เดียวต่อชั่วโมงแล้วแจกจาก cache แทน · รูปแบบ createdAt แปลงกลับเป็น
// { seconds } ให้ตรงกับที่หน้าเดิมใช้ (client SDK คืน Timestamp)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const getReviewsList = unstable_cache(
    async () => {
        const docs = await listCollection(
            "reviews",
            [
                "userName", "userPhoto", "rating", "comment", "createdAt",
                "matchLevel", "isHidden", "courseName", "courseId",
                "featured", "helpfulCount",
            ],
            { revalidate: 3600 }
        );
        const reviews = docs
            .map((d) => {
                const iso = d.createdAt as string | undefined;
                const seconds = iso ? Math.floor(Date.parse(iso) / 1000) : 0;
                return {
                    id: d.id,
                    userName: (d.userName as string) || "",
                    userPhoto: (d.userPhoto as string) || "",
                    rating: (d.rating as number | undefined) ?? 0,
                    comment: (d.comment as string) || "",
                    createdAt: seconds ? { seconds } : null,
                    matchLevel: (d.matchLevel as string) || "",
                    isHidden: (d.isHidden as boolean) || false,
                    courseName: (d.courseName as string) || "",
                    courseId: (d.courseId as string) || "",
                    featured: (d.featured as boolean) || false,
                    helpfulCount: (d.helpfulCount as number | undefined) ?? 0,
                    _sort: seconds,
                };
            })
            .sort((a, b) => b._sort - a._sort)
            .slice(0, 200)
            .map(({ _sort, ...rest }) => rest);
        return { reviews };
    },
    ["reviews-list-v1"],
    { revalidate: 3600 }
);

export async function GET() {
    try {
        return NextResponse.json(await getReviewsList());
    } catch (error) {
        console.error("reviews-list failed:", error);
        return NextResponse.json({ reviews: [] }, { status: 200 });
    }
}
