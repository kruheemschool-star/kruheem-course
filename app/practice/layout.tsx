import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ฝึกทำโจทย์คณิตศาสตร์ | Practice Mode",
    description: "ฝึกทำโจทย์คณิตศาสตร์แยกตามหัวข้อ ค้นหาโจทย์ที่ต้องการ พร้อมเฉลยละเอียด เหมาะสำหรับฝึกซ้อมก่อนสอบ",
    keywords: ["ฝึกทำโจทย์", "คณิตศาสตร์", "แบบฝึกหัด", "เฉลย", "ครูฮีม"],
    openGraph: {
        title: "ฝึกทำโจทย์คณิตศาสตร์ | KruHeem Course",
        description: "ฝึกทำโจทย์คณิตศาสตร์แยกตามหัวข้อ พร้อมเฉลยละเอียด",
        type: "website",
    },
};

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
    return children;
}
