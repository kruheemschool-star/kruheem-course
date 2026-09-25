import type { Metadata, Viewport } from "next";
import ZombieRunLoader from "@/components/game/ZombieRunLoader";

// เกมพักสมอง "ครูฮีม หนีซอมบี้" — ยังไม่ผูกลิงก์จากหน้าอื่น ครูฮีมลองเล่นก่อน
// จึงบอก Google ว่าอย่าเพิ่งเก็บ (เปิดเมื่อวางทางเข้าจริงแล้ว)
export const metadata: Metadata = {
  title: "ครูฮีม หนีซอมบี้! เกมพักสมอง",
  description: "เกมวิ่งพิกเซลสั้นๆ ให้น้องๆ พักสมอง พาครูฮีมกระโดดข้ามกองหนังสือ สไลด์ลอดเครื่องบินกระดาษ เก็บชาไทย อย่าให้ซอมบี้ตามทัน",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#140f24",
};

export default function GamePage() {
  return <ZombieRunLoader />;
}
