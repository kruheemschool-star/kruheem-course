import ClassicHome from "./ClassicHome";
import StudyDesk from "@/components/desk/StudyDesk";
import { SHOW_DESK_HOME } from "@/lib/constants";
import { getDeskHomeData } from "@/lib/deskHomeData";

// 5 นาที (เดิม 30 วิ): หน้านี้ต้อง re-render เป็นระยะเพราะแบนเนอร์โปรโมชัน
// คัดกรองด้วย startDate/endDate ณ เวลา render (lib/promotion.ts) — โปรตั้งเวลา
// ล่วงหน้า/หมดเขตต้องสลับเองแม้ไม่มีใครกดบันทึก การ re-render ใช้ข้อมูลจาก
// fetch-cache (1 ชม. + tag) จึงแทบไม่เกิด Firestore read เพิ่ม
export const revalidate = 300;

// หน้าแรกมี 2 แบบ สลับด้วยสวิตช์ SHOW_DESK_HOME (lib/constants.ts):
// หน้าเลื่อนยาวแบบเดิม (ClassicHome — ใช้ร่วมกับ /classic) หรือโต๊ะเรียน 3 มิติ
export default async function HomePage() {
  if (SHOW_DESK_HOME) return <StudyDesk data={await getDeskHomeData()} classicUrl="/classic" />;
  return <ClassicHome />;
}
