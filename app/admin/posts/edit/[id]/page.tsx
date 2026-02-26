"use client";

import { useState, useEffect, use } from "react";
import AdminGuard from "@/components/AdminGuard";
import Link from "next/link";
import { ArrowLeft, Save, Image as ImageIcon, Eye, Code, Trash2, FileJson } from "lucide-react";
import TiptapEditor from "@/components/TiptapEditor";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import { useRouter } from "next/navigation";
import { SmartContentRenderer } from "@/components/ContentRenderer";
import SmartJsonEditor from "@/components/admin/SmartJsonEditor";

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [content, setContent] = useState("");
    const [contentType, setContentType] = useState<'html' | 'json'>('html'); // New State

    // SEO Fields
    const [excerpt, setExcerpt] = useState("");
    const [keywords, setKeywords] = useState("");

    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [coverImageUrl, setCoverImageUrl] = useState(""); // Existing URL
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
    const [originalSize, setOriginalSize] = useState<number>(0);
    const [compressedSize, setCompressedSize] = useState<number>(0);

    // Fetch Post Data
    useEffect(() => {
        const fetchPost = async () => {
            try {
                const docRef = doc(db, "posts", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setTitle(data.title);
                    setSlug(data.slug);
                    setContent(data.content);
                    setCoverImageUrl(data.coverImage);
                    // Load new fields if they exist, default to 'html' if not
                    setContentType(data.contentType || 'html');
                    setExcerpt(data.excerpt || "");
                    setKeywords(Array.isArray(data.keywords) ? data.keywords.join(', ') : "");
                } else {
                    alert("ไม่พบบทความนี้");
                    router.push("/admin/posts");
                }
            } catch (error) {
                console.error("Error fetching post:", error);
                alert("เกิดข้อผิดพลาดในการโหลดข้อมูล");
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
    }, [id, router]);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setOriginalSize(file.size);

            try {
                // Compress image
                const options = {
                    maxSizeMB: 0.5,
                    maxWidthOrHeight: 1320,
                    useWebWorker: true,
                    fileType: 'image/jpeg',
                    initialQuality: 0.85
                };
                
                const compressedFile = await imageCompression(file, options);
                setCompressedSize(compressedFile.size);
                console.log(`Original: ${(file.size / 1024 / 1024).toFixed(2)}MB → Compressed: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

                setCoverImage(compressedFile as File);
                setCoverImageUrl(URL.createObjectURL(compressedFile));
            } catch (err) {
                console.error('Image compression error:', err);
                // Fallback to original if compression fails
                setCoverImage(file);
                setCoverImageUrl(URL.createObjectURL(file));
                setCompressedSize(file.size);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return alert("กรุณาใส่หัวข้อบทความ");
        if (!slug.trim()) return alert("กรุณาตั้งชื่อ URL (Slug)");

        setIsSubmitting(true);

        try {
            let finalCoverUrl = coverImageUrl;

            // Upload NEW Image if selected
            if (coverImage) {
                const storageRef = ref(storage, `posts/${Date.now()}_${coverImage.name}`);
                const snapshot = await uploadBytes(storageRef, coverImage);
                finalCoverUrl = await getDownloadURL(snapshot.ref);
            }

            // Prepare Keywords Array
            const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);

            // Get current post data to preserve fields like views
            const currentDoc = await getDoc(doc(db, "posts", id));
            const currentData = currentDoc.data();

            await updateDoc(doc(db, "posts", id), {
                title,
                slug: slug.toLowerCase().replace(/\s+/g, '-'),
                content,
                contentType,
                excerpt,
                keywords: keywordList,
                coverImage: finalCoverUrl,
                updatedAt: serverTimestamp(),
                // Preserve views field if it exists, otherwise initialize to 0
                views: currentData?.views !== undefined ? currentData.views : 0,
            });

            alert("อัปเดตบทความเรียบร้อย! 🎉");

        } catch (error) {
            console.error("Error updating post:", error);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("คุณแน่ใจว่าต้องการลบบทความนี้? การกระทำนี้ไม่สามารถย้อนกลับได้")) return;
        try {
            await deleteDoc(doc(db, "posts", id));
            router.push("/admin/posts");
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("เกิดข้อผิดพลาดในการลบ");
        }
    };

    if (loading) {
        return <div className="text-center py-20">กำลังโหลด...</div>;
    }

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
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">แก้ไขบทความ ✏️</h1>
                                <span className="text-xs text-slate-400">ID: {id}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="p-2 rounded-full text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                title="ลบบทความ"
                            >
                                <Trash2 size={20} />
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save size={20} />
                                {isSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                            </button>
                        </div>
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
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400 font-bold text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">URL (Slug)</label>
                                    <input
                                        type="text"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400 font-mono text-sm text-slate-600"
                                    />
                                </div>
                            </div>

                            {/* SEO Settings */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">🔍 SEO Settings</h3>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">คำอธิบายย่อ (Description)</label>
                                    <textarea
                                        value={excerpt}
                                        onChange={(e) => setExcerpt(e.target.value)}
                                        rows={3}
                                        placeholder="สรุปสั้นๆ ให้คนอยากคลิกอ่าน..."
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm text-slate-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">คำค้นหา (Keywords)</label>
                                    <input
                                        type="text"
                                        value={keywords}
                                        onChange={(e) => setKeywords(e.target.value)}
                                        placeholder="คณิตศาสตร์, สูตรลัด, ม.ปลาย (คั่นด้วย ,)"
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm text-slate-600"
                                    />
                                </div>
                            </div>

                            {/* Cover Image */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                                <label className="block text-sm font-bold text-slate-700">รูปปกบทความ</label>
                                
                                {/* Aspect Ratio Info */}
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                                    <p className="text-xs font-bold text-slate-600">📐 อัตราส่วนที่แนะนำ: <span className="text-teal-600">15:22</span> (แนวตั้ง)</p>
                                    <p className="text-xs text-slate-500">💾 ขนาดที่แนะนำ: <span className="font-semibold">750 × 1100 px</span> หรือ <span className="font-semibold">900 × 1320 px</span></p>
                                    <p className="text-xs text-slate-400">📦 ขนาดไฟล์: ไม่เกิน 500 KB</p>
                                </div>

                                {/* Image Upload */}
                                <div className="relative group cursor-pointer border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden min-h-[200px] flex items-center justify-center bg-slate-50 hover:bg-slate-100 transition">
                                    <input type="file" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" />
                                    {coverImageUrl ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={coverImageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center text-slate-400">
                                            <ImageIcon size={40} className="mx-auto mb-2 opacity-50" />
                                            <span className="text-sm">คลิกเพื่อเปลี่ยนรูป</span>
                                        </div>
                                    )}
                                </div>

                                {/* File Size Info */}
                                {originalSize > 0 && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                        <p className="text-xs font-bold text-emerald-700 mb-1">✅ บีบอัดรูปภาพสำเร็จ</p>
                                        <div className="flex items-center justify-between text-xs text-emerald-600">
                                            <span>ขนาดต้นฉบับ: <span className="font-semibold">{(originalSize / 1024).toFixed(0)} KB</span></span>
                                            <span>→</span>
                                            <span>หลังบีบอัด: <span className="font-semibold">{(compressedSize / 1024).toFixed(0)} KB</span></span>
                                        </div>
                                        <p className="text-xs text-emerald-500 mt-1">ประหยัด: {((1 - compressedSize / originalSize) * 100).toFixed(0)}%</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Editor */}
                        <div className="lg:col-span-2 space-y-4">
                            {/* Toolbar */}
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

                                {/* Content Type Toggle */}
                                <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setContentType('html')}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition ${contentType === 'html' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        Rich Text (HTML)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setContentType('json')}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition ${contentType === 'json' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <FileJson size={14} /> Smart Content (JSON)
                                    </button>
                                </div>
                            </div>

                            {/* Editor/Preview Area */}
                            <div className="min-h-[600px]">
                                {activeTab === 'edit' ? (
                                    contentType === 'html' ? (
                                        <TiptapEditor content={content} onChange={setContent} />
                                    ) : (
                                        <SmartJsonEditor content={content} onChange={setContent} />
                                    )
                                ) : (
                                    <div className="h-[600px] overflow-y-auto p-6 bg-slate-50/50 rounded-3xl border border-slate-200">
                                        <div
                                            className="w-full min-h-full bg-white/90 backdrop-blur-xl border border-white/50 shadow-sm rounded-3xl p-8"
                                        >
                                            {contentType === 'json' ? (
                                                <SmartContentRenderer content={content} />
                                            ) : (
                                                <div
                                                    className="prose prose-lg max-w-none text-slate-700 leading-relaxed font-medium"
                                                    dangerouslySetInnerHTML={{ __html: content }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                </form>
            </div>
        </AdminGuard>
    );
}
