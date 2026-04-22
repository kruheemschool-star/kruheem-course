"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db, storage } from "@/lib/firebase";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    writeBatch,
} from "firebase/firestore";
import { ref, listAll, deleteObject, getMetadata } from "firebase/storage";
import { useUserAuth } from "@/context/AuthContext";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import toast, { Toaster } from "react-hot-toast";
import {
    ArrowLeft,
    AlertTriangle,
    Loader2,
    Search,
    Trash2,
    Users,
    Image as ImageIcon,
    CheckCircle2,
    XCircle,
    Shield,
} from "lucide-react";

// Legacy Storage paths to sweep.
// These are the prefixes where the OLD hardcoded avatars live.
const LEGACY_PREFIXES = [
    "static/avatars/kids",
    "static/avatars/male",
    "static/avatars/female",
    "static/avatars/animals",
    "static/avatars/monsters",
] as const;

// Heuristic: any user whose .avatar starts with this base is on a legacy URL.
const LEGACY_URL_BASE = "https://storage.googleapis.com/kruheem-course-45088.firebasestorage.app/static/avatars/";

interface LegacyFile {
    fullPath: string;   // e.g. "static/avatars/kids/kid_1.png"
    url: string;        // public URL (for matching against users)
    size?: number;      // bytes
    category: string;   // folder name
}

interface AffectedUser {
    uid: string;
    displayName: string;
    avatar: string;
}

