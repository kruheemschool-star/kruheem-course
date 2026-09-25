import type { Metadata, Viewport } from "next";
import ZombieRunLoader from "@/components/game/ZombieRunLoader";

// เกมพักสมอง "ครูฮีม หนีซอมบี้" — ทางเข้าคือเครื่องเกมพกพาบนโต๊ะเรียนหน้าแรก (components/desk/StudyDeskScene.jsx buildGame)
export const metadata: Metadata = {
  title: "ครูฮีม หนีซอมบี้! เกมพักสมอง",
  description: "เกมวิ่งพิกเซลสั้นๆ ให้น้องๆ พักสมอง พาครูฮีมกระโดดข้ามกองหนังสือ สไลด์ลอดเครื่องบินกระดาษ เก็บชาไทย อย่าให้ซอมบี้ตามทัน",
  openGraph: { title: "ครูฮีม หนีซอมบี้! เกมพักสมอง", description: "เกมวิ่งพิกเซลสั้นๆ ให้น้องๆ พักสมอง อย่าให้ซอมบี้ตามทัน", type: "website" },
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
