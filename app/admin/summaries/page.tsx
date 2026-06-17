"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { Plus, Edit, Trash2, BookOpen, ChevronUp, ChevronDown, FileText, CheckCircle2, PencilLine, CalendarPlus } from "lucide-react";
import { useConfirmModal } from "@/hooks/useConfirmModal";

interface Summary {
    id: string;
    title: string;
    slug: string;
    order: number;
    status: string;
    createdAt: any;
}

export default function AdminSummariesPage() {
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();
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

    const handleDelete = (id: string, title: string) => {
        confirmModal("ยืนยันการลบ", `ต้องการลบ "${title}" ใช่ไหม?`, async () => {
            try {
                await deleteDoc(doc(db, "summaries", id));
                setSummaries(prev => prev.filter(s => s.id !== id));
            } catch (error) {
                console.error("Error deleting:", error);
                alert("เกิดข้อผิดพลาด");
            }
        }, true);
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

    // Stats derived ONLY from data already loaded
    const total = summaries.length;
    const publishedCount = summaries.filter(s => s.status === 'published').length;
    const draftCount = total - publishedCount;
    const now = new Date();
    const addedThisMonth = summaries.filter(s => {
        const d = s.createdAt?.toDate ? s.createdAt.toDate() : (s.createdAt ? new Date(s.createdAt) : null);
        if (!d || isNaN(d.getTime())) return false;
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;

    const formatDate = (createdAt: any) => {
        const d = createdAt?.toDate ? createdAt.toDate() : (createdAt ? new Date(createdAt) : null);
        if (!d || isNaN(d.getTime())) return null;
        return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    };

    const stats = [
        { label: "บทสรุปทั้งหมด", value: total, icon: FileText, color: "var(--accent)", soft: "var(--accent-soft)" },
        { label: "เผยแพร่แล้ว", value: publishedCount, icon: CheckCircle2, color: "var(--good)", soft: "var(--good-soft)" },
        { label: "ฉบับร่าง", value: draftCount, icon: PencilLine, color: "var(--warn)", soft: "var(--warn-soft)" },
        { label: "เพิ่มเดือนนี้", value: addedThisMonth, icon: CalendarPlus, color: "var(--accent)", soft: "var(--accent-soft)" },
    ];

    if (loading) {
        return (
            <div className="kh-card p-10 text-center kh-ink3">กำลังโหลด...</div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <span className="kh-eyebrow">
                        <BookOpen size={14} style={{ color: "var(--accent)" }} />
                        สรุปเนื้อหา
                    </span>
                    <span className="kh-pill kh-pill-accent">{total} บท</span>
                    {isSaving && <span className="kh-pill kh-pill-warn">กำลังบันทึก...</span>}
                </div>
                <Link href="/admin/summaries/new" className="kh-btn">
                    <Plus size={16} /> สร้างบทใหม่
                </Link>
            </div>

            {/* Stat chips */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map(({ label, value, icon: Icon, color, soft }) => (
                    <div key={label} className="kh-card p-4 flex items-center justify-between gap-3">
                        <div>
                            <p className="kh-ink3 text-xs font-bold mb-1">{label}</p>
                            <p className="kh-num text-2xl font-bold kh-ink">{value}</p>
                        </div>
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: soft, color }}
                        >
                            <Icon size={20} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Content */}
            {summaries.length === 0 ? (
                <div className="kh-card p-16 flex flex-col items-center justify-center text-center gap-3">
                    <BookOpen size={40} className="kh-ink3" />
                    <p className="font-bold kh-ink2">ยังไม่มีบทสรุป</p>
                    <Link href="/admin/summaries/new" className="kh-btn">
                        <Plus size={16} /> สร้างบทสรุปแรก
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {summaries.map((summary, index) => {
                        const isPublished = summary.status === 'published';
                        const created = formatDate(summary.createdAt);
                        return (
                            <div
                                key={summary.id}
                                className="kh-card kh-card-h p-5 flex flex-col gap-3 relative overflow-hidden"
                            >
                                {/* Colored top bar */}
                                <span
                                    className="absolute left-0 top-0 h-1 w-full"
                                    style={{ background: isPublished ? "var(--good)" : "var(--warn)" }}
                                />

                                {/* Top row: order tag + status */}
                                <div className="flex items-center justify-between gap-2">
                                    <span className="kh-pill kh-pill-accent no-dot">
                                        <span className="kh-num">บทที่ {index + 1}</span>
                                    </span>
                                    <span className={`kh-pill ${isPublished ? 'kh-pill-good' : 'kh-pill-warn'}`}>
                                        {isPublished ? 'เผยแพร่' : 'ฉบับร่าง'}
                                    </span>
                                </div>

                                {/* Title */}
                                <h3 className="font-bold kh-ink leading-snug line-clamp-2">{summary.title}</h3>

                                {/* Meta */}
                                <div className="flex flex-col gap-1">
                                    <p className="kh-ink3 text-xs truncate">/summary/{summary.slug}</p>
                                    {created && (
                                        <p className="kh-ink3 text-xs flex items-center gap-1">
                                            <CalendarPlus size={12} /> สร้างเมื่อ {created}
                                        </p>
                                    )}
                                </div>

                                {/* Footer actions */}
                                <div className="mt-auto pt-3 flex items-center justify-between gap-2" style={{ borderTop: "1px solid var(--line)" }}>
                                    {/* Order Controls */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => moveItem(index, 'up')}
                                            disabled={index === 0 || isSaving}
                                            title="เลื่อนขึ้น"
                                            className="kh-btn-ghost"
                                            style={{ padding: "6px", opacity: index === 0 ? 0.4 : 1 }}
                                        >
                                            <ChevronUp size={16} />
                                        </button>
                                        <button
                                            onClick={() => moveItem(index, 'down')}
                                            disabled={index === summaries.length - 1 || isSaving}
                                            title="เลื่อนลง"
                                            className="kh-btn-ghost"
                                            style={{ padding: "6px", opacity: index === summaries.length - 1 ? 0.4 : 1 }}
                                        >
                                            <ChevronDown size={16} />
                                        </button>
                                    </div>

                                    {/* Edit / Delete */}
                                    <div className="flex items-center gap-1">
                                        <Link
                                            href={`/admin/summaries/edit/${summary.id}`}
                                            title="แก้ไข"
                                            className="kh-btn-ghost"
                                            style={{ padding: "6px" }}
                                        >
                                            <Edit size={16} />
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(summary.id, summary.title)}
                                            title="ลบ"
                                            className="kh-btn-ghost"
                                            style={{ padding: "6px" }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ConfirmDialog />
        </div>
    );
}
