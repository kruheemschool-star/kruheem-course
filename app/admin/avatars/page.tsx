"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { db, storage } from "@/lib/firebase";
import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    setDoc,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { uploadImageToStorage } from "@/lib/upload";
import { useUserAuth } from "@/context/AuthContext";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import toast, { Toaster } from "react-hot-toast";
import { ArrowLeft, Upload, Trash2, Loader2, ImageOff, AlertCircle, Plus, CheckSquare, Square, X } from "lucide-react";

const DEFAULT_CATEGORIES = [
    { id: "kids", label: "เด็ก", emoji: "🧒", order: 0 },
    { id: "male", label: "ผู้ชาย", emoji: "👦", order: 1 },
    { id: "female", label: "ผู้หญิง", emoji: "👧", order: 2 },
    { id: "animals", label: "สัตว์น่ารัก", emoji: "🦁", order: 3 },
    { id: "monsters", label: "สัตว์ประหลาด", emoji: "👾", order: 4 },
] as const;

interface AvatarDoc {
    id: string;
    url: string;
    category: string;
    storagePath: string;
    label?: string;
    order?: number;
    createdAt?: Timestamp | null;
}

interface AvatarCategoryDoc {
    id: string;
    label: string;
    emoji: string;
    order: number;
    persisted: boolean;
}

const normalizeCategoryId = (value: string) =>
    value
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\p{L}\p{N}_-]/gu, "")
        .slice(0, 60);

const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "unknown";

