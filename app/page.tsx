import HomeClient from "./HomeClient";
import { getActivePromotion } from "@/lib/promotion";
import { getDocument } from "@/lib/firestoreRest";
import type { CountdownConfig } from "@/components/home/ExamCountdownHero";

// Server component: read the promotion on the server so the homepage HTML
// already knows whether to show the banner (no layout shift / hero "jump"),
// then hand off to the interactive client homepage. ISR-cached ~30s so admin
// promo edits appear on the live site quickly.
export const revalidate = 30;

// การ์ดนับถอยหลัง: อ่าน settings/homeCountdown ฝั่งเซิร์ฟเวอร์ (data cache 5 นาที)
// แล้วส่งเป็น prop — ตัด getDoc ฝั่ง client ที่เคยกิน 1 Firestore read ทุกวิวหน้าแรก
async function getHomeCountdown(): Promise<Partial<CountdownConfig> | null> {
  try {
    const doc = await getDocument("settings/homeCountdown", { revalidate: 300 });
    return doc as unknown as Partial<CountdownConfig> | null;
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
