"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs, where } from "firebase/firestore";
import AdminGuard from "@/components/AdminGuard";
import Link from "next/link";
import { ArrowLeft, Plus, Ticket, Search, Trash2, CheckCircle, Clock, Copy, Filter } from "lucide-react";

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
}

export default function AdminCouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "unused" | "used">("all");
    const [filterSource, setFilterSource] = useState<"all" | "review_reward" | "admin_promo">("all");
    const [userMap, setUserMap] = useState<Record<string, UserInfo>>({});
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Create promo code form
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newCode, setNewCode] = useState("");
    const [newAmount, setNewAmount] = useState(100);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "coupons"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Coupon[];
            setCoupons(data);

            // Fetch user info for all unique userIds
            const userIds = [...new Set(data.map(c => c.userId).filter(Boolean))] as string[];
            const newUserMap: Record<string, UserInfo> = {};

            // Batch fetch user docs
            const batchSize = 10;
            for (let i = 0; i < userIds.length; i += batchSize) {
                const batch = userIds.slice(i, i + batchSize);
                await Promise.all(batch.map(async (uid) => {
                    try {
                        const userSnap = await getDocs(query(collection(db, "users"), where("uid", "==", uid)));
                        if (!userSnap.empty) {
                            const userData = userSnap.docs[0].data();
                            newUserMap[uid] = { displayName: userData.displayName || userData.name, email: userData.email };
                        }
                    } catch { /* ignore */ }
                }));
            }
            setUserMap(newUserMap);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleCreatePromo = async () => {
        if (!newCode.trim()) return alert("กรุณาใส่โค้ดคูปอง");
        if (newAmount <= 0) return alert("จำนวนส่วนลดต้องมากกว่า 0");

        setCreating(true);
        try {
            await addDoc(collection(db, "coupons"), {
                code: newCode.trim().toUpperCase(),
                discountAmount: newAmount,
                userId: null,
                courseId: null,
                isUsed: false,
                usedAt: null,
                createdAt: serverTimestamp(),
                source: "admin_promo"
            });
            setNewCode("");
            setNewAmount(100);
            setShowCreateForm(false);
        } catch (error) {
            console.error("Error creating coupon:", error);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteCoupon = async (id: string, code: string) => {
        if (!confirm(`ลบคูปอง "${code}" ถาวร? (กู้คืนไม่ได้)`)) return;
        try {
            await deleteDoc(doc(db, "coupons", id));
        } catch (error) {
            console.error("Error deleting coupon:", error);
            alert("เกิดข้อผิดพลาด");
        }
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
    const promoCoupons = coupons.filter(c => c.source === "admin_promo").length;
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
                                <p className="text-xs text-slate-500">ดูสถานะ สร้างโค้ดโปรโมชั่น จัดการคูปองรีวิว</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition shadow-md"
                        >
                            <Plus size={16} />
                            สร้างโค้ดใหม่
                        </button>
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

                    {/* Create Promo Form */}
                    {showCreateForm && (
                        <div className="bg-white rounded-xl border border-indigo-200 p-6 shadow-sm animate-in slide-in-from-top-2 duration-200">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Plus size={16} className="text-indigo-600" />
                                สร้างโค้ดโปรโมชั่นใหม่
                            </h3>
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">โค้ดคูปอง</label>
                                    <input
                                        type="text"
                                        value={newCode}
                                        onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                                        placeholder="เช่น NEWYEAR2025"
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
                                        className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
                                    >
                                        {creating ? "กำลังสร้าง..." : "สร้าง"}
                                    </button>
                                    <button
                                        onClick={() => setShowCreateForm(false)}
                                        className="px-4 py-2.5 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition"
                                    >
                                        ยกเลิก
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-3">* โค้ดโปรโมชั่นไม่ผูกกับ userId — ใครก็ใช้ได้</p>
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
                                placeholder="ค้นหาโค้ด หรือ ชื่อผู้ใช้..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none"
                            >
                                <option value="all">ทุกสถานะ</option>
                                <option value="unused">ยังไม่ใช้</option>
                                <option value="used">ใช้แล้ว</option>
                            </select>
                            <select
                                value={filterSource}
                                onChange={(e) => setFilterSource(e.target.value as any)}
                                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none"
                            >
                                <option value="all">ทุกประเภท</option>
                                <option value="review_reward">จากรีวิว</option>
                                <option value="admin_promo">โปรโมชั่น</option>
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
                                            <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase">ผู้ใช้</th>
                                            <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase">ประเภท</th>
                                            <th className="text-left px-4 py-3 font-bold text-slate-500 text-xs uppercase">สถานะ</th>
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
                                                                <div className="font-bold text-slate-700 text-xs">{userInfo?.displayName || "ไม่ทราบชื่อ"}</div>
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
                                                            {coupon.source === "review_reward" ? "รีวิว" : "โปรโมชั่น"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {coupon.isUsed ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-full border border-rose-200">
                                                                <CheckCircle size={10} /> ใช้แล้ว
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                                                                <Clock size={10} /> พร้อมใช้
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-400">
                                                        {coupon.createdAt?.seconds
                                                            ? new Date(coupon.createdAt.seconds * 1000).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
                                                            : "-"
                                                        }
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                                                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition"
                                                            title="ลบคูปอง"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
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
            </div>
        </AdminGuard>
    );
}
