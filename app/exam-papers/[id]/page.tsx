import { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getDocument, listCollection } from "@/lib/firestoreRest";
import { getPaperTrust } from "@/lib/paperTrust";
import PaperDetailClient from "@/components/exampapers/PaperDetailClient";
import type { ExamPaper } from "@/types";

export const revalidate = 300;

type PaperPageData = { paper: ExamPaper; fileLabels: string[] };

async function getPaper(id: string): Promise<PaperPageData | null> {
    try {
        const d = await getDocument(`examPapers/${id}`, { revalidate: 300 });
        if (!d || d.hidden) return null;
        // รายการไฟล์ส่งลง client เฉพาะ "ชื่อที่ผู้ซื้อเห็น" (label) เท่านั้น —
        // path ใน Storage เป็นความลับฝั่งเซิร์ฟเวอร์ ห้ามหลุดลง HTML
        const rawFiles = Array.isArray(d.files) ? (d.files as { label?: string }[]) : [];
        const fileLabels = rawFiles.map((f) => (f.label || "").trim()).filter(Boolean);
        if (fileLabels.length === 0 && d.pdfPath) fileLabels.push("ไฟล์ข้อสอบพร้อมเฉลย"); // สินค้ารุ่นเก่าไฟล์เดียว
        return {
            paper: {
                id: d.id,
                title: (d.title as string) || "",
                description: (d.description as string) || "",
                price: Number(d.price ?? 0),
                fullPrice: Number(d.fullPrice ?? 0),
                level: (d.level as string) || "",
                category: (d.category as string) || "",
                tags: (d.tags as string[]) || [],
                coverUrl: (d.coverUrl as string) || "",
                previewUrl: (d.previewUrl as string) || "",
                pageCount: Number(d.pageCount ?? 0),
                questionCount: Number(d.questionCount ?? 0),
                analysis: (d.analysis as ExamPaper["analysis"]) || undefined,
                samplePages: (Array.isArray(d.samplePages) ? d.samplePages : [])
                    .map((s) => s as { url?: string; caption?: string })
                    .filter((s) => !!s?.url)
                    .map((s) => ({ url: String(s.url), caption: s.caption ? String(s.caption) : undefined })),
                badge: (d.badge as string) || "",
                comingSoon: !!d.comingSoon,
            },
            fileLabels,
        };
    } catch {
        return null;
    }
}

// ชุดอื่นที่น่าสนใจ — หมวด/ชั้นเดียวกันขึ้นก่อน แล้วค่อยตามลำดับร้าน (สูงสุด 3 ชุด)
async function getRelatedPapers(current: ExamPaper): Promise<ExamPaper[]> {
    try {
        const docs = await listCollection(
            "examPapers",
            ["title", "price", "fullPrice", "level", "category", "coverUrl", "comingSoon", "hidden", "order"],
            { revalidate: 300 },
        );
        const score = (p: { category?: string; level?: string }) =>
            (p.category && p.category === current.category ? 0 : 2) + (p.level && p.level === current.level ? 0 : 1);
        return docs
            // ชุด "เร็วๆ นี้" ยังซื้อไม่ได้ — เอาไปแนะนำต่อท้ายหน้าขายไม่มีประโยชน์
            .filter((d) => !d.hidden && !d.comingSoon && d.id !== current.id)
            .map((d) => ({
                id: d.id,
                title: (d.title as string) || "",
                price: Number(d.price ?? 0),
                fullPrice: Number(d.fullPrice ?? 0),
                level: (d.level as string) || "",
                category: (d.category as string) || "",
                coverUrl: (d.coverUrl as string) || "",
                order: (d.order as number | undefined) ?? Number.MAX_SAFE_INTEGER,
            }))
            .sort((a, b) => score(a) - score(b) || (a.order ?? 0) - (b.order ?? 0))
            .slice(0, 3);
    } catch {
        return [];
    }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const data = await getPaper(id);
    if (!data) return { title: "ไม่พบข้อสอบ | KruHeem Course" };
    const paper = data.paper;
    const title = `${paper.title} | คลังข้อสอบ PDF ครูฮีม`;
    const description = paper.description || `ดาวน์โหลด ${paper.title} เป็นไฟล์ PDF พร้อมเฉลย`;
    return {
        title,
        description,
        openGraph: {
            title,
            description,
            // ปกชุดข้อสอบเป็นแนวตั้ง — ถ้าไม่มีปกให้ปล่อยตกไปใช้รูปกลางของ layout
            ...(paper.coverUrl ? { images: [{ url: paper.coverUrl }] } : {}),
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            ...(paper.coverUrl ? { images: [paper.coverUrl] } : {}),
        },
    };
}

export default async function PaperDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const data = await getPaper(id);
    if (!data) notFound();
    const [related, trust] = await Promise.all([getRelatedPapers(data.paper), getPaperTrust(3)]);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 bg-dot-pattern font-sans flex flex-col transition-colors">
            <Navbar />
            <div className="pt-24 flex-1">
                <PaperDetailClient
                    paper={data.paper}
                    fileLabels={data.fileLabels}
                    related={related}
                    reviews={trust.reviews}
                    reviewCount={trust.reviewCount}
                    avgRating={trust.avgRating}
                />
            </div>
            <Footer />
        </div>
    );
}
