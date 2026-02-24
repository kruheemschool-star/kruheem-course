import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "สาระน่ารู้จากครูฮีม | เทคนิคการเรียนคณิตศาสตร์",
    description: "รวมเทคนิคคณิตศาสตร์ ข่าวสารการสอบ เคล็ดลับการเรียน และเรื่องราวดีๆ จากครูฮีม ที่จะช่วยให้น้องๆ เก่งขึ้นทุกวัน",
    keywords: ["เทคนิคการเรียน", "คณิตศาสตร์", "สอบเข้า", "ครูฮีม", "บทความ", "เคล็ดลับเรียนเก่ง"],
    openGraph: {
        title: "สาระน่ารู้จากครูฮีม | เทคนิคการเรียนคณิตศาสตร์",
        description: "รวมเทคนิคคณิตศาสตร์ ข่าวสารการสอบ เคล็ดลับการเรียน และเรื่องราวดีๆ จากครูฮีม",
        type: "website",
    },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
    return children;
}
