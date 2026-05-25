"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, getDoc, getDocs, updateDoc, where } from "firebase/firestore";
import AdminGuard from "@/components/AdminGuard";
import Link from "next/link";
import { ArrowLeft, Plus, Ticket, Search, Trash2, CheckCircle, Clock, Copy, Wrench, Pencil, UserPlus, X } from "lucide-react";
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
            <div className="min-h-screen bg-slate-50 font-sans pb-20">
                {/* Header */}
                <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-sm">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/admin" className="p-2 rounded-full hover:bg-slate-100 transition text-slate-500">
                                <ArrowLeft size={24} />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Ticket size={20} /> จัดการคูปอง
                                </h1>
                                <p className="text-xs text-slate-500">ดูสถานะ มอบคูปองให้นักเรียน แก้ไขส่วนลด จัดการคูปองรีวิว</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRepairCoupons}
                                disabled={repairing}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition shadow-md"
                                title="สร้างคูปองให้นักเรียนที่รีวิวแล้วแต่ยังไม่ได้รับ (ซ่อมเคสที่ระบบเคยพลาด)"
                            >
                                <Wrench size={16} />
                                {repairing ? "กำลังซ่อม..." : "ซ่อมคูปอง"}
                            </button>
                            <button
                                onClick={() => setShowCreateForm(!showCreateForm)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition shadow-md"
                            >
                                <Plus size={16} />
                                สร้าง / มอบคูปอง
                            </button>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                            <div className="text-2xl font-black text-slate-700">{totalCoupons}</div>
                            <div className="text-xs font-bold text-slate-400">คูปองทั้งหมด</div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                            <div className="text-2xl font-black text-emerald-600">{totalCoupons - usedCoupons}</div>
                            <div className="text-xs font-bold text-slate-400">ยังไม่ใช้</div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                            <div className="text-2xl font-black text-rose-500">{usedCoupons}</div>
                            <div className="text-xs font-bold text-slate-400">ใช้แล้ว</div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                            <div className="text-2xl font-black text-amber-500">{reviewCoupons}</div>
                            <div className="text-xs font-bold text-slate-400">จากรีวิว</div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                            <div className="text-2xl font-black text-indigo-600">{totalDiscount.toLocaleString()}</div>
                            <div className="text-xs font-bold text-slate-400">ส่วนลดรวม (บาท)</div>
                        </div>
                    </div>

                    {/* Repair result banner */}
                    {repairResult && (
                        <div className={`rounded-xl border p-4 text-sm font-bold flex items-center gap-2 ${repairResult.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-600"}`}>
                            {repairResult.ok ? <CheckCircle size={16} /> : <span>⚠️</span>}
                            {repairResult.msg}
                        </div>
                    )}

                    {/* Create / Gift Coupon Form */}
                    {showCreateForm && (
                        <div className="bg-white rounded-xl border border-indigo-200 p-6 shadow-sm animate-in slide-in-from-top-2 duration-200">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Plus size={16} className="text-indigo-600" />
                                สร้างโค้ด / มอบคูปองให้นักเรียน
                            </h3>
                            <div className="space-y-4">
                                {/* Email — optional: bind to a specific student */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                                        <UserPlus size={12} /> อีเมลนักเรียน (มอบให้รายคน — เว้นว่างถ้าจะทำโค้ดสาธารณะ)
                                    </label>
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="student@email.com"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                                    />
                                </div>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">โค้ดคูปอง (เว้นว่าง = สุ่มให้อัตโนมัติ)</label>
                                        <input
                                            type="text"
                                            value={newCode}
                                            onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                                            placeholder="เช่น NEWYEAR2025 หรือเว้นว่าง"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-mono font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 uppercase"
                                        />
                                    </div>
                                    <div className="w-full md:w-40">
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">ส่วนลด (บาท)</label>
                                        <input
                                            type="number"
                                            value={newAmount}
                                            onChange={(e) => setNewAmount(Number(e.target.value))}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                                        />
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <button
                                            onClick={handleCreatePromo}
                                            disabled={creating}
                                            className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition whitespace-nowrap"
                                        >
                                            {creating ? "กำลังบันทึก..." : "บันทึก"}
                                        </button>
                                        <button
                                            onClick={() => { setShowCreateForm(false); setNewEmail(""); setNewCode(""); }}
                                            className="px-4 py-2.5 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition"
                                        >
                                            ยกเลิก
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-3">💡 ใส่อีเมล = คูปองผูกกับนักเรียนคนนั้น โชว์ในหน้า &quot;คอร์สเรียนของฉัน&quot; ของเขา ใช้ได้คนเดียว · เว้นว่าง = ใครก็ใช้ได้</p>
                        </div>
                    )}

                    {/* Search & Filter */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="ค้นหาโค้ด / ชื่อ / อีเมล..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as "all" | "unused" | "used")}
                                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none"
                            >
                                <option value="all">ทุกสถานะ</option>
                                <option value="unused">ยังไม่ใช้</option>
                                <option value="used">ใช้แล้ว</option>
                            </select>
                            <select
                                value={filterSource}
                                onChange={(e) => setFilterSource(e.target.value as "all" | "review_reward" | "admin_promo")}
                                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none"
                            >
                                <option value="all">ทุกประเภท</option>
                                <option value="review_reward">จากรีวิว</option>
                                <option value="admin_promo">มอบ/โปรโมชั่น</option>
                            </select>
                        </div>
                    </div>

                    {/* Coupon Table */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        {loading ? (
                            <div className="p-10 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                                <p className="text-sm text-slate-400">กำลังโหลด...</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="p-10 text-center text-slate-400">
                                <Ticket size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="font-bold">ไม่พบคูปอง</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase">โค้ด</th>
                                            <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase">ส่วนลด</th>
                                            <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase">ผู้ใช้ / อีเมล</th>
                                            <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase">ประเภท</th>
                                            <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase">สถานะ / การใช้</th>
                                            <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase">วันที่สร้าง</th>
                                            <th className="text-right px-4 py-3 font-bold text-slate-500 text-xs uppercase">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((coupon) => {
                                            const userInfo = userMap[coupon.userId || ""];
                                            return (
                                                <tr key={coupon.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => handleCopy(coupon.code)}
                                                            className="font-mono font-bold text-slate-700 hover:text-indigo-600 transition flex items-center gap-1.5 group"
                                                        >
                                                            {coupon.code}
                                                            {copiedCode === coupon.code ? (
                                                                <CheckCircle size={12} className="text-emerald-500" />
                                                            ) : (
                                                                <Copy size={12} className="text-slate-300 group-hover:text-indigo-400" />
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="font-bold text-slate-700">
                                                            {coupon.discountAmount ? `${coupon.discountAmount} บาท` : coupon.discountPercent ? `${coupon.discountPercent}%` : '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {coupon.userId ? (
                                                            <div>
                                                                <div className="font-bold text-slate-700 text-xs">{userInfo?.displayName || "(ยังไม่ตั้งชื่อ)"}</div>
                                                                <div className="text-[10px] text-slate-400">{userInfo?.email || coupon.userId.substring(0, 12) + "..."}</div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs">ใครก็ได้</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${coupon.source === "review_reward"
                                                            ? "bg-amber-50 text-amber-600 border border-amber-200"
                                                            : "bg-indigo-50 text-indigo-600 border border-indigo-200"
                                                            }`}>
                                                            {coupon.source === "review_reward" ? "รีวิว" : coupon.userId ? "มอบให้" : "โปรโมชั่น"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {coupon.isUsed ? (
                                                            <div>
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-full border border-rose-200">
                                                                    <CheckCircle size={10} /> ใช้แล้ว
                                                                </span>
                                                                <div className="text-[10px] text-slate-400 mt-1">
                                                                    {fmtDate(coupon.usedAt)}
                                                                    {coupon.usedForCourseId && courseMap[coupon.usedForCourseId] ? ` · ${courseMap[coupon.usedForCourseId]}` : ""}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                                                                <Clock size={10} /> พร้อมใช้
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-400">
                                                        {fmtDate(coupon.createdAt)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={() => openEdit(coupon)}
                                                                className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                                                title="แก้ไขคูปอง"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                                                                className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition"
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
                </main>

                {/* Edit Coupon Modal */}
                {editing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !savingEdit && setEditing(null)}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Pencil size={16} className="text-indigo-600" /> แก้ไขคูปอง
                                </h3>
                                <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition" disabled={savingEdit}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-slate-50 rounded-xl px-4 py-3">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">โค้ด</div>
                                    <div className="font-mono font-bold text-slate-700">{editing.code}</div>
                                    {editing.userId && (
                                        <div className="text-[11px] text-slate-500 mt-1">
                                            {userMap[editing.userId]?.displayName || ""} · {userMap[editing.userId]?.email || editing.userId.substring(0, 12) + "..."}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">ส่วนลด (บาท)</label>
                                    <input
                                        type="number"
                                        value={editAmount}
                                        onChange={(e) => setEditAmount(Number(e.target.value))}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">สถานะ</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setEditIsUsed(false)}
                                            className={`flex-1 py-2.5 rounded-xl font-bold text-sm border transition ${!editIsUsed ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"}`}
                                        >
                                            <Clock size={14} className="inline mr-1" /> พร้อมใช้
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditIsUsed(true)}
                                            className={`flex-1 py-2.5 rounded-xl font-bold text-sm border transition ${editIsUsed ? "bg-rose-50 border-rose-300 text-rose-600" : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"}`}
                                        >
                                            <CheckCircle size={14} className="inline mr-1" /> ใช้แล้ว
                                        </button>
                                    </div>
                                    {editing.isUsed && !editIsUsed && (
                                        <p className="text-[11px] text-amber-600 mt-1.5">↩️ เปลี่ยนเป็น &quot;พร้อมใช้&quot; จะคืนสิทธิ์ให้คูปองนี้ใช้ได้อีกครั้ง</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <button
                                    onClick={saveEdit}
                                    disabled={savingEdit}
                                    className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
                                >
                                    {savingEdit ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                                </button>
                                <button
                                    onClick={() => setEditing(null)}
                                    disabled={savingEdit}
                                    className="px-5 py-2.5 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition"
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
