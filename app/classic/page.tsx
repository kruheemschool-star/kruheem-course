import type { Metadata } from "next";
import ClassicHome from "../ClassicHome";

// หน้าแรก "เวอร์ชันคลาสสิก" — ปลายทางปุ่ม "เวอร์ชันคลาสสิก" บนโต๊ะเรียน 3 มิติ
// เนื้อหาเหมือนหน้าแรกเดิมทุกอย่าง จึงไม่ให้ Google เก็บซ้ำ (ลิงก์ในหน้ายังตามต่อได้)
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export const revalidate = 300;

export default function ClassicPage() {
  return <ClassicHome />;
}
