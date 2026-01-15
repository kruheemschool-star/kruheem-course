"use client";

import { useState, useEffect, use } from "react";
import AdminGuard from "@/components/AdminGuard";
import Link from "next/link";
import { ArrowLeft, Save, Image as ImageIcon, Eye, Code, Trash2, Wand2, FileJson } from "lucide-react";
import TiptapEditor from "@/components/TiptapEditor";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { SmartContentRenderer } from "@/components/ContentRenderer";

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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCoverImage(e.target.files[0]);
            // Create preview URL locally
            setCoverImageUrl(URL.createObjectURL(e.target.files[0]));
        }
    };

    // 🪄 Auto-Fix JSON Logic
    const handleAutoFixJson = () => {
        try {
            let cleanJson = content.trim();
            if (!cleanJson) return;

            // 1. Remove Markdown Code Blocks
            cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");

            // 2. Remove AI Artifacts
            cleanJson = cleanJson
                .replace(/\[cite(_start|_end)?(:.*?)?\]/gi, '')
                .replace(/^Based on the provided[\s\S]*?\[/, "[");

            // 3. Fix Common Syntax Errors
            // Fix unquoted keys
            cleanJson = cleanJson.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1\"$2\"$3');
            // Fix trailing commas
            cleanJson = cleanJson.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

            // 4. Try parsing
            const parsed = JSON.parse(cleanJson); // Test parse

            // Re-format nicely
            setContent(JSON.stringify(parsed, null, 2));
            alert("🪄 Auto-Fix Complete! JSON format is valid.");
        } catch (e) {
            alert("❌ Could not auto-fix. Please check syntax manually.\n" + (e as Error).message);
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

            await updateDoc(doc(db, "posts", id), {
                title,
                slug: slug.toLowerCase().replace(/\s+/g, '-'),
                content,
                contentType,
                excerpt,
                keywords: keywordList,
                coverImage: finalCoverUrl,
                updatedAt: serverTimestamp(),
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
                                            <span className="text-sm">คลิกเพื่อเปลี่ยนรูป</span>
                                        </div>
                                    )}
                                </div>
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
                                        <div className="relative h-[600px]">
                                            <textarea
                                                value={content}
                                                onChange={(e) => setContent(e.target.value)}
                                                className="w-full h-full p-6 text-sm font-mono bg-slate-900 text-slate-200 rounded-3xl focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none leading-relaxed"
                                                placeholder={`[\n  {\n    "type": "header",\n    "content": "บทนำ"\n  },\n  {\n    "type": "definition",\n    "title": "สูตรลับ",\n    "content": "E = mc^2"\n  }\n]`}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAutoFixJson}
                                                className="absolute bottom-4 right-4 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition"
                                            >
                                                <Wand2 size={16} /> Auto Fix JSON
                                            </button>
                                        </div>
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
