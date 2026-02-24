import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "รีวิวจากนักเรียน | ความประทับใจจากผู้เรียนจริง",
    description: "เสียงจากนักเรียนที่เคยเรียนกับครูฮีม รีวิวประสบการณ์จริง ช่วยให้คุณตัดสินใจได้ง่ายขึ้น",
    keywords: ["รีวิว", "ความคิดเห็นนักเรียน", "ครูฮีม", "เรียนคณิตศาสตร์", "ประสบการณ์จริง"],
    openGraph: {
        title: "รีวิวจากนักเรียน | KruHeem Course",
        description: "เสียงจากนักเรียนที่เคยเรียนกับครูฮีม รีวิวประสบการณ์จริง",
        type: "website",
    },
};

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
