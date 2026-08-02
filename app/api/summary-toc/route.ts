import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { listCollection } from "@/lib/firestoreRest";

// สารบัญบทสรุป (slug/title/order เท่านั้น) สำหรับปุ่ม "บทก่อนหน้า/ถัดไป" ใน
// /summary/[slug] — เดิมหน้านั้น getDocs ทั้ง collection พร้อมเนื้อหาเต็มทุก
// บทความ (~40 reads + เนื้อหาทั้งเว็บ) ต่อการเปิด 1 ครั้ง เพื่อใช้แค่ลำดับบท
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface SummaryTocItem {
    id: string;
    slug: string;
    title: string;
}

const getSummaryToc = unstable_cache(
    async (): Promise<{ summaries: SummaryTocItem[] }> => {
        const docs = await listCollection(
            "summaries",
            ["title", "slug", "order", "status"],
            { revalidate: 300 }
        );
        const summaries = docs
            .filter((d) => (d.status as string) === "published")
            .map((d) => ({
                id: d.id,
                slug: (d.slug as string) || "",
                title: (d.title as string) || "",
                order: (d.order as number | undefined) ?? 0,
            }))
            .filter((s) => s.slug)
            .sort((a, b) => a.order - b.order)
            .map(({ id, slug, title }) => ({ id, slug, title }));
        return { summaries };
    },
    ["summary-toc-v1"],
    { revalidate: 300 }
);

export async function GET() {
    try {
        return NextResponse.json(await getSummaryToc());
    } catch (error) {
        // Fail soft: หน้าอ่านสรุปยังทำงานได้ แค่ไม่มีปุ่มบทก่อนหน้า/ถัดไป
        console.error("summary-toc failed:", error);
        return NextResponse.json({ summaries: [] }, { status: 200 });
    }
}
