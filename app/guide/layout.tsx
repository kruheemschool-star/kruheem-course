import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "คู่มือการใช้งานเว็บไซต์ | KruHeem School",
    description: "คู่มือใช้งานเว็บไซต์ KruHeem School ครบทุกขั้นตอน ตั้งแต่สมัครสมาชิก เลือกคอร์ส ชำระเงิน เข้าเรียน ทำข้อสอบ รับใบประกาศ รีวิวรับส่วนลด และอื่นๆ",
    keywords: ["คู่มือใช้งาน", "วิธีใช้เว็บไซต์", "ครูฮีม", "คอร์สออนไลน์", "คณิตศาสตร์", "สมัครเรียน"],
    openGraph: {
        title: "คู่มือการใช้งานเว็บไซต์ | KruHeem School",
        description: "ทุกสิ่งที่ต้องรู้เกี่ยวกับการใช้งาน KruHeem School ตั้งแต่สมัครสมาชิกจนถึงรับใบประกาศ",
        type: "website",
    },
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
    return children;
}
