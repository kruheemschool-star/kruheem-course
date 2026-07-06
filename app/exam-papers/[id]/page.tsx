import { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getDocument } from "@/lib/firestoreRest";
import PaperDetailClient from "@/components/exampapers/PaperDetailClient";
import type { ExamPaper } from "@/types";

export const revalidate = 300;

async function getPaper(id: string): Promise<ExamPaper | null> {
    try {
        const d = await getDocument(`examPapers/${id}`, { revalidate: 300 });
        if (!d || d.hidden) return null;
        return {
            id: d.id,
            title: (d.title as string) || "",
            description: (d.description as string) || "",
            price: Number(d.price ?? 0),
            level: (d.level as string) || "",
            category: (d.category as string) || "",
            tags: (d.tags as string[]) || [],
            coverUrl: (d.coverUrl as string) || "",
            previewUrl: (d.previewUrl as string) || "",
            pageCount: Number(d.pageCount ?? 0),
            analysis: (d.analysis as ExamPaper["analysis"]) || undefined,
        };
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const paper = await getPaper(id);
    if (!paper) return { title: "ไม่พบข้อสอบ | KruHeem Course" };
    return {
        title: `${paper.title} | คลังข้อสอบ PDF ครูฮีม`,
        description: paper.description || `ดาวน์โหลด ${paper.title} เป็นไฟล์ PDF พร้อมเฉลย`,
    };
}

export default async function PaperDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const paper = await getPaper(id);
    if (!paper) notFound();

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 bg-dot-pattern font-sans flex flex-col transition-colors">
            <Navbar />
            <div className="pt-24 flex-1">
                <PaperDetailClient paper={paper} />
            </div>
            <Footer />
        </div>
    );
}
