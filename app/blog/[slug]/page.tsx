import type { Metadata, ResolvingMetadata } from 'next';
import { cache } from "react";
import { listCollection, getDocument } from "@/lib/firestoreRest";
import BlogPostClient from "./BlogPostClient";

// ISR: cache the article 5 min (was dynamic — re-read on every request).
// 1 ชม. (เดิม 5 นาที) — แก้บทความจากหน้าแอดมินยังเห็นทันทีผ่าน /api/revalidate-content
export const revalidate = 3600;

type Props = {
    params: Promise<{ slug: string }>
}

// Helper to fetch post data. Wrapped in React cache() so generateMetadata
// and the page render share ONE lookup per request (was 2).
//
// อ่านผ่าน Firestore REST ไม่ใช่ client SDK — client SDK ใน ISR บน Vercel เคย
// คืน snapshot ว่างแล้วถูกแช่ลงแคช (บั๊กเดียวกับที่ทำ homepage grid หาย — ดู
// lib/firestoreRest.ts) และยิ่งอันตรายขึ้นเมื่อ TTL ยืดเป็น 1 ชม.
// สองจังหวะ: (1) หา doc id จากรายการ metadata (แชร์ fetch-cache เดียวกับหน้า
// /blog อยู่แล้ว จึงแทบไม่เพิ่ม read) → (2) อ่าน doc เต็มของบทความนั้นใบเดียว
// ทั้งคู่ติด tag posts-feed ให้ /api/revalidate-content บัสต์ตอนแอดมินบันทึก
const getPost = cache(async (slug: string) => {
    const listing = await listCollection(
        "posts",
        ["title", "slug", "coverImage", "status", "createdAt"],
        { revalidate: 3600, tags: ["posts-feed"] }
    );
    const match = listing.find((d) => (d.slug as string) === slug);
    if (!match) return null;
    const post = await getDocument(`posts/${match.id}`, { revalidate: 3600, tags: ["posts-feed"] });
    if (!post) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return post as any;
});

// Serialize Firestore Timestamps for the client component boundary.
function serializePost(post: any) {
    if (!post) return null;
    return {
        id: post.id,
        title: post.title || "",
        slug: post.slug || "",
        coverImage: post.coverImage || "",
        content: post.content || "",
        contentType: post.contentType,
        views: post.views ?? 0,
        keywords: Array.isArray(post.keywords) ? post.keywords : [],
        // REST คืน timestamp เป็น ISO string อยู่แล้ว (เผื่อ .toDate ไว้กันรูปเก่า)
        createdAt: typeof post.createdAt === "string" ? post.createdAt : (post.createdAt?.toDate?.().toISOString() || null),
        updatedAt: typeof post.updatedAt === "string" ? post.updatedAt : (post.updatedAt?.toDate?.().toISOString() || null),
    };
}

// 🧠 Dynamic Metadata for SEO
export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPost(slug);

    if (!post) {
        return {
            title: 'บทความไม่พบ - Kruheem.com',
        };
    }

    const defaultKeywords = ['คณิตศาสตร์', 'เรียนพิเศษ', 'Kruheem', 'สอบเข้า'];
    const postKeywords = Array.isArray(post.keywords) ? post.keywords : [];

    return {
        title: `${post.title} | Kruheem.com`,
        description: post.excerpt || post.title,
        keywords: [...defaultKeywords, ...postKeywords],
        openGraph: {
            title: post.title,
            description: post.excerpt || post.title,
            images: post.coverImage ? [post.coverImage] : [],
            type: 'article',
            publishedTime: post.createdAt?.toDate?.()?.toISOString(),
            modifiedTime: post.updatedAt?.toDate?.()?.toISOString(),
        },
    };
}

export default async function BlogPostPage({ params }: Props) {
    const { slug } = await params;
    const post = await getPost(slug);

    // JSON-LD Article structured data
    const jsonLd = post ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.excerpt || post.title,
        image: post.coverImage || undefined,
        datePublished: post.createdAt?.toDate?.()?.toISOString(),
        dateModified: post.updatedAt?.toDate?.()?.toISOString() || post.createdAt?.toDate?.()?.toISOString(),
        author: {
            '@type': 'Person',
            name: 'ครูฮีม',
            url: 'https://www.kruheemmath.com',
        },
        publisher: {
            '@type': 'Organization',
            name: 'KruHeem Course',
            url: 'https://www.kruheemmath.com',
            logo: {
                '@type': 'ImageObject',
                url: 'https://www.kruheemmath.com/logo.png',
            },
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://www.kruheemmath.com/blog/${slug}`,
        },
    } : null;

    return (
        <>
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            )}
            <BlogPostClient params={params} initialPost={serializePost(post)} />
        </>
    );
}
