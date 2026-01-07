"use client";

import { useState, useEffect } from "react";
import AdminGuard from "@/components/AdminGuard";
import Link from "next/link";
import { ArrowLeft, Save, Image as ImageIcon, Eye, Code, Layout, Trash2 } from "lucide-react";
import TiptapEditor from "@/components/TiptapEditor";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";

export default function NewPostPage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [content, setContent] = useState("");
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [coverImageUrl, setCoverImageUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

    // Auto-generate slug from title (simple version)
    useEffect(() => {
        if (!slug && title) {
            // Very basic slugify: replace spaces with dashes, keep only alphanumeric
            // For Thai, strictly speaking we usually use English slugs for SEO, 
            // but for now let's just let user edit it or default to timestamp if empty?
            // Let's just default to something or leave empty to encourage manual input for better SEO
        }
    }, [title, slug]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCoverImage(e.target.files[0]);
            // Create preview URL
            setCoverImageUrl(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return alert("กรุณาใส่หัวข้อบทความ");
        if (!slug.trim()) return alert("กรุณาตั้งชื่อ URL (Slug)");

        setIsSubmitting(true);

        try {
            let finalCoverUrl = coverImageUrl;

            // Upload Image if selected
            if (coverImage) {
                const storageRef = ref(storage, `posts/${Date.now()}_${coverImage.name}`);
                const snapshot = await uploadBytes(storageRef, coverImage);
                finalCoverUrl = await getDownloadURL(snapshot.ref);
            }

            await addDoc(collection(db, "posts"), {
                title,
                slug: slug.toLowerCase().replace(/\s+/g, '-'), // Basic cleanup
                content,
                coverImage: finalCoverUrl,
                status: 'published', // Default to published for now
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                views: 0
            });

            alert("บันทึกบทความเรียบร้อย! 🎉");
            router.push("/admin/posts");

        } catch (error) {
            console.error("Error creating post:", error);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AdminGuard>
            <div className="min-h-screen bg-[#F0F7F4] font-sans pb-20">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-white/20 px-6 py-4 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/admin/posts" className="p-2 rounded-full hover:bg-slate-100 transition text-slate-500">
                                <ArrowLeft size={24} />
                            </Link>
                            <h1 className="text-xl font-bold text-slate-800">เขียนบทความใหม่ ✍️</h1>
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={20} />
                            {isSubmitting ? "กำลังบันทึก..." : "บันทึกบทความ"}
                        </button>
                    </header>

                    <main className="max-w-7xl mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Settings */}
                        <div className="space-y-6 lg:col-span-1">
                            {/* Title & Slug */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">หัวข้อบทความ</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="เช่น สูตรลัดพิชิตสมการ..."
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400 font-bold text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">URL (Slug) <span className="text-xs font-normal text-slate-400">(ภาษาอังกฤษ)</span></label>
                                    <input
                                        type="text"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value)}
                                        placeholder="math-trick-equation-secret"
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400 font-mono text-sm text-slate-600"
                                    />
                                </div>
                            </div>

                            {/* Cover Image */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                                <label className="block text-sm font-bold text-slate-700 mb-3">รูปปกบทความ</label>
                                <div className="relative group cursor-pointer border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden min-h-[200px] flex items-center justify-center bg-slate-50 hover:bg-slate-100 transition">
                                    <input type="file" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" />
                                    {coverImageUrl ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={coverImageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center text-slate-400">
                                            <ImageIcon size={40} className="mx-auto mb-2 opacity-50" />
                                            <span className="text-sm">คลิกเพื่ออัปโหลดรูป</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Editor */}
                        <div className="lg:col-span-2 space-y-4">
                            {/* Toolbar */}
                            {/* Toolbar - Page Level */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('edit')}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${activeTab === 'edit' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <Code size={18} /> Editor
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('preview')}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${activeTab === 'preview' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <Eye size={18} /> Final Preview
                                    </button>
                                </div>
                            </div>

                            {/* Editor/Preview Area */}
                            <div className="min-h-[600px]">
                                {activeTab === 'edit' ? (
                                    <TiptapEditor content={content} onChange={setContent} />
                                ) : (
                                    <div className="h-[600px] overflow-y-auto p-6 bg-slate-50/50 rounded-3xl border border-slate-200">
                                        <div
                                            className="math-content-area w-full min-h-full prose max-w-none 
                                            bg-white/90 backdrop-blur-xl border border-white/50 shadow-sm rounded-3xl p-8
                                            overflow-x-auto leading-8 md:leading-9"
                                            dangerouslySetInnerHTML={{ __html: content }}
                                        />
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-slate-400 text-center">
                                Tip: ใช้ AI (ChatGPT, Claude) ช่วย Generate Code แบบ "HTML + Tailwind CSS" แล้วนำมาวางได้เลย
                            </p>
                        </div>
                    </main>
                </form>
            </div>
        </AdminGuard>
    );
}
