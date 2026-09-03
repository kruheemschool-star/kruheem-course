import { listCollection } from "@/lib/firestoreRest";

export type TrustReview = {
    id: string;
    userName: string;
    userPhoto?: string;
    rating: number;
    comment: string;
    courseName?: string;
};

export type PaperTrust = {
    reviews: TrustReview[];
    reviewCount: number; // จำนวนรีวิวสาธารณะทั้งหมด (ตรงกับที่หน้า /reviews นับ)
    avgRating: number;   // คะแนนเฉลี่ยจากรีวิวสาธารณะทั้งหมด
};

const EMPTY: PaperTrust = { reviews: [], reviewCount: 0, avgRating: 0 };

// รีวิวเปลี่ยนไม่บ่อยเท่าตัวสินค้า — ยืดแคชเป็นครึ่งชั่วโมงเพื่อไม่ให้หน้าร้าน
// ยิงอ่าน 58 doc ทุก 5 นาทีโดยไม่จำเป็น (ดู [[firebase-cost-audit-round2]])
const REVALIDATE = 1800;

/**
 * เสียงผู้ปกครอง/นักเรียนจริงจาก collection `reviews` สำหรับใช้บนหน้าร้าน PDF
 *
 * สำคัญ: รีวิวพวกนี้เป็นรีวิว "คอร์ส/คลังข้อสอบ" ไม่ใช่รีวิวไฟล์ PDF รายชุด
 * ตอนแสดงผลจึงต้องติดชื่อคอร์สไว้ทุกใบ และพาดหัวว่า "เสียงจากผู้เรียนกับครูฮีม"
 * ห้ามพาดหัวทำนอง "รีวิวชุดนี้" เด็ดขาด — จะกลายเป็นการอ้างเท็จทันที
 */
export async function getPaperTrust(take = 3): Promise<PaperTrust> {
    try {
        const docs = await listCollection(
            "reviews",
            ["userName", "userPhoto", "rating", "comment", "courseName", "isHidden", "featured", "helpfulCount", "createdAt"],
            { revalidate: REVALIDATE, tags: ["reviews"] },
        );

        const pub = docs.filter((d) => !d.isHidden && Number(d.rating) > 0);
        if (pub.length === 0) return EMPTY;

        const reviewCount = pub.length;
        const avgRating = pub.reduce((s, d) => s + Number(d.rating || 0), 0) / reviewCount;

        // เลือกใบที่ "อ่านแล้วได้อะไร": ห้าดาว + ข้อความยาวพอที่จะมีเนื้อหา แต่
        // ไม่ยาวจนล้นการ์ด และให้คนที่พูดถึงข้อสอบ/การฝึกทำโจทย์ขึ้นก่อน
        // เพราะตรงกับสิ่งที่คนกำลังจะซื้อไฟล์ข้อสอบอยากรู้ที่สุด
        const relevant = (c: string) => /ข้อสอบ|โจทย์|ปริ้น|ฝึกทำ|ทำข้อสอบ|เฉลย/.test(c);
        const picked = pub
            .filter((d) => Number(d.rating) === 5)
            .map((d) => ({
                id: String(d.id),
                userName: String(d.userName || "ผู้เรียน"),
                userPhoto: String(d.userPhoto || ""),
                rating: Number(d.rating),
                comment: String(d.comment || "").trim(),
                courseName: String(d.courseName || ""),
                featured: !!d.featured,
                helpful: Number(d.helpfulCount || 0),
            }))
            .filter((r) => r.comment.length >= 30 && r.comment.length <= 260)
            .sort(
                (a, b) =>
                    Number(b.featured) - Number(a.featured) ||
                    Number(relevant(b.comment)) - Number(relevant(a.comment)) ||
                    b.helpful - a.helpful ||
                    b.comment.length - a.comment.length,
            );

        // คนเดียวกันขึ้นสองใบติดกันอ่านแล้วเหมือนรีวิวปั้ม — เอาใบที่ดีที่สุดของแต่ละคน
        const seen = new Set<string>();
        const unique = picked.filter((r) => {
            const key = r.userName.trim().toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, take);

        return {
            reviews: unique.map(({ id, userName, userPhoto, rating, comment, courseName }) => ({
                id, userName, userPhoto, rating, comment, courseName,
            })),
            reviewCount,
            avgRating,
        };
    } catch {
        // รีวิวเป็นของประกอบ ไม่ใช่ของหลัก — อ่านไม่ได้ก็ต้องไม่ทำให้ร้านล่ม
        return EMPTY;
    }
}
