"use client";

import dynamic from "next/dynamic";

// เกมวาดด้วย canvas + จำสถิติในเครื่อง → โหลดฝั่งเครื่องผู้ใช้อย่างเดียว
const ZombieRunGame = dynamic(() => import("./ZombieRunGame"), {
  ssr: false,
  loading: () => <div style={{ position: "fixed", inset: 0, background: "#140f24" }} />,
});

export default function ZombieRunLoader() {
  return <ZombieRunGame />;
}
