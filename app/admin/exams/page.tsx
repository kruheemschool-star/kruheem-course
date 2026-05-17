"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, getDoc, query, deleteDoc, doc, addDoc, serverTimestamp, writeBatch, updateDoc, setDoc } from "firebase/firestore";
import Link from "next/link";
import { Plus, Trash2, FileJson, GripVertical, Unlock, Lock, Eye, EyeOff, ClipboardCheck, BarChart3, Settings, FolderPlus, AlertCircle, Pencil, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { useUserAuth } from "@/context/AuthContext";
import { deriveExamLevel } from "@/lib/exam-level";
import toast, { Toaster } from "react-hot-toast";

// Drag and Drop imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React from "react";

// Sortable Table Row Component
function SortableExamRow({ exam, categoryOptions, onDelete, onToggleFree, onToggleHidden, onToggleAnswerChecking, onCategoryChange }: { exam: any; categoryOptions: string[]; onDelete: (id: string) => void; onToggleFree: (id: string, currentStatus: boolean) => void; onToggleHidden: (id: string, currentStatus: boolean) => void; onToggleAnswerChecking: (id: string, currentStatus: boolean) => void; onCategoryChange: (id: string, newCategory: string) => void }) {
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
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 1,
        position: 'relative',
        backgroundColor: isDragging ? '#f1f5f9' : undefined,
    };

    return (
        <tr ref={setNodeRef} style={style} className={`hover:bg-slate-50/50 transition-colors group ${exam.hidden ? 'opacity-50' : ''}`}>
            <td className="p-4 w-10">
                <button
                    {...attributes}
                    {...listeners}
                    className="flex items-center justify-center w-8 h-8 cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition"
                    aria-label="ลากเพื่อเรียงลำดับ"
                >
                    <GripVertical size={18} />
                </button>
            </td>
            <td className="p-6">
                <div className="flex items-center gap-2">
                    <div className="font-bold text-slate-800 text-lg">{exam.title}</div>
                    {exam.hidden && (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-500 rounded-full text-xs font-bold border border-rose-100">ซ่อนอยู่</span>
                    )}
                </div>
                <div className="text-sm text-slate-400 line-clamp-1 max-w-sm">{exam.description || "-"}</div>
            </td>
            <td className="p-6">
                <select
                    value={exam.category || ""}
                    onChange={(e) => onCategoryChange(exam.id, e.target.value)}
                    className="px-3 py-2 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200 hover:bg-amber-100 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all cursor-pointer"
                >
                    <option value="">— เลือกหมวดหมู่ —</option>
                    {categoryOptions.map((name) => (
                        <option key={name} value={name}>
                            {name}
                        </option>
                    ))}
                </select>
                <div className="text-xs text-slate-400 mt-1">{exam.level}</div>
            </td>
            <td className="p-6 text-center">
                <span className={`text-xs font-bold px-2 py-1 rounded ${exam.difficulty === 'Easy' ? 'text-green-500 bg-green-50' :
                    exam.difficulty === 'Hard' ? 'text-red-500 bg-red-50' :
                        'text-amber-500 bg-amber-50'
                    }`}>
                    {exam.difficulty}
                </span>
            </td>
            <td className="p-6 text-center font-mono text-slate-500">
                {exam.questions?.length || 0}
            </td>
            <td className="p-6 text-center">
                <button
                    onClick={() => onToggleFree(exam.id, exam.isFree || false)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                        exam.isFree
                            ? "bg-teal-50 text-teal-600 border border-teal-200 hover:bg-teal-100 hover:shadow"
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 hover:shadow"
                    }`}
                >
                    {exam.isFree ? (
                        <><Unlock size={14} /> ทำฟรี</>
                    ) : (
                        <><Lock size={14} /> เฉพาะสมาชิก</>
                    )}
                </button>
            </td>
            <td className="p-6 text-center">
                <button
                    onClick={() => onToggleAnswerChecking(exam.id, exam.showAnswerChecking || false)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                        exam.showAnswerChecking
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 hover:shadow"
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 hover:shadow"
                    }`}
                >
                    <ClipboardCheck size={14} />
                    {exam.showAnswerChecking ? 'เปิดตรวจ' : 'ปิดตรวจ'}
                </button>
            </td>
            <td className="p-6 text-right">
                <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onToggleHidden(exam.id, exam.hidden || false)}
                        className={`p-2 rounded-lg tooltip ${exam.hidden ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                        title={exam.hidden ? 'แสดงข้อสอบ (ปลดซ่อน)' : 'ซ่อนข้อสอบ'}
                    >
                        {exam.hidden ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <Link
                        href={`/admin/exams/${exam.id}`}
                        className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg tooltip"
                        title="แก้ไขเนื้อหา (JSON Editor)"
                    >
                        <FileJson size={18} />
                    </Link>
                    <button
                        onClick={() => onDelete(exam.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg tooltip"
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
        backgroundColor: isDragging ? '#f1f5f9' : undefined,
    };

    const submitRename = () => {
        const next = draft.trim();
        if (next && next !== category.name) onRename(category.id, category.name, next);
        setEditing(false);
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group border border-transparent hover:border-slate-200">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                    {...attributes}
                    {...listeners}
                    className="flex items-center justify-center w-8 h-8 cursor-grab active:cursor-grabbing text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition flex-shrink-0"
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
                        className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none font-bold text-slate-700"
                    />
                ) : (
                    <span className="font-bold text-slate-700 truncate">
                        {category.name}
                        <span className="ml-2 text-xs font-medium text-slate-400">({count} ชุด)</span>
                    </span>
                )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
                {editing ? (
                    <>
                        <button onClick={submitRename} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="บันทึกชื่อ">
                            <Check size={16} />
                        </button>
                        <button onClick={() => { setDraft(category.name); setEditing(false); }} className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors" title="ยกเลิก">
                            <X size={16} />
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => { setDraft(category.name); setEditing(true); }} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="เปลี่ยนชื่อหมวดหมู่">
                            <Pencil size={15} />
                        </button>
                        <button
                            onClick={() => onDelete(category.id, category.name)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
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

export default function ExamManagerPage() {
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();
    const { isAdmin, loading: authLoading } = useUserAuth();
    const [exams, setExams] = useState<any[]>([]);
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
        <div className="min-h-screen bg-slate-50 p-8">
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto">
                {categoriesLoadError && (
                    <div className="mb-4 bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 text-sm">
                            <p className="font-bold text-amber-800">โหลดหมวดหมู่ไม่สำเร็จ</p>
                            <p className="text-amber-700 mt-1">
                                ไม่สามารถอ่านจาก <code className="bg-amber-100 px-1 rounded">examCategories</code> ได้
                                — dropdown จะใช้ค่าจากข้อสอบที่มีอยู่ชั่วคราว กด "จัดการหมวดหมู่" เพื่อเพิ่มใหม่
                            </p>
                            <p className="text-xs text-amber-600 mt-1 font-mono">{categoriesLoadError}</p>
                            <button
                                onClick={fetchCategories}
                                className="mt-2 px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700"
                            >
                                ลองใหม่
                            </button>
                        </div>
                    </div>
                )}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">จัดการคลังข้อสอบ 📚</h1>
                        <p className="text-slate-500">สร้างและแก้ไขชุดข้อสอบสำหรับนักเรียน</p>
                    </div>
                    <div className="flex gap-3 items-center">
                        {isSavingOrder && (
                            <span className="text-sm text-indigo-500 font-medium animate-pulse">กำลังบันทึกลำดับ...</span>
                        )}
                        <Link href="/admin" className="px-4 py-2 bg-white text-slate-600 rounded-lg hover:bg-slate-100 font-bold border border-slate-200">
                            ย้อนกลับ
                        </Link>
                        <Link href="/admin/exams/audit" className="px-4 py-2 bg-white text-slate-600 rounded-lg hover:bg-slate-100 font-bold flex items-center gap-2 border border-slate-200" title="ตรวจสอบข้อสอบที่ category ไม่ตรงกับ title">
                            🔍 ตรวจสอบหมวด
                        </Link>
                        <button onClick={() => setIsCategoryModalOpen(v => !v)} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-bold flex items-center gap-2 shadow-lg shadow-amber-200">
                            <FolderPlus size={20} />
                            จัดการหมวดหมู่
                            {isCategoryModalOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <button onClick={handleQuickAdd} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex items-center gap-2 shadow-lg shadow-indigo-200">
                            <Plus size={20} />
                            สร้างข้อสอบใหม่
                        </button>
                    </div>
                </div>

                {/* Global Exam Settings */}
                <div className="mb-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4 text-sm">
                        <Settings size={16} />
                        ตั้งค่าระบบข้อสอบ
                    </h3>
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={() => toggleExamConfig('enableResultTracking')}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                                examConfig.enableResultTracking
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            <ClipboardCheck size={16} />
                            บันทึกผลสอบ: {examConfig.enableResultTracking ? 'เปิด' : 'ปิด'}
                        </button>
                        <button
                            onClick={() => toggleExamConfig('showExamDashboard')}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                                examConfig.showExamDashboard
                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            <BarChart3 size={16} />
                            หน้า Dashboard: {examConfig.showExamDashboard ? 'เปิด' : 'ปิด'}
                        </button>
                    </div>
                </div>

                {/* Inline Category Management Panel (toggled by the toolbar
                    button). One place for all category CRUD — no hidden modal. */}
                {isCategoryModalOpen && (
                    <div className="mb-6 bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                                <FolderPlus size={16} />
                                จัดการหมวดหมู่ — เพิ่ม / เปลี่ยนชื่อ / ลบ / ลากเรียงลำดับ
                            </h3>
                            {isSavingCategoryOrder && <span className="text-xs font-bold text-amber-500 animate-pulse">กำลังบันทึก...</span>}
                        </div>
                        <div className="mb-3 flex gap-2">
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                                placeholder="ชื่อหมวดหมู่ใหม่ เช่น สอบเข้า ม.4"
                            />
                            <button
                                onClick={addCategory}
                                disabled={!newCategoryName.trim()}
                                className="px-6 py-2.5 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-lg shadow-amber-200"
                            >
                                เพิ่ม
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">ลำดับด้านล่างคือลำดับหมวดที่แสดงในหน้า /exam ของนักเรียน — ลากเพื่อสลับ</p>
                        <div className="max-h-72 overflow-y-auto space-y-2 p-1">
                            {categories.length === 0 ? (
                                <p className="text-center text-slate-400 py-8">ยังไม่มีหมวดหมู่ — เพิ่มด้านบน</p>
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
                    <div className="text-center py-20 text-slate-400">กำลังโหลดข้อมูล...</div>
                ) : exams.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
                        <div className="text-4xl mb-4 opacity-50">📂</div>
                        <h3 className="text-xl font-bold text-slate-600">ยังไม่มีชุดข้อสอบ</h3>
                        <p className="text-slate-400 mt-2">เริ่มสร้างชุดแรกกันเลย!</p>
                    </div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <div className="space-y-6">
                            {groupedExams.map((group) => (
                                <div key={group.key} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="flex items-center gap-3 flex-wrap px-6 py-4 bg-gradient-to-r from-amber-50 to-white border-b border-slate-100">
                                        <h3 className="font-black text-slate-800 text-lg">{group.name}</h3>
                                        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">{group.items.length} ชุด</span>
                                        {group.key === "__uncat__" && (
                                            <span className="text-xs text-slate-400">— เลือกหมวดในช่อง &ldquo;หมวดหมู่&rdquo; ของแต่ละชุด เพื่อจัดเข้าหมวด</span>
                                        )}
                                    </div>
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-sm">
                                            <tr>
                                                <th className="p-4 w-10"></th>
                                                <th className="p-6">ชื่อชุดข้อสอบ</th>
                                                <th className="p-6">หมวดหมู่</th>
                                                <th className="p-6 text-center">ระดับความยาก</th>
                                                <th className="p-6 text-center">จำนวนข้อ</th>
                                                <th className="p-6 text-center">สิทธิ์การเข้าถึง</th>
                                                <th className="p-6 text-center">ตรวจคำตอบ</th>
                                                <th className="p-6 text-right">จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            <SortableContext items={group.items.map(e => e.id)} strategy={verticalListSortingStrategy}>
                                                {group.items.map((exam) => (
                                                    <SortableExamRow key={exam.id} exam={exam} categoryOptions={categoryOptions} onDelete={handleDelete} onToggleFree={handleToggleFree} onToggleHidden={handleToggleHidden} onToggleAnswerChecking={handleToggleAnswerChecking} onCategoryChange={handleCategoryChange} />
                                                ))}
                                            </SortableContext>
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    </DndContext>
                )}
            </div>
            <ConfirmDialog />

            {/* Custom Create Exam Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-black text-slate-800 mb-4">สร้างชุดข้อสอบใหม่</h2>
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-600 mb-2">ชื่อชุดข้อสอบ</label>
                            <input
                                type="text"
                                value={newExamTitle}
                                onChange={(e) => setNewExamTitle(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                placeholder="เช่น สอบเข้า ม.1 ชุดที่ 5"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-6 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={submitQuickAdd}
                                disabled={!newExamTitle.trim()}
                                className="px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-200"
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
