import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "คอร์สเรียนของฉัน | ติดตามความก้าวหน้า",
    description: "ดูคอร์สเรียนที่ลงทะเบียนไว้ ติดตามความก้าวหน้าการเรียน และเรียนต่อจากจุดที่หยุดไว้",
    robots: { index: false, follow: false },
};

export default function MyCoursesLayout({ children }: { children: React.ReactNode }) {
    return children;
}
