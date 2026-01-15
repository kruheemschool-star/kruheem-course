import type { Metadata, ResolvingMetadata } from 'next';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import BlogPostClient from "./BlogPostClient";

type Props = {
    params: Promise<{ slug: string }>
}

// 🧠 Dynamic Metadata for SEO
export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { slug } = await params;

    // Fetch post data
    const q = query(
        collection(db, "posts"),
        where("slug", "==", slug),
        limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return {
            title: 'บทความไม่พบ - Kruheem.com',
        };
    }

    const post = querySnapshot.docs[0].data();

    // Default keywords
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
        },
    };
}

export default async function BlogPostPage({ params }: Props) {
    return <BlogPostClient params={params} />;
}
