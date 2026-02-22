"use client";

import { useState, useEffect, useRef, use } from "react";
import Navbar from "@/components/Navbar";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { Calendar, Share2, Facebook, Link as LinkIcon, Eye } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { SmartContentRenderer } from "@/components/ContentRenderer";

interface Post {
    id: string;
    title: string;
    slug: string;
    coverImage: string;
    createdAt: any;
    updatedAt: any;
    content: string;
    contentType?: 'html' | 'json';
    views?: number;
    keywords?: string[];
}

export default function BlogPostClient({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);

    // MathJax specific state and ref (for Legacy HTML content)
    const [isMathJaxLoaded, setIsMathJaxLoaded] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // 1. Fetch Post Data
    useEffect(() => {
        const fetchPost = async () => {
            try {
                const q = query(
                    collection(db, "posts"),
                    where("slug", "==", slug),
                    limit(1)
                );
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const doc = querySnapshot.docs[0];
                    setPost({ id: doc.id, ...doc.data() } as Post);
                } else {
                    setPost(null);
                }
            } catch (error) {
                console.error("Error fetching post:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
    }, [slug]);

    // 2. Typeset MathJax when content or script is ready (Only for HTML content)
    useEffect(() => {
        const typeset = async () => {
            if (post && post.contentType !== 'json' && contentRef.current && (window as any).MathJax && isMathJaxLoaded) {
                try {
                    const MathJax = (window as any).MathJax;
                    if (MathJax.typesetPromise) {
                        await MathJax.typesetPromise([contentRef.current]);
                    } else if (MathJax.typeset) {
                        MathJax.typeset([contentRef.current]);
                    }
                } catch (err) {
                    console.error('MathJax typesetting failed:', err);
                }
            }
        };

        typeset();
        const timer = setTimeout(typeset, 300);
        return () => clearTimeout(timer);
    }, [post, isMathJaxLoaded]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors">
                <Navbar />
                <div className="pt-32 pb-20 px-6 max-w-3xl mx-auto space-y-8 animate-pulse">
                    <div className="h-64 bg-slate-200 rounded-[2rem]"></div>
                    <div className="h-10 bg-slate-200 rounded-lg w-3/4"></div>
                </div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-[#FDFBF7] dark:bg-slate-950 flex flex-col items-center justify-center text-center px-6 transition-colors">
                <Navbar />
                <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100 mb-4">404</h1>
                <p className="text-xl text-slate-500 dark:text-slate-400 mb-8">ไม่พบบทความที่คุณค้นหา</p>
                <Link href="/blog" className="bg-teal-600 text-white px-8 py-3 rounded-full font-bold hover:bg-teal-700 transition shadow-lg">
                    กลับไปหน้าบทความ
                </Link>
            </div>
        );
    }

    // Determine if it's new Smart Content (JSON)
    const isSmartContent = post.contentType === 'json' || (
        typeof post.content === 'string' && post.content.trim().startsWith('[') && post.content.trim().endsWith(']')
    );

    return (
        <div className="min-h-screen bg-[#FDFBF7] dark:bg-slate-950 font-sans selection:bg-teal-100 selection:text-teal-900 transition-colors">
            <Navbar />

            {/* Legacy MathJax Support for Old HTML Posts */}
            {!isSmartContent && (
                <>
                    <Script
                        id="mathjax-config"
                        strategy="beforeInteractive"
                        dangerouslySetInnerHTML={{
                            __html: `
                                window.MathJax = {
                                    loader: { load: ['[tex]/ams'] },
                                    tex: {
                                        inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                                        displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
                                        processEscapes: true,
                                        packages: {'[+]': ['noerrors', 'noundefined', 'ams']}
                                    },
                                    startup: { typeset: false },
                                    svg: { fontCache: 'global', scale: 1, minScale: .5 }
                                };
                            `
                        }}
                    />
                    <Script
                        id="mathjax-script"
                        strategy="afterInteractive"
                        src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"
                        onLoad={() => setIsMathJaxLoaded(true)}
                    />
                </>
            )}

            <main className="pt-24 pb-20">
                <article className="max-w-4xl mx-auto px-6">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-1.5 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm text-sm text-slate-500 dark:text-slate-400 mb-6 mt-6">
                            <Calendar size={14} className="text-teal-500" />
                            {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString('th-TH', { dateStyle: 'long' }) : 'Unknown Date'}
                            {post.views !== undefined && (
                                <>
                                    <div className="w-1 h-1 rounded-full bg-slate-300 mx-1"></div>
                                    <Eye size={14} className="text-slate-400" />
                                    <span>{post.views.toLocaleString()} views</span>
                                </>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-800 dark:text-slate-100 leading-tight mb-8">
                            {post.title}
                        </h1>
                    </div>

                    {/* Cover Image */}
                    {post.coverImage && (
                        <div className="rounded-[2.5rem] overflow-hidden shadow-xl shadow-teal-900/5 mb-12 border-4 border-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={post.coverImage}
                                alt={post.title}
                                className="w-full max-h-[500px] object-cover"
                            />
                        </div>
                    )}

                    {/* Content Body */}
                    <div className="max-w-4xl mx-auto">
                        {isSmartContent ? (
                            // ✅ New Smart Content Renderer
                            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-xl rounded-[2.5rem] p-8 md:p-12 min-h-[400px]">
                                <SmartContentRenderer content={post.content} />
                            </div>
                        ) : (
                            // 🍂 Legacy HTML Renderer
                            <div
                                ref={contentRef}
                                className="math-content-area prose prose-lg prose-slate dark:prose-invert prose-headings:font-bold prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-a:text-teal-600 hover:prose-a:text-teal-700 prose-img:rounded-2xl max-w-none 
                                bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-xl rounded-[2.5rem] p-8 md:p-12
                                overflow-x-auto leading-8 md:leading-9"
                                dangerouslySetInnerHTML={{ __html: post.content }}
                            />
                        )}
                    </div>

                    {/* Share / Tags section */}
                    <div className="max-w-3xl mx-auto mt-16 pt-10 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold">
                            <Share2 size={20} />
                            <span>แชร์บทความ</span>
                        </div>
                        <div className="flex gap-2">
                            <button className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:scale-110 transition"><Facebook size={20} /></button>
                            <button className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center hover:scale-110 transition" onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Copied link!') }}><LinkIcon size={20} /></button>
                        </div>
                    </div>
                </article>
            </main>
        </div >
    );
}
