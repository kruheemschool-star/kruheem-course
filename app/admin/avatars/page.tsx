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
import { Upload, Trash2, Loader2, ImageOff, AlertCircle, Plus, CheckSquare, Square, X, Images, Layers, Star, FolderOpen, Sparkles } from "lucide-react";

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
            <div className="flex items-center justify-center py-32">
                <Loader2 className="animate-spin" size={32} style={{ color: "var(--ink-3)" }} />
            </div>
        );
    }
    if (!isAdmin) {
        return (
            <div className="kh-card p-10 flex flex-col items-center text-center gap-3 max-w-sm mx-auto">
                <h1 className="text-2xl font-bold kh-ink">จำเป็นต้องเป็นแอดมิน</h1>
                <p className="kh-ink2">เข้าสู่ระบบด้วยบัญชีแอดมินก่อน</p>
                <Link href="/" className="kh-btn mt-2">กลับหน้าหลัก</Link>
            </div>
        );
    }

    const current = avatars[activeTab] || [];

    // === Stats derived ONLY from data already loaded ===
    const totalAvatars = Object.values(avatars).reduce((sum, list) => sum + list.length, 0);
    const totalCategories = categories.length;
    const emptyCategories = categories.filter((c) => (avatars[c.id]?.length || 0) === 0).length;
    const topCategory = categories.reduce<{ label: string; count: number } | null>((best, c) => {
        const count = avatars[c.id]?.length || 0;
        if (!best || count > best.count) return { label: c.label, count };
        return best;
    }, null);

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            {/* Top toolbar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <span className="kh-eyebrow"><Images size={14} /> คลังรูปประจำตัว</span>
                    <span className="kh-pill kh-pill-accent no-dot">{totalAvatars} รูป</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Link
                        href="/admin/avatars/cleanup"
                        className="kh-btn-ghost"
                        title="ล้างรูปเก่าที่ไม่ใช้แล้ว"
                    >
                        <Sparkles size={16} /> ล้างรูปเก่า
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
                        className="kh-btn"
                    >
                        {uploading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                กำลังอัปโหลด ({uploadProgress.done}/{uploadProgress.total})
                            </>
                        ) : (
                            <>
                                <Upload size={16} />
                                อัปโหลดรูปใหม่
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Stat chips */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="kh-card p-4 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold kh-ink3">รูปทั้งหมด</p>
                        <p className="kh-num text-2xl font-black kh-ink mt-1">{totalAvatars}</p>
                    </div>
                    <Images size={22} style={{ color: "var(--accent)" }} />
                </div>
                <div className="kh-card p-4 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold kh-ink3">หมวดหมู่</p>
                        <p className="kh-num text-2xl font-black kh-ink mt-1">{totalCategories}</p>
                    </div>
                    <Layers size={22} style={{ color: "var(--good)" }} />
                </div>
                <div className="kh-card p-4 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold kh-ink3">หมวดที่มีรูปมากสุด</p>
                        <p className="text-base font-black kh-ink mt-1 truncate">{topCategory && topCategory.count > 0 ? topCategory.label : "—"}</p>
                        {topCategory && topCategory.count > 0 && (
                            <p className="kh-num text-xs kh-ink3">{topCategory.count} รูป</p>
                        )}
                    </div>
                    <Star size={22} style={{ color: "var(--warn)" }} />
                </div>
                <div className="kh-card p-4 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold kh-ink3">หมวดที่ยังว่าง</p>
                        <p className="kh-num text-2xl font-black kh-ink mt-1">{emptyCategories}</p>
                    </div>
                    <FolderOpen size={22} style={{ color: "var(--danger)" }} />
                </div>
            </div>

            {/* Helper note */}
            <div className="kh-card p-4" style={{ background: "var(--accent-soft)", borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)" }}>
                <p className="font-bold mb-1" style={{ color: "var(--accent-ink)" }}>เคล็ดลับ</p>
                <ul className="list-disc pl-5 space-y-0.5 text-sm" style={{ color: "var(--accent-ink)" }}>
                    <li>เลือกแท็บหมวดที่ต้องการก่อน แล้วค่อยอัปโหลด (อัปโหลดหลายรูปพร้อมกันได้)</li>
                    <li>เพิ่ม/ลบหมวดหมู่ได้ด้านล่าง (ลบได้เฉพาะหมวดที่ไม่มีรูป)</li>
                    <li>ระบบจะ compress รูปอัตโนมัติให้ขนาดเล็ก (≤512×512, ≤0.5MB) เพื่อประหยัด bandwidth</li>
                    <li>รูปแนะนำ: สี่เหลี่ยมจัตุรัส, PNG มีพื้นหลังโปร่งใส</li>
                    <li>ลบรูปจะไม่กระทบนักเรียนที่เลือกรูปนี้ไปแล้ว (URL เดิมยังใช้ได้)</li>
                </ul>
            </div>

            {/* Category management */}
            <div className="kh-card p-4">
                <p className="font-bold kh-ink mb-3">จัดการหมวดหมู่</p>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        value={newCategoryEmoji}
                        onChange={(e) => setNewCategoryEmoji(e.target.value)}
                        className="kh-input text-center"
                        style={{ width: "5rem" }}
                        placeholder="✨"
                        maxLength={4}
                    />
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addCategory()}
                        className="kh-input flex-1"
                        style={{ minWidth: "220px" }}
                        placeholder="ชื่อหมวดหมู่ใหม่ (เช่น นักวิทย์)"
                    />
                    <button
                        onClick={addCategory}
                        disabled={addingCategory || !newCategoryName.trim()}
                        className="kh-btn"
                    >
                        {addingCategory ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        เพิ่มหมวดหมู่
                    </button>
                </div>
                <p className="text-xs kh-ink3 mt-2">
                    หมายเหตุ: ระบบจะสร้างรหัสหมวดหมู่อัตโนมัติจากชื่อหมวดที่กรอก
                </p>
            </div>

            {/* Error banner */}
            {fetchError && (
                <div className="kh-card p-4 flex items-start gap-3" style={{ background: "var(--warn-soft)", borderColor: "color-mix(in srgb, var(--warn) 35%, transparent)" }}>
                    <AlertCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: "var(--warn)" }} />
                    <div className="text-sm">
                        <p className="font-bold" style={{ color: "var(--warn)" }}>โหลดรูปไม่สำเร็จ</p>
                        <p className="mt-1 font-mono text-xs" style={{ color: "var(--warn)" }}>{fetchError}</p>
                        <button
                            onClick={fetchAll}
                            className="kh-btn mt-2"
                        >
                            ลองใหม่
                        </button>
                    </div>
                </div>
            )}

            {/* Category filter tabs */}
            <div className="flex flex-wrap gap-2">
                {categories.map((t) => {
                    const count = avatars[t.id]?.length || 0;
                    const active = activeTab === t.id;
                    return (
                        <div key={t.id} className="flex items-center gap-1">
                            <button
                                onClick={() => { setActiveTab(t.id); setSelectedIds(new Set()); }}
                                data-active={active}
                                className="kh-tab flex items-center gap-2"
                            >
                                <span>{t.emoji}</span>
                                <span>{t.label}</span>
                                <span className="kh-pill kh-pill-ink no-dot kh-num" style={{ padding: "1px 8px" }}>
                                    {count}
                                </span>
                            </button>
                            <button
                                onClick={() => handleDeleteCategory(t)}
                                disabled={!t.persisted}
                                className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ color: "var(--danger)" }}
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
                <div className="flex items-center gap-2 flex-wrap">
                    {selectionMode ? (
                        <>
                            <button
                                onClick={exitSelectionMode}
                                className="kh-btn-ghost"
                            >
                                <X size={16} />
                                ยกเลิก
                            </button>
                            <button
                                onClick={selectedIds.size === current.length ? deselectAll : selectAll}
                                className="kh-btn-ghost"
                            >
                                {selectedIds.size === current.length ? <CheckSquare size={16} /> : <Square size={16} />}
                                {selectedIds.size === current.length ? "เลิกเลือกทั้งหมด" : "เลือกทั้งหมด"}
                            </button>
                            {selectedIds.size > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={bulkDeleting}
                                    className="kh-btn"
                                    style={{ background: "linear-gradient(135deg, var(--danger), var(--danger))" }}
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
                            className="kh-btn-ghost"
                        >
                            <CheckSquare size={16} />
                            เลือกหลายรูป
                        </button>
                    )}
                </div>
            )}

            {/* Upload dropzone + Grid */}
            {loading ? (
                <div className="kh-card p-16 flex flex-col items-center text-center gap-3" style={{ color: "var(--ink-3)" }}>
                    <Loader2 className="animate-spin" size={32} />
                    กำลังโหลด…
                </div>
            ) : current.length === 0 ? (
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="kh-card w-full p-16 flex flex-col items-center text-center gap-3 transition"
                    style={{ borderStyle: "dashed", borderWidth: "2px", borderColor: "var(--line-2)", color: "var(--ink-3)" }}
                >
                    <ImageOff size={48} style={{ color: "var(--ink-3)" }} />
                    <p className="font-bold kh-ink2">ยังไม่มีรูปในหมวดนี้</p>
                    <p className="text-sm kh-ink3">
                        กด &quot;อัปโหลดรูปใหม่&quot; ด้านบน หรือคลิกที่นี่เพื่อเพิ่มรูปแรก
                    </p>
                </button>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {current.map((a) => {
                        const isSelected = selectedIds.has(a.id);
                        return (
                            <div
                                key={a.id}
                                onClick={selectionMode ? () => toggleSelect(a.id) : undefined}
                                className="kh-card kh-card-h group relative p-3 cursor-pointer"
                                style={
                                    selectionMode && isSelected
                                        ? { borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-soft)" }
                                        : undefined
                                }
                            >
                                {selectionMode && (
                                    <div className="absolute top-2 left-2 z-10">
                                        {isSelected ? (
                                            <CheckSquare size={20} style={{ color: "var(--accent)" }} />
                                        ) : (
                                            <Square size={20} style={{ color: "var(--ink-3)" }} />
                                        )}
                                    </div>
                                )}
                                <div className="aspect-square rounded-lg overflow-hidden flex items-center justify-center" style={{ background: "var(--card-2)" }}>
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
                                        className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition"
                                        style={{ background: "var(--card)", border: "1px solid var(--line)", color: "var(--danger)" }}
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
            <ConfirmDialog />
        </div>
    );
}
