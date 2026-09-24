import { getDocument } from "@/lib/firestoreRest";
import { PUBLIC_SETTINGS_DOC, PUBLIC_SETTINGS_REVALIDATE, PUBLIC_SETTINGS_TAGS } from "@/lib/publicSettings";
import type { CountdownConfig } from "@/components/home/ExamCountdownHero";

// การ์ดนับถอยหลัง: อ่าน field `countdown` ใน settings/homepage_promotion ฝั่ง
// เซิร์ฟเวอร์ แล้วส่งเป็น prop — ใช้ doc เดียวกับโปรโมชัน (เหตุผลเรื่อง rules ดู
// lib/publicSettings.ts) URL+revalidate ตรงกับ getActivePromotion จึงแชร์แคช
// ไม่เพิ่มยอดอ่าน Firestore
// (ย้ายมาจาก app/page.tsx เพื่อใช้ร่วมกับหน้าโต๊ะเรียน 3 มิติ)
export async function getHomeCountdown(): Promise<Partial<CountdownConfig> | null> {
  try {
    const doc = await getDocument(PUBLIC_SETTINGS_DOC, { revalidate: PUBLIC_SETTINGS_REVALIDATE, tags: PUBLIC_SETTINGS_TAGS });
    return (doc?.countdown as Partial<CountdownConfig> | undefined) ?? null;
  } catch {
    return null; // การ์ดใช้ค่า default ของตัวเอง
  }
}
