"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, getDoc, query, deleteDoc, doc, addDoc, serverTimestamp, writeBatch, updateDoc, setDoc } from "firebase/firestore";
import Link from "next/link";
import { Plus, Trash2, FileJson, GripVertical, Unlock, Lock, Eye, EyeOff, ClipboardCheck, ClipboardList, BarChart3, Settings, FolderPlus, AlertCircle, Pencil, Check, X, ChevronDown, ChevronUp, Download, FileText, BookOpen, Loader2 } from "lucide-react";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { useUserAuth } from "@/context/AuthContext";
import { deriveExamLevel } from "@/lib/exam-level";
import { buildExamExport, parseExamQuestions, examFilenameSlug } from "@/lib/exam-export";
import toast, { Toaster } from "react-hot-toast";

// Drag and Drop imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React from "react";

// Sortable Table Row Component
function SortableExamRow({ exam, categoryOptions, onDelete, onToggleFree, onToggleHidden, onToggleAnswerChecking, onCategoryChange, onExport }: { exam: any; categoryOptions: string[]; onDelete: (id: string) => void; onToggleFree: (id: string, currentStatus: boolean) => void; onToggleHidden: (id: string, currentStatus: boolean) => void; onToggleAnswerChecking: (id: string, currentStatus: boolean) => void; onCategoryChange: (id: string, newCategory: string) => void; onExport: (exam: any) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: exam.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : (exam.hidden ? 0.55 : 1),
        zIndex: isDragging ? 50 : 1,
        position: 'relative',
        backgroundColor: isDragging ? 'var(--card-2)' : undefined,
    };

    return (
        <tr ref={setNodeRef} style={style} className="group">
            <td className="w-10">
                <button
                    {...attributes}
                    {...listeners}
                    className="flex items-center justify-center w-8 h-8 cursor-grab active:cursor-grabbing rounded-lg transition hover:bg-[var(--card-2)]"
                    style={{ color: 'var(--ink-3)' }}
                    aria-label="ลากเพื่อเรียงลำดับ"
                >
                    <GripVertical size={18} />
                </button>
            </td>
            <td>
                <div className="flex items-center gap-2">
                    <FileText size={16} style={{ color: 'var(--accent)' }} className="shrink-0" />
                    <div className="font-bold kh-ink">{exam.title}</div>
                    {exam.hidden && (
                        <span className="kh-pill kh-pill-danger no-dot">ซ่อนอยู่</span>
                    )}
                </div>
                {exam.description && (
                    <div className="text-xs kh-ink3 line-clamp-1 max-w-sm mt-1 pl-6">{exam.description}</div>
                )}
            </td>
            <td>
                <select
                    value={exam.category || ""}
                    onChange={(e) => onCategoryChange(exam.id, e.target.value)}
                    className="kh-select cursor-pointer"
                    style={{ width: 'auto', minWidth: 130, fontSize: 12.5, padding: '6px 10px' }}
                >
                    <option value="">— เลือกระดับชั้น —</option>
                    {categoryOptions.map((name) => (
                        <option key={name} value={name}>
                            {name}
                        </option>
                    ))}
                </select>
            </td>
            <td className="text-center">
                <span className={`kh-pill no-dot ${exam.difficulty === 'Easy' ? 'kh-pill-good' :
                    exam.difficulty === 'Hard' ? 'kh-pill-danger' :
                        'kh-pill-warn'
                    }`}>
                    {exam.difficulty}
                </span>
            </td>
            <td className="text-center kh-num kh-ink2 font-bold">
                {exam.questions?.length || 0}
            </td>
            <td className="text-center">
                <button
                    onClick={() => onToggleFree(exam.id, exam.isFree || false)}
                    className={`kh-pill ${exam.isFree ? "kh-pill-accent" : "kh-pill-ink"}`}
                    style={{ cursor: 'pointer' }}
                >
                    {exam.isFree ? (
                        <><Unlock size={13} /> ทำฟรี</>
                    ) : (
                        <><Lock size={13} /> เฉพาะสมาชิก</>
                    )}
                </button>
            </td>
            <td className="text-center">
                <button
                    onClick={() => onToggleAnswerChecking(exam.id, exam.showAnswerChecking || false)}
                    className={`kh-pill ${exam.showAnswerChecking ? "kh-pill-good" : "kh-pill-ink"}`}
                    style={{ cursor: 'pointer' }}
                >
                    <ClipboardCheck size={13} />
                    {exam.showAnswerChecking ? 'เปิดตรวจ' : 'ปิดตรวจ'}
                </button>
            </td>
            <td className="text-right">
                <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onToggleHidden(exam.id, exam.hidden || false)}
                        className="p-2 rounded-lg transition hover:bg-[var(--card-2)]"
                        style={{ color: exam.hidden ? 'var(--danger)' : 'var(--good)' }}
                        title={exam.hidden ? 'แสดงข้อสอบ (ปลดซ่อน)' : 'ซ่อนข้อสอบ'}
                    >
                        {exam.hidden ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button
                        onClick={() => onExport(exam)}
                        className="p-2 rounded-lg transition hover:bg-[var(--card-2)]"
                        style={{ color: 'var(--accent)' }}
                        title="ดาวน์โหลดข้อมูล JSON (โจทย์/เฉลย)"
                    >
                        <Download size={18} />
                    </button>
                    <Link
                        href={`/admin/exams/${exam.id}`}
                        className="p-2 rounded-lg transition hover:bg-[var(--card-2)]"
                        style={{ color: 'var(--accent)' }}
                        title="แก้ไขเนื้อหา (JSON Editor)"
                    >
                        <FileJson size={18} />
                    </Link>
                    <button
                        onClick={() => onDelete(exam.id)}
                        className="p-2 rounded-lg transition hover:bg-[var(--card-2)]"
                        style={{ color: 'var(--danger)' }}
                        title="ลบชุดข้อสอบ"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </td>
        </tr>
    );
}

