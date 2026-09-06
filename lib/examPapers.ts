import { listCollection } from "@/lib/firestoreRest";
import type { ExamPaper } from "@/types";

// ฟิลด์ + revalidate ต้องเหมือนกันทุกที่ที่เรียก เพราะ fetch-cache ของ Next
// แยกด้วย URL+body ของ request — หน้าร้านกับการ์ดหน้าแรกจึงใช้ผลอ่านก้อนเดียวกัน
// ไม่เพิ่มยอดอ่าน Firestore (เหตุผลเดียวกับที่ getHomeCountdown แชร์แคชกับโปรโมชัน)
const FIELDS = [
    "title", "description", "price", "fullPrice", "level", "category", "tags",
    "coverUrl", "previewUrl", "pageCount", "questionCount", "badge", "comingSoon",
    "hidden", "order", "createdAt",
];
const REVALIDATE = 300;

/**
 * ชุด/เอกสาร PDF ที่เปิดขายอยู่ เรียงตามลำดับที่ตั้งในหลังบ้าน
 * (ตัดชุดที่ซ่อนออกแล้ว) — ใช้ทั้งหน้าร้าน /exam-papers และการ์ดบนหน้าแรก
 */
export async function listPublicExamPapers(): Promise<ExamPaper[]> {
    try {
        const docs = await listCollection("examPapers", FIELDS, { revalidate: REVALIDATE });
        return docs
            .filter((d) => !d.hidden)
            .map((d) => ({
                id: d.id,
                title: (d.title as string) || "",
                description: (d.description as string) || "",
                price: Number(d.price ?? 0),
                fullPrice: d.fullPrice != null ? Number(d.fullPrice) : undefined,
                level: (d.level as string) || "",
                category: (d.category as string) || "",
                tags: (d.tags as string[]) || [],
                coverUrl: (d.coverUrl as string) || "",
                previewUrl: (d.previewUrl as string) || "",
                pageCount: Number(d.pageCount ?? 0),
                questionCount: Number(d.questionCount ?? 0),
                badge: (d.badge as string) || "",
                comingSoon: !!d.comingSoon,
                order: (d.order as number | undefined) ?? Number.MAX_SAFE_INTEGER,
            }))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } catch (e) {
        console.error("Error fetching exam papers:", e);
        return [];
    }
}
