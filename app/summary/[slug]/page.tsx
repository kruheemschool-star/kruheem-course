"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Clock, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { SmartContentRenderer } from "@/components/ContentRenderer";
import CommentSection from "@/components/CommentSection";
import SocialEngagement from "@/components/SocialEngagement";
import RelatedCourses from "@/components/RelatedCourses";

interface Summary {
    id: string;
    title: string;
    slug: string;
    order: number;
    content: string;
    htmlContent?: string;
    contentType?: 'json' | 'html';
    status?: string;
    seo_title?: string;
    meta_description?: string;
    keywords?: string[];
    tags?: string[];
    reading_time?: string;
}

// Helper to extract metadata from JSON content
function extractMetadata(jsonContent: string) {
    try {
        const parsed = JSON.parse(jsonContent);
        if (parsed.metadata) {
            return {
                seo_title: parsed.metadata.seo_title || '',
                meta_description: parsed.metadata.meta_description || '',
                focus_keywords: parsed.metadata.focus_keywords || [],
                tags: parsed.metadata.tags || [],
                reading_time: parsed.metadata.estimated_reading_time || '5',
            };
        }
        return null;
    } catch {
        return null;
    }
}

export default function SummaryContentPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [allSummaries, setAllSummaries] = useState<Summary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const q = query(collection(db, "summaries"));
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Summary[];

                // Filter published
                const published = data.filter(s => s.status === "published");
                setAllSummaries(published.sort((a, b) => (a.order || 0) - (b.order || 0)));

                // Find current summary
                const found = published.find(s => s.slug === slug);

                if (found) {
                    setSummary(found);
                    // Update document title
                    const meta = extractMetadata(found.content);
                    document.title = (meta?.seo_title || found.title) + " | Kruheem.com";
                } else {
                    setError("ไม่พบบทสรุปนี้");
                }
            } catch (err) {
                console.error("Error:", err);
                setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-950 font-sans transition-colors">
                <Navbar />
                <div className="flex items-center justify-center h-[60vh]">
                    <Loader2 className="animate-spin text-slate-400" size={32} />
                </div>
            </div>
        );
    }

    if (error || !summary) {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-950 font-sans transition-colors">
                <Navbar />
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <div className="text-6xl mb-4">😢</div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">404 - ไม่พบหน้านี้</h1>
                    <p className="text-slate-500 mb-6">{error || "ไม่พบบทสรุปที่ต้องการ"}</p>
                    <Link href="/summary" className="text-teal-600 font-bold hover:underline">
                        ← กลับไปหน้าสรุปเนื้อหา
                    </Link>
                </div>
            </div>
        );
    }

    const meta = extractMetadata(summary.content);
    const readingTime = parseInt(meta?.reading_time || summary.reading_time || '5');

    // Find adjacent summaries
    const currentIndex = allSummaries.findIndex(s => s.slug === slug);
    const prev = currentIndex > 0 ? allSummaries[currentIndex - 1] : null;
    const next = currentIndex < allSummaries.length - 1 ? allSummaries[currentIndex + 1] : null;

    return (
        <div className="min-h-screen bg-white font-sans">
            <Navbar />

            <main className="pt-28 pb-20 px-6">
                <article className="max-w-3xl mx-auto">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-8">
                        <Link href="/summary" className="hover:text-slate-600 transition flex items-center gap-1">
                            <ArrowLeft size={16} />
                            สรุปเนื้อหา
                        </Link>
                        <span>/</span>
                        <span className="text-slate-600 font-medium truncate">{summary.title}</span>
                    </div>

                    {/* Header */}
                    <header className="mb-12 pb-8 border-b border-slate-100">
                        <div className="flex items-center gap-3 mb-4 flex-wrap">
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-bold">
                                บทที่ {currentIndex + 1} / {allSummaries.length}
                            </span>
                            <span className="bg-slate-50 text-slate-400 px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1">
                                <Clock size={14} />
                                อ่าน {readingTime} นาที
                            </span>
                            {(meta?.tags || summary.tags)?.slice(0, 3).map((tag: string, i: number) => (
                                <span key={i} className="bg-teal-50 text-teal-600 px-2 py-0.5 rounded text-xs font-medium">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-800 leading-tight">
                            {meta?.seo_title || summary.title}
                        </h1>
                        {(meta?.meta_description || summary.meta_description) && (
                            <p className="text-slate-500 mt-4 text-lg">{meta?.meta_description || summary.meta_description}</p>
                        )}
                    </header>

                    {/* Content */}
                    <div className="summary-content">
                        {summary.contentType === 'html' && summary.htmlContent ? (
                            <div
                                className="prose prose-lg prose-slate max-w-none"
                                dangerouslySetInnerHTML={{ __html: summary.htmlContent }}
                            />
                        ) : (
                            <SmartContentRenderer content={summary.content} />
                        )}
                    </div>

                    {/* Related Courses - เลื่อนขึ้นมาแทน Navigation */}
                    <RelatedCourses
                        summaryTitle={summary.title}
                        summaryKeywords={summary.keywords}
                        summaryTags={summary.tags}
                    />

                    {/* Social Engagement */}
                    <SocialEngagement
                        summaryId={summary.id}
                        summaryTitle={summary.title}
                        summarySlug={summary.slug}
                    />

                    {/* Comment Section */}
                    <CommentSection summaryId={summary.id} />
                </article>
            </main>
        </div>
    );
}
