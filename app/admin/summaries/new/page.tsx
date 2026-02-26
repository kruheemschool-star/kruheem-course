"use client";

import { useState, useEffect } from "react";
import AdminGuard from "@/components/AdminGuard";
import Link from "next/link";
import { ArrowLeft, Save, Wand2, Eye, Code, Info } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useRouter } from "next/navigation";
import { SmartContentRenderer } from "@/components/ContentRenderer";
import { Image as ImageIcon, Upload, Trash2 } from "lucide-react";
import imageCompression from "browser-image-compression";

// Helper to extract metadata from JSON content
function extractMetadata(jsonContent: string) {
    try {
        const parsed = JSON.parse(jsonContent);
        if (parsed.metadata) {
            return {
                seo_title: parsed.metadata.seo_title || '',
                slug: parsed.metadata.slug || '',
                meta_description: parsed.metadata.meta_description || '',
                focus_keywords: parsed.metadata.focus_keywords || [],
                tags: parsed.metadata.tags || [],
                reading_time: parsed.metadata.estimated_reading_time || '5',
            };
        }
        return null;
    } catch {
        return null;
    }
}

export default function NewSummaryPage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [content, setContent] = useState("");
    const [status, setStatus] = useState<'draft' | 'published'>('published');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
    const [detectedMeta, setDetectedMeta] = useState<ReturnType<typeof extractMetadata>>(null);

    // Category and settings fields
    const [category, setCategory] = useState("");
    const [readingTime, setReadingTime] = useState("5");

    // Cover image for homepage slideshow
    const [coverImage, setCoverImage] = useState("");
    const [uploadingCover, setUploadingCover] = useState(false);

    // Auto-detect metadata when content changes
    useEffect(() => {
        const meta = extractMetadata(content);
        setDetectedMeta(meta);
        if (meta) {
            if (meta.seo_title && !title) setTitle(meta.seo_title);
            if (meta.slug && !slug) setSlug(meta.slug);
        }
    }, [content]);

    // Auto-generate slug from title (fallback)
    const handleTitleChange = (value: string) => {
        setTitle(value);
        const autoSlug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-ก-๙]/g, '');
        if (!slug) setSlug(autoSlug);
    };



    // 🪄 Auto-Fix JSON Logic
    const handleAutoFixJson = () => {
        try {
            let cleanJson = content.trim();
            if (!cleanJson) return;

            cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
            cleanJson = cleanJson
                .replace(/\[cite(_start|_end)?(:.*?)?\]/gi, '')
                .replace(/\[cite:\s*\d+[^\]]*\]/gi, '')
                .replace(/^Based on the provided[\s\S]*?\{/, "{");
            cleanJson = cleanJson.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1\"$2\"$3');
            cleanJson = cleanJson.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

            const parsed = JSON.parse(cleanJson);
            setContent(JSON.stringify(parsed, null, 2));
            alert("🪄 Auto-Fix Complete!");
        } catch (e) {
            alert("❌ Could not auto-fix.\n" + (e as Error).message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return alert("กรุณาใส่ชื่อบท");
        if (!slug.trim()) return alert("กรุณาตั้งชื่อ URL (Slug)");

        setIsSubmitting(true);

        try {
            const snapshot = await getDocs(collection(db, "summaries"));
            const newOrder = snapshot.size + 1;

            // Extract metadata from content for storage
            const meta = extractMetadata(content);

            await addDoc(collection(db, "summaries"), {
                title,
                slug: slug.toLowerCase().replace(/\s+/g, '-'),
                content,
                contentType: 'json',
                coverImage: coverImage || '',
                category: category || '',
                readingTime: parseInt(readingTime) || 5,
                // Auto-extracted from metadata
                seo_title: meta?.seo_title || title,
                meta_description: meta?.meta_description || '',
                keywords: meta?.focus_keywords || [],
                tags: meta?.tags || [],
                reading_time: meta?.reading_time || readingTime,
                status,
                order: newOrder,
                viewCount: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            alert("บันทึกเรียบร้อย! 🎉");
            router.push("/admin/summaries");

        } catch (error) {
            console.error("Error:", error);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AdminGuard>
            <div className="min-h-screen bg-white font-sans pb-20">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
                        <div className="max-w-5xl mx-auto flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Link href="/admin/summaries" className="p-2 rounded-full hover:bg-slate-100 transition text-slate-400">
                                    <ArrowLeft size={24} />
                                </Link>
                                <h1 className="text-xl font-bold text-slate-800">✨ สร้างบทสรุปใหม่</h1>
                            </div>
                            <div className="flex items-center gap-3">
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 bg-white"
                                >
                                    <option value="draft">📝 ฉบับร่าง</option>
                                    <option value="published">✅ เผยแพร่</option>
                                </select>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition disabled:opacity-50"
                                >
                                    <Save size={20} />
                                    {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
                                </button>
                            </div>
                        </div>
                    </header>

                    <main className="max-w-5xl mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Settings */}
                        <div className="space-y-6 lg:col-span-1">
                            {/* Title & Slug */}
                            <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">📝 รายละเอียด</h3>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-1">ชื่อบท</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => handleTitleChange(e.target.value)}
                                        placeholder="จะดึงจาก metadata.seo_title อัตโนมัติ"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 font-bold text-slate-800 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-1">URL (Slug)</label>
                                    <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden">
                                        <span className="px-3 text-sm text-slate-400">/summary/</span>
                                        <input
                                            type="text"
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value)}
                                            placeholder="จะดึงจาก metadata.slug"
                                            className="flex-1 px-2 py-3 focus:outline-none font-mono text-sm text-slate-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Cover Image for Homepage Slideshow */}
                            <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">🖼️ รูปปกสไลด์โชว์</h3>
                                <p className="text-xs text-slate-400">รูปนี้จะแสดงในสไลด์โชว์หน้าแรก</p>
                                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                                    <p className="text-xs font-bold text-slate-600">📐 อัตราส่วนที่แนะนำ: <span className="text-teal-600">15:22</span> (แนวตั้ง)</p>
                                    <p className="text-xs text-slate-500">💾 ขนาดที่แนะนำ: <span className="font-semibold">750 × 1100 px</span> หรือ <span className="font-semibold">900 × 1320 px</span></p>
                                    <p className="text-xs text-slate-400">📦 ขนาดไฟล์: ไม่เกิน 500 KB</p>
                                </div>

                                {coverImage && (
                                    <div className="relative rounded-xl overflow-hidden border border-slate-200">
                                        <img src={coverImage} alt="Cover" className="w-full aspect-[3/4.4] object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setCoverImage("")}
                                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}

                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-slate-50 transition group">
                                    <div className="flex flex-col items-center justify-center py-3">
                                        {uploadingCover ? (
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div>
                                        ) : (
                                            <>
                                                <Upload size={20} className="text-slate-400 mb-1 group-hover:text-slate-600 transition" />
                                                <p className="text-xs text-slate-500 font-medium">{coverImage ? 'เปลี่ยนรูปปก' : 'อัปโหลดรูปปก'}</p>
                                            </>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setUploadingCover(true);
                                            try {
                                                // Delete old image if exists
                                                if (coverImage) {
                                                    try {
                                                        const oldImageRef = ref(storage, coverImage);
                                                        await deleteObject(oldImageRef);
                                                    } catch (delErr) {
                                                        console.warn('Could not delete old cover image:', delErr);
                                                    }
                                                }

                                                // Compress image before upload
                                                const options = {
                                                    maxSizeMB: 0.5,          // Max file size 500KB
                                                    maxWidthOrHeight: 1320,  // Max dimension for 900x1320
                                                    useWebWorker: true,
                                                    fileType: 'image/jpeg',  // Convert to JPEG for better compression
                                                    initialQuality: 0.85     // High quality (85%)
                                                };
                                                
                                                const compressedFile = await imageCompression(file, options);
                                                console.log(`Original: ${(file.size / 1024 / 1024).toFixed(2)}MB → Compressed: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

                                                // Upload compressed image
                                                const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
                                                const storageRef = ref(storage, `summaries/covers/${filename}`);
                                                const snapshot = await uploadBytes(storageRef, compressedFile);
                                                const url = await getDownloadURL(snapshot.ref);
                                                setCoverImage(url);
                                            } catch (err) {
                                                console.error('Cover upload error:', err);
                                                alert('อัปโหลดรูปปกไม่สำเร็จ');
                                            } finally {
                                                setUploadingCover(false);
                                                e.target.value = '';
                                            }
                                        }}
                                        disabled={uploadingCover}
                                    />
                                </label>
                            </div>

                            {/* Category & Settings */}
                            <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">⚙️ ตั้งค่า</h3>

                                {/* Category */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-1">หมวดหมู่</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm bg-white font-bold"
                                    >
                                        <option value="">-- เลือกหมวดหมู่ --</option>
                                        <option value="ม.1">ม.1</option>
                                        <option value="ม.2">ม.2</option>
                                        <option value="ม.3">ม.3</option>
                                        <option value="ม.4">ม.4</option>
                                        <option value="ม.5">ม.5</option>
                                        <option value="ม.6">ม.6</option>
                                        <option value="Gifted">Gifted</option>
                                    </select>
                                </div>

                                {/* Reading Time */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-1">เวลาอ่าน (นาที)</label>
                                    <input
                                        type="number"
                                        value={readingTime}
                                        onChange={(e) => setReadingTime(e.target.value)}
                                        min="1"
                                        max="60"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm bg-white"
                                    />
                                </div>
                            </div>
                            {/* Auto-detected Metadata Preview */}
                            {detectedMeta && (
                                <div className="bg-emerald-50 rounded-2xl p-6 space-y-3 border border-emerald-100">
                                    <h3 className="font-bold text-emerald-700 text-sm uppercase tracking-wide flex items-center gap-2">
                                        <Info size={16} />
                                        ตรวจพบ Metadata อัตโนมัติ
                                    </h3>
                                    <div className="text-xs text-emerald-800 space-y-2">
                                        <p><strong>Title:</strong> {detectedMeta.seo_title || '-'}</p>
                                        <p><strong>Description:</strong> {detectedMeta.meta_description?.slice(0, 80) || '-'}...</p>
                                        <p><strong>Keywords:</strong> {detectedMeta.focus_keywords?.slice(0, 3).join(', ') || '-'}</p>
                                        <p><strong>อ่าน:</strong> {detectedMeta.reading_time} นาที</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Editor */}
                        <div className="lg:col-span-2 space-y-4">
                            {/* Toolbar */}
                            <div className="flex items-center gap-2">
                                <div className="bg-slate-100 rounded-xl p-1 flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('edit')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${activeTab === 'edit' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Code size={16} /> Editor
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('preview')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${activeTab === 'preview' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Eye size={16} /> Preview
                                    </button>
                                </div>
                            </div>

                            {/* Editor/Preview */}
                            <div className="min-h-[500px]">
                                {activeTab === 'edit' ? (
                                    <div className="relative h-[500px]">
                                        <textarea
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            className="w-full h-full p-6 text-sm font-mono bg-slate-900 text-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none leading-relaxed"
                                            placeholder={`{\n  "metadata": {\n    "seo_title": "...",\n    "slug": "...",\n    "meta_description": "...",\n    "focus_keywords": [...]\n  },\n  "content": [...]\n}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAutoFixJson}
                                            className="absolute bottom-4 right-4 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition"
                                        >
                                            <Wand2 size={16} /> Auto Fix
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-[500px] overflow-y-auto p-8 bg-white rounded-2xl border border-slate-100">
                                        <SmartContentRenderer content={content} />
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
