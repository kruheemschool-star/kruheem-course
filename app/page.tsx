import HomeClient from "./HomeClient";
import { getActivePromotion } from "@/lib/promotion";
import { getDocument } from "@/lib/firestoreRest";
import { PUBLIC_SETTINGS_DOC, PUBLIC_SETTINGS_REVALIDATE } from "@/lib/publicSettings";
import type { CountdownConfig } from "@/components/home/ExamCountdownHero";

// Server component: read the promotion on the server so the homepage HTML
// already knows whether to show the banner (no layout shift / hero "jump"),
// then hand off to the interactive client homepage. ISR-cached ~30s so admin
// promo edits appear on the live site quickly.
export const revalidate = 30;

// การ์ดนับถอยหลัง: อ่าน field `countdown` ใน settings/homepage_promotion ฝั่ง
// เซิร์ฟเวอร์ แล้วส่งเป็น prop — ใช้ doc เดียวกับโปรโมชัน (เหตุผลเรื่อง rules ดู
// lib/publicSettings.ts) URL+revalidate ตรงกับ getActivePromotion จึงแชร์แคช
// ไม่เพิ่มยอดอ่าน Firestore
async function getHomeCountdown(): Promise<Partial<CountdownConfig> | null> {
  try {
    const doc = await getDocument(PUBLIC_SETTINGS_DOC, { revalidate: PUBLIC_SETTINGS_REVALIDATE });
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
