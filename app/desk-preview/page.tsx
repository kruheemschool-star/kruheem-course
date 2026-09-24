import type { Metadata, Viewport } from "next";
import StudyDesk from "@/components/desk/StudyDesk";
import { getDeskHomeData } from "@/lib/deskHomeData";
import { SHOW_DESK_HOME } from "@/lib/constants";

// หน้าลับสำหรับครูฮีมดูหน้าแรก "โต๊ะเรียน 3 มิติ" ก่อนสลับจริง (สวิตช์ SHOW_DESK_HOME)
// ไม่อยู่ใน sitemap และบอก Google ว่าอย่าเก็บ
export const metadata: Metadata = {
  title: "โต๊ะเรียนครูฮีม (ทดลอง)",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const revalidate = 300;

export default async function DeskPreviewPage() {
  // หน้าแรกเป็นโต๊ะเรียนแล้ว → หน้าเดิมอยู่ /classic · ถ้าปิดสวิตช์ หน้าเดิมคือ "/"
  return <StudyDesk data={await getDeskHomeData()} classicUrl={SHOW_DESK_HOME ? "/classic" : "/"} />;
}
