import type { Metadata } from "next";
import { listCollection, type FsDoc } from "@/lib/firestoreRest";
import SummaryClient from "./SummaryClient";

// Server shell around the (unchanged) client summary reader. The route was
// 100% client-rendered with NO metadata, so these public sheet pages were
// invisible to crawlers and shared as a generic card. Summary docs already
// carry seo_title / meta_description fields — authored in the admin editor
// but never used until now (the client only set document.title after load).
//
// Metadata lookup: summaries can only be found by slug (not doc id), and the
// REST wrapper has no server-side where(); listing the collection with a
// tight field projection (no content bodies) is ~50 tiny rows, cached for
// 1 hour — a negligible, bounded cost.

async function findSummaryBySlug(slug: string): Promise<FsDoc | undefined> {
    const docs = await listCollection(
        "summaries",
        ["slug", "title", "seo_title", "meta_description", "status"],
        { revalidate: 3600 }
    );
    return docs.find((d) => d.slug === slug || d.id === slug);
}

export async function generateMetadata(
    { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
    // Never let a metadata hiccup break the page — fall back to the layout's
    // site-wide defaults (title template still applies).
    try {
        const { slug } = await params;
        if (!slug) return {};
        const summary = await findSummaryBySlug(decodeURIComponent(slug));
        if (!summary) return {};

        const title = (summary.seo_title as string) || (summary.title as string) || "";
        if (!title) return {};
        const description =
            ((summary.meta_description as string) || "")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 160) ||
            `สรุปเนื้อหาคณิตศาสตร์ "${(summary.title as string) || title}" อ่านฟรี โดยครูฮีม`;

        return {
            title,
            description,
            alternates: { canonical: `/summary/${slug}` },
            openGraph: { title, description, type: "article" },
            twitter: { card: "summary", title, description },
        };
    } catch {
        return {};
    }
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
    return <SummaryClient params={params} />;
}
