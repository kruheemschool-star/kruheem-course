"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, getDoc, getDocs, updateDoc, where } from "firebase/firestore";
import AdminGuard from "@/components/AdminGuard";
import { Plus, Ticket, Search, Trash2, CheckCircle, Clock, Copy, Wrench, Pencil, UserPlus, X } from "lucide-react";
import { useConfirmModal } from "@/hooks/useConfirmModal";

interface Coupon {
    id: string;
    code: string;
    discountAmount?: number;
    discountPercent?: number;
    userId?: string;
    courseId?: string;
    isUsed: boolean;
    usedAt?: any;
    usedForCourseId?: string;
    createdAt: any;
    source: string;
    usedCount?: number;
}

interface UserInfo {
    displayName?: string;
    email?: string;
    avatar?: string;
}

// Simple random code for admin-created coupons (admin-only, not security critical).
function genCode(prefix: string): string {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const rand = Array.from({ length: 6 }, () => charset[Math.floor(Math.random() * charset.length)]).join("");
    return `${prefix}-${rand}`;
}

function fmtDate(ts: any): string {
    if (!ts?.seconds) return "-";
    return new Date(ts.seconds * 1000).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

export default function AdminCouponsPage() {
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "unused" | "used">("all");
    const [filterSource, setFilterSource] = useState<"all" | "review_reward" | "admin_promo">("all");
    const [userMap, setUserMap] = useState<Record<string, UserInfo>>({});
    const [courseMap, setCourseMap] = useState<Record<string, string>>({});
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Create coupon form
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newCode, setNewCode] = useState("");
    const [newAmount, setNewAmount] = useState(100);
    const [newEmail, setNewEmail] = useState("");
    const [creating, setCreating] = useState(false);

    // Edit coupon modal
    const [editing, setEditing] = useState<Coupon | null>(null);
    const [editAmount, setEditAmount] = useState(0);
    const [editIsUsed, setEditIsUsed] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);

    // One-off repair: backfill review coupons that failed to be created
    // (the discountPercent rules bug denied coupon writes ~Mar–May 2026).
    const [repairing, setRepairing] = useState(false);
    const [repairResult, setRepairResult] = useState<{ ok: boolean; msg: string } | null>(null);

    const userMapCacheRef = useRef<Record<string, UserInfo>>({});

    const fetchCoupons = async () => {
        try {
            const q = query(collection(db, "coupons"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Coupon[];
            setCoupons(data);

            // Look up owner info. User docs are keyed BY uid (doc id) and have no
            // "uid" field — so read by document id, not a where("uid") query.
            const allUserIds = [...new Set(data.map(c => c.userId).filter(Boolean))] as string[];
            const newUserIds = allUserIds.filter(uid => !userMapCacheRef.current[uid]);

            if (newUserIds.length > 0) {
                await Promise.all(newUserIds.map(async (uid) => {
                    try {
                        const userSnap = await getDoc(doc(db, "users", uid));
                        if (userSnap.exists()) {
                            const u = userSnap.data();
                            userMapCacheRef.current[uid] = { displayName: u.displayName || u.name, email: u.email, avatar: u.avatar };
                        } else {
                            userMapCacheRef.current[uid] = {}; // remember "not found" so we don't refetch
                        }
                    } catch { /* ignore */ }
                }));
                setUserMap({ ...userMapCacheRef.current });
            }
        } catch (error) {
            console.error("Error fetching coupons:", error);
        } finally {
            setLoading(false);
        }
    };

    // Course id -> title, for showing which course a coupon was used on.
    useEffect(() => {
        (async () => {
            try {
                const snap = await getDocs(collection(db, "courses"));
                const map: Record<string, string> = {};
                snap.docs.forEach(d => { map[d.id] = (d.data() as any).title || d.id; });
                setCourseMap(map);
            } catch { /* ignore */ }
        })();
    }, []);

    useEffect(() => {
        fetchCoupons();
    }, []);

    const handleCreatePromo = async () => {
        const email = newEmail.trim().toLowerCase();
        let code = newCode.trim().toUpperCase();
        if (!code && !email) return alert("กรุณาใส่โค้ดคูปอง หรือ อีเมลนักเรียนที่จะมอบให้");
        if (newAmount <= 0) return alert("จำนวนส่วนลดต้องมากกว่า 0");

        setCreating(true);
        try {
            // If an email is given, bind the coupon to that student.
            let userId: string | null = null;
            if (email) {
                const us = await getDocs(query(collection(db, "users"), where("email", "==", email)));
                if (us.empty) {
                    alert(`ไม่พบนักเรียนที่ใช้อีเมล "${email}" — ตรวจสอบอีเมลอีกครั้ง (นักเรียนต้องเคยล็อกอินเข้าระบบแล้ว)`);
                    setCreating(false);
                    return;
                }
                userId = us.docs[0].id;
            }

            // Auto-generate a code if the admin didn't type one.
            if (!code) code = genCode("GIFT");

            // Don't create a duplicate code.
            const dup = await getDocs(query(collection(db, "coupons"), where("code", "==", code)));
            if (!dup.empty) {
                alert(`โค้ด "${code}" มีอยู่แล้ว กรุณาใช้โค้ดอื่น`);
                setCreating(false);
                return;
            }

            await addDoc(collection(db, "coupons"), {
                code,
                discountAmount: newAmount,
                discountPercent: null,
                userId,
                courseId: null,
                isUsed: false,
                usedAt: null,
                usedForCourseId: null,
                createdAt: serverTimestamp(),
                source: "admin_promo"
            });
            setNewCode("");
            setNewAmount(100);
            setNewEmail("");
            setShowCreateForm(false);
            await fetchCoupons();
            alert(userId ? `มอบคูปอง ${code} (ลด ${newAmount} บาท) ให้นักเรียนแล้ว ✓` : `สร้างโค้ด ${code} แล้ว ✓`);
        } catch (error) {
            console.error("Error creating coupon:", error);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setCreating(false);
        }
    };

    const openEdit = (c: Coupon) => {
        setEditing(c);
        setEditAmount(c.discountAmount || 0);
        setEditIsUsed(c.isUsed);
    };

    const saveEdit = async () => {
        if (!editing) return;
        if (editAmount <= 0) return alert("จำนวนส่วนลดต้องมากกว่า 0");
        setSavingEdit(true);
        try {
            const patch: any = { discountAmount: editAmount, isUsed: editIsUsed };
            if (editIsUsed && !editing.isUsed) patch.usedAt = serverTimestamp();
            if (!editIsUsed) { patch.usedAt = null; patch.usedForCourseId = null; }
            await updateDoc(doc(db, "coupons", editing.id), patch);
            setEditing(null);
            await fetchCoupons();
        } catch (error) {
            console.error("Error updating coupon:", error);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setSavingEdit(false);
        }
    };

    // Scan every review for its stored couponCode and create any coupon that
    // is missing. Admin writes bypass the strict create rule, and we skip codes
    // that already exist, so this is safe to run more than once (idempotent).
    const handleRepairCoupons = () => {
        confirmModal(
            "ซ่อมคูปองรีวิวที่ตกหล่น",
            "ระบบจะสแกนรีวิวทั้งหมด แล้วสร้างคูปองให้นักเรียนที่รีวิวแล้วแต่ยังไม่ได้รับคูปอง (ปลอดภัย ทำซ้ำได้ ไม่สร้างของซ้ำ)",
            async () => {
                setRepairing(true);
                setRepairResult(null);
                try {
                    const [reviewsSnap, couponsSnap] = await Promise.all([
                        getDocs(collection(db, "reviews")),
                        getDocs(collection(db, "coupons")),
                    ]);

                    const existingCodes = new Set(
                        couponsSnap.docs
                            .map(d => String(d.data().code || "").toUpperCase())
                            .filter(Boolean)
                    );

                    const seen = new Set<string>();
                    const missing = reviewsSnap.docs
                        .map(d => d.data())
                        .filter(r => {
                            const code = String(r.couponCode || "").toUpperCase();
                            if (!code) return false;
                            if (existingCodes.has(code)) return false;
                            if (seen.has(code)) return false;
                            seen.add(code);
                            return true;
                        });

                    if (missing.length === 0) {
                        setRepairResult({ ok: true, msg: "ไม่พบคูปองที่ตกหล่น — นักเรียนทุกคนได้รับครบแล้ว ✓" });
                        return;
                    }

                    let created = 0;
                    for (const r of missing) {
                        await addDoc(collection(db, "coupons"), {
                            code: String(r.couponCode).toUpperCase(),
                            discountAmount: 100,
                            discountPercent: null,
                            userId: r.userId || null,
                            courseId: r.courseId || null,
                            isUsed: false,
                            usedAt: null,
                            usedForCourseId: null,
                            createdAt: serverTimestamp(),
                            source: "review_reward",
                        });
                        created++;
                    }

                    setRepairResult({ ok: true, msg: `สร้างคูปองที่ตกหล่นสำเร็จ ${created} ใบ 🎉 นักเรียนเห็นโค้ดได้ทันทีที่หน้า "คอร์สเรียนของฉัน"` });
                    await fetchCoupons();
                } catch (error) {
                    console.error("Error repairing coupons:", error);
                    setRepairResult({ ok: false, msg: "เกิดข้อผิดพลาดระหว่างซ่อมคูปอง กรุณาลองใหม่" });
                } finally {
                    setRepairing(false);
                }
            }
        );
    };

    const handleDeleteCoupon = async (id: string, code: string) => {
        confirmModal("ยืนยันการลบ", `ลบคูปอง "${code}" ถาวร? (กู้คืนไม่ได้)`, async () => {
            try {
                await deleteDoc(doc(db, "coupons", id));
                setCoupons(prev => prev.filter(c => c.id !== id));
            } catch (error) {
                console.error("Error deleting coupon:", error);
                alert("เกิดข้อผิดพลาด");
            }
        }, true);
    };

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    // Filter & Search
    const filtered = coupons.filter(c => {
        if (filterStatus === "used" && !c.isUsed) return false;
        if (filterStatus === "unused" && c.isUsed) return false;
        if (filterSource === "review_reward" && c.source !== "review_reward") return false;
        if (filterSource === "admin_promo" && c.source !== "admin_promo") return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const userName = userMap[c.userId || ""]?.displayName?.toLowerCase() || "";
            const userEmail = userMap[c.userId || ""]?.email?.toLowerCase() || "";
            return c.code.toLowerCase().includes(term) || userName.includes(term) || userEmail.includes(term);
        }
        return true;
    });

    // Stats
    const totalCoupons = coupons.length;
    const usedCoupons = coupons.filter(c => c.isUsed).length;
    const reviewCoupons = coupons.filter(c => c.source === "review_reward").length;
    const totalDiscount = coupons.filter(c => c.isUsed).reduce((sum, c) => sum + (c.discountAmount || 0), 0);

    return (
        <AdminGuard>
            <div className="space-y-6">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="kh-eyebrow"><Ticket size={15} strokeWidth={1.9} /> จัดการคูปอง</div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRepairCoupons}
                            disabled={repairing}
                            className="kh-btn-ghost"
                            title="สร้างคูปองให้นักเรียนที่รีวิวแล้วแต่ยังไม่ได้รับ (ซ่อมเคสที่ระบบเคยพลาด)"
                        >
                            <Wrench size={15} strokeWidth={1.9} />
                            {repairing ? "กำลังซ่อม..." : "ซ่อมคูปอง"}
                        </button>
                        <button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="kh-btn"
                        >
                            <Plus size={15} strokeWidth={2.1} />
                            สร้าง / มอบคูปอง
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="kh-card p-4 flex items-center justify-between gap-3">
                        <div>
                            <div className="kh-num text-[26px] font-semibold leading-none kh-ink">{totalCoupons}</div>
                            <div className="text-xs font-medium kh-ink3 mt-1.5">คูปองทั้งหมด</div>
                        </div>
                        <Ticket size={20} strokeWidth={1.7} style={{ color: "var(--ink-3)" }} />
                    </div>
                    <div className="kh-card p-4 flex items-center justify-between gap-3">
                        <div>
                            <div className="kh-num text-[26px] font-semibold leading-none" style={{ color: "var(--good)" }}>{totalCoupons - usedCoupons}</div>
                            <div className="text-xs font-medium kh-ink3 mt-1.5">ใช้งานได้</div>
                        </div>
                        <Clock size={20} strokeWidth={1.7} style={{ color: "var(--good)" }} />
                    </div>
                    <div className="kh-card p-4 flex items-center justify-between gap-3">
                        <div>
                            <div className="kh-num text-[26px] font-semibold leading-none" style={{ color: "var(--danger)" }}>{usedCoupons}</div>
                            <div className="text-xs font-medium kh-ink3 mt-1.5">ใช้ไปแล้ว</div>
                        </div>
                        <CheckCircle size={20} strokeWidth={1.7} style={{ color: "var(--danger)" }} />
                    </div>
                    <div className="kh-card p-4 flex items-center justify-between gap-3">
                        <div>
                            <div className="kh-num text-[26px] font-semibold leading-none" style={{ color: "var(--accent)" }}>{totalDiscount.toLocaleString()}</div>
                            <div className="text-xs font-medium kh-ink3 mt-1.5">ส่วนลดที่มอบ (บาท)</div>
                        </div>
                        <Ticket size={20} strokeWidth={1.7} style={{ color: "var(--accent)" }} />
                    </div>
                    <div className="kh-card p-4 flex items-center justify-between gap-3">
                        <div>
                            <div className="kh-num text-[26px] font-semibold leading-none" style={{ color: "var(--warn)" }}>{reviewCoupons}</div>
                            <div className="text-xs font-medium kh-ink3 mt-1.5">จากรีวิว</div>
                        </div>
                        <UserPlus size={20} strokeWidth={1.7} style={{ color: "var(--warn)" }} />
                    </div>
                </div>

                {/* Repair result banner */}
                {repairResult && (
                    <div
                        className="kh-card p-4 text-sm font-bold flex items-center gap-2"
                        style={{
                            background: repairResult.ok ? "var(--good-soft)" : "var(--danger-soft)",
                            color: repairResult.ok ? "var(--good)" : "var(--danger)",
                            borderColor: "transparent",
                        }}
                    >
                        {repairResult.ok ? <CheckCircle size={16} /> : <span>⚠️</span>}
                        {repairResult.msg}
                    </div>
                )}

                {/* Create / Gift Coupon Form */}
                {showCreateForm && (
                    <div className="kh-card p-5 animate-in slide-in-from-top-2 duration-200" style={{ borderColor: "var(--accent)" }}>
                        <h3 className="font-semibold kh-ink mb-4 flex items-center gap-2">
                            <Plus size={16} style={{ color: "var(--accent)" }} />
                            สร้างโค้ด / มอบคูปองให้นักเรียน
                        </h3>
                        <div className="space-y-4">
                            {/* Email — optional: bind to a specific student */}
                            <div>
                                <label className="text-xs font-medium kh-ink2 mb-1.5 flex items-center gap-1">
                                    <UserPlus size={12} /> อีเมลนักเรียน (มอบให้รายคน — เว้นว่างถ้าจะทำโค้ดสาธารณะ)
                                </label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="student@email.com"
                                    className="kh-input"
                                />
                            </div>
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-medium kh-ink2 mb-1.5 block">โค้ดคูปอง (เว้นว่าง = สุ่มให้อัตโนมัติ)</label>
                                    <input
                                        type="text"
                                        value={newCode}
                                        onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                                        placeholder="เช่น NEWYEAR2025 หรือเว้นว่าง"
                                        className="kh-input font-mono uppercase"
                                    />
                                </div>
                                <div className="w-full md:w-40">
                                    <label className="text-xs font-medium kh-ink2 mb-1.5 block">ส่วนลด (บาท)</label>
                                    <input
                                        type="number"
                                        value={newAmount}
                                        onChange={(e) => setNewAmount(Number(e.target.value))}
                                        className="kh-input kh-num"
                                    />
                                </div>
                                <div className="flex items-end gap-2">
                                    <button
                                        onClick={handleCreatePromo}
                                        disabled={creating}
                                        className="kh-btn whitespace-nowrap"
                                    >
                                        {creating ? "กำลังบันทึก..." : "บันทึก"}
                                    </button>
                                    <button
                                        onClick={() => { setShowCreateForm(false); setNewEmail(""); setNewCode(""); }}
                                        className="kh-btn-ghost"
                                    >
                                        ยกเลิก
                                    </button>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs kh-ink3 mt-3">💡 ใส่อีเมล = คูปองผูกกับนักเรียนคนนั้น โชว์ในหน้า &quot;คอร์สเรียนของฉัน&quot; ของเขา ใช้ได้คนเดียว · เว้นว่าง = ใครก็ใช้ได้</p>
                    </div>
                )}

                {/* Search & Filter */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-3)" }} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="ค้นหาโค้ด / ชื่อ / อีเมล..."
                            className="kh-input pl-10"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as "all" | "unused" | "used")}
                            className="kh-select w-auto"
                        >
                            <option value="all">ทุกสถานะ</option>
                            <option value="unused">ยังไม่ใช้</option>
                            <option value="used">ใช้แล้ว</option>
                        </select>
                        <select
                            value={filterSource}
                            onChange={(e) => setFilterSource(e.target.value as "all" | "review_reward" | "admin_promo")}
                            className="kh-select w-auto"
                        >
                            <option value="all">ทุกประเภท</option>
                            <option value="review_reward">จากรีวิว</option>
                            <option value="admin_promo">มอบ/โปรโมชั่น</option>
                        </select>
                    </div>
                </div>

                {/* Coupon Table */}
                <div className="kh-card overflow-hidden">
                    {loading ? (
                        <div className="p-10 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-3" style={{ borderColor: "var(--accent)" }}></div>
                            <p className="text-sm kh-ink3">กำลังโหลด...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-10 text-center kh-ink3">
                            <Ticket size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="font-semibold">ไม่พบคูปอง</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="kh-table">
                                <thead>
                                    <tr>
                                        <th>ผู้ใช้ / อีเมล</th>
                                        <th>คอร์สที่รีวิว</th>
                                        <th>โค้ด</th>
                                        <th>ส่วนลด</th>
                                        <th>ประเภท</th>
                                        <th>การใช้งาน</th>
                                        <th>สถานะ</th>
                                        <th>วันที่สร้าง</th>
                                        <th style={{ textAlign: "right" }}>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((coupon) => {
                                        const userInfo = userMap[coupon.userId || ""];
                                        return (
                                            <tr key={coupon.id}>
                                                <td>
                                                    {coupon.userId ? (
                                                        <div>
                                                            <div className="font-semibold kh-ink text-xs">{userInfo?.displayName || "(ยังไม่ตั้งชื่อ)"}</div>
                                                            <div className="text-[10px] kh-ink3">{userInfo?.email || coupon.userId.substring(0, 12) + "..."}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="kh-ink3 text-xs">ใครก็ได้</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {coupon.courseId && courseMap[coupon.courseId] ? (
                                                        <span className="text-xs kh-ink2">{courseMap[coupon.courseId]}</span>
                                                    ) : (
                                                        <span className="kh-ink3 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => handleCopy(coupon.code)}
                                                        className="font-mono font-semibold kh-pill kh-pill-ink no-dot transition flex items-center gap-1.5 group"
                                                    >
                                                        {coupon.code}
                                                        {copiedCode === coupon.code ? (
                                                            <CheckCircle size={12} style={{ color: "var(--good)" }} />
                                                        ) : (
                                                            <Copy size={12} className="opacity-50 group-hover:opacity-100" />
                                                        )}
                                                    </button>
                                                </td>
                                                <td>
                                                    <span className="font-semibold kh-ink kh-num">
                                                        {coupon.discountAmount ? `${coupon.discountAmount} บาท` : coupon.discountPercent ? `${coupon.discountPercent}%` : '-'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`kh-pill no-dot ${coupon.source === "review_reward" ? "kh-pill-warn" : "kh-pill-accent"}`}>
                                                        {coupon.source === "review_reward" ? "รีวิว" : coupon.userId ? "มอบให้" : "โปรโมชั่น"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-2 min-w-[88px]">
                                                        <div className="kh-progress flex-1">
                                                            <span style={{ width: coupon.isUsed ? "100%" : "0%" }} />
                                                        </div>
                                                        <span className="text-[10px] kh-ink3 kh-num whitespace-nowrap">{coupon.isUsed ? "1/1" : "0/1"}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {coupon.isUsed ? (
                                                        <div>
                                                            <span className="kh-pill kh-pill-ink">
                                                                <CheckCircle size={10} /> ใช้ครบ
                                                            </span>
                                                            <div className="text-[10px] kh-ink3 mt-1">
                                                                {fmtDate(coupon.usedAt)}
                                                                {coupon.usedForCourseId && courseMap[coupon.usedForCourseId] ? ` · ${courseMap[coupon.usedForCourseId]}` : ""}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="kh-pill kh-pill-good">
                                                            <Clock size={10} /> กำลังใช้งาน
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="text-xs kh-ink3">
                                                    {fmtDate(coupon.createdAt)}
                                                </td>
                                                <td>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => openEdit(coupon)}
                                                            className="p-1.5 rounded-lg transition kh-ink3 hover:text-[var(--accent)]"
                                                            style={{ background: "transparent" }}
                                                            title="แก้ไขคูปอง"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                                                            className="p-1.5 rounded-lg transition kh-ink3 hover:text-[var(--danger)]"
                                                            style={{ background: "transparent" }}
                                                            title="ลบคูปอง"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Edit Coupon Modal */}
                {editing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !savingEdit && setEditing(null)}>
                        <div className="kh-card w-full max-w-md p-6 animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="font-semibold kh-ink flex items-center gap-2">
                                    <Pencil size={16} style={{ color: "var(--accent)" }} /> แก้ไขคูปอง
                                </h3>
                                <button onClick={() => setEditing(null)} className="kh-btn-ghost p-1.5" disabled={savingEdit}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-xl px-4 py-3" style={{ background: "var(--card-2)" }}>
                                    <div className="text-[10px] font-bold kh-ink3 uppercase mb-1">โค้ด</div>
                                    <div className="font-mono font-semibold kh-ink">{editing.code}</div>
                                    {editing.userId && (
                                        <div className="text-[11px] kh-ink2 mt-1">
                                            {userMap[editing.userId]?.displayName || ""} · {userMap[editing.userId]?.email || editing.userId.substring(0, 12) + "..."}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-medium kh-ink2 mb-1.5 block">ส่วนลด (บาท)</label>
                                    <input
                                        type="number"
                                        value={editAmount}
                                        onChange={(e) => setEditAmount(Number(e.target.value))}
                                        className="kh-input kh-num"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium kh-ink2 mb-1.5 block">สถานะ</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setEditIsUsed(false)}
                                            className="flex-1 py-2.5 rounded-xl font-semibold text-sm border transition"
                                            style={!editIsUsed
                                                ? { background: "var(--good-soft)", borderColor: "var(--good)", color: "var(--good)" }
                                                : { background: "var(--card)", borderColor: "var(--line)", color: "var(--ink-3)" }}
                                        >
                                            <Clock size={14} className="inline mr-1" /> พร้อมใช้
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditIsUsed(true)}
                                            className="flex-1 py-2.5 rounded-xl font-semibold text-sm border transition"
                                            style={editIsUsed
                                                ? { background: "var(--danger-soft)", borderColor: "var(--danger)", color: "var(--danger)" }
                                                : { background: "var(--card)", borderColor: "var(--line)", color: "var(--ink-3)" }}
                                        >
                                            <CheckCircle size={14} className="inline mr-1" /> ใช้แล้ว
                                        </button>
                                    </div>
                                    {editing.isUsed && !editIsUsed && (
                                        <p className="text-[11px] mt-1.5" style={{ color: "var(--warn)" }}>↩️ เปลี่ยนเป็น &quot;พร้อมใช้&quot; จะคืนสิทธิ์ให้คูปองนี้ใช้ได้อีกครั้ง</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <button
                                    onClick={saveEdit}
                                    disabled={savingEdit}
                                    className="kh-btn flex-1"
                                >
                                    {savingEdit ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                                </button>
                                <button
                                    onClick={() => setEditing(null)}
                                    disabled={savingEdit}
                                    className="kh-btn-ghost"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <ConfirmDialog />
            </div>
        </AdminGuard>
    );
}
