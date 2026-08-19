import HomeClient from "./HomeClient";
import { getActivePromotion } from "@/lib/promotion";
import { getDocument } from "@/lib/firestoreRest";
import { PUBLIC_SETTINGS_DOC, PUBLIC_SETTINGS_REVALIDATE, PUBLIC_SETTINGS_TAGS } from "@/lib/publicSettings";
import type { CountdownConfig } from "@/components/home/ExamCountdownHero";

// Server component: read the promotion on the server so the homepage HTML
// already knows whether to show the banner (no layout shift / hero "jump"),
// then hand off to the interactive client homepage. ISR-cached ~30s so admin
// promo edits appear on the live site quickly.
// 5 นาที (เดิม 30 วิ): หน้านี้ต้อง re-render เป็นระยะเพราะแบนเนอร์โปรโมชัน
// คัดกรองด้วย startDate/endDate ณ เวลา render (lib/promotion.ts) — โปรตั้งเวลา
// ล่วงหน้า/หมดเขตต้องสลับเองแม้ไม่มีใครกดบันทึก การ re-render ใช้ข้อมูลจาก
// fetch-cache (1 ชม. + tag) จึงแทบไม่เกิด Firestore read เพิ่ม
export const revalidate = 300;

// การ์ดนับถอยหลัง: อ่าน field `countdown` ใน settings/homepage_promotion ฝั่ง
// เซิร์ฟเวอร์ แล้วส่งเป็น prop — ใช้ doc เดียวกับโปรโมชัน (เหตุผลเรื่อง rules ดู
// lib/publicSettings.ts) URL+revalidate ตรงกับ getActivePromotion จึงแชร์แคช
// ไม่เพิ่มยอดอ่าน Firestore
async function getHomeCountdown(): Promise<Partial<CountdownConfig> | null> {
  try {
    const doc = await getDocument(PUBLIC_SETTINGS_DOC, { revalidate: PUBLIC_SETTINGS_REVALIDATE, tags: PUBLIC_SETTINGS_TAGS });
    return (doc?.countdown as Partial<CountdownConfig> | undefined) ?? null;
  } catch {
    return null; // การ์ดใช้ค่า default ของตัวเอง
  }
}

export default async function HomePage() {
  const [initialPromo, initialCountdown] = await Promise.all([
    getActivePromotion(),
    getHomeCountdown(),
  ]);
  return <HomeClient initialPromo={initialPromo} initialCountdown={initialCountdown} />;
}
