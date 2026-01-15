"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import { Calendar, ArrowRight, BookOpen } from "lucide-react";

interface Post {
    id: string;
    title: string;
    slug: string;
    coverImage: string;
    createdAt: any;
    status: string;
    content: string; // We might want to strip tags for excerpt
}

export default function BlogIndexPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            // Only fetch published posts
            // Note: Composite index might be needed if using 'where' + 'orderBy'. 
            // If it fails, I'll remove 'where' and filter client side for MVP.
            // Let's try client side filtering to avoid index creation delay for the user.
            try {
                const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Post[];

                // Filter only published
                setPosts(data.filter(p => p.status === 'published' || !p.status)); // Support old posts without status if any
            } catch (error) {
                console.error("Error fetching posts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-teal-100 selection:text-teal-900 transition-colors">
            <Navbar />

            <main className="pt-28 pb-20 px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header Section */}
                    <div className="text-center mb-16 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-teal-200/20 rounded-full blur-[100px] pointer-events-none"></div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-4 relative z-10 tracking-tight">
                            สาระน่ารู้จาก <span className="text-teal-600">ครูฮีม</span> 🎓
                        </h1>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto relative z-10 font-medium">
                            รวมเทคนิคคณิตศาสตร์ ข่าวสารการสอบ และเรื่องราวดีๆ ที่จะช่วยให้น้องๆ เก่งขึ้น
                        </p>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-[2rem] h-[400px] animate-pulse shadow-sm"></div>
                            ))}
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-20 bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-xl font-bold text-slate-400">ยังไม่มีบทความในตอนนี้</h3>
                            <p className="text-slate-400 mt-2">โปรดติดตามตอนต่อไป...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {posts.map((post) => (
                                <Link href={`/blog/${post.slug}`} key={post.id} className="group flex flex-col bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-slate-100">
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
                                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-600 shadow-sm flex items-center gap-1">
                                            <Calendar size={12} className="text-teal-500" />
                                            {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : 'Recently'}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6">
                                        <h2 className="text-xl font-bold text-slate-800 group-hover:text-teal-600 transition-colors leading-tight">
                                            {post.title}
                                        </h2>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
