"use client";

import { useState, useEffect } from "react";
import AdminGuard from "@/components/AdminGuard";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { Plus, Edit, Trash2, BookOpen, ArrowLeft, ChevronUp, ChevronDown, GripVertical } from "lucide-react";

interface Summary {
    id: string;
    title: string;
    slug: string;
    order: number;
    status: string;
    createdAt: any;
}

export default function AdminSummariesPage() {
    const [summaries, setSummaries] = useState<Summary[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchSummaries();
    }, []);

    const fetchSummaries = async () => {
        try {
            const q = query(collection(db, "summaries"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Summary[];
            // Sort by order
            data.sort((a, b) => (a.order || 0) - (b.order || 0));
            setSummaries(data);
        } catch (error) {
            console.error("Error fetching summaries:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`ต้องการลบ "${title}" ใช่ไหม?`)) return;
        try {
            await deleteDoc(doc(db, "summaries", id));
            setSummaries(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error("Error deleting:", error);
            alert("เกิดข้อผิดพลาด");
        }
    };

    const moveItem = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === summaries.length - 1) return;

        setIsSaving(true);
        const newList = [...summaries];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap items
        [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];

        // Update order values
        newList.forEach((item, i) => {
            item.order = i + 1;
        });

        setSummaries(newList);

        // Batch update to Firebase
        try {
            const batch = writeBatch(db);
            batch.update(doc(db, "summaries", newList[index].id), { order: newList[index].order });
            batch.update(doc(db, "summaries", newList[targetIndex].id), { order: newList[targetIndex].order });
            await batch.commit();
        } catch (error) {
            console.error("Error updating order:", error);
            fetchSummaries(); // Refresh on error
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-slate-500">กำลังโหลด...</div>;
    }

    return (
        <AdminGuard>
            <div className="min-h-screen bg-white font-sans">
                {/* Header */}
                <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/admin" className="p-2 rounded-full hover:bg-slate-100 transition text-slate-400">
                                <ArrowLeft size={24} />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <BookOpen size={24} className="text-teal-600" />
                                    สรุปเนื้อหา
                                </h1>
                                <p className="text-sm text-slate-400">{summaries.length} บท</p>
                            </div>
                        </div>
                        <Link
                            href="/admin/summaries/new"
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition"
                        >
                            <Plus size={20} />
                            สร้างบทใหม่
                        </Link>
                    </div>
                </header>

                <main className="max-w-4xl mx-auto p-6 md:p-10">
                    {/* Hint */}
                    <div className="bg-slate-50 rounded-xl p-4 mb-8 text-sm text-slate-500 flex items-center gap-3">
                        <GripVertical size={18} className="text-slate-400" />
                        <span>ใช้ปุ่ม <strong>⬆️⬇️</strong> เพื่อจัดลำดับบท</span>
                        {isSaving && <span className="ml-auto text-teal-600 font-bold animate-pulse">กำลังบันทึก...</span>}
                    </div>

                    {/* Content */}
                    {summaries.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 rounded-2xl">
                            <div className="text-6xl mb-4">📚</div>
                            <p className="text-slate-500 text-lg mb-4">ยังไม่มีบทสรุป</p>
                            <Link href="/admin/summaries/new" className="text-teal-600 font-bold hover:underline">
                                + สร้างบทสรุปแรก
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {summaries.map((summary, index) => (
                                <div
                                    key={summary.id}
                                    className="group flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition"
                                >
                                    {/* Order Controls */}
                                    <div className="flex flex-col gap-0.5">
                                        <button
                                            onClick={() => moveItem(index, 'up')}
                                            disabled={index === 0 || isSaving}
                                            className={`p-1 rounded hover:bg-slate-100 transition ${index === 0 ? 'opacity-20 cursor-not-allowed' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            <ChevronUp size={18} />
                                        </button>
                                        <button
                                            onClick={() => moveItem(index, 'down')}
                                            disabled={index === summaries.length - 1 || isSaving}
                                            className={`p-1 rounded hover:bg-slate-100 transition ${index === summaries.length - 1 ? 'opacity-20 cursor-not-allowed' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            <ChevronDown size={18} />
                                        </button>
                                    </div>

                                    {/* Order Number */}
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 flex-shrink-0">
                                        {index + 1}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h3 className="font-bold text-slate-800 truncate">{summary.title}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${summary.status === 'published'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {summary.status === 'published' ? 'เผยแพร่' : 'ฉบับร่าง'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 truncate">/summary/{summary.slug}</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                                        <Link
                                            href={`/admin/summaries/edit/${summary.id}`}
                                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                                        >
                                            <Edit size={18} />
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(summary.id, summary.title)}
                                            className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </AdminGuard>
    );
}
