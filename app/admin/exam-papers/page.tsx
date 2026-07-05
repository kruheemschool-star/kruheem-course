"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { uploadPublicFile, uploadPrivateFile, deleteStorageFile } from "@/lib/pdfUpload";
import { uploadImageToStorage } from "@/lib/upload";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import type { ExamPaper } from "@/types";
import toast, { Toaster } from "react-hot-toast";
import { Plus, FileText, Trash2, Pencil, Eye, EyeOff, ImagePlus, UploadCloud, FileCheck2, X, Loader2, Lock } from "lucide-react";

const LEVELS = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6", "อื่นๆ"];
const CATEGORIES = ["O-NET", "A-Level", "สอบกลางภาค", "สอบปลายภาค", "สอบเข้า", "แนวข้อสอบ", "อื่นๆ"];

// Blank draft used by the editor.
const emptyForm = {
    title: "",
    description: "",
    price: 0,
    level: "ม.6",
    category: "O-NET",
    pageCount: 0,
    questionCount: 0,
    hidden: false,
};

export default function AdminExamPapersPage() {
    const { confirm, ConfirmDialog } = useConfirmModal();
    const [papers, setPapers] = useState<ExamPaper[]>([]);
    const [loading, setLoading] = useState(true);

    // editor state
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...emptyForm });

    // file staging
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string>("");   // existing url or objectURL
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const [previewName, setPreviewName] = useState<string>("");     // existing preview label
    const [masterFile, setMasterFile] = useState<File | null>(null);
    const [masterName, setMasterName] = useState<string>("");       // existing master filename

    // Storage paths already on this paper, so we can delete the OLD file when
    // it gets replaced by a new upload (otherwise every edit leaves an orphan
    // behind in Storage, quietly growing usage/cost).
    const [existingPaths, setExistingPaths] = useState<{ cover?: string; preview?: string; pdf?: string }>({});

    const [saving, setSaving] = useState(false);
    const [progressLabel, setProgressLabel] = useState("");
    const coverInputRef = useRef<HTMLInputElement>(null);
    const previewInputRef = useRef<HTMLInputElement>(null);
    const masterInputRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const snap = await getDocs(query(collection(db, "examPapers"), orderBy("order", "asc")));
            setPapers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as ExamPaper[]);
        } catch {
            // Fall back to unordered read if the composite index/order field is missing.
            const snap = await getDocs(collection(db, "examPapers"));
            setPapers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as ExamPaper[]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...emptyForm });
        setCoverFile(null); setCoverPreview("");
        setPreviewFile(null); setPreviewName("");
        setMasterFile(null); setMasterName("");
        setExistingPaths({});
        setEditorOpen(true);
    };

    const openEdit = (p: ExamPaper) => {
        setEditingId(p.id);
        setForm({
            title: p.title || "",
            description: p.description || "",
            price: Number(p.price || 0),
            level: p.level || "ม.6",
            category: p.category || "O-NET",
            pageCount: Number(p.pageCount || 0),
            questionCount: Number(p.questionCount || 0),
            hidden: !!p.hidden,
        });
        setCoverFile(null); setCoverPreview(p.coverUrl || "");
        setPreviewFile(null); setPreviewName(p.previewUrl ? "มีไฟล์ตัวอย่างแล้ว" : "");
        setMasterFile(null); setMasterName(p.pdfName || (p.pdfPath ? "มีไฟล์ต้นฉบับแล้ว" : ""));
        setExistingPaths({ cover: p.coverPath, preview: p.previewPath, pdf: p.pdfPath });
        setEditorOpen(true);
    };

    const closeEditor = () => {
        if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
        setEditorOpen(false);
    };

    const onPickCover = (f: File | null) => {
        if (!f) return;
        if (!f.type.startsWith("image/")) return toast.error("หน้าปกต้องเป็นรูปภาพ");
        if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
        setCoverFile(f);
        setCoverPreview(URL.createObjectURL(f));
    };

    const onPickPdf = (f: File | null, kind: "preview" | "master") => {
        if (!f) return;
        if (f.type !== "application/pdf") return toast.error("ต้องเป็นไฟล์ PDF เท่านั้น");
        const maxMb = kind === "master" ? 50 : 10;
        if (f.size > maxMb * 1024 * 1024) return toast.error(`ไฟล์ใหญ่เกิน ${maxMb}MB`);
        if (kind === "master") { setMasterFile(f); setMasterName(f.name); }
        else { setPreviewFile(f); setPreviewName(f.name); }
    };

    const handleSave = async () => {
        if (!form.title.trim()) return toast.error("กรุณากรอกชื่อชุดข้อสอบ");
        if (form.price < 0) return toast.error("ราคาต้องไม่ติดลบ");
        if (!editingId && !masterFile) return toast.error("กรุณาแนบไฟล์ PDF ต้นฉบับ");

        setSaving(true);
        try {
            // 1. Ensure we have a doc id (need it for the private storage path).
            let paperId = editingId;
            if (!paperId) {
                setProgressLabel("กำลังสร้างรายการ...");
                const ref = await addDoc(collection(db, "examPapers"), {
                    title: form.title.trim(),
                    price: Number(form.price),
                    hidden: form.hidden,
                    order: papers.length,
                    createdAt: serverTimestamp(),
                });
                paperId = ref.id;
            }

            const patch: Record<string, unknown> = {
                title: form.title.trim(),
                description: form.description.trim(),
                price: Number(form.price),
                level: form.level,
                category: form.category,
                pageCount: Number(form.pageCount) || 0,
                questionCount: Number(form.questionCount) || 0,
                hidden: form.hidden,
                updatedAt: serverTimestamp(),
            };

            // 2. Cover (public image). Track the new path so we can wipe the old
            //    file after the new one is safely uploaded and saved.
            let newCoverPath: string | undefined;
            if (coverFile) {
                setProgressLabel("กำลังอัปโหลดหน้าปก...");
                newCoverPath = `exam-paper-covers/${paperId}_${Date.now()}.jpg`;
                patch.coverUrl = await uploadImageToStorage(coverFile, newCoverPath, { maxSizeMB: 0.5, maxWidthOrHeight: 1200 });
                patch.coverPath = newCoverPath;
            }

            // 3. Free preview (public PDF, optional).
            let newPreviewPath: string | undefined;
            if (previewFile) {
                setProgressLabel("กำลังอัปโหลดไฟล์ตัวอย่าง...");
                newPreviewPath = `exam-paper-previews/${paperId}_${Date.now()}.pdf`;
                patch.previewUrl = await uploadPublicFile(
                    previewFile,
                    newPreviewPath,
                    (p) => setProgressLabel(`กำลังอัปโหลดไฟล์ตัวอย่าง... ${p}%`),
                );
                patch.previewPath = newPreviewPath;
            }

            // 4. Master PDF (PRIVATE — store the path only, never a public URL).
            let newPdfPath: string | undefined;
            if (masterFile) {
                setProgressLabel("กำลังอัปโหลดไฟล์ต้นฉบับ...");
                newPdfPath = `exam-pdfs/${paperId}/${Date.now()}_${masterFile.name.replace(/[^\w.\-]/g, "_")}`;
                patch.pdfPath = await uploadPrivateFile(
                    masterFile,
                    newPdfPath,
                    (p) => setProgressLabel(`กำลังอัปโหลดไฟล์ต้นฉบับ... ${p}%`),
                );
                patch.pdfName = masterFile.name;
            }

            setProgressLabel("กำลังบันทึก...");
            await updateDoc(doc(db, "examPapers", paperId), patch);

            // 5. Only now that the doc points at the new files, delete whichever
            //    OLD files got replaced — otherwise a crash between upload and
            //    save could orphan the new file while the doc still needs it.
            await Promise.allSettled([
                newCoverPath && existingPaths.cover ? deleteStorageFile(existingPaths.cover) : Promise.resolve(),
                newPreviewPath && existingPaths.preview ? deleteStorageFile(existingPaths.preview) : Promise.resolve(),
                newPdfPath && existingPaths.pdf ? deleteStorageFile(existingPaths.pdf) : Promise.resolve(),
            ]);

            toast.success(editingId ? "บันทึกการแก้ไขแล้ว" : "เพิ่มชุดข้อสอบแล้ว");
            closeEditor();
            await load();
        } catch (err) {
            console.error(err);
            toast.error("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
        } finally {
            setSaving(false);
            setProgressLabel("");
        }
    };

    const handleDelete = (p: ExamPaper) => {
        confirm(
            "ลบชุดข้อสอบนี้?",
            `"${p.title}" จะถูกลบออกจากหน้าร้านพร้อมไฟล์ทั้งหมด (ไฟล์ที่ลูกค้าซื้อไปแล้วจะดาวน์โหลดไม่ได้อีก)`,
            async () => {
                try {
                    // Delete the actual Storage files FIRST — best-effort, each
                    // failure is independent so a missing/already-gone file never
                    // blocks the others. Only after that remove the catalog entry,
                    // so nothing is left orphaned in Storage racking up cost.
                    await Promise.allSettled([
                        deleteStorageFile(p.coverPath),
                        deleteStorageFile(p.previewPath),
                        deleteStorageFile(p.pdfPath),
                    ]);
                    await deleteDoc(doc(db, "examPapers", p.id));
                    toast.success("ลบแล้ว");
                    setPapers((prev) => prev.filter((x) => x.id !== p.id));
                } catch {
                    toast.error("ลบไม่สำเร็จ");
                }
            },
            true,
        );
    };

    const toggleHidden = async (p: ExamPaper) => {
        try {
            await updateDoc(doc(db, "examPapers", p.id), { hidden: !p.hidden });
            setPapers((prev) => prev.map((x) => (x.id === p.id ? { ...x, hidden: !p.hidden } : x)));
        } catch {
            toast.error("อัปเดตไม่สำเร็จ");
        }
    };

    return (
        <div className="space-y-6">
            <Toaster position="top-center" />
            <ConfirmDialog />

            {/* header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold kh-ink flex items-center gap-2">
                        <FileText size={24} style={{ color: "var(--accent)" }} /> ขายข้อสอบ PDF
                    </h1>
                    <p className="kh-ink3 text-sm mt-1">อัปโหลดไฟล์ข้อสอบต้นฉบับ ตั้งราคา แล้วลูกค้าซื้อ-ดาวน์โหลดได้เอง</p>
                </div>
                <button className="kh-btn" onClick={openCreate}>
                    <Plus size={18} /> เพิ่มชุดข้อสอบ
                </button>
            </div>

            {/* list */}
            {loading ? (
                <div className="kh-card p-10 flex items-center justify-center kh-ink3">
                    <Loader2 className="animate-spin mr-2" size={20} /> กำลังโหลด...
                </div>
            ) : papers.length === 0 ? (
                <div className="kh-card p-12 text-center">
                    <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--accent-soft)" }}>
                        <UploadCloud size={26} style={{ color: "var(--accent)" }} />
                    </div>
                    <div className="font-bold kh-ink mb-1">ยังไม่มีข้อสอบ PDF ในร้าน</div>
                    <div className="kh-ink3 text-sm mb-5">กดปุ่มด้านล่างเพื่ออัปโหลดชุดแรกของครู</div>
                    <button className="kh-btn" onClick={openCreate}><Plus size={18} /> เพิ่มชุดข้อสอบ</button>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {papers.map((p) => (
                        <div key={p.id} className="kh-card overflow-hidden flex flex-col" style={{ opacity: p.hidden ? 0.6 : 1 }}>
                            <div className="relative aspect-[4/3] bg-[var(--card-2)] flex items-center justify-center overflow-hidden">
                                {p.coverUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={p.coverUrl} alt={p.title} className="w-full h-full object-cover" />
                                ) : (
                                    <FileText size={40} style={{ color: "var(--ink-3)" }} />
                                )}
                                {p.hidden && <span className="kh-pill kh-pill-danger no-dot absolute top-2 left-2">ซ่อนอยู่</span>}
                                {!p.pdfPath && <span className="kh-pill kh-pill-warn no-dot absolute top-2 right-2">ยังไม่มีไฟล์</span>}
                            </div>
                            <div className="p-4 flex flex-col flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    {p.level && <span className="kh-pill kh-pill-accent no-dot">{p.level}</span>}
                                    {p.category && <span className="kh-pill kh-pill-ink no-dot">{p.category}</span>}
                                </div>
                                <div className="font-bold kh-ink line-clamp-2">{p.title}</div>
                                {p.description && <div className="text-xs kh-ink3 line-clamp-2 mt-1">{p.description}</div>}
                                <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: "var(--line)" }}>
                                    <span className="text-lg font-bold" style={{ color: "var(--accent-ink)" }}>฿{Number(p.price || 0).toLocaleString()}</span>
                                    <span className="text-xs kh-ink3">{p.pageCount ? `${p.pageCount} หน้า` : ""}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <button className="kh-btn-ghost flex-1 justify-center" onClick={() => openEdit(p)}><Pencil size={15} /> แก้ไข</button>
                                    <button className="kh-btn-ghost" onClick={() => toggleHidden(p)} title={p.hidden ? "แสดง" : "ซ่อน"} aria-label={p.hidden ? "แสดง" : "ซ่อน"}>
                                        {p.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                    <button className="kh-btn-ghost" onClick={() => handleDelete(p)} title="ลบ" aria-label="ลบ" style={{ color: "var(--danger)" }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* editor drawer */}
            {editorOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(12,24,22,0.55)", backdropFilter: "blur(4px)" }} onClick={closeEditor}>
                    <div className="kh-card w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-xl font-bold kh-ink">{editingId ? "แก้ไขชุดข้อสอบ" : "เพิ่มชุดข้อสอบ PDF"}</h2>
                            <button className="kh-btn-ghost" onClick={closeEditor} aria-label="ปิด"><X size={18} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium kh-ink mb-1">ชื่อชุดข้อสอบ *</label>
                                <input className="kh-input w-full" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="เช่น ข้อสอบ O-NET คณิต ม.6 ปี 2568 พร้อมเฉลย" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium kh-ink mb-1">คำอธิบายสั้นๆ</label>
                                <textarea className="kh-textarea w-full" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="บอกว่าในไฟล์มีอะไรบ้าง เช่น 30 ข้อ พร้อมเฉลยละเอียดทุกข้อ" />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-sm font-medium kh-ink mb-1">ราคา (บาท) *</label>
                                    <input type="number" min={0} className="kh-input w-full" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium kh-ink mb-1">ระดับชั้น</label>
                                    <select className="kh-select w-full" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                                        {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium kh-ink mb-1">หมวด</label>
                                    <select className="kh-select w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium kh-ink mb-1">จำนวนข้อ</label>
                                    <input type="number" min={0} className="kh-input w-full" value={form.questionCount} onChange={(e) => setForm({ ...form, questionCount: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium kh-ink mb-1">จำนวนหน้า</label>
                                    <input type="number" min={0} className="kh-input w-full" value={form.pageCount} onChange={(e) => setForm({ ...form, pageCount: Number(e.target.value) })} />
                                </div>
                            </div>

                            {/* cover */}
                            <div>
                                <label className="block text-sm font-medium kh-ink mb-1">หน้าปก (รูปภาพ)</label>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 h-24 rounded-xl bg-[var(--card-2)] border flex items-center justify-center overflow-hidden shrink-0" style={{ borderColor: "var(--line)" }}>
                                        {coverPreview ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={coverPreview} alt="ปก" className="w-full h-full object-cover" />
                                        ) : <ImagePlus size={22} style={{ color: "var(--ink-3)" }} />}
                                    </div>
                                    <div>
                                        <button type="button" className="kh-btn-ghost" onClick={() => coverInputRef.current?.click()}><ImagePlus size={16} /> เลือกรูปปก</button>
                                        <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={(e) => onPickCover(e.target.files?.[0] || null)} />
                                        <p className="text-xs kh-ink3 mt-1">แนะนำสัดส่วน 4:3 เห็นชื่อชุดชัดๆ</p>
                                    </div>
                                </div>
                            </div>

                            {/* master pdf */}
                            <div className="kh-card p-4" style={{ background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
                                <label className="text-sm font-medium kh-ink mb-1 flex items-center gap-1.5"><Lock size={14} style={{ color: "var(--accent-ink)" }} /> ไฟล์ PDF ต้นฉบับ (ที่ลูกค้าจะได้เมื่อจ่ายเงิน) *</label>
                                <div className="flex items-center gap-3 mt-2">
                                    <button type="button" className="kh-btn" onClick={() => masterInputRef.current?.click()}><UploadCloud size={16} /> เลือกไฟล์ PDF</button>
                                    <input ref={masterInputRef} type="file" accept="application/pdf" hidden onChange={(e) => onPickPdf(e.target.files?.[0] || null, "master")} />
                                    {masterName && <span className="text-sm kh-ink flex items-center gap-1.5"><FileCheck2 size={16} style={{ color: "var(--good)" }} /> {masterName}</span>}
                                </div>
                                <p className="text-xs kh-ink3 mt-2">ไฟล์นี้เก็บเป็นความลับ เปิดตรงๆ ไม่ได้ ลูกค้าดาวน์โหลดผ่านลิงก์ชั่วคราวหลังครูอนุมัติเท่านั้น (สูงสุด 50MB)</p>
                            </div>

                            {/* preview pdf */}
                            <div>
                                <label className="block text-sm font-medium kh-ink mb-1">ไฟล์ตัวอย่างฟรี (PDF, ไม่บังคับ)</label>
                                <div className="flex items-center gap-3">
                                    <button type="button" className="kh-btn-ghost" onClick={() => previewInputRef.current?.click()}><UploadCloud size={16} /> เลือกไฟล์ตัวอย่าง</button>
                                    <input ref={previewInputRef} type="file" accept="application/pdf" hidden onChange={(e) => onPickPdf(e.target.files?.[0] || null, "preview")} />
                                    {previewName && <span className="text-sm kh-ink flex items-center gap-1.5"><FileCheck2 size={16} style={{ color: "var(--good)" }} /> {previewName}</span>}
                                </div>
                                <p className="text-xs kh-ink3 mt-1">แนะนำให้ตัดมา 1–2 หน้าแรก ให้ลูกค้าดูก่อนซื้อ ช่วยเพิ่มยอดขาย</p>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" checked={form.hidden} onChange={(e) => setForm({ ...form, hidden: e.target.checked })} />
                                <span className="text-sm kh-ink">ซ่อนจากหน้าร้าน (บันทึกเป็นฉบับร่างก่อน)</span>
                            </label>
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
                            {saving && <span className="text-sm kh-ink3 flex items-center gap-1.5 mr-auto"><Loader2 className="animate-spin" size={15} /> {progressLabel}</span>}
                            <button className="kh-btn-ghost" onClick={closeEditor} disabled={saving}>ยกเลิก</button>
                            <button className="kh-btn" onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="animate-spin" size={16} /> : <FileCheck2 size={16} />} บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
