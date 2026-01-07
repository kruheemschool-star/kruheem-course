"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, where } from "firebase/firestore";
import { BookOpen, ArrowRight, Calendar } from "lucide-react";

interface Post {
    id: string;
    title: string;
    slug: string;
    coverImage: string;
    createdAt: any;
    status: string;
}

export default function HomeBlogSection() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                // Fetch latest 3 posts
                const q = query(
                    collection(db, "posts"),
                    orderBy("createdAt", "desc"),
                    limit(3)
                );

                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as Post))
                    .filter(post => post.status === 'published' || !post.status); // Client-side filter for status if index missing

                setPosts(data.slice(0, 3));
            } catch (error) {
                console.error("Error fetching blog posts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    if (!loading && posts.length === 0) return null;

    return (
        <section className="max-w-[1400px] mx-auto px-6 pb-32 w-full animate-fade-in">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-12 pl-4">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[2rem] bg-white/60 backdrop-blur-md border border-white/60 flex items-center justify-center -rotate-3 shadow-sm">
                        <BookOpen size={32} className="text-teal-500 drop-shadow-sm" />
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight drop-shadow-sm">
                        บทความน่ารู้
                    </h2>
                </div>

                <Link href="/blog" className="hidden md:flex items-center gap-2 text-slate-500 hover:text-teal-600 font-bold transition-colors bg-white/50 px-6 py-3 rounded-full hover:bg-white/80 border border-transparent hover:border-slate-200">
                    ดูทั้งหมด <ArrowRight size={20} />
                </Link>
            </div>

            {/* Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {loading ? (
                    // Loading Skeletons
                    [1, 2, 3].map((i) => (
                        <div key={i} className="h-[350px] bg-white/40 rounded-[2.5rem] animate-pulse border border-white/60"></div>
                    ))
                ) : (
                    posts.map((post) => (
                        <Link
                            href={`/blog/${post.slug}`}
                            key={post.id}
                            className="group flex flex-col bg-white rounded-[2.5rem] overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border border-white/50 h-full"
                        >
                            {/* Image */}
                            <div className="h-56 bg-slate-100 relative overflow-hidden">
                                {post.coverImage ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={post.coverImage}
                                        alt={post.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-teal-50 text-teal-200">
                                        <BookOpen size={48} />
                                    </div>
                                )}
                                {/* Date Badge */}
                                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 shadow-sm flex items-center gap-1.5">
                                    <Calendar size={12} className="text-teal-500" />
                                    {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : 'Recently'}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-8 flex-1 flex flex-col justify-between">
                                <h3 className="text-xl font-bold text-slate-800 group-hover:text-teal-600 transition-colors leading-tight line-clamp-2">
                                    {post.title}
                                </h3>

                                <div className="mt-6 flex items-center text-slate-400 text-sm font-bold group-hover:text-teal-600 transition-colors gap-2">
                                    อ่านต่อ <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            {/* Mobile View All Button */}
            <div className="mt-8 md:hidden text-center">
                <Link href="/blog" className="inline-flex items-center gap-2 text-slate-600 font-bold bg-white/50 px-8 py-4 rounded-full border border-white/60 shadow-sm">
                    ดูบทความทั้งหมด <ArrowRight size={20} />
                </Link>
            </div>
        </section>
    );
}
