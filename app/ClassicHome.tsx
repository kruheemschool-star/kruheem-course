import HomeClient from "./HomeClient";
import ExamPapersHomeSection from "@/components/home/ExamPapersHomeSection";
import { getActivePromotion } from "@/lib/promotion";
import { listPublicExamPapers } from "@/lib/examPapers";
import { SHOW_EXAM_PAPERS_SHOP } from "@/lib/constants";
import { getHomeCountdown } from "@/lib/homeCountdown";

// หน้าแรก "เวอร์ชันคลาสสิก" (หน้าเลื่อนยาวแบบเดิม) — แยกออกมาจาก app/page.tsx
// เพื่อให้ทั้ง "/" และ "/classic" เรนเดอร์ชุดเดียวกันได้ ตอนสลับหน้าแรกเป็น
// โต๊ะเรียน 3 มิติด้วยสวิตช์ SHOW_DESK_HOME (lib/constants.ts)
// Server component: read the promotion on the server so the homepage HTML
// already knows whether to show the banner (no layout shift / hero "jump"),
// then hand off to the interactive client homepage.
export default async function ClassicHome() {
  // ร้านข้อสอบ PDF ถูกซ่อนอยู่ (lib/constants.ts) → ไม่ต้องอ่าน Firestore ทิ้งเปล่า
  const [initialPromo, initialCountdown, papers] = await Promise.all([
    getActivePromotion(),
    getHomeCountdown(),
    SHOW_EXAM_PAPERS_SHOP ? listPublicExamPapers() : Promise.resolve([]),
  ]);
  return (
    <HomeClient
      initialPromo={initialPromo}
      initialCountdown={initialCountdown}
      // เรนเดอร์ฝั่งเซิร์ฟเวอร์แล้วส่งเป็น slot — HomeClient เป็น client component
      // ถ้า import ตรงๆ การ์ดจะถูกลากเข้า client bundle ทั้งก้อน
      examPapersSection={SHOW_EXAM_PAPERS_SHOP ? <ExamPapersHomeSection papers={papers} /> : null}
    />
  );
}