export default function AdminAvatarsPage() {
    const { user, isAdmin, loading: authLoading } = useUserAuth();
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();

    const [categories, setCategories] = useState<AvatarCategoryDoc[]>([]);
    const [activeTab, setActiveTab] = useState("kids");
    const [avatars, setAvatars] = useState<Record<string, AvatarDoc[]>>({});
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategoryEmoji, setNewCategoryEmoji] = useState("✨");
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [addingCategory, setAddingCategory] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
    const [fetchError, setFetchError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const seedDefaultCategories = useCallback(async () => {
        await Promise.all(
            DEFAULT_CATEGORIES.map((category) =>
                setDoc(doc(db, "avatarCategories", category.id), {
                    label: category.label,
                    emoji: category.emoji,
                    order: category.order,
                    createdAt: serverTimestamp(),
                }, { merge: true })
            )
        );
    }, []);

    // Single fetch for ALL categories — one Firestore read per mount (cheap).
    const fetchAll = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const [avatarSnap, initialCategorySnap] = await Promise.all([
                getDocs(collection(db, "avatars")),
                getDocs(collection(db, "avatarCategories")),
            ]);

            let categorySnap = initialCategorySnap;
            if (categorySnap.empty && isAdmin) {
                await seedDefaultCategories();
                categorySnap = await getDocs(collection(db, "avatarCategories"));
            }

            const categoryMap = new Map<string, AvatarCategoryDoc>();
            if (categorySnap.empty) {
                DEFAULT_CATEGORIES.forEach((c) => {
                    categoryMap.set(c.id, {
                        id: c.id,
                        label: c.label,
                        emoji: c.emoji,
                        order: c.order,
                        persisted: false,
                    });
                });
            } else {
                categorySnap.docs.forEach((d) => {
                    const data = d.data() as { label?: unknown; emoji?: unknown; order?: unknown };
                    categoryMap.set(d.id, {
                        id: d.id,
                        label: typeof data.label === "string" && data.label.trim() ? data.label : d.id,
                        emoji: typeof data.emoji === "string" && data.emoji.trim() ? data.emoji : "📁",
                        order: typeof data.order === "number" ? data.order : 9999,
                        persisted: true,
                    });
                });
            }

            const byCat: Record<string, AvatarDoc[]> = {};
            avatarSnap.docs.forEach((d) => {
                const data = d.data() as {
                    url?: unknown;
                    category?: unknown;
                    storagePath?: unknown;
                    label?: unknown;
                    order?: unknown;
                    createdAt?: unknown;
                };
                if (!data.category || typeof data.category !== "string") return;
                const categoryId = data.category;
                if (!categoryMap.has(categoryId)) {
                    categoryMap.set(categoryId, {
                        id: categoryId,
                        label: categoryId,
                        emoji: "📁",
                        order: 9999,
                        persisted: false,
                    });
                }
                if (!byCat[categoryId]) byCat[categoryId] = [];
                byCat[categoryId].push({
                    id: d.id,
                    url: typeof data.url === "string" ? data.url : "",
                    category: data.category,
                    storagePath: typeof data.storagePath === "string" ? data.storagePath : "",
                    label: typeof data.label === "string" ? data.label : "",
                    order: typeof data.order === "number" ? data.order : 9999,
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
                });
            });

            const sortedCategories = Array.from(categoryMap.values()).sort((a, b) => {
                if (a.order !== b.order) return a.order - b.order;
                return a.label.localeCompare(b.label, "th");
            });

            sortedCategories.forEach((cat) => {
                if (!byCat[cat.id]) byCat[cat.id] = [];
            });

            // Client-side sort by order ASC, then createdAt ASC (nulls last)
            Object.keys(byCat).forEach((k) => {
                byCat[k].sort((a, b) => {
                    const oa = a.order ?? 9999;
                    const ob = b.order ?? 9999;
                    if (oa !== ob) return oa - ob;
                    const ta = a.createdAt?.toMillis?.() ?? 0;
                    const tb = b.createdAt?.toMillis?.() ?? 0;
                    return ta - tb;
                });
            });

            setCategories(sortedCategories);
            setAvatars(byCat);
            setActiveTab((prev) => (sortedCategories.some((c) => c.id === prev) ? prev : (sortedCategories[0]?.id || "kids")));
        } catch (e: unknown) {
            console.error("fetch avatars failed:", e);
            setFetchError(getErrorMessage(e));
            toast.error("โหลดรูปไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, [isAdmin, seedDefaultCategories]);

    const addCategory = async () => {
        const label = newCategoryName.trim();
        if (!label) {
            toast.error("กรุณากรอกชื่อหมวดหมู่");
            return;
        }

        const categoryId = normalizeCategoryId(label);
        if (!categoryId) {
            toast.error("ชื่อหมวดหมู่ไม่ถูกต้อง");
            return;
        }
        if (categories.some((c) => c.id === categoryId)) {
            toast.error("มีหมวดหมู่นี้แล้ว");
            return;
        }

        setAddingCategory(true);
        try {
            const nextOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.order || 0)) + 1 : 0;
            await setDoc(doc(db, "avatarCategories", categoryId), {
                label,
                emoji: newCategoryEmoji.trim() || "📁",
                order: nextOrder,
                createdAt: serverTimestamp(),
            });
            setNewCategoryName("");
            setNewCategoryEmoji("✨");
            toast.success("เพิ่มหมวดหมู่แล้ว");
            await fetchAll();
            setActiveTab(categoryId);
        } catch (e: unknown) {
            console.error("add category failed:", e);
            toast.error("เพิ่มหมวดหมู่ไม่สำเร็จ: " + getErrorMessage(e));
        } finally {
            setAddingCategory(false);
        }
    };

    const handleDeleteCategory = (category: AvatarCategoryDoc) => {
        if (!category.persisted) {
            toast.error("หมวดหมู่นี้เป็นหมวด fallback (ยังไม่ได้บันทึก) จึงลบไม่ได้");
            return;
        }

        const count = avatars[category.id]?.length || 0;
        const message = count > 0
            ? `ต้องการลบหมวด "${category.label}" พร้อมรูปทั้งหมด ${count} รูป? (ลบถาวร กู้คืนไม่ได้)`
            : `ต้องการลบหมวด "${category.label}" ใช่ไหม?`;

        confirmModal(
            "ยืนยันการลบหมวดหมู่",
            message,
            async () => {
                try {
                    // Cascade delete all avatars in this category
                    const categoryAvatars = avatars[category.id] || [];
                    for (const avatar of categoryAvatars) {
                        await deleteDoc(doc(db, "avatars", avatar.id));
                        if (avatar.storagePath) {
                            try {
                                await deleteObject(ref(storage, avatar.storagePath));
                            } catch (storageErr) {
                                console.warn("storage delete failed:", storageErr);
                            }
                        }
                    }
                    // Delete category doc
                    await deleteDoc(doc(db, "avatarCategories", category.id));
                    toast.success(count > 0 ? `ลบหมวดหมู่และรูป ${count} รูปแล้ว` : "ลบหมวดหมู่แล้ว");
                    setCategories((prev) => prev.filter((c) => c.id !== category.id));
                    setAvatars((prev) => {
                        const next = { ...prev };
                        delete next[category.id];
                        return next;
                    });
                    setActiveTab((prev) => {
                        if (prev !== category.id) return prev;
                        const remaining = categories.filter((c) => c.id !== category.id);
                        return remaining[0]?.id || "kids";
                    });
                } catch (e: unknown) {
                    console.error("delete category failed:", e);
                    toast.error("ลบหมวดหมู่ไม่สำเร็จ: " + getErrorMessage(e));
                }
            },
            true
        );
    };

    // === Bulk delete ===
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        const ids = current.map((a) => a.id);
        setSelectedIds(new Set(ids));
    };

    const deselectAll = () => setSelectedIds(new Set());

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        confirmModal(
            "ยืนยันการลบหลายรูป",
            `ต้องการลบรูปที่เลือก ${selectedIds.size} รูป? (ลบถาวร กู้คืนไม่ได้)`,
            async () => {
                setBulkDeleting(true);
                let deleted = 0;
                let failed = 0;
                for (const id of selectedIds) {
                    const avatar = current.find((a) => a.id === id);
                    if (!avatar) continue;
                    try {
                        await deleteDoc(doc(db, "avatars", avatar.id));
                        if (avatar.storagePath) {
                            try {
                                await deleteObject(ref(storage, avatar.storagePath));
                            } catch (storageErr) {
                                console.warn("storage delete failed:", storageErr);
                            }
                        }
                        deleted++;
                    } catch {
                        failed++;
                    }
                }
                setBulkDeleting(false);
                setSelectedIds(new Set());
                setSelectionMode(false);
                if (deleted > 0) toast.success(`ลบ ${deleted} รูปสำเร็จ`);
                if (failed > 0) toast.error(`ลบ ${failed} รูปไม่สำเร็จ`);
                await fetchAll();
            },
            true
        );
    };

    const exitSelectionMode = () => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    };

    useEffect(() => {
        if (authLoading) return;
        if (!isAdmin) return;
        fetchAll();
    }, [authLoading, isAdmin, fetchAll]);

    const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        if (!user) {
            toast.error("ต้อง login admin ก่อน");
            return;
        }

        setUploading(true);
        setUploadProgress({ done: 0, total: files.length });

        const existingCount = avatars[activeTab]?.length || 0;
        let uploaded = 0;
        let failed = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith("image/")) {
                failed++;
                continue;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`${file.name} เกิน 5MB (จะถูก compress ก่อนอัปโหลด)`);
            }

            try {
                // Path: static/avatars/<category>/<timestamp>_<safeName>.<ext>
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
                const storagePath = `static/avatars/${activeTab}/${Date.now()}_${i}_${safeName}`;
                // upload.ts auto-compresses to 0.8MB max; also below our 2MB storage rule limit.
                const url = await uploadImageToStorage(file, storagePath, {
                    maxSizeMB: 0.5,
                    maxWidthOrHeight: 512,
                });

                await addDoc(collection(db, "avatars"), {
                    url,
                    category: activeTab,
                    storagePath,
                    label: "",
                    order: existingCount + i,
                    createdAt: serverTimestamp(),
                });

                uploaded++;
            } catch (err: unknown) {
                console.error("upload failed for", file.name, err);
                failed++;
            } finally {
                setUploadProgress({ done: i + 1, total: files.length });
            }
        }

        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";

        if (uploaded > 0) toast.success(`อัปโหลด ${uploaded} รูปสำเร็จ`);
        if (failed > 0) toast.error(`อัปโหลด ${failed} รูปไม่สำเร็จ`);

        // Refresh
        await fetchAll();
    };

    const handleDelete = (avatar: AvatarDoc) => {
        confirmModal(
            "ยืนยันการลบรูป",
            `ลบรูปนี้ออกจากคลังถาวร? (นักเรียนที่เคยเลือกรูปนี้จะยังคงเห็นรูปเดิมอยู่เพราะ URL ยังใช้ได้)`,
            async () => {
                try {
                    // 1. Delete Firestore doc first (so it disappears from UI even if Storage delete fails)
                    await deleteDoc(doc(db, "avatars", avatar.id));
                    // 2. Delete Storage file (best-effort)
                    if (avatar.storagePath) {
                        try {
                            await deleteObject(ref(storage, avatar.storagePath));
                        } catch (storageErr) {
                            console.warn("storage delete failed (doc already removed):", storageErr);
                        }
                    }
                    toast.success("ลบแล้ว");
                    // Optimistic: remove from local state
                    setAvatars((prev) => ({
                        ...prev,
                        [avatar.category]: (prev[avatar.category] || []).filter((a) => a.id !== avatar.id),
                    }));
                } catch (e: unknown) {
                    console.error("delete failed:", e);
                    toast.error("ลบไม่สำเร็จ: " + getErrorMessage(e));
                }
            },
            true
        );
    };

    // === Auth gate ===
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }
    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <div className="text-center max-w-sm">
                    <h1 className="text-2xl font-bold text-slate-700">จำเป็นต้องเป็นแอดมิน</h1>
                    <p className="text-slate-500 mt-2">เข้าสู่ระบบด้วยบัญชีแอดมินก่อน</p>
                    <Link href="/" className="inline-block mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg">
                        กลับหน้าหลัก
                    </Link>
                </div>
            </div>
        );
    }

    const current = avatars[activeTab] || [];

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin"
                            className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 transition"
                        >
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-800">
                                🖼️ จัดการรูปประจำตัว
                            </h1>
                            <p className="text-slate-500 text-sm">
                                เพิ่ม/ลบ รูปที่นักเรียนจะเลือกใช้เป็น avatar
                            </p>
                        </div>
                    </div>

                    {/* Upload + Cleanup buttons */}
                    <div className="flex gap-2 flex-wrap">
                        <Link
                            href="/admin/avatars/cleanup"
                            className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 font-bold flex items-center gap-2 text-sm"
                            title="ล้างรูปเก่าที่ไม่ใช้แล้ว"
                        >
                            🧹 ล้างรูปเก่า
                        </Link>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleFilesSelected}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    กำลังอัปโหลด ({uploadProgress.done}/{uploadProgress.total})
                                </>
                            ) : (
                                <>
                                    <Upload size={18} />
                                    อัปโหลดรูปใหม่
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Helper note */}
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                    <p className="font-bold mb-1">💡 เคล็ดลับ</p>
                    <ul className="list-disc pl-5 space-y-0.5 text-blue-700">
                        <li>เลือกแท็บหมวดที่ต้องการก่อน แล้วค่อยอัปโหลด (อัปโหลดหลายรูปพร้อมกันได้)</li>
                        <li>เพิ่ม/ลบหมวดหมู่ได้ด้านล่าง (ลบได้เฉพาะหมวดที่ไม่มีรูป)</li>
                        <li>ระบบจะ compress รูปอัตโนมัติให้ขนาดเล็ก (≤512×512, ≤0.5MB) เพื่อประหยัด bandwidth</li>
                        <li>รูปแนะนำ: สี่เหลี่ยมจัตุรัส, PNG มีพื้นหลังโปร่งใส</li>
                        <li>ลบรูปจะไม่กระทบนักเรียนที่เลือกรูปนี้ไปแล้ว (URL เดิมยังใช้ได้)</li>
                    </ul>
                </div>

                <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4">
                    <p className="font-bold text-slate-800 mb-3">จัดการหมวดหมู่</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="text"
                            value={newCategoryEmoji}
                            onChange={(e) => setNewCategoryEmoji(e.target.value)}
                            className="w-20 px-3 py-2 rounded-lg border border-slate-300 text-center"
                            placeholder="✨"
                            maxLength={4}
                        />
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addCategory()}
                            className="min-w-[220px] flex-1 px-3 py-2 rounded-lg border border-slate-300"
                            placeholder="ชื่อหมวดหมู่ใหม่ (เช่น นักวิทย์)"
                        />
                        <button
                            onClick={addCategory}
                            disabled={addingCategory || !newCategoryName.trim()}
                            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-bold disabled:opacity-50 flex items-center gap-2"
                        >
                            {addingCategory ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            เพิ่มหมวดหมู่
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        หมายเหตุ: ระบบจะสร้างรหัสหมวดหมู่อัตโนมัติจากชื่อหมวดที่กรอก
                    </p>
                </div>

                {/* Error banner */}
                {fetchError && (
                    <div className="mb-4 bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-bold text-amber-800">โหลดรูปไม่สำเร็จ</p>
                            <p className="text-amber-700 mt-1 font-mono text-xs">{fetchError}</p>
                            <button
                                onClick={fetchAll}
                                className="mt-2 px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700"
                            >
                                ลองใหม่
                            </button>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {categories.map((t) => {
                        const count = avatars[t.id]?.length || 0;
                        const active = activeTab === t.id;
                        return (
                            <div key={t.id} className="flex items-center gap-1">
                                <button
                                    onClick={() => { setActiveTab(t.id); setSelectedIds(new Set()); }}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 ${active
                                        ? "bg-slate-800 text-white shadow-sm"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                                        }`}
                                >
                                    <span>{t.emoji}</span>
                                    <span>{t.label}</span>
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                                            }`}
                                    >
                                        {count}
                                    </span>
                                </button>
                                <button
                                    onClick={() => handleDeleteCategory(t)}
                                    disabled={!t.persisted}
                                    className="p-2 rounded-lg border border-slate-200 bg-white text-rose-500 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                    title={!t.persisted ? "หมวด fallback ลบไม่ได้" : count > 0 ? `ลบหมวดพร้อมรูป ${count} รูป` : "ลบหมวดหมู่"}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Selection mode toolbar */}
                {current.length > 0 && (
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                        {selectionMode ? (
                            <>
                                <button
                                    onClick={exitSelectionMode}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-100 flex items-center gap-2"
                                >
                                    <X size={16} />
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={selectedIds.size === current.length ? deselectAll : selectAll}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-100 flex items-center gap-2"
                                >
                                    {selectedIds.size === current.length ? <CheckSquare size={16} /> : <Square size={16} />}
                                    {selectedIds.size === current.length ? "เลิกเลือกทั้งหมด" : "เลือกทั้งหมด"}
                                </button>
                                {selectedIds.size > 0 && (
                                    <button
                                        onClick={handleBulkDelete}
                                        disabled={bulkDeleting}
                                        className="px-4 py-2 bg-rose-500 text-white rounded-lg font-bold text-sm hover:bg-rose-600 shadow-md shadow-rose-200 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {bulkDeleting ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={16} />
                                        )}
                                        ลบที่เลือก ({selectedIds.size})
                                    </button>
                                )}
                            </>
                        ) : (
                            <button
                                onClick={() => setSelectionMode(true)}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-100 flex items-center gap-2"
                            >
                                <CheckSquare size={16} />
                                เลือกหลายรูป
                            </button>
                        )}
                    </div>
                )}

                {/* Grid */}
                {loading ? (
                    <div className="text-center py-20 text-slate-400">
                        <Loader2 className="animate-spin mx-auto mb-3" size={32} />
                        กำลังโหลด…
                    </div>
                ) : current.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                        <ImageOff className="mx-auto text-slate-300 mb-3" size={48} />
                        <p className="text-slate-500 font-bold">ยังไม่มีรูปในหมวดนี้</p>
                        <p className="text-slate-400 text-sm mt-1">
                            กด &quot;อัปโหลดรูปใหม่&quot; ด้านบนเพื่อเพิ่มรูปแรก
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {current.map((a) => {
                            const isSelected = selectedIds.has(a.id);
                            return (
                                <div
                                    key={a.id}
                                    onClick={selectionMode ? () => toggleSelect(a.id) : undefined}
                                    className={`group relative bg-white border-2 rounded-xl p-3 hover:shadow-md transition cursor-pointer ${
                                        selectionMode && isSelected
                                            ? "border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50/50"
                                            : "border-slate-200"
                                    }`}
                                >
                                    {selectionMode && (
                                        <div className="absolute top-2 left-2 z-10">
                                            {isSelected ? (
                                                <CheckSquare size={20} className="text-indigo-600" />
                                            ) : (
                                                <Square size={20} className="text-slate-400" />
                                            )}
                                        </div>
                                    )}
                                    <div className="aspect-square rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={a.url}
                                            alt={a.label || "avatar"}
                                            loading="lazy"
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                (e.currentTarget as HTMLImageElement).style.opacity = "0.2";
                                            }}
                                        />
                                    </div>
                                    {!selectionMode && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(a); }}
                                            className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg text-rose-500 hover:bg-rose-50 hover:border-rose-200 opacity-0 group-hover:opacity-100 transition"
                                            title="ลบรูปนี้"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <ConfirmDialog />
        </div>
    );
}