export default function AvatarCleanupPage() {
    const { user, isAdmin, loading: authLoading } = useUserAuth();
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();

    const [scanning, setScanning] = useState(false);
    const [scanned, setScanned] = useState(false);
    const [legacyFiles, setLegacyFiles] = useState<LegacyFile[]>([]);
    const [totalBytes, setTotalBytes] = useState(0);

    const [affectedUsers, setAffectedUsers] = useState<AffectedUser[]>([]);
    const [newAvatarCount, setNewAvatarCount] = useState<number>(0);
    const [defaultNewAvatar, setDefaultNewAvatar] = useState<string>("");

    const [migrating, setMigrating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteProgress, setDeleteProgress] = useState({ done: 0, total: 0 });

    // === Build URL helper (matches Firebase Storage public URL format) ===
    const bucketFromEnv = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "";
    const toPublicUrl = (fullPath: string) =>
        `https://storage.googleapis.com/${bucketFromEnv}/${fullPath}`;

    // === Scan Storage + count affected users ===
    const runScan = async () => {
        setScanning(true);
        setScanned(false);
        try {
            // 1) List legacy Storage files recursively.
            const files: LegacyFile[] = [];
            let bytes = 0;
            for (const prefix of LEGACY_PREFIXES) {
                const folderRef = ref(storage, prefix);
                let result;
                try {
                    result = await listAll(folderRef);
                } catch (e) {
                    console.warn("listAll failed for", prefix, e);
                    continue;
                }
                for (const itemRef of result.items) {
                    let size = 0;
                    try {
                        const meta = await getMetadata(itemRef);
                        size = Number(meta.size || 0);
                    } catch {
                        // Ignore — metadata optional
                    }
                    const url = toPublicUrl(itemRef.fullPath);
                    files.push({
                        fullPath: itemRef.fullPath,
                        url,
                        size,
                        category: prefix.replace("static/avatars/", ""),
                    });
                    bytes += size;
                }
            }
            setLegacyFiles(files);
            setTotalBytes(bytes);

            // 2) Count how many users still reference these URLs.
            //    One-time full scan of /users (cached in memory, ~1 read per user).
            const usersSnap = await getDocs(collection(db, "users"));
            const legacyUrlSet = new Set(files.map((f) => f.url));
            const affected: AffectedUser[] = [];
            usersSnap.docs.forEach((d) => {
                const data = d.data() as any;
                const avatar: string = data?.avatar || "";
                // Match either full URL or any URL starting with legacy base
                if (avatar && (legacyUrlSet.has(avatar) || avatar.startsWith(LEGACY_URL_BASE))) {
                    affected.push({
                        uid: d.id,
                        displayName: data?.displayName || "(ไม่มีชื่อ)",
                        avatar,
                    });
                }
            });
            setAffectedUsers(affected);

            // 3) Count NEW avatars in Firestore (safety guard).
            const newSnap = await getDocs(collection(db, "avatars"));
            setNewAvatarCount(newSnap.size);
            // Pick a default new avatar (first one sorted by order)
            const newList = newSnap.docs
                .map((d) => {
                    const data = d.data() as any;
                    return {
                        url: data.url as string,
                        order: typeof data.order === "number" ? data.order : 9999,
                    };
                })
                .filter((a) => !!a.url)
                .sort((a, b) => a.order - b.order);
            setDefaultNewAvatar(newList[0]?.url || "");

            setScanned(true);
            toast.success("สแกนเสร็จแล้ว");
        } catch (e: any) {
            console.error("scan failed:", e);
            toast.error("สแกนไม่สำเร็จ: " + (e?.message || ""));
        } finally {
            setScanning(false);
        }
    };

    // === Migration: reassign affected users to a new default avatar ===
    const runMigration = async () => {
        if (!defaultNewAvatar) {
            toast.error("ยังไม่มีรูปใหม่ใน library — อัปโหลดก่อน");
            return;
        }
        if (affectedUsers.length === 0) {
            toast("ไม่มีนักเรียนที่ต้องย้าย", { icon: "✨" });
            return;
        }

        confirmModal(
            "ยืนยันการย้ายรูปประจำตัวนักเรียน",
            `จะเปลี่ยน avatar ของ ${affectedUsers.length} คนให้เป็นรูป default ใหม่ ทำต่อไหม?`,
            async () => {
                setMigrating(true);
                try {
                    // Firestore batch = 500 ops/batch max
                    const BATCH_LIMIT = 400;
                    let migrated = 0;
                    for (let i = 0; i < affectedUsers.length; i += BATCH_LIMIT) {
                        const chunk = affectedUsers.slice(i, i + BATCH_LIMIT);
                        const batch = writeBatch(db);
                        chunk.forEach((u) => {
                            batch.update(doc(db, "users", u.uid), {
                                avatar: defaultNewAvatar,
                                photoURL: defaultNewAvatar,
                            });
                        });
                        await batch.commit();
                        migrated += chunk.length;
                    }
                    toast.success(`ย้าย ${migrated} คนสำเร็จ`);
                    // Re-scan so UI shows 0 affected
                    await runScan();
                } catch (e: any) {
                    console.error("migration failed:", e);
                    toast.error("ย้ายไม่สำเร็จ: " + (e?.message || ""));
                } finally {
                    setMigrating(false);
                }
            },
            true
        );
    };

    // === Delete legacy Storage files ===
    const runDelete = async () => {
        if (newAvatarCount === 0) {
            toast.error("ยังไม่มีรูปใหม่ใน Firestore — อัปโหลดก่อน ไม่งั้นหน้า profile จะพัง");
            return;
        }
        if (affectedUsers.length > 0) {
            toast.error(`ยังมีนักเรียน ${affectedUsers.length} คนใช้รูปเก่า — ย้ายก่อน`);
            return;
        }

        confirmModal(
            "ยืนยันการลบไฟล์รูปเก่าถาวร",
            `จะลบ ${legacyFiles.length} ไฟล์ (${(totalBytes / 1024).toFixed(1)} KB) ออกจาก Storage ถาวร — กู้คืนไม่ได้ ยืนยัน?`,
            async () => {
                setDeleting(true);
                setDeleteProgress({ done: 0, total: legacyFiles.length });
                let ok = 0, fail = 0;
                for (let i = 0; i < legacyFiles.length; i++) {
                    const f = legacyFiles[i];
                    try {
                        await deleteObject(ref(storage, f.fullPath));
                        ok++;
                    } catch (e) {
                        console.warn("delete failed", f.fullPath, e);
                        fail++;
                    }
                    setDeleteProgress({ done: i + 1, total: legacyFiles.length });
                }
                setDeleting(false);
                if (ok > 0) toast.success(`ลบสำเร็จ ${ok} ไฟล์`);
                if (fail > 0) toast.error(`ลบไม่สำเร็จ ${fail} ไฟล์`);
                // Re-scan
                await runScan();
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
                    <Link href="/" className="inline-block mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg">
                        กลับหน้าหลัก
                    </Link>
                </div>
            </div>
        );
    }

    const canMigrate = scanned && affectedUsers.length > 0 && newAvatarCount > 0;
    const canDelete = scanned && legacyFiles.length > 0 && affectedUsers.length === 0 && newAvatarCount > 0;

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
            <Toaster position="top-right" />
            <div className="max-w-4xl mx-auto">
                <Link
                    href="/admin/avatars"
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4 text-sm"
                >
                    <ArrowLeft size={16} />
                    กลับไปจัดการรูปประจำตัว
                </Link>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">
                    🧹 ล้างรูปเก่า (Legacy Cleanup)
                </h1>
                <p className="text-slate-500 mb-6">
                    ลบรูป avatar ชุดเดิมที่ถูกฝังมาตั้งแต่เริ่มต้น (hardcoded ใน <code className="text-xs bg-slate-100 px-1 rounded">lib/staticAssets.ts</code>)
                </p>

                {/* Warning banner */}
                <div className="mb-6 bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                        <p className="font-bold mb-1">ขั้นตอนที่ถูกต้อง:</p>
                        <ol className="list-decimal pl-5 space-y-0.5 text-amber-700">
                            <li>อัปโหลดรูปใหม่ที่ <Link href="/admin/avatars" className="underline font-bold">/admin/avatars</Link> ให้ครบทุกหมวดก่อน</li>
                            <li>กด "สแกน" เพื่อดูจำนวนนักเรียนที่ต้องย้าย</li>
                            <li>กด "ย้ายรูปนักเรียน" → ให้เป็น default ใหม่</li>
                            <li>กด "ลบไฟล์เก่า" → ล้าง Storage</li>
                        </ol>
                        <p className="mt-2 font-semibold">ระบบจะบล็อกการลบถ้ายังไม่มีรูปใหม่หรือยังมีนักเรียนใช้รูปเก่าอยู่</p>
                    </div>
                </div>

                {/* Scan button */}
                <button
                    onClick={runScan}
                    disabled={scanning}
                    className="w-full mb-6 px-6 py-4 bg-slate-800 text-white rounded-xl hover:bg-slate-900 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {scanning ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            กำลังสแกน…
                        </>
                    ) : (
                        <>
                            <Search size={18} />
                            {scanned ? "สแกนใหม่" : "เริ่มสแกน"}
                        </>
                    )}
                </button>

                {scanned && (
                    <div className="space-y-4">
                        {/* Stat cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <StatCard
                                icon={<ImageIcon size={20} />}
                                label="ไฟล์รูปเก่าใน Storage"
                                value={`${legacyFiles.length} ไฟล์`}
                                sub={`~${(totalBytes / 1024).toFixed(1)} KB`}
                                tone={legacyFiles.length > 0 ? "warn" : "ok"}
                            />
                            <StatCard
                                icon={<Users size={20} />}
                                label="นักเรียนใช้รูปเก่า"
                                value={`${affectedUsers.length} คน`}
                                sub={affectedUsers.length > 0 ? "ต้องย้ายก่อนลบ" : "ปลอดภัยลบได้"}
                                tone={affectedUsers.length > 0 ? "warn" : "ok"}
                            />
                            <StatCard
                                icon={<Shield size={20} />}
                                label="รูปใหม่ใน Firestore"
                                value={`${newAvatarCount} รูป`}
                                sub={newAvatarCount > 0 ? "พร้อมใช้" : "อัปโหลดก่อน!"}
                                tone={newAvatarCount > 0 ? "ok" : "danger"}
                            />
                        </div>

                        {/* Affected users preview */}
                        {affectedUsers.length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-xl p-4">
                                <h3 className="font-bold text-slate-700 mb-3">
                                    นักเรียนที่ยังใช้รูปเก่า ({affectedUsers.length} คน)
                                </h3>
                                <div className="max-h-48 overflow-y-auto space-y-1 text-sm">
                                    {affectedUsers.slice(0, 50).map((u) => (
                                        <div key={u.uid} className="flex items-center gap-2 text-slate-600">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={u.avatar} alt="" className="w-6 h-6 rounded-full bg-slate-100" loading="lazy" />
                                            <span className="flex-1 truncate">{u.displayName}</span>
                                            <span className="text-xs text-slate-400 font-mono">{u.uid.slice(0, 8)}</span>
                                        </div>
                                    ))}
                                    {affectedUsers.length > 50 && (
                                        <p className="text-slate-400 text-xs italic pt-1">
                                            …และอีก {affectedUsers.length - 50} คน
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={runMigration}
                                    disabled={!canMigrate || migrating}
                                    className="mt-4 w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {migrating ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            กำลังย้าย…
                                        </>
                                    ) : (
                                        <>
                                            <Users size={16} />
                                            ย้ายทั้งหมดไปใช้รูป default ใหม่
                                        </>
                                    )}
                                </button>
                                {defaultNewAvatar && (
                                    <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
                                        <span>รูป default ที่จะใช้:</span>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={defaultNewAvatar} alt="" className="w-8 h-8 rounded-full bg-slate-100" loading="lazy" />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Delete action */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <Trash2 size={18} className="text-rose-500" />
                                ลบไฟล์รูปเก่า (ถาวร)
                            </h3>

                            <SafetyCheck
                                ok={newAvatarCount > 0}
                                label="มีรูปใหม่ใน Firestore avatars"
                                detail={newAvatarCount > 0 ? `${newAvatarCount} รูป พร้อม` : "ต้องอัปโหลดก่อน"}
                            />
                            <SafetyCheck
                                ok={affectedUsers.length === 0}
                                label="ไม่มีนักเรียนใช้รูปเก่า"
                                detail={affectedUsers.length === 0 ? "ปลอดภัย" : `ยังมี ${affectedUsers.length} คน — ย้ายก่อน`}
                            />
                            <SafetyCheck
                                ok={legacyFiles.length > 0}
                                label="มีไฟล์รูปเก่าให้ลบ"
                                detail={`${legacyFiles.length} ไฟล์`}
                            />

                            <button
                                onClick={runDelete}
                                disabled={!canDelete || deleting}
                                className="mt-4 w-full px-4 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {deleting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        กำลังลบ ({deleteProgress.done}/{deleteProgress.total})
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={16} />
                                        ลบไฟล์ทั้งหมดถาวร
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <ConfirmDialog />
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    sub,
    tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    tone: "ok" | "warn" | "danger";
}) {
    const toneCls =
        tone === "ok"
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : tone === "warn"
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-rose-50 border-rose-200 text-rose-700";
    return (
        <div className={`border rounded-xl p-4 ${toneCls}`}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-70">
                {icon}
                <span>{label}</span>
            </div>
            <p className="text-2xl font-black mt-1">{value}</p>
            {sub && <p className="text-xs mt-0.5 opacity-70">{sub}</p>}
        </div>
    );
}

function SafetyCheck({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
    return (
        <div className="flex items-start gap-2 text-sm py-1">
            {ok ? (
                <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            ) : (
                <XCircle size={16} className="text-rose-500 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
                <span className={ok ? "text-slate-700" : "text-rose-600 font-medium"}>{label}</span>
                <span className="text-slate-400 text-xs ml-2">— {detail}</span>
            </div>
        </div>
    );
}
