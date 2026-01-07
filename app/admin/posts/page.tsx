"use client";

import { useState, useEffect } from "react";
import AdminGuard from "@/components/AdminGuard";
import Link from "next/link";
import { ArrowLeft, Plus, Edit, Trash2, Eye } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";

interface Post {
    id: string;
    title: string;
    slug: string;
    createdAt: any;
    status: 'published' | 'draft';
}

export default function AdminPostsPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Post[];
            setPosts(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("คุณแน่ใจว่าต้องการลบบทความนี้? การกระทำนี้ไม่สามารถย้อนกลับได้")) return;
        try {
            await deleteDoc(doc(db, "posts", id));
            alert("ลบบทความเรียบร้อยแล้ว");
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("เกิดข้อผิดพลาดในการลบ");
        }
    };

    return (
        <AdminGuard>
            <div className="min-h-screen bg-[#F0F7F4] font-sans pb-20">
                {/* Header */}
                <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-white/20 px-6 py-4 shadow-sm">
                    <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link href="/admin" className="p-2 rounded-full hover:bg-slate-100 transition text-slate-500">
                                <ArrowLeft size={24} />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    📰 จัดการบทความ
                                </h1>
                                <p className="text-xs text-slate-500">สร้างและแก้ไขบทความความรู้</p>
                            </div>
                        </div>

                        <Link
                            href="/admin/posts/new"
                            className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all hover:-translate-y-1"
                        >
                            <Plus size={20} />
                            <span className="hidden sm:inline">เขียนบทความใหม่</span>
                        </Link>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto p-6 md:p-10">
                    {loading ? (
                        <div className="text-center py-20 text-slate-400">กำลังโหลดข้อมูล...</div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                            <h3 className="text-xl font-bold text-slate-400 mb-2">ยังไม่มีบทความ</h3>
                            <p className="text-slate-400 mb-6">เริ่มเขียนบทความแรกเพื่อแบ่งปันความรู้กันเถอะ!</p>
                            <Link
                                href="/admin/posts/new"
                                className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 px-6 py-3 rounded-xl font-bold hover:bg-teal-200 transition"
                            >
                                <Plus size={20} /> เขียนบทความใหม่
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {posts.map((post) => (
                                <div key={post.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${post.status === 'published' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {post.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
                                        </span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {/* Preview Link (Simulated for now until frontend is ready) */}
                                            {/* <Link href={`/blog/${post.slug}`} target="_blank" className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-indigo-500" title="ดูตัวอย่าง">
                                                <Eye size={16} />
                                            </Link> */}
                                            <Link href={`/admin/posts/edit/${post.id}`} className="p-2 hover:bg-amber-50 rounded-full text-slate-400 hover:text-amber-500" title="แก้ไข">
                                                <Edit size={16} />
                                            </Link>
                                            <button onClick={() => handleDelete(post.id)} className="p-2 hover:bg-rose-50 rounded-full text-slate-400 hover:text-rose-500" title="ลบ">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-2 leading-tight">
                                        {post.title}
                                    </h3>

                                    <div className="text-xs text-slate-400 font-mono mt-4">
                                        /{post.slug}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString('th-TH') : 'N/A'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </AdminGuard>
    );
}
