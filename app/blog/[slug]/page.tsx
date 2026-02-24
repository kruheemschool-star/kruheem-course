import type { Metadata, ResolvingMetadata } from 'next';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import BlogPostClient from "./BlogPostClient";

type Props = {
    params: Promise<{ slug: string }>
}

// Helper to fetch post data (shared between metadata and page)
async function getPost(slug: string) {
    const q = query(
        collection(db, "posts"),
        where("slug", "==", slug),
        limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as any;
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
            <BlogPostClient params={params} />
        </>
    );
}
