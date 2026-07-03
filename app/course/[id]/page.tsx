import type { Metadata } from "next";
import { getDocument } from "@/lib/firestoreRest";
import CourseClient from "./CourseClient";

// Server shell around the (unchanged) client sales page. Before this, the
// route was 100% client-rendered with NO metadata: crawlers and social
// scrapers (Google, Facebook, LINE) saw an empty page with the generic site
// title. This shell adds per-course <title>/<description>/OG image while the
// visible page stays byte-identical — CourseClient is the exact former
// page.tsx and still fetches its own data client-side.
//
// The metadata read goes through the Firestore REST wrapper with a 5-minute
// cache, so it adds ~1 read per course per 5 minutes — not per visitor.

export async function generateMetadata(
    { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
    // Never let a metadata hiccup break the page — fall back to the layout's
    // site-wide defaults (title template still applies).
    try {
        const { id } = await params;
        if (!id) return {};
        const course = await getDocument(`courses/${id}`, { revalidate: 300 });
        if (!course) return {};

        const title = (course.title as string) || "";
        if (!title) return {};
        const description =
            ((course.description as string) || "")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 160) ||
            `คอร์สเรียนคณิตศาสตร์ออนไลน์ "${title}" โดยครูฮีม ปูพื้นฐานแน่น เข้าใจง่าย พร้อมลุยทุกสนามสอบ`;
        const image = (course.image as string) || undefined;

        return {
            title,
            description,
            alternates: { canonical: `/course/${id}` },
            openGraph: {
                title,
                description,
                type: "website",
                ...(image ? { images: [{ url: image }] } : {}),
            },
            twitter: {
                card: image ? "summary_large_image" : "summary",
                title,
                description,
                ...(image ? { images: [image] } : {}),
            },
        };
    } catch {
        return {};
    }
}

export default function Page() {
    return <CourseClient />;
}
