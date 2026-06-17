"use client";

import { useState, useEffect, use, useRef } from "react";
import AdminGuard from "@/components/AdminGuard";
import Link from "next/link";
import { ArrowLeft, Save, Wand2, Eye, Code, Trash2, Info, PenTool, Layers } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { uploadImageToStorage } from "@/lib/upload";
import { Image as ImageIcon, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { SmartContentRenderer } from "@/components/ContentRenderer";
import TiptapEditor from "@/components/TiptapEditor";
import SummaryBlockEditor from "@/components/SummaryBlockEditor";
import imageCompression from "browser-image-compression";
import { useConfirmModal } from "@/hooks/useConfirmModal";

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

export default function EditSummaryPage({ params }: { params: Promise<{ id: string }> }) {
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();
    const { id } = use(params);
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [content, setContent] = useState("");
    const [status, setStatus] = useState<'draft' | 'published'>('draft');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
    const [detectedMeta, setDetectedMeta] = useState<ReturnType<typeof extractMetadata>>(null);

    // Category and settings fields
    const [category, setCategory] = useState("");
    const [readingTime, setReadingTime] = useState("5");

    // Cover image for homepage slideshow
    const [coverImage, setCoverImage] = useState("");
    const [uploadingCover, setUploadingCover] = useState(false);

    // Editor mode: 'blocks' (Visual Block List), 'visual' (TipTap), or 'json' (raw JSON)
    const [editorMode, setEditorMode] = useState<'blocks' | 'visual' | 'json'>('blocks');
    const [htmlContent, setHtmlContent] = useState("");
    const jsonTextareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const docRef = doc(db, "summaries", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setTitle(data.title || "");
                    setSlug(data.slug || "");
                    setContent(data.content || "");
                    setHtmlContent(data.htmlContent || "");
                    // Auto-detect editor mode based on content
                    if (data.htmlContent && data.htmlContent.trim()) {
                        setEditorMode('visual');
                    }
                    setStatus(data.status || 'draft');
                    setCategory(data.category || "");
                    setReadingTime(String(data.readingTime || "5"));
                    setCoverImage(data.coverImage || "");
                } else {
                    alert("ไม่พบบทสรุปนี้");
                    router.push("/admin/summaries");
                }
            } catch (error) {
                console.error("Error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, [id, router]);

    // Auto-detect metadata when content changes
    useEffect(() => {
        const meta = extractMetadata(content);
        setDetectedMeta(meta);
    }, [content]);



    const [uploadingImage, setUploadingImage] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            // 1. Compress image before upload
            const originalSize = file.size;

            const options = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                fileType: 'image/jpeg' as const,
                initialQuality: 0.8
            };

            const compressedFile = await imageCompression(file, options);

            // 2. Upload compressed file to Firebase Storage
            const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
            const url = await uploadImageToStorage(compressedFile, `summaries/images/${filename}`);

            // 2. Generate JSON Block
            const jsonBlock = `
    {
      "type": "image",
      "url": "${url}",
      "caption": ""
    },`;

            // 3. Smart insert at nearest block boundary
            const textarea = jsonTextareaRef.current;
            if (textarea && editorMode === 'json') {
                const cursorPos = textarea.selectionStart;

                // Find the nearest safe insertion point (after `},` or `{` at start)
                let insertPos = cursorPos;

                // Look backward for the end of a block: `},`
                const beforeCursor = content.substring(0, cursorPos);
                const lastBlockEnd = beforeCursor.lastIndexOf('},');
                const lastArrayStart = beforeCursor.lastIndexOf('[');

                if (lastBlockEnd !== -1 && lastBlockEnd > lastArrayStart) {
                    // Insert after the last `},`
                    insertPos = lastBlockEnd + 2;
                } else if (lastArrayStart !== -1) {
                    // Insert right after the array start `[`
                    insertPos = lastArrayStart + 1;
                }

                const newContent = content.substring(0, insertPos) + jsonBlock + content.substring(insertPos);
                setContent(newContent);

                setTimeout(() => {
                    textarea.focus();
                    textarea.selectionStart = textarea.selectionEnd = insertPos + jsonBlock.length;
                }, 0);

                const savedPercent = ((1 - compressedFile.size / originalSize) * 100).toFixed(0);
                alert(
                    `✅ แทรกรูปภาพเรียบร้อย!\n\n` +
                    `📦 ขนาดต้นฉบับ: ${(originalSize / 1024).toFixed(0)} KB\n` +
                    `📦 ขนาดหลังบีบอัด: ${(compressedFile.size / 1024).toFixed(0)} KB\n` +
                    `� ประหยัดพื้นที่: ${savedPercent}%\n\n` +
                    `� กรุณากด 'Auto Fix' เพื่อจัด format JSON`
                );
            } else {
                // Fallback: Copy to clipboard if not in JSON mode
                await navigator.clipboard.writeText(jsonBlock);
                const savedPercent = ((1 - compressedFile.size / originalSize) * 100).toFixed(0);
                alert(
                    `✅ อัปโหลดแล้ว! JSON ถูก Copy ไปยัง Clipboard\n\n` +
                    `📦 ขนาดต้นฉบับ: ${(originalSize / 1024).toFixed(0)} KB\n` +
                    `📦 ขนาดหลังบีบอัด: ${(compressedFile.size / 1024).toFixed(0)} KB\n` +
                    `💾 ประหยัดพื้นที่: ${savedPercent}%`
                );
            }

            // Clear input
            e.target.value = "";
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Upload failed");
        } finally {
            setUploadingImage(false);
        }
    };

    const handleAutoFixJson = () => {
        try {
            let cleanJson = content.trim();
            if (!cleanJson) return;
            // ... (rest of the function)

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

        setIsSubmitting(true);

        try {
            const meta = extractMetadata(content);

            await updateDoc(doc(db, "summaries", id), {
                title,
                slug: slug.toLowerCase().replace(/\s+/g, '-'),
                content,
                htmlContent,
                contentType: editorMode === 'visual' ? 'html' : 'json',
                coverImage: coverImage || '',
                category: category || '',
                readingTime: parseInt(readingTime) || 5,
                seo_title: meta?.seo_title || title,
                meta_description: meta?.meta_description || '',
                keywords: meta?.focus_keywords || [],
                tags: meta?.tags || [],
                reading_time: meta?.reading_time || readingTime,
                status,
                updatedAt: serverTimestamp(),
            });

            alert("อัปเดตเรียบร้อย! 🎉");
        } catch (error) {
            console.error("Error:", error);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        confirmModal("ยืนยันการลบ", "ต้องการลบบทสรุปนี้ใช่ไหม?", async () => {
            try {
                await deleteDoc(doc(db, "summaries", id));
                router.push("/admin/summaries");
            } catch (error) {
                console.error("Error:", error);
            }
        }, true);
    };

    if (loading) {
        return <div className="kh-ink3 py-20 text-center">กำลังโหลด...</div>;
    }

    return (
        <AdminGuard>
            <div className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link href="/admin/summaries" className="kh-btn-ghost">
                            <ArrowLeft size={16} />
                            กลับ
                        </Link>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="kh-btn-ghost"
                                style={{ color: "var(--danger)" }}
                            >
                                <Trash2 size={16} />
                                ลบ
                            </button>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                                className="kh-select w-auto"
                            >
                                <option value="draft">📝 ฉบับร่าง</option>
                                <option value="published">✅ เผยแพร่</option>
                            </select>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="kh-btn"
                            >
                                <Save size={16} />
                                {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column */}
                        <div className="space-y-6 lg:col-span-1">
                            <div className="kh-card p-6 space-y-4">
                                <h3 className="kh-eyebrow">📝 รายละเอียด</h3>
                                <div>
                                    <label className="block text-sm font-semibold kh-ink2 mb-1.5">ชื่อบท</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="kh-input font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold kh-ink2 mb-1.5">URL (Slug)</label>
                                    <div className="flex items-center kh-input p-0 overflow-hidden">
                                        <span className="px-3 text-sm kh-ink3 shrink-0">/summary/</span>
                                        <input
                                            type="text"
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value)}
                                            className="flex-1 bg-transparent border-0 px-0 py-2.5 focus:outline-none font-mono text-sm kh-ink2"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Cover Image for Homepage Slideshow */}
                            <div className="kh-card p-6 space-y-4">
                                <h3 className="kh-eyebrow">🖼️ รูปปกสไลด์โชว์</h3>
                                <p className="text-xs kh-ink3">รูปนี้จะแสดงในสไลด์โชว์หน้าแรก</p>
                                <div className="rounded-xl p-3 space-y-1" style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}>
                                    <p className="text-xs font-semibold kh-ink2">📐 อัตราส่วนที่แนะนำ: <span style={{ color: "var(--accent-ink)" }}>15:22</span> (แนวตั้ง)</p>
                                    <p className="text-xs kh-ink3">💾 ขนาดที่แนะนำ: <span className="font-semibold kh-ink2">750 × 1100 px</span> หรือ <span className="font-semibold kh-ink2">900 × 1320 px</span></p>
                                    <p className="text-xs kh-ink3">📦 ขนาดไฟล์: ไม่เกิน 500 KB</p>
                                </div>

                                {coverImage && (
                                    <div className="relative rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
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

                                <label
                                    className="flex flex-col items-center justify-center w-full h-24 rounded-xl cursor-pointer transition group"
                                    style={{ border: "2px dashed var(--line-2)", background: "var(--card-2)" }}
                                >
                                    <div className="flex flex-col items-center justify-center py-3">
                                        {uploadingCover ? (
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: "var(--accent)" }}></div>
                                        ) : (
                                            <>
                                                <Upload size={20} className="kh-ink3 mb-1 transition" />
                                                <p className="text-xs kh-ink2 font-medium">{coverImage ? 'เปลี่ยนรูปปก' : 'อัปโหลดรูปปก'}</p>
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

                                                // Calculate compression stats
                                                const originalSize = file.size;
                                                const compressedSize = compressedFile.size;
                                                const savedPercent = ((1 - compressedSize / originalSize) * 100).toFixed(0);

                                                // Upload compressed image
                                                const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
                                                const url = await uploadImageToStorage(compressedFile, `summaries/covers/${filename}`);
                                                setCoverImage(url);

                                                // Show compression stats
                                                alert(
                                                    `✅ อัปโหลดรูปปกสำเร็จ!\n\n` +
                                                    `📦 ขนาดต้นฉบับ: ${(originalSize / 1024).toFixed(0)} KB\n` +
                                                    `📦 ขนาดหลังบีบอัด: ${(compressedSize / 1024).toFixed(0)} KB\n` +
                                                    `💾 ประหยัดพื้นที่: ${savedPercent}%`
                                                );
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
                            <div className="kh-card p-6 space-y-4">
                                <h3 className="kh-eyebrow">⚙️ ตั้งค่า</h3>

                                {/* Category */}
                                <div>
                                    <label className="block text-sm font-semibold kh-ink2 mb-1.5">หมวดหมู่</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="kh-select font-semibold"
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
                                    <label className="block text-sm font-semibold kh-ink2 mb-1.5">เวลาอ่าน (นาที)</label>
                                    <input
                                        type="number"
                                        value={readingTime}
                                        onChange={(e) => setReadingTime(e.target.value)}
                                        min="1"
                                        max="60"
                                        className="kh-input"
                                    />
                                </div>
                            </div>

                            {/* Auto-detected Metadata Preview */}
                            {/* Media Upload Helper */}
                            <div className="kh-card p-6 space-y-4">
                                <h3 className="kh-eyebrow">
                                    <ImageIcon size={14} /> แทรกรูปภาพ
                                </h3>
                                <div>
                                    <label
                                        className="flex flex-col items-center justify-center w-full h-32 rounded-xl cursor-pointer transition group"
                                        style={{ border: "2px dashed var(--line-2)", background: "var(--card-2)" }}
                                    >
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            {uploadingImage ? (
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--accent)" }}></div>
                                            ) : (
                                                <>
                                                    <Upload size={24} className="kh-ink3 mb-2 transition" />
                                                    <p className="text-sm kh-ink2 font-medium">คลิกเพื่ออัปโหลด</p>
                                                    <p className="text-xs kh-ink3 mt-1">จะ Copy JSON ให้ทันที</p>
                                                </>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            disabled={uploadingImage}
                                        />
                                    </label>
                                </div>
                            </div>

                            {detectedMeta && (
                                <div className="kh-card p-6 space-y-3" style={{ background: "var(--good-soft)", borderColor: "color-mix(in srgb, var(--good) 30%, transparent)" }}>
                                    <h3 className="kh-eyebrow" style={{ color: "var(--good)" }}>
                                        <Info size={14} />
                                        Metadata อัตโนมัติ
                                    </h3>
                                    <div className="text-xs space-y-2" style={{ color: "var(--good)" }}>
                                        <p><strong>SEO Title:</strong> {detectedMeta.seo_title || '-'}</p>
                                        <p><strong>Description:</strong> {detectedMeta.meta_description?.slice(0, 60) || '-'}...</p>
                                        <p><strong>Keywords:</strong> {detectedMeta.focus_keywords?.slice(0, 3).join(', ') || '-'}</p>
                                        <p><strong>อ่าน:</strong> {detectedMeta.reading_time} นาที</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column */}
                        <div className="lg:col-span-2 space-y-4">
                            {/* Editor Mode Toggle */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="rounded-xl p-1 flex items-center gap-1" style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}>
                                    <button
                                        type="button"
                                        onClick={() => setEditorMode('blocks')}
                                        className="kh-tab flex items-center gap-2"
                                        data-active={editorMode === 'blocks'}
                                    >
                                        <Layers size={16} /> Blocks
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditorMode('visual')}
                                        className="kh-tab flex items-center gap-2"
                                        data-active={editorMode === 'visual'}
                                    >
                                        <PenTool size={16} /> Visual
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditorMode('json')}
                                        className="kh-tab flex items-center gap-2"
                                        data-active={editorMode === 'json'}
                                    >
                                        <Code size={16} /> JSON
                                    </button>
                                </div>
                                <div className="rounded-xl p-1 flex items-center gap-1" style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('edit')}
                                        className="kh-tab text-xs flex items-center gap-1"
                                        data-active={activeTab === 'edit'}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('preview')}
                                        className="kh-tab text-xs flex items-center gap-1"
                                        data-active={activeTab === 'preview'}
                                    >
                                        <Eye size={14} /> Preview
                                    </button>
                                </div>
                            </div>

                            <div className="min-h-[500px]">
                                {activeTab === 'edit' ? (
                                    editorMode === 'blocks' ? (
                                        /* Visual Block List Editor */
                                        <SummaryBlockEditor
                                            content={content}
                                            onChange={setContent}
                                        />
                                    ) : editorMode === 'visual' ? (
                                        /* TipTap Visual Editor */
                                        <TiptapEditor
                                            content={htmlContent}
                                            onChange={setHtmlContent}
                                        />
                                    ) : (
                                        /* JSON Editor */
                                        <div className="relative h-[500px]">
                                            <textarea
                                                ref={jsonTextareaRef}
                                                value={content}
                                                onChange={(e) => setContent(e.target.value)}
                                                className="kh-textarea w-full h-full p-6 font-mono resize-none leading-relaxed"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAutoFixJson}
                                                className="absolute bottom-4 right-4 px-4 py-2 rounded-xl font-semibold text-sm shadow-lg flex items-center gap-2 transition"
                                                style={{ background: "var(--warn)", color: "#fff" }}
                                            >
                                                <Wand2 size={16} /> Auto Fix
                                            </button>
                                        </div>
                                    )
                                ) : (
                                    /* Preview */
                                    <div className="kh-card h-[500px] overflow-y-auto p-8">
                                        {editorMode === 'visual' ? (
                                            <div
                                                className="prose prose-lg max-w-none"
                                                dangerouslySetInnerHTML={{ __html: htmlContent }}
                                            />
                                        ) : (
                                            <SmartContentRenderer content={content} />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </form>
                <ConfirmDialog />
            </div>
        </AdminGuard>
    );
}
