import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "วิธีสมัครเรียน | ขั้นตอนง่ายๆ เริ่มเรียนกับครูฮีม",
    description: "ขั้นตอนสมัครเรียนคอร์สคณิตศาสตร์ออนไลน์กับครูฮีม ง่ายๆ แค่ 4 ขั้นตอน สมัครสมาชิก เลือกคอร์ส แจ้งโอน เริ่มเรียนได้ทันที",
    keywords: ["สมัครเรียน", "วิธีสมัคร", "ครูฮีม", "คอร์สออนไลน์", "คณิตศาสตร์"],
    openGraph: {
        title: "วิธีสมัครเรียน | KruHeem Course",
        description: "ขั้นตอนง่ายๆ ในการเริ่มเรียนกับครูฮีม",
        type: "website",
    },
};

export default function HowToApplyLayout({ children }: { children: React.ReactNode }) {
    return children;
}
