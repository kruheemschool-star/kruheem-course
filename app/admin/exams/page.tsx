"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, deleteDoc, doc, addDoc, serverTimestamp, writeBatch, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { Plus, Trash2, FileJson, GripVertical, Unlock, Lock, Eye, EyeOff, ClipboardCheck } from "lucide-react";
import { useConfirmModal } from "@/hooks/useConfirmModal";

// Drag and Drop imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React from "react";

// Sortable Table Row Component
function SortableExamRow({ exam, onDelete, onToggleFree, onToggleHidden, onToggleAnswerChecking }: { exam: any; onDelete: (id: string) => void; onToggleFree: (id: string, currentStatus: boolean) => void; onToggleHidden: (id: string, currentStatus: boolean) => void; onToggleAnswerChecking: (id: string, currentStatus: boolean) => void }) {
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
                <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-100">
                    {exam.category} / {exam.level}
                </span>
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

export default function ExamManagerPage() {
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newExamTitle, setNewExamTitle] = useState("");

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

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

    useEffect(() => {
        fetchExams();
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

    const handleQuickAdd = () => {
        setNewExamTitle("");
        setIsAddModalOpen(true);
    };

    const submitQuickAdd = async () => {
        if (!newExamTitle.trim()) return;

        try {
            await addDoc(collection(db, "exams"), {
                title: newExamTitle.trim(),
                description: "รายละเอียดเบื้องต้น...",
                category: "ม.ต้น",
                level: "ม.1",
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
                        <button onClick={handleQuickAdd} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex items-center gap-2 shadow-lg shadow-indigo-200">
                            <Plus size={20} />
                            สร้างข้อสอบใหม่
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
                                            <SortableExamRow key={exam.id} exam={exam} onDelete={handleDelete} onToggleFree={handleToggleFree} onToggleHidden={handleToggleHidden} onToggleAnswerChecking={handleToggleAnswerChecking} />
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
