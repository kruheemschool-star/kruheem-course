"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, deleteField } from "firebase/firestore";
import { uploadPublicFile, uploadPrivateFile, deleteStorageFile } from "@/lib/pdfUpload";
import { uploadImageToStorage } from "@/lib/upload";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import type { ExamPaper, ExamPaperFile, ExamPaperAnalysis } from "@/types";
import toast, { Toaster } from "react-hot-toast";
import { Plus, FileText, Trash2, Pencil, Eye, EyeOff, ImagePlus, UploadCloud, FileCheck2, X, Loader2, Lock, GripVertical, BarChart3 } from "lucide-react";

// A file row in the editor: either already-uploaded (has `path`) or freshly
// staged (has `file`, not yet uploaded).
type EditFile = { id: string; label: string; name: string; path?: string; file?: File };

// Read a paper's files, falling back to the legacy single-file fields.
function filesOf(p: ExamPaper): EditFile[] {
    if (p.files?.length) return p.files.map((f) => ({ id: f.id, label: f.label, name: f.name, path: f.path }));
    if (p.pdfPath) return [{ id: "legacy", label: "ชุดที่ 1", name: p.pdfName || "ข้อสอบ.pdf", path: p.pdfPath }];
    return [];
}

const LEVELS = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6", "อื่นๆ"];
const CATEGORIES = ["O-NET", "A-Level", "สอบกลางภาค", "สอบปลายภาค", "สอบเข้า", "แนวข้อสอบ", "อื่นๆ"];
// The 3 standard parts of an exam set (+ extras). Used as the file-label
// presets so ครูฮีม picks a type instead of typing it. First 3 files default
// to ตัวข้อสอบ / กระดาษคำตอบ / เฉลย in order.
const FILE_PARTS = ["ตัวข้อสอบ", "กระดาษคำตอบ", "เฉลย", "เอกสารวิเคราะห์"];
const partForIndex = (i: number) => FILE_PARTS[i] || `ไฟล์ที่ ${i + 1}`;

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

    // The sellable PDF set(s). Each row is one complete exam ("ชุดที่ N").
    const [files, setFiles] = useState<EditFile[]>([]);
    const [origFilePaths, setOrigFilePaths] = useState<string[]>([]); // to delete removed files on save

    // "วิเคราะห์แนวข้อสอบ" — optional sales section (bar chart of chapter %).
    const [analysis, setAnalysis] = useState<ExamPaperAnalysis>({});

    // Storage paths already on this paper, so we can delete the OLD file when
    // it gets replaced by a new upload (otherwise every edit leaves an orphan
    // behind in Storage, quietly growing usage/cost).
    const [existingPaths, setExistingPaths] = useState<{ cover?: string; preview?: string }>({});

    const [saving, setSaving] = useState(false);
    const [progressLabel, setProgressLabel] = useState("");
    const coverInputRef = useRef<HTMLInputElement>(null);
    const previewInputRef = useRef<HTMLInputElement>(null);
    const filesInputRef = useRef<HTMLInputElement>(null);
    const articleInputRef = useRef<HTMLInputElement>(null);

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

    // Bust the public shop's ISR cache so admin changes show instantly instead of
    // waiting out the 5-minute window. Best-effort — the change is already saved.
    const bustShopCache = useCallback(async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) return;
            await fetch("/api/revalidate-exam-papers", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch { /* non-fatal */ }
    }, []);

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...emptyForm });
        setCoverFile(null); setCoverPreview("");
        setPreviewFile(null); setPreviewName("");
        setFiles([]); setOrigFilePaths([]);
        setAnalysis({});
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
        const existing = filesOf(p);
        setFiles(existing);
        setOrigFilePaths(existing.map((f) => f.path).filter(Boolean) as string[]);
        setAnalysis(p.analysis || {});
        setExistingPaths({ cover: p.coverPath, preview: p.previewPath });
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

    const onPickPreview = (f: File | null) => {
        if (!f) return;
        if (f.type !== "application/pdf") return toast.error("ต้องเป็นไฟล์ PDF เท่านั้น");
        if (f.size > 10 * 1024 * 1024) return toast.error("ไฟล์ใหญ่เกิน 10MB");
        setPreviewFile(f); setPreviewName(f.name);
    };

    // Add one or more master PDFs to the set. Each defaults to a "ชุดที่ N" label.
    const onAddFiles = (list: FileList | null) => {
        if (!list?.length) return;
        const picked: EditFile[] = [];
        Array.from(list).forEach((f) => {
            if (f.type !== "application/pdf") { toast.error(`"${f.name}" ไม่ใช่ไฟล์ PDF`); return; }
            if (f.size > 50 * 1024 * 1024) { toast.error(`"${f.name}" ใหญ่เกิน 50MB`); return; }
            picked.push({ id: crypto.randomUUID(), label: "", name: f.name, file: f });
        });
        if (picked.length) {
            setFiles((prev) => {
                const merged = [...prev, ...picked];
                // Default blank labels to the standard parts by position.
                return merged.map((f, i) => ({ ...f, label: f.label || partForIndex(i) }));
            });
        }
    };
    const setFileLabel = (id: string, label: string) => setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, label } : f)));
    const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

    // --- analysis (วิเคราะห์แนวข้อสอบ) editing ---
    const chapters = analysis.chapters || [];
    const addChapter = () => setAnalysis((a) => ({ ...a, chapters: [...(a.chapters || []), { name: "", percent: 0 }] }));
    const setChapter = (i: number, patch: Partial<{ name: string; percent: number }>) =>
        setAnalysis((a) => ({ ...a, chapters: (a.chapters || []).map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }));
    const removeChapter = (i: number) =>
        setAnalysis((a) => ({ ...a, chapters: (a.chapters || []).filter((_, idx) => idx !== i) }));

    // Load a .md file straight into the article textarea (kept editable after).
    const onPickArticle = async (f: File | null) => {
        if (!f) return;
        if (f.size > 400 * 1024) return toast.error("ไฟล์ใหญ่เกิน 400KB");
        try {
            const text = await f.text();
            setAnalysis((a) => ({ ...a, article: text }));
            toast.success(`อ่านไฟล์ "${f.name}" เรียบร้อย`);
        } catch {
            toast.error("อ่านไฟล์ไม่สำเร็จ ลองใหม่อีกครั้ง");
        }
    };

    // Strip empty rows/fields so we never store a blank analysis object.
    const cleanAnalysis = (): ExamPaperAnalysis | null => {
        const rows = (analysis.chapters || []).filter((c) => c.name.trim() !== "").map((c) => ({ name: c.name.trim(), percent: Number(c.percent) || 0 }));
        const out: ExamPaperAnalysis = {};
        if (analysis.headline?.trim()) out.headline = analysis.headline.trim();
        if (analysis.note?.trim()) out.note = analysis.note.trim();
        if (Number(analysis.years) > 0) out.years = Number(analysis.years);
        if (Number(analysis.totalQuestions) > 0) out.totalQuestions = Number(analysis.totalQuestions);
        if (Number(analysis.coverage) > 0) out.coverage = Number(analysis.coverage);
        if (rows.length) out.chapters = rows;
        if (analysis.article?.trim()) out.article = analysis.article.trim();
        return Object.keys(out).length ? out : null;
    };

    const handleSave = async () => {
        if (!form.title.trim()) return toast.error("กรุณากรอกชื่อชุดข้อสอบ");
        if (form.price < 0) return toast.error("ราคาต้องไม่ติดลบ");
        if (files.length === 0) return toast.error("กรุณาแนบไฟล์ข้อสอบอย่างน้อย 1 ไฟล์");

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
                analysis: cleanAnalysis() ?? deleteField(),
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

            // 4. Master PDF set (PRIVATE — store paths only, never public URLs).
            //    Upload any newly-staged files; keep already-uploaded ones as-is.
            const finalFiles: ExamPaperFile[] = [];
            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                const label = f.label.trim() || partForIndex(i);
                if (f.file) {
                    setProgressLabel(`กำลังอัปโหลดไฟล์ ${i + 1}/${files.length}...`);
                    const path = `exam-pdfs/${paperId}/${Date.now()}_${i}_${f.file.name.replace(/[^\w.\-]/g, "_")}`;
                    await uploadPrivateFile(f.file, path, (p) => setProgressLabel(`กำลังอัปโหลดไฟล์ ${i + 1}/${files.length}... ${p}%`));
                    finalFiles.push({ id: f.id, label, name: f.file.name, path });
                } else if (f.path) {
                    finalFiles.push({ id: f.id, label, name: f.name, path: f.path });
                }
            }
            patch.files = finalFiles;
            // Retire the legacy single-file fields — the app now reads `files`.
            patch.pdfPath = deleteField();
            patch.pdfName = deleteField();

            setProgressLabel("กำลังบันทึก...");
            await updateDoc(doc(db, "examPapers", paperId), patch);

            // 5. Only now that the doc points at the new files, delete whichever
            //    OLD files were removed/replaced — a crash between upload and save
            //    would otherwise orphan a still-needed file. Compare original
            //    paths against the ones we just saved.
            const keptPaths = new Set(finalFiles.map((f) => f.path));
            const removedFilePaths = origFilePaths.filter((p) => !keptPaths.has(p));
            await Promise.allSettled([
                newCoverPath && existingPaths.cover ? deleteStorageFile(existingPaths.cover) : Promise.resolve(),
                newPreviewPath && existingPaths.preview ? deleteStorageFile(existingPaths.preview) : Promise.resolve(),
                ...removedFilePaths.map((p) => deleteStorageFile(p)),
            ]);

            toast.success(editingId ? "บันทึกการแก้ไขแล้ว" : "เพิ่มชุดข้อสอบแล้ว");
            closeEditor();
            await load();
            bustShopCache();
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
                        ...filesOf(p).map((f) => deleteStorageFile(f.path)),
                    ]);
                    await deleteDoc(doc(db, "examPapers", p.id));
                    toast.success("ลบแล้ว");
                    setPapers((prev) => prev.filter((x) => x.id !== p.id));
                    bustShopCache();
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
            bustShopCache();
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
                                {filesOf(p).length === 0
                                    ? <span className="kh-pill kh-pill-warn no-dot absolute top-2 right-2">ยังไม่มีไฟล์</span>
                                    : filesOf(p).length > 1 && <span className="kh-pill kh-pill-ink no-dot absolute top-2 right-2">{filesOf(p).length} ชุด</span>}
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
                                    <input type="number" min={0} className="kh-input w-full" placeholder="0" value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })} />
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
                                    <input type="number" min={0} className="kh-input w-full" placeholder="0" value={form.questionCount || ""} onChange={(e) => setForm({ ...form, questionCount: Number(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium kh-ink mb-1">จำนวนหน้า</label>
                                    <input type="number" min={0} className="kh-input w-full" placeholder="0" value={form.pageCount || ""} onChange={(e) => setForm({ ...form, pageCount: Number(e.target.value) || 0 })} />
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

                            {/* master pdf set — one or many files */}
                            <div className="kh-card p-4" style={{ background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
                                <label className="text-sm font-medium kh-ink flex items-center gap-1.5"><Lock size={14} style={{ color: "var(--accent-ink)" }} /> ไฟล์ในชุดนี้ · ตัวข้อสอบ / กระดาษคำตอบ / เฉลย *</label>
                                <p className="text-xs kh-ink3 mt-1 mb-3">อัปโหลดทั้ง 3 ไฟล์ แล้วเลือกประเภทให้แต่ละไฟล์ ลูกค้าจ่ายครั้งเดียวได้ครบทุกไฟล์ · สูงสุดไฟล์ละ 50MB</p>

                                {files.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                        {files.map((f) => (
                                            <div key={f.id} className="flex items-center gap-2 bg-[var(--card)] rounded-xl p-2 border" style={{ borderColor: "var(--line)" }}>
                                                <GripVertical size={16} style={{ color: "var(--ink-3)" }} className="shrink-0" />
                                                <FileText size={18} style={{ color: f.file ? "var(--warn)" : "var(--good)" }} className="shrink-0" />
                                                <select
                                                    className="kh-select shrink-0"
                                                    style={{ width: 150, padding: "6px 8px", fontSize: 13 }}
                                                    value={FILE_PARTS.includes(f.label) ? f.label : "__custom"}
                                                    onChange={(e) => setFileLabel(f.id, e.target.value === "__custom" ? "" : e.target.value)}
                                                >
                                                    {FILE_PARTS.map((p) => <option key={p} value={p}>{p}</option>)}
                                                    <option value="__custom">อื่นๆ (พิมพ์เอง)…</option>
                                                </select>
                                                {!FILE_PARTS.includes(f.label) && (
                                                    <input
                                                        className="kh-input flex-1 min-w-0"
                                                        style={{ padding: "6px 10px", fontSize: 13 }}
                                                        value={f.label}
                                                        onChange={(e) => setFileLabel(f.id, e.target.value)}
                                                        placeholder="พิมพ์ชื่อไฟล์"
                                                        autoFocus
                                                    />
                                                )}
                                                <span className="text-xs kh-ink3 truncate max-w-[100px] hidden sm:block flex-1" title={f.name}>{f.name}</span>
                                                {!f.file && <span className="text-[10px] kh-pill kh-pill-good no-dot">อัปแล้ว</span>}
                                                <button type="button" onClick={() => removeFile(f.id)} aria-label="ลบไฟล์" className="kh-btn-ghost shrink-0" style={{ color: "var(--danger)", padding: 6 }}><Trash2 size={15} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button type="button" className="kh-btn" onClick={() => filesInputRef.current?.click()}><Plus size={16} /> เพิ่มไฟล์ข้อสอบ</button>
                                <input ref={filesInputRef} type="file" accept="application/pdf" multiple hidden onChange={(e) => { onAddFiles(e.target.files); e.target.value = ""; }} />
                            </div>

                            {/* preview pdf */}
                            <div>
                                <label className="block text-sm font-medium kh-ink mb-1">ไฟล์ตัวอย่างฟรี (PDF, ไม่บังคับ)</label>
                                <div className="flex items-center gap-3">
                                    <button type="button" className="kh-btn-ghost" onClick={() => previewInputRef.current?.click()}><UploadCloud size={16} /> เลือกไฟล์ตัวอย่าง</button>
                                    <input ref={previewInputRef} type="file" accept="application/pdf" hidden onChange={(e) => onPickPreview(e.target.files?.[0] || null)} />
                                    {previewName && <span className="text-sm kh-ink flex items-center gap-1.5"><FileCheck2 size={16} style={{ color: "var(--good)" }} /> {previewName}</span>}
                                </div>
                                <p className="text-xs kh-ink3 mt-1">แนะนำให้ตัดมา 1–2 หน้าแรก ให้ลูกค้าดูก่อนซื้อ ช่วยเพิ่มยอดขาย</p>
                            </div>

                            {/* วิเคราะห์แนวข้อสอบ — sales section (optional) */}
                            <details className="kh-card p-4" style={{ background: "var(--card-2)" }}>
                                <summary className="text-sm font-medium kh-ink cursor-pointer flex items-center gap-1.5"><BarChart3 size={15} style={{ color: "var(--accent)" }} /> วิเคราะห์แนวข้อสอบ (แสดงบนหน้าขาย · ไม่บังคับ)</summary>
                                <p className="text-xs kh-ink3 mt-2 mb-3">กรอกว่าบทไหนออกกี่ % หน้าขายจะวาดกราฟให้อัตโนมัติ ปล่อยว่างไว้ก็ได้ (จะไม่แสดงส่วนนี้)</p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs kh-ink3 mb-1">หัวข้อ (headline)</label>
                                        <input className="kh-input w-full" value={analysis.headline || ""} onChange={(e) => setAnalysis({ ...analysis, headline: e.target.value })} placeholder="เช่น สอบเข้า ม.1 บทไหนออกบ่อยที่สุด?" />
                                    </div>
                                    <div><label className="block text-xs kh-ink3 mb-1">วิเคราะห์กี่ปี</label><input type="number" min={0} className="kh-input w-full" placeholder="0" value={analysis.years || ""} onChange={(e) => setAnalysis({ ...analysis, years: Number(e.target.value) || 0 })} /></div>
                                    <div><label className="block text-xs kh-ink3 mb-1">รวมกี่ข้อ</label><input type="number" min={0} className="kh-input w-full" placeholder="0" value={analysis.totalQuestions || ""} onChange={(e) => setAnalysis({ ...analysis, totalQuestions: Number(e.target.value) || 0 })} /></div>
                                    <div><label className="block text-xs kh-ink3 mb-1">ครอบคลุม (%)</label><input type="number" min={0} max={100} className="kh-input w-full" placeholder="0" value={analysis.coverage || ""} onChange={(e) => setAnalysis({ ...analysis, coverage: Number(e.target.value) || 0 })} /></div>
                                    <div><label className="block text-xs kh-ink3 mb-1">คำโปรยใต้ %</label><input className="kh-input w-full" value={analysis.note || ""} onChange={(e) => setAnalysis({ ...analysis, note: e.target.value })} placeholder="ฝึกตรงจุด ไม่เสียเวลา" /></div>
                                </div>

                                <label className="block text-xs kh-ink3 mb-1.5">บท + เปอร์เซ็นต์ที่ออก</label>
                                <div className="space-y-2">
                                    {chapters.map((c, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <input className="kh-input flex-1" style={{ padding: "6px 10px", fontSize: 13 }} value={c.name} onChange={(e) => setChapter(i, { name: e.target.value })} placeholder={`บทที่ ${i + 1} เช่น เศษส่วน`} />
                                            <div className="flex items-center gap-1 shrink-0">
                                                <input type="number" min={0} max={100} className="kh-input" style={{ width: 68, padding: "6px 8px", fontSize: 13 }} placeholder="0" value={c.percent || ""} onChange={(e) => setChapter(i, { percent: Number(e.target.value) || 0 })} />
                                                <span className="text-xs kh-ink3">%</span>
                                            </div>
                                            <button type="button" onClick={() => removeChapter(i)} aria-label="ลบบท" className="kh-btn-ghost shrink-0" style={{ color: "var(--danger)", padding: 6 }}><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" className="kh-btn-ghost mt-2" onClick={addChapter}><Plus size={15} /> เพิ่มบท</button>

                                {/* บทวิเคราะห์ฉบับเต็ม — Markdown, rendered under the chart on the sales page */}
                                <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
                                    <label className="block text-xs kh-ink3 mb-1.5">บทวิเคราะห์ฉบับเต็ม (Markdown · แสดงต่อจากกราฟบนหน้าขาย)</label>
                                    <div className="flex items-center gap-2 mb-2">
                                        <button type="button" className="kh-btn-ghost" onClick={() => articleInputRef.current?.click()}><UploadCloud size={15} /> อัปโหลดไฟล์ .md</button>
                                        <input ref={articleInputRef} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" hidden onChange={(e) => { onPickArticle(e.target.files?.[0] || null); e.target.value = ""; }} />
                                        {analysis.article?.trim() ? (
                                            <button type="button" className="kh-btn-ghost" style={{ color: "var(--danger)" }} onClick={() => setAnalysis((a) => ({ ...a, article: "" }))}><Trash2 size={14} /> ล้างข้อความ</button>
                                        ) : null}
                                    </div>
                                    <textarea
                                        className="kh-input w-full font-mono"
                                        rows={10}
                                        style={{ fontSize: 12.5, lineHeight: 1.6 }}
                                        value={analysis.article || ""}
                                        onChange={(e) => setAnalysis((a) => ({ ...a, article: e.target.value }))}
                                        placeholder={"อัปโหลดไฟล์ .md หรือวางเนื้อหาตรงนี้ได้เลย เช่น\n\n# บทวิเคราะห์แนวข้อสอบ\n## บทไหนออกบ่อยที่สุด\nเนื้อหา **ตัวหนา** ได้\n> 💡 **อ๋อ!:** ข้อความนี้จะกลายเป็นกล่องไฮไลต์บนหน้าขาย"}
                                    />
                                    <p className="text-xs kh-ink3 mt-1">รองรับหัวข้อ (#, ##), ตัวหนา (**...**), รายการข้อ, ตาราง และกล่องไฮไลต์ (&gt; ตามด้วยอิโมจิ เช่น 💡 ⚠️ 🔧) — หน้าขายจัดรูปแบบให้อัตโนมัติ</p>
                                </div>
                            </details>

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
