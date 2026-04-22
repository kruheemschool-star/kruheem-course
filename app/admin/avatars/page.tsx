"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { db, storage } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    orderBy,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { uploadImageToStorage } from "@/lib/upload";
import { useUserAuth } from "@/context/AuthContext";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import toast, { Toaster } from "react-hot-toast";
import { ArrowLeft, Upload, Trash2, Loader2, ImageOff, AlertCircle } from "lucide-react";

type AvatarCategory = "kids" | "female" | "male" | "animals" | "monsters";

const TABS: { id: AvatarCategory; label: string; emoji: string }[] = [
    { id: "kids", label: "เด็ก", emoji: "🧒" },
    { id: "male", label: "ผู้ชาย", emoji: "👦" },
    { id: "female", label: "ผู้หญิง", emoji: "👧" },
    { id: "animals", label: "สัตว์น่ารัก", emoji: "🦁" },
    { id: "monsters", label: "สัตว์ประหลาด", emoji: "👾" },
];

interface AvatarDoc {
    id: string;
    url: string;
    category: AvatarCategory;
    storagePath: string;
    label?: string;
    order?: number;
    createdAt?: any;
}

export default function AdminAvatarsPage() {
    const { user, isAdmin, loading: authLoading } = useUserAuth();
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();

    const [activeTab, setActiveTab] = useState<AvatarCategory>("kids");
    const [avatars, setAvatars] = useState<Record<AvatarCategory, AvatarDoc[]>>({
        kids: [], male: [], female: [], animals: [], monsters: [],
    });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
    const [fetchError, setFetchError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Single fetch for ALL categories — one Firestore read per mount (cheap).
    const fetchAll = async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const snap = await getDocs(collection(db, "avatars"));
            const byCat: Record<AvatarCategory, AvatarDoc[]> = {
                kids: [], male: [], female: [], animals: [], monsters: [],
            };
            snap.docs.forEach((d) => {
                const data = d.data() as any;
                if (!data.category || !byCat[data.category as AvatarCategory]) return;
                byCat[data.category as AvatarCategory].push({
                    id: d.id,
                    url: data.url,
                    category: data.category,
                    storagePath: data.storagePath || "",
                    label: data.label || "",
                    order: typeof data.order === "number" ? data.order : 9999,
                    createdAt: data.createdAt,
                });
            });
            // Client-side sort by order ASC, then createdAt ASC (nulls last)
            (Object.keys(byCat) as AvatarCategory[]).forEach((k) => {
                byCat[k].sort((a, b) => {
                    const oa = a.order ?? 9999;
                    const ob = b.order ?? 9999;
                    if (oa !== ob) return oa - ob;
                    const ta = a.createdAt?.toMillis?.() ?? 0;
                    const tb = b.createdAt?.toMillis?.() ?? 0;
                    return ta - tb;
                });
            });
            setAvatars(byCat);
        } catch (e: any) {
            console.error("fetch avatars failed:", e);
            setFetchError(e?.message || "unknown");
            toast.error("โหลดรูปไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authLoading) return;
        if (!isAdmin) return;
        fetchAll();
    }, [authLoading, isAdmin]);

    const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        if (!user) {
            toast.error("ต้อง login admin ก่อน");
            return;
        }

        setUploading(true);
        setUploadProgress({ done: 0, total: files.length });

        const existingCount = avatars[activeTab].length;
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
            } catch (err: any) {
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
                        [avatar.category]: prev[avatar.category].filter((a) => a.id !== avatar.id),
                    }));
                } catch (e: any) {
                    console.error("delete failed:", e);
                    toast.error("ลบไม่สำเร็จ: " + (e?.message || ""));
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

    const current = avatars[activeTab];

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
                        <li>ระบบจะ compress รูปอัตโนมัติให้ขนาดเล็ก (≤512×512, ≤0.5MB) เพื่อประหยัด bandwidth</li>
                        <li>รูปแนะนำ: สี่เหลี่ยมจัตุรัส, PNG มีพื้นหลังโปร่งใส</li>
                        <li>ลบรูปจะไม่กระทบนักเรียนที่เลือกรูปนี้ไปแล้ว (URL เดิมยังใช้ได้)</li>
                    </ul>
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
                    {TABS.map((t) => {
                        const count = avatars[t.id].length;
                        const active = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
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
                        );
                    })}
                </div>

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
                            กด "อัปโหลดรูปใหม่" ด้านบนเพื่อเพิ่มรูปแรก
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {current.map((a) => (
                            <div
                                key={a.id}
                                className="group relative bg-white border border-slate-200 rounded-xl p-3 hover:shadow-md transition"
                            >
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
                                <button
                                    onClick={() => handleDelete(a)}
                                    className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg text-rose-500 hover:bg-rose-50 hover:border-rose-200 opacity-0 group-hover:opacity-100 transition"
                                    title="ลบรูปนี้"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <ConfirmDialog />
        </div>
    );
}