// Sortable Category Row Component
function SortableCategoryRow({ category, count, onDelete, onRename }: { category: any; count: number; onDelete: (id: string, name: string) => void; onRename: (id: string, oldName: string, newName: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category.id });

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(category.name);

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 1,
        position: 'relative',
        backgroundColor: isDragging ? 'var(--card-2)' : 'var(--card-2)',
    };

    const submitRename = () => {
        const next = draft.trim();
        if (next && next !== category.name) onRename(category.id, category.name, next);
        setEditing(false);
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 rounded-xl transition-colors group border" >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                    {...attributes}
                    {...listeners}
                    className="flex items-center justify-center w-8 h-8 cursor-grab active:cursor-grabbing rounded-lg transition flex-shrink-0 hover:bg-[var(--card)]"
                    style={{ color: 'var(--ink-3)' }}
                    aria-label="ลากเพื่อเรียงลำดับ"
                >
                    <GripVertical size={16} />
                </button>
                {editing ? (
                    <input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') { setDraft(category.name); setEditing(false); } }}
                        className="kh-input flex-1 min-w-0 font-bold"
                    />
                ) : (
                    <span className="font-bold kh-ink truncate">
                        {category.name}
                        <span className="ml-2 text-xs font-medium kh-ink3">({count} ชุด)</span>
                    </span>
                )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
                {editing ? (
                    <>
                        <button onClick={submitRename} className="p-2 rounded-lg transition-colors hover:bg-[var(--card)]" style={{ color: 'var(--good)' }} title="บันทึกชื่อ">
                            <Check size={16} />
                        </button>
                        <button onClick={() => { setDraft(category.name); setEditing(false); }} className="p-2 rounded-lg transition-colors hover:bg-[var(--card)]" style={{ color: 'var(--ink-3)' }} title="ยกเลิก">
                            <X size={16} />
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => { setDraft(category.name); setEditing(true); }} className="p-2 rounded-lg transition-colors hover:bg-[var(--card)]" style={{ color: 'var(--ink-3)' }} title="เปลี่ยนชื่อหมวดหมู่">
                            <Pencil size={15} />
                        </button>
                        <button
                            onClick={() => onDelete(category.id, category.name)}
                            className="p-2 rounded-lg transition-colors hover:bg-[var(--card)]"
                            style={{ color: 'var(--danger)' }}
                            title="ลบหมวดหมู่"
                        >
                            <Trash2 size={16} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

// Export modal — downloads an exam's data as JSON for external typesetting.
// Offers three shapes (full / problems-only / solutions-only) so โจทย์ and
// เฉลย can be laid out as separate documents. Questions are resolved from the
// inline field, falling back to the exam's questionsUrl if there are none.
function ExamExportModal({ exam, onClose }: { exam: any; onClose: () => void }) {
    const [resolved, setResolved] = useState<any[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            let qs = parseExamQuestions(exam.questions);
            if (qs.length === 0 && exam.questionsUrl) {
                try {
                    const res = await fetch(exam.questionsUrl, { signal: AbortSignal.timeout(8000) });
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data)) qs = data;
                    }
                } catch { /* ignore — falls through to empty */ }
            }
            if (!cancelled) setResolved(qs);
        })();
        return () => { cancelled = true; };
    }, [exam]);

    const data = useMemo(() => (resolved ? buildExamExport(exam, resolved) : null), [resolved, exam]);

    const download = (suffix: string, payload: any) => {
        const slug = examFilenameSlug(exam.title);
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = suffix ? `${slug}-${suffix}.json` : `${slug}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const loading = resolved === null;
    const count = data?.meta.questionCount ?? 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(12, 24, 22, 0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
            <div className="kh-card p-8 max-w-md w-full animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-1">
                    <h2 className="text-2xl font-black kh-ink flex items-center gap-2">
                        <Download size={22} style={{ color: 'var(--accent)' }} />
                        ดาวน์โหลดข้อมูล JSON
                    </h2>
                    <button onClick={onClose} className="p-2 -mr-2 -mt-2 kh-ink3 rounded-lg transition-colors hover:bg-[var(--card-2)]">
                        <X size={20} />
                    </button>
                </div>
                <p className="kh-ink3 text-sm mb-5 truncate">{exam.title}</p>

                {loading ? (
                    <div className="py-10 flex flex-col items-center kh-ink3">
                        <Loader2 className="animate-spin mb-3" size={28} />
                        <p className="text-sm font-medium">กำลังเตรียมข้อมูล...</p>
                    </div>
                ) : count === 0 ? (
                    <div className="py-8 text-center">
                        <p className="kh-ink2 font-bold mb-1">ชุดนี้ยังไม่มีโจทย์ที่ใช้งานได้</p>
                        <p className="kh-ink3 text-sm">เพิ่มโจทย์ในหน้าแก้ไขก่อน แล้วค่อยดาวน์โหลด</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-4 px-4 py-3 rounded-xl text-sm kh-ink2 font-medium" style={{ background: 'var(--card-2)' }}>
                            มีโจทย์ใช้งานได้ <span className="font-black kh-ink">{count}</span> ข้อ — แยกโจทย์และเฉลยให้อัตโนมัติ
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={() => download("", data)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left"
                                style={{ border: '2px solid var(--accent)', background: 'var(--accent-soft)' }}
                            >
                                <FileJson size={20} className="shrink-0" style={{ color: 'var(--accent)' }} />
                                <div className="flex-1">
                                    <div className="font-bold kh-ink">ทั้งชุด (โจทย์ + เฉลย)</div>
                                    <div className="text-xs kh-ink3">ไฟล์เดียว แยกเป็นส่วน problems และ solutions</div>
                                </div>
                            </button>
                            <button
                                onClick={() => download("โจทย์", { meta: data!.meta, problems: data!.problems })}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left hover:bg-[var(--card-2)]"
                                style={{ border: '1px solid var(--line)' }}
                            >
                                <FileText size={20} className="shrink-0" style={{ color: 'var(--accent)' }} />
                                <div className="flex-1">
                                    <div className="font-bold kh-ink">เฉพาะโจทย์</div>
                                    <div className="text-xs kh-ink3">ไม่มีเฉลย — สำหรับหน้าข้อสอบ</div>
                                </div>
                            </button>
                            <button
                                onClick={() => download("เฉลย", { meta: data!.meta, solutions: data!.solutions })}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left hover:bg-[var(--card-2)]"
                                style={{ border: '1px solid var(--line)' }}
                            >
                                <BookOpen size={20} className="shrink-0" style={{ color: 'var(--warn)' }} />
                                <div className="flex-1">
                                    <div className="font-bold kh-ink">เฉพาะเฉลย</div>
                                    <div className="text-xs kh-ink3">คำตอบ + คำอธิบายละเอียด</div>
                                </div>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function ExamManagerPage() {
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();
    const { isAdmin, loading: authLoading } = useUserAuth();
    const [exams, setExams] = useState<any[]>([]);
    const [exportExam, setExportExam] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newExamTitle, setNewExamTitle] = useState("");
    const [examConfig, setExamConfig] = useState<{ showExamDashboard: boolean; enableResultTracking: boolean }>({ showExamDashboard: false, enableResultTracking: false });
    const [categories, setCategories] = useState<any[]>([]);
    const [categoriesLoadError, setCategoriesLoadError] = useState<string | null>(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [isSavingCategoryOrder, setIsSavingCategoryOrder] = useState(false);

    // Merged category options for dropdowns: Firestore categories + any category
    // currently referenced by existing exams (prevents orphaned values showing blank).
    const categoryOptions = React.useMemo(() => {
        const fromFirestore = categories.map(c => c.name).filter(Boolean);
        const fromExams = Array.from(new Set(exams.map(e => e.category).filter(Boolean))) as string[];
        const merged = Array.from(new Set([...fromFirestore, ...fromExams]));
        return merged;
    }, [categories, exams]);

    // Group exams under their category, ordered by examCategories.order
    // (categories is already order-sorted by fetchCategories). Exams keep
    // their existing within-group order (exams is order-sorted). Anything
    // with an empty/unknown category falls into one "ไม่ได้จัดหมวด" group
    // appended last. Pure in-memory derive — no extra Firestore reads.
    const groupedExams = React.useMemo(() => {
        const known = new Set(categories.map((c: any) => c.name));
        const UNCAT = "__uncat__";
        const buckets = new Map<string, any[]>();
        for (const e of exams) {
            const key = (e.category && known.has(e.category)) ? e.category : UNCAT;
            const arr = buckets.get(key);
            if (arr) arr.push(e); else buckets.set(key, [e]);
        }
        const ordered: { key: string; name: string; items: any[] }[] = [];
        for (const c of categories) {
            const items = buckets.get(c.name);
            if (items && items.length) ordered.push({ key: c.name, name: c.name, items });
        }
        const uncat = buckets.get(UNCAT);
        if (uncat && uncat.length) ordered.push({ key: UNCAT, name: "ไม่ได้จัดหมวด", items: uncat });
        return ordered;
    }, [exams, categories]);

    // Top stat chips — derived purely from data the component already holds.
    // No invented numbers: only counts available from the exams array.
    const stats = React.useMemo(() => {
        const total = exams.length;
        const free = exams.filter(e => e.isFree).length;
        const hidden = exams.filter(e => e.hidden).length;
        const totalQuestions = exams.reduce((sum, e) => sum + (e.questions?.length || 0), 0);
        return { total, free, hidden, totalQuestions };
    }, [exams]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchExamConfig = async () => {
        try {
            const snap = await getDoc(doc(db, 'settings', 'examConfig'));
            if (snap.exists()) setExamConfig(snap.data() as any);
        } catch (e) { console.error('Error fetching exam config:', e); }
    };

    const toggleExamConfig = async (field: 'showExamDashboard' | 'enableResultTracking') => {
        const newVal = !examConfig[field];
        try {
            await setDoc(doc(db, 'settings', 'examConfig'), { [field]: newVal }, { merge: true });
            setExamConfig(prev => ({ ...prev, [field]: newVal }));
        } catch (e) { console.error('Error updating exam config:', e); alert('เกิดข้อผิดพลาด'); }
    };

    const fetchExams = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "exams"));
            const snapshot = await getDocs(q);
            const fetchedExams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort by order field, fallback to createdAt desc
            fetchedExams.sort((a: any, b: any) => {
                const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
                const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
                if (orderA !== orderB) return orderA - orderB;

                // Fallback to createdAt desc
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
            });

            setExams(fetchedExams);
        } catch (error) {
            console.error("Error fetching exams:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const snap = await getDocs(collection(db, "examCategories"));
            const cats = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
            cats.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            setCategories(cats);
            setCategoriesLoadError(null);
        } catch (e: any) {
            console.error('Error fetching categories:', e);
            setCategoriesLoadError(e?.message || 'ไม่สามารถโหลดหมวดหมู่ได้');
            toast.error('โหลดหมวดหมู่ไม่สำเร็จ — dropdown จะใช้ค่าจากข้อสอบที่มีอยู่แทน');
        }
    };

    const addCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            await addDoc(collection(db, "examCategories"), {
                name: newCategoryName.trim(),
                order: categories.length,
                createdAt: serverTimestamp()
            });
            setNewCategoryName("");
            fetchCategories();
        } catch (e) { console.error('Error adding category:', e); alert('เกิดข้อผิดพลาด'); }
    };

    const deleteCategory = async (id: string, name: string) => {
        const count = exams.filter(e => e.category === name).length;
        const msg = count > 0
            ? `มีข้อสอบ ${count} ชุดในหมวด "${name}" — ลบหมวดแล้วชุดเหล่านั้นจะกลายเป็น "ไม่ได้จัดหมวด" (ตัวข้อสอบไม่ถูกลบ) ดำเนินการต่อ?`
            : `ลบหมวด "${name}"?`;
        confirmModal("ยืนยันการลบหมวดหมู่", msg, async () => {
            try {
                await deleteDoc(doc(db, "examCategories", id));
                fetchCategories();
            } catch (e) { console.error('Error deleting category:', e); alert('เกิดข้อผิดพลาด'); }
        }, true);
    };

    // Rename a category and cascade the new name onto every exam tagged with
    // the old name (category is a denormalized string on each exam, no FK).
    // One batch, only on explicit admin click; bounded by exam count.
    const renameCategory = async (id: string, oldName: string, newName: string) => {
        const name = newName.trim();
        if (!name || name === oldName) return;
        if (categories.some((c: any) => c.name === name)) {
            toast.error(`มีหมวด "${name}" อยู่แล้ว`);
            return;
        }
        try {
            const batch = writeBatch(db);
            batch.update(doc(db, "examCategories", id), { name });
            exams.forEach(e => {
                if (e.category === oldName) batch.update(doc(db, "exams", e.id), { category: name });
            });
            await batch.commit();
            setCategories(prev => prev.map((c: any) => c.id === id ? { ...c, name } : c));
            setExams(prev => prev.map(e => e.category === oldName ? { ...e, category: name } : e));
            toast.success(`เปลี่ยนชื่อหมวดเป็น "${name}" แล้ว`);
        } catch (e) {
            console.error('Error renaming category:', e);
            toast.error("เปลี่ยนชื่อหมวดไม่สำเร็จ");
        }
    };

    useEffect(() => {
        // Public data — safe to fetch immediately.
        fetchExams();
        fetchCategories();
    }, []);

    // Admin-only data — wait until auth resolved and admin confirmed,
    // otherwise Firestore rules reject with "Missing or insufficient permissions".
    useEffect(() => {
        if (authLoading) return;
        if (!isAdmin) return;
        fetchExamConfig();
    }, [authLoading, isAdmin]);

    const handleDelete = (id: string) => {
        confirmModal("ยืนยันการลบชุดข้อสอบ", "คุณแน่ใจหรือไม่ว่าจะลบชุดข้อสอบนี้? การกระทำนี้ไม่สามารถย้อนกลับได้", async () => {
            try {
                await deleteDoc(doc(db, "exams", id));
                setExams(prev => prev.filter(exam => exam.id !== id));
                alert("ลบสำเร็จ!");
            } catch (error) {
                console.error("Error deleting exam:", error);
                alert("เกิดข้อผิดพลาดในการลบ");
            }
        }, true);
    };

    const handleToggleFree = async (id: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, "exams", id), {
                isFree: !currentStatus
            });
            setExams(prev => prev.map(exam => exam.id === id ? { ...exam, isFree: !currentStatus } : exam));
        } catch (error) {
            console.error("Error updating exam free status:", error);
            alert("เกิดข้อผิดพลาดในการอัปเดตสิทธิ์การเข้าถึง");
        }
    };

    const handleToggleHidden = async (id: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, "exams", id), {
                hidden: !currentStatus
            });
            setExams(prev => prev.map(exam => exam.id === id ? { ...exam, hidden: !currentStatus } : exam));
        } catch (error) {
            console.error("Error updating exam hidden status:", error);
            alert("เกิดข้อผิดพลาดในการอัปเดตสถานะซ่อน");
        }
    };

    const handleToggleAnswerChecking = async (id: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, "exams", id), {
                showAnswerChecking: !currentStatus
            });
            setExams(prev => prev.map(exam => exam.id === id ? { ...exam, showAnswerChecking: !currentStatus } : exam));
        } catch (error) {
            console.error("Error updating answer checking status:", error);
            alert("เกิดข้อผิดพลาดในการอัปเดตสถานะตรวจคำตอบ");
        }
    };

    const handleCategoryChange = async (id: string, newCategory: string) => {
        try {
            await updateDoc(doc(db, "exams", id), {
                category: newCategory
            });
            setExams(prev => prev.map(exam => exam.id === id ? { ...exam, category: newCategory } : exam));
        } catch (error) {
            console.error("Error updating exam category:", error);
            alert("เกิดข้อผิดพลาดในการอัปเดตหมวดหมู่");
        }
    };

    const handleQuickAdd = () => {
        setNewExamTitle("");
        setIsAddModalOpen(true);
    };

    const submitQuickAdd = async () => {
        if (!newExamTitle.trim()) return;

        // Auto-derive category/level from the title so that a new exam titled
        // "สอบเข้า ม.1 ชุดที่ 7" is NOT left tagged as ม.ต้น (which would lock
        // it from primary-bank subscribers). Admin can still override in the row.
        const title = newExamTitle.trim();
        const derived = deriveExamLevel(null, null, title);
        // Canonical sections (see scripts/retag-exams.mjs): สอบเข้า ม.1 / ป.6 / ม.1.
        // Quick-add defaults a primary-ish title to ป.6 and a lower title to ม.1
        // (both real sections); admin picks "สอบเข้า ม.1" from the per-row <select>
        // when the title is an entrance set.
        const DEFAULTS: Record<string, { category: string; level: string }> = {
            primary: { category: "ป.6", level: "ป.6" },
            lower:   { category: "ม.1", level: "ม.1" },
            upper:   { category: "ม.1", level: "ม.1" },
        };
        const { category, level } = derived
            ? DEFAULTS[derived]
            : { category: "", level: "" }; // admin must set manually when title is ambiguous

        try {
            await addDoc(collection(db, "exams"), {
                title,
                description: "รายละเอียดเบื้องต้น...",
                category,
                level,
                questionCount: 0,
                timeLimit: 30,
                difficulty: "Medium",
                isFree: true,
                createdAt: serverTimestamp(),
                order: exams.length, // Add to end
                questions: []
            });
            setIsAddModalOpen(false);
            setNewExamTitle("");
            fetchExams();
            alert("เพิ่มชุดข้อสอบใหม่แล้ว!");
        } catch (err) {
            console.error(err);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        // Reorder only WITHIN the same category group. Moving an exam to
        // another category is done via the per-row dropdown (clearer, and
        // drag wouldn't change `category` so it would just snap back).
        const known = new Set(categories.map((c: any) => c.name));
        const groupKey = (e: any) => (e?.category && known.has(e.category)) ? e.category : "__uncat__";
        const a = exams.find(e => e.id === active.id);
        const b = exams.find(e => e.id === over.id);
        if (!a || !b || groupKey(a) !== groupKey(b)) return;

        const oldIndex = exams.findIndex(e => e.id === active.id);
        const newIndex = exams.findIndex(e => e.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        // Optimistic update
        const newExams = arrayMove(exams, oldIndex, newIndex);
        setExams(newExams);

        // Save to Firestore
        setIsSavingOrder(true);
        try {
            const batch = writeBatch(db);
            newExams.forEach((exam, index) => {
                const ref = doc(db, "exams", exam.id);
                batch.update(ref, { order: index });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error saving order:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกลำดับ");
            fetchExams(); // Revert on error
        } finally {
            setIsSavingOrder(false);
        }
    };

    const handleCategoryDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = categories.findIndex(c => c.id === active.id);
        const newIndex = categories.findIndex(c => c.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        // Optimistic update
        const newCategories = arrayMove(categories, oldIndex, newIndex);
        setCategories(newCategories);

        // Save to Firestore
        setIsSavingCategoryOrder(true);
        try {
            const batch = writeBatch(db);
            newCategories.forEach((cat, index) => {
                const ref = doc(db, "examCategories", cat.id);
                batch.update(ref, { order: index });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error saving category order:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกลำดับหมวดหมู่");
            fetchCategories(); // Revert on error
        } finally {
            setIsSavingCategoryOrder(false);
        }
    };

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            {categoriesLoadError && (
                <div className="kh-card p-4 flex items-start gap-3" style={{ borderColor: 'var(--warn)', background: 'var(--warn-soft)' }}>
                    <AlertCircle size={20} style={{ color: 'var(--warn)' }} className="flex-shrink-0 mt-0.5" />
                    <div className="flex-1 text-sm">
                        <p className="font-bold kh-ink">โหลดหมวดหมู่ไม่สำเร็จ</p>
                        <p className="kh-ink2 mt-1">
                            ไม่สามารถอ่านจาก <code className="px-1 rounded" style={{ background: 'var(--card-2)' }}>examCategories</code> ได้
                            — dropdown จะใช้ค่าจากข้อสอบที่มีอยู่ชั่วคราว กด "จัดการหมวดหมู่" เพื่อเพิ่มใหม่
                        </p>
                        <p className="text-xs kh-ink3 mt-1 font-mono">{categoriesLoadError}</p>
                        <button
                            onClick={fetchCategories}
                            className="kh-btn mt-2"
                            style={{ padding: '5px 12px', fontSize: 12 }}
                        >
                            ลองใหม่
                        </button>
                    </div>
                </div>
            )}

            {/* Toolbar — page title/back nav come from the admin shell */}
            <div className="flex flex-wrap gap-3 items-center justify-end">
                {isSavingOrder && (
                    <span className="text-sm font-medium animate-pulse mr-auto" style={{ color: 'var(--accent)' }}>กำลังบันทึกลำดับ...</span>
                )}
                <Link href="/admin/exams/audit" className="kh-btn-ghost" title="ตรวจสอบข้อสอบที่ category ไม่ตรงกับ title">
                    <AlertCircle size={16} />
                    ตรวจสอบหมวด
                </Link>
                <button onClick={() => setIsCategoryModalOpen(v => !v)} className="kh-btn-ghost">
                    <FolderPlus size={16} />
                    จัดการหมวดหมู่
                    {isCategoryModalOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
                <button onClick={handleQuickAdd} className="kh-btn">
                    <Plus size={16} />
                    สร้างข้อสอบใหม่
                </button>
            </div>

            {/* Stat chips — derived from loaded exam data */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="kh-card p-4">
                    <div className="flex items-start justify-between">
                        <p className="kh-eyebrow" style={{ textTransform: 'none' }}>ชุดข้อสอบ</p>
                        <ClipboardList size={18} style={{ color: 'var(--accent)' }} />
                    </div>
                    <p className="kh-num text-3xl font-black kh-ink mt-1">{stats.total}</p>
                </div>
                <div className="kh-card p-4">
                    <div className="flex items-start justify-between">
                        <p className="kh-eyebrow" style={{ textTransform: 'none' }}>โจทย์ทั้งหมด</p>
                        <FileText size={18} style={{ color: 'var(--accent)' }} />
                    </div>
                    <p className="kh-num text-3xl font-black kh-ink mt-1">{stats.totalQuestions}</p>
                </div>
                <div className="kh-card p-4">
                    <div className="flex items-start justify-between">
                        <p className="kh-eyebrow" style={{ textTransform: 'none' }}>ทำฟรี</p>
                        <Unlock size={18} style={{ color: 'var(--good)' }} />
                    </div>
                    <p className="kh-num text-3xl font-black kh-ink mt-1">{stats.free}</p>
                </div>
                <div className="kh-card p-4">
                    <div className="flex items-start justify-between">
                        <p className="kh-eyebrow" style={{ textTransform: 'none' }}>ซ่อนอยู่</p>
                        <EyeOff size={18} style={{ color: 'var(--danger)' }} />
                    </div>
                    <p className="kh-num text-3xl font-black kh-ink mt-1">{stats.hidden}</p>
                </div>
            </div>

            {/* Global Exam Settings */}
            <div className="kh-card p-5">
                <h3 className="kh-eyebrow mb-4">
                    <Settings size={15} />
                    ตั้งค่าระบบข้อสอบ
                </h3>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => toggleExamConfig('enableResultTracking')}
                        className={`kh-pill ${examConfig.enableResultTracking ? 'kh-pill-good' : 'kh-pill-ink'}`}
                        style={{ cursor: 'pointer', padding: '7px 14px', fontSize: 13 }}
                    >
                        <ClipboardCheck size={15} />
                        บันทึกผลสอบ: {examConfig.enableResultTracking ? 'เปิด' : 'ปิด'}
                    </button>
                    <button
                        onClick={() => toggleExamConfig('showExamDashboard')}
                        className={`kh-pill ${examConfig.showExamDashboard ? 'kh-pill-accent' : 'kh-pill-ink'}`}
                        style={{ cursor: 'pointer', padding: '7px 14px', fontSize: 13 }}
                    >
                        <BarChart3 size={15} />
                        หน้า Dashboard: {examConfig.showExamDashboard ? 'เปิด' : 'ปิด'}
                    </button>
                </div>
            </div>

            {/* Inline Category Management Panel (toggled by the toolbar
                button). One place for all category CRUD — no hidden modal. */}
            {isCategoryModalOpen && (
                <div className="kh-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="kh-eyebrow">
                            <FolderPlus size={15} />
                            จัดการหมวดหมู่ — เพิ่ม / เปลี่ยนชื่อ / ลบ / ลากเรียงลำดับ
                        </h3>
                        {isSavingCategoryOrder && <span className="text-xs font-bold animate-pulse" style={{ color: 'var(--accent)' }}>กำลังบันทึก...</span>}
                    </div>
                    <div className="mb-3 flex gap-2">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                            className="kh-input flex-1"
                            placeholder="ชื่อหมวดหมู่ใหม่ เช่น สอบเข้า ม.4"
                        />
                        <button
                            onClick={addCategory}
                            disabled={!newCategoryName.trim()}
                            className="kh-btn"
                        >
                            เพิ่ม
                        </button>
                    </div>
                    <p className="text-xs kh-ink3 mb-2">ลำดับด้านล่างคือลำดับหมวดที่แสดงในหน้า /exam ของนักเรียน — ลากเพื่อสลับ</p>
                    <div className="max-h-72 overflow-y-auto space-y-2 p-1">
                        {categories.length === 0 ? (
                            <p className="text-center kh-ink3 py-8">ยังไม่มีหมวดหมู่ — เพิ่มด้านบน</p>
                        ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
                                <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2">
                                        {categories.map((cat) => (
                                            <SortableCategoryRow
                                                key={cat.id}
                                                category={cat}
                                                count={exams.filter(e => e.category === cat.name).length}
                                                onDelete={deleteCategory}
                                                onRename={renameCategory}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-20 kh-ink3">กำลังโหลดข้อมูล...</div>
            ) : exams.length === 0 ? (
                <div className="kh-card text-center py-20" style={{ borderStyle: 'dashed' }}>
                    <div className="text-4xl mb-4 opacity-50">📂</div>
                    <h3 className="text-xl font-bold kh-ink2">ยังไม่มีชุดข้อสอบ</h3>
                    <p className="kh-ink3 mt-2">เริ่มสร้างชุดแรกกันเลย!</p>
                </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <div className="space-y-6">
                        {groupedExams.map((group) => (
                            <div key={group.key} className="kh-card overflow-hidden">
                                <div className="flex items-center gap-3 flex-wrap px-5 py-4 border-b" style={{ borderColor: 'var(--line)', background: 'var(--card-2)' }}>
                                    <h3 className="font-black kh-ink text-lg">{group.name}</h3>
                                    <span className="kh-pill kh-pill-accent no-dot">{group.items.length} ชุด</span>
                                    {group.key === "__uncat__" && (
                                        <span className="text-xs kh-ink3">— เลือกระดับชั้นในช่อง &ldquo;ระดับชั้น&rdquo; ของแต่ละชุด เพื่อจัดเข้าหมวด</span>
                                    )}
                                </div>
                                <table className="kh-table">
                                    <thead>
                                        <tr>
                                            <th className="w-10"></th>
                                            <th>ชื่อชุดข้อสอบ</th>
                                            <th>ระดับชั้น</th>
                                            <th className="text-center">ระดับความยาก</th>
                                            <th className="text-center">จำนวนข้อ</th>
                                            <th className="text-center">สิทธิ์การเข้าถึง</th>
                                            <th className="text-center">ตรวจคำตอบ</th>
                                            <th className="text-right">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <SortableContext items={group.items.map(e => e.id)} strategy={verticalListSortingStrategy}>
                                            {group.items.map((exam) => (
                                                <SortableExamRow key={exam.id} exam={exam} categoryOptions={categoryOptions} onDelete={handleDelete} onToggleFree={handleToggleFree} onToggleHidden={handleToggleHidden} onToggleAnswerChecking={handleToggleAnswerChecking} onCategoryChange={handleCategoryChange} onExport={setExportExam} />
                                            ))}
                                        </SortableContext>
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                </DndContext>
            )}
            <ConfirmDialog />

            {/* Export JSON Modal */}
            {exportExam && (
                <ExamExportModal exam={exportExam} onClose={() => setExportExam(null)} />
            )}

            {/* Custom Create Exam Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(12, 24, 22, 0.55)', backdropFilter: 'blur(4px)' }}>
                    <div className="kh-card p-8 max-w-md w-full animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-black kh-ink mb-4">สร้างชุดข้อสอบใหม่</h2>
                        <div className="mb-6">
                            <label className="block text-sm font-bold kh-ink2 mb-2">ชื่อชุดข้อสอบ</label>
                            <input
                                type="text"
                                value={newExamTitle}
                                onChange={(e) => setNewExamTitle(e.target.value)}
                                className="kh-input"
                                placeholder="เช่น สอบเข้า ม.1 ชุดที่ 5"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="kh-btn-ghost"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={submitQuickAdd}
                                disabled={!newExamTitle.trim()}
                                className="kh-btn"
                            >
                                ยืนยันสร้าง
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
