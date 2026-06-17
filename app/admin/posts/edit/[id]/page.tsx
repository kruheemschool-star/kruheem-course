"use client";

import { useState, useEffect, use } from "react";
import AdminGuard from "@/components/AdminGuard";
import { Save, Image as ImageIcon, Eye, Code, Trash2, FileJson, FilePen, Search, Check } from "lucide-react";
import TiptapEditor from "@/components/TiptapEditor";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { uploadImageToStorage } from "@/lib/upload";
import imageCompression from "browser-image-compression";
import { useRouter } from "next/navigation";
import { SmartContentRenderer } from "@/components/ContentRenderer";
import SmartJsonEditor from "@/components/admin/SmartJsonEditor";
import { useConfirmModal } from "@/hooks/useConfirmModal";

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();
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
                finalCoverUrl = await uploadImageToStorage(coverImage, `posts/${Date.now()}_${coverImage.name}`);
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
        confirmModal("ยืนยันการลบ", "คุณแน่ใจว่าต้องการลบบทความนี้? การกระทำนี้ไม่สามารถย้อนกลับได้", async () => {
            try {
                await deleteDoc(doc(db, "posts", id));
                router.push("/admin/posts");
            } catch (error) {
                console.error("Error deleting post:", error);
                alert("เกิดข้อผิดพลาดในการลบ");
            }
        }, true);
    };

    if (loading) {
        return <div className="kh-card p-12 text-center kh-ink3">กำลังโหลด...</div>;
    }

    return (
        <AdminGuard>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Toolbar */}
                <div className="kh-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                        <span className="kh-eyebrow">
                            <FilePen size={14} />
                            แก้ไขบทความ
                        </span>
                        <p className="text-xs kh-ink3 font-mono mt-1 truncate">ID: {id}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="kh-btn-ghost"
                            style={{ color: "var(--danger)" }}
                            title="ลบบทความ"
                        >
                            <Trash2 size={18} />
                            ลบ
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="kh-btn whitespace-nowrap"
                        >
                            <Save size={18} />
                            {isSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Settings */}
                    <div className="space-y-6 lg:col-span-1">
                        {/* Title & Slug */}
                        <div className="kh-card p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-bold kh-ink mb-1.5">หัวข้อบทความ</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="kh-input font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold kh-ink mb-1.5">URL (Slug)</label>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    className="kh-input font-mono text-sm"
                                />
                            </div>
                        </div>

                        {/* SEO Settings */}
                        <div className="kh-card p-5 space-y-4">
                            <h3 className="font-bold kh-ink flex items-center gap-2">
                                <Search size={16} style={{ color: "var(--accent)" }} /> SEO Settings
                            </h3>
                            <div>
                                <label className="block text-sm font-bold kh-ink mb-1.5">คำอธิบายย่อ (Description)</label>
                                <textarea
                                    value={excerpt}
                                    onChange={(e) => setExcerpt(e.target.value)}
                                    rows={3}
                                    placeholder="สรุปสั้นๆ ให้คนอยากคลิกอ่าน..."
                                    className="kh-textarea text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold kh-ink mb-1.5">คำค้นหา (Keywords)</label>
                                <input
                                    type="text"
                                    value={keywords}
                                    onChange={(e) => setKeywords(e.target.value)}
                                    placeholder="คณิตศาสตร์, สูตรลัด, ม.ปลาย (คั่นด้วย ,)"
                                    className="kh-input text-sm"
                                />
                            </div>
                        </div>

                        {/* Cover Image */}
                        <div className="kh-card p-5 space-y-4">
                            <label className="block text-sm font-bold kh-ink">รูปปกบทความ</label>

                            {/* Aspect Ratio Info */}
                            <div className="rounded-xl p-3 space-y-1" style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}>
                                <p className="text-xs font-bold kh-ink2">อัตราส่วนที่แนะนำ: <span style={{ color: "var(--accent)" }}>15:22</span> (แนวตั้ง)</p>
                                <p className="text-xs kh-ink2">ขนาดที่แนะนำ: <span className="font-semibold">750 × 1100 px</span> หรือ <span className="font-semibold">900 × 1320 px</span></p>
                                <p className="text-xs kh-ink3">ขนาดไฟล์: ไม่เกิน 500 KB</p>
                            </div>

                            {/* Image Upload */}
                            <div
                                className="relative group cursor-pointer rounded-2xl overflow-hidden min-h-[200px] flex items-center justify-center transition"
                                style={{ border: "2px dashed var(--line-2)", background: "var(--card-2)" }}
                            >
                                <input type="file" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" />
                                {coverImageUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={coverImageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center kh-ink3">
                                        <ImageIcon size={40} className="mx-auto mb-2 opacity-60" />
                                        <span className="text-sm">คลิกเพื่อเปลี่ยนรูป</span>
                                    </div>
                                )}
                            </div>

                            {/* File Size Info */}
                            {originalSize > 0 && (
                                <div className="rounded-xl p-3" style={{ background: "var(--good-soft)", border: "1px solid color-mix(in srgb, var(--good) 30%, transparent)" }}>
                                    <p className="text-xs font-bold mb-1 inline-flex items-center gap-1.5" style={{ color: "var(--good)" }}>
                                        <Check size={14} /> บีบอัดรูปภาพสำเร็จ
                                    </p>
                                    <div className="flex items-center justify-between text-xs" style={{ color: "var(--good)" }}>
                                        <span>ขนาดต้นฉบับ: <span className="font-semibold">{(originalSize / 1024).toFixed(0)} KB</span></span>
                                        <span>→</span>
                                        <span>หลังบีบอัด: <span className="font-semibold">{(compressedSize / 1024).toFixed(0)} KB</span></span>
                                    </div>
                                    <p className="text-xs mt-1" style={{ color: "var(--good)" }}>ประหยัด: {((1 - compressedSize / originalSize) * 100).toFixed(0)}%</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Editor */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('edit')}
                                    className="kh-tab"
                                    data-active={activeTab === 'edit'}
                                >
                                    <Code size={16} /> Editor
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('preview')}
                                    className="kh-tab"
                                    data-active={activeTab === 'preview'}
                                >
                                    <Eye size={16} /> Final Preview
                                </button>
                            </div>

                            {/* Content Type Toggle */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setContentType('html')}
                                    className="kh-tab"
                                    data-active={contentType === 'html'}
                                >
                                    Rich Text (HTML)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setContentType('json')}
                                    className="kh-tab"
                                    data-active={contentType === 'json'}
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
                                <div className="kh-card h-[600px] overflow-y-auto p-6" style={{ background: "var(--card-2)" }}>
                                    <div className="kh-card w-full min-h-full p-8">
                                        {contentType === 'json' ? (
                                            <SmartContentRenderer content={content} />
                                        ) : (
                                            <div
                                                className="prose prose-lg max-w-none kh-ink2 leading-relaxed font-medium"
                                                dangerouslySetInnerHTML={{ __html: content }}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <ConfirmDialog />
            </form>
        </AdminGuard>
    );
}
