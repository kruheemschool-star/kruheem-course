"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, getDoc, query, deleteDoc, doc, addDoc, serverTimestamp, writeBatch, updateDoc, setDoc } from "firebase/firestore";
import Link from "next/link";
import { Plus, Trash2, FileJson, GripVertical, Unlock, Lock, Eye, EyeOff, ClipboardCheck, BarChart3, Settings, FolderPlus, Copy, Download } from "lucide-react";
import { useConfirmModal } from "@/hooks/useConfirmModal";

// Drag and Drop imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React from "react";
import type { Exam, ExamCategory, ExamConfig } from "@/types/exam";

// Sortable Table Row Component
const LEVELS = ["ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6", "มหาวิทยาลัย"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const DIFFICULTY_LABELS: Record<string, string> = { Easy: "ง่าย", Medium: "ปานกลาง", Hard: "ยาก" };

function SortableExamRow({ exam, categories, onDelete, onToggleFree, onToggleHidden, onToggleAnswerChecking, onCategoryChange, onLevelChange, onDifficultyChange, onDuplicate }: { exam: Exam; categories: ExamCategory[]; onDelete: (id: string) => void; onToggleFree: (id: string, currentStatus: boolean) => void; onToggleHidden: (id: string, currentStatus: boolean) => void; onToggleAnswerChecking: (id: string, currentStatus: boolean) => void; onCategoryChange: (id: string, newCategory: string) => void; onLevelChange: (id: string, newLevel: string) => void; onDifficultyChange: (id: string, newDifficulty: string) => void; onDuplicate: (id: string) => void }) {
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
                    <option value="" disabled>เลือกหมวดหมู่</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                            {cat.name}
                        </option>
                    ))}
                </select>
                <select
                    value={exam.level || ""}
                    onChange={(e) => onLevelChange(exam.id, e.target.value)}
                    className="mt-1 px-2 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all cursor-pointer"
                >
                    <option value="" disabled>ระดับชั้น</option>
                    {LEVELS.map((lv) => (
                        <option key={lv} value={lv}>{lv}</option>
                    ))}
                </select>
            </td>
            <td className="p-6 text-center">
                <select
                    value={exam.difficulty || "Medium"}
                    onChange={(e) => onDifficultyChange(exam.id, e.target.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border outline-none transition-all cursor-pointer ${
                        exam.difficulty === 'Easy' ? 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100' :
                        exam.difficulty === 'Hard' ? 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100' :
                        'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100'
                    }`}
                >
                    {DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
                    ))}
                </select>
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
                    <button
                        onClick={() => onDuplicate(exam.id)}
                        className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg tooltip"
                        title="คัดลอกชุดข้อสอบ"
                    >
                        <Copy size={18} />
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

export default function ExamManagerPage() {
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newExamTitle, setNewExamTitle] = useState("");
    const [newExamCategory, setNewExamCategory] = useState("");
    const [newExamLevel, setNewExamLevel] = useState("");
    const [newExamDifficulty, setNewExamDifficulty] = useState("Medium");
    const [examConfig, setExamConfig] = useState<ExamConfig>({ showExamDashboard: false, enableResultTracking: false });
    const [categories, setCategories] = useState<ExamCategory[]>([]);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchExamConfig = async () => {
        try {
            const snap = await getDoc(doc(db, 'settings', 'examConfig'));
            if (snap.exists()) setExamConfig(snap.data() as ExamConfig);
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
            const fetchedExams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));

            // Sort by order field, fallback to createdAt desc
            fetchedExams.sort((a, b) => {
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
            const cats = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamCategory));
            cats.sort((a, b) => (a.order || 0) - (b.order || 0));
            setCategories(cats);
        } catch (e) { console.error('Error fetching categories:', e); }
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

    const deleteCategory = async (id: string) => {
        confirmModal("ยืนยันการลบหมวดหมู่", "คุณแน่ใจหรือไม่? ข้อสอบที่ใช้หมวดหมู่นี้จะยังคงอยู่", async () => {
            try {
                await deleteDoc(doc(db, "examCategories", id));
                fetchCategories();
            } catch (e) { console.error('Error deleting category:', e); alert('เกิดข้อผิดพลาด'); }
        }, true);
    };

    useEffect(() => {
        fetchExams();
        fetchExamConfig();
        fetchCategories();
    }, []);

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
            await updateDoc(doc(db, "exams", id), { category: newCategory });
            setExams(prev => prev.map(exam => exam.id === id ? { ...exam, category: newCategory } : exam));
        } catch (error) {
            console.error("Error updating exam category:", error);
            alert("เกิดข้อผิดพลาดในการอัปเดตหมวดหมู่");
        }
    };

    const handleLevelChange = async (id: string, newLevel: string) => {
        try {
            await updateDoc(doc(db, "exams", id), { level: newLevel });
            setExams(prev => prev.map(exam => exam.id === id ? { ...exam, level: newLevel } : exam));
        } catch (error) {
            console.error("Error updating exam level:", error);
            alert("เกิดข้อผิดพลาดในการอัปเดตระดับชั้น");
        }
    };

    const handleDifficultyChange = async (id: string, newDifficulty: string) => {
        try {
            await updateDoc(doc(db, "exams", id), { difficulty: newDifficulty });
            setExams(prev => prev.map(exam => exam.id === id ? { ...exam, difficulty: newDifficulty } : exam));
        } catch (error) {
            console.error("Error updating exam difficulty:", error);
            alert("เกิดข้อผิดพลาดในการอัปเดตระดับความยาก");
        }
    };

    const handleDuplicate = async (id: string) => {
        const original = exams.find(e => e.id === id);
        if (!original) return;
        confirmModal("ยืนยันการคัดลอก", `คัดลอกชุดข้อสอบ "${original.title}"?`, async () => {
            try {
                const { id: _id, ...data } = original;
                await addDoc(collection(db, "exams"), {
                    ...data,
                    title: `${data.title} (สำเนา)`,
                    createdAt: serverTimestamp(),
                    order: exams.length,
                });
                fetchExams();
                alert("คัดลอกสำเร็จ!");
            } catch (error) {
                console.error("Error duplicating exam:", error);
                alert("เกิดข้อผิดพลาดในการคัดลอก");
            }
        });
    };

    const handleExportAll = () => {
        const exportData = exams.map(({ id, ...rest }) => rest);
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exams-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleQuickAdd = () => {
        setNewExamTitle("");
        setNewExamCategory(categories.length > 0 ? categories[0].name : "");
        setNewExamLevel("");
        setNewExamDifficulty("Medium");
        setIsAddModalOpen(true);
    };

    const submitQuickAdd = async () => {
        if (!newExamTitle.trim()) return;

        try {
            await addDoc(collection(db, "exams"), {
                title: newExamTitle.trim(),
                description: "",
                category: newExamCategory,
                level: newExamLevel,
                questionCount: 0,
                timeLimit: 30,
                difficulty: newExamDifficulty,
                isFree: true,
                createdAt: serverTimestamp(),
                order: exams.length,
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

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-6xl mx-auto">
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
                        <button onClick={() => setIsCategoryModalOpen(true)} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-bold flex items-center gap-2 shadow-lg shadow-amber-200">
                            <FolderPlus size={20} />
                            จัดการหมวดหมู่
                        </button>
                        <button onClick={handleExportAll} className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-bold flex items-center gap-2 shadow-lg shadow-slate-200">
                            <Download size={20} />
                            Export
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

                {loading ? (
                    <div className="text-center py-20 text-slate-400">กำลังโหลดข้อมูล...</div>
                ) : exams.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
                        <div className="text-4xl mb-4 opacity-50">📂</div>
                        <h3 className="text-xl font-bold text-slate-600">ยังไม่มีชุดข้อสอบ</h3>
                        <p className="text-slate-400 mt-2">เริ่มสร้างชุดแรกกันเลย!</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
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
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={exams.map(e => e.id)} strategy={verticalListSortingStrategy}>
                                    <tbody className="divide-y divide-slate-50">
                                        {exams.map((exam) => (
                                            <SortableExamRow key={exam.id} exam={exam} categories={categories} onDelete={handleDelete} onToggleFree={handleToggleFree} onToggleHidden={handleToggleHidden} onToggleAnswerChecking={handleToggleAnswerChecking} onCategoryChange={handleCategoryChange} onLevelChange={handleLevelChange} onDifficultyChange={handleDifficultyChange} onDuplicate={handleDuplicate} />
                                        ))}
                                    </tbody>
                                </SortableContext>
                            </DndContext>
                        </table>
                    </div>
                )}
            </div>
            <ConfirmDialog />

            {/* Custom Create Exam Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-black text-slate-800 mb-6">สร้างชุดข้อสอบใหม่</h2>
                        <div className="space-y-4 mb-6">
                            <div>
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
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">หมวดหมู่</label>
                                    <select
                                        value={newExamCategory}
                                        onChange={(e) => setNewExamCategory(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm font-bold text-slate-700 bg-white"
                                    >
                                        <option value="">เลือก</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">ระดับชั้น</label>
                                    <select
                                        value={newExamLevel}
                                        onChange={(e) => setNewExamLevel(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm font-bold text-slate-700 bg-white"
                                    >
                                        <option value="">เลือก</option>
                                        {LEVELS.map((lv) => (
                                            <option key={lv} value={lv}>{lv}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">ความยาก</label>
                                    <select
                                        value={newExamDifficulty}
                                        onChange={(e) => setNewExamDifficulty(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm font-bold text-slate-700 bg-white"
                                    >
                                        {DIFFICULTIES.map((d) => (
                                            <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
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

            {/* Category Management Modal */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-black text-slate-800 mb-6">จัดการหมวดหมู่ข้อสอบ</h2>
                        
                        {/* Add New Category */}
                        <div className="mb-6 flex gap-2">
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                                placeholder="ชื่อหมวดหมู่ใหม่ เช่น ม.6"
                            />
                            <button
                                onClick={addCategory}
                                disabled={!newCategoryName.trim()}
                                className="px-6 py-3 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-lg shadow-amber-200"
                            >
                                เพิ่ม
                            </button>
                        </div>

                        {/* Category List */}
                        <div className="mb-6 max-h-64 overflow-y-auto space-y-2">
                            {categories.length === 0 ? (
                                <p className="text-center text-slate-400 py-8">ยังไม่มีหมวดหมู่</p>
                            ) : (
                                categories.map((cat) => (
                                    <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                                        <span className="font-bold text-slate-700">{cat.name}</span>
                                        <button
                                            onClick={() => deleteCategory(cat.id)}
                                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => setIsCategoryModalOpen(false)}
                                className="px-6 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
