import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { listCollection } from "@/lib/firestoreRest";
import { getPaperTrust } from "@/lib/paperTrust";
import ExamPapersShop from "@/components/exampapers/ExamPapersShop";
import type { ExamPaper } from "@/types";

export const metadata: Metadata = {
    // layout ต่อท้าย "| KruHeem Course" ให้เองผ่าน title.template — ใส่ซ้ำที่นี่
    // แท็บจะขึ้นชื่อแบรนด์สองรอบ
    title: "คลังข้อสอบ PDF พร้อมเฉลย โหลดได้เลย",
    description: "ดาวน์โหลดข้อสอบคณิตศาสตร์ ม.1–ม.6 พร้อมเฉลยละเอียด เป็นไฟล์ PDF ซื้อครั้งเดียว โหลดเก็บไว้ได้ตลอด O-NET, A-Level, สอบเข้า",
    keywords: ["ข้อสอบ PDF", "ดาวน์โหลดข้อสอบ", "ข้อสอบพร้อมเฉลย", "ข้อสอบคณิต", "O-NET", "A-Level"],
    openGraph: {
        title: "คลังข้อสอบ PDF พร้อมเฉลย โหลดได้เลย | KruHeem Course",
        description: "ดาวน์โหลดข้อสอบคณิตศาสตร์ ม.1–ม.6 พร้อมเฉลยละเอียด เป็นไฟล์ PDF ซื้อครั้งเดียว โหลดเก็บไว้ได้ตลอด O-NET, A-Level, สอบเข้า",
    },
};

// ISR — admin changes reflect within 5 minutes.
export const revalidate = 300;

async function getPapers(): Promise<ExamPaper[]> {
    try {
        const docs = await listCollection(
            "examPapers",
            ["title", "description", "price", "fullPrice", "level", "category", "tags", "coverUrl", "previewUrl", "pageCount", "questionCount", "badge", "comingSoon", "hidden", "order", "createdAt"],
            { revalidate: 300 },
        );
        return docs
            .filter((d) => !d.hidden)
            .map((d) => ({
                id: d.id,
                title: (d.title as string) || "",
                description: (d.description as string) || "",
                price: Number(d.price ?? 0),
                fullPrice: d.fullPrice != null ? Number(d.fullPrice) : undefined,
                level: (d.level as string) || "",
                category: (d.category as string) || "",
                tags: (d.tags as string[]) || [],
                coverUrl: (d.coverUrl as string) || "",
                previewUrl: (d.previewUrl as string) || "",
                pageCount: Number(d.pageCount ?? 0),
                questionCount: Number(d.questionCount ?? 0),
                badge: (d.badge as string) || "",
                comingSoon: !!d.comingSoon,
                order: (d.order as number | undefined) ?? Number.MAX_SAFE_INTEGER,
            }))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } catch (e) {
        console.error("Error fetching exam papers:", e);
        return [];
    }
}

export default async function ExamPapersPage() {
    const [papers, trust] = await Promise.all([getPapers(), getPaperTrust(3)]);
    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 bg-dot-pattern font-sans flex flex-col transition-colors">
            <Navbar />
            <div className="pt-24 flex-1">
                <ExamPapersShop
                    papers={papers}
                    reviews={trust.reviews}
                    reviewCount={trust.reviewCount}
                    avgRating={trust.avgRating}
                />
            </div>
            <Footer />
        </div>
    );
}
