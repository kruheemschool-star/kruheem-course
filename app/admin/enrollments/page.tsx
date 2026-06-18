"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import Link from "next/link";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { useUserAuth } from "@/context/AuthContext";
import { UserPlus, Check, X, MessageCircle, ArrowDownLeft, Building2, Calendar, Hash, Phone, Mail, CheckCircle2, Clock, Inbox, ZoomIn } from "lucide-react";

export default function AdminEnrollmentsPage() {
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();
    const { refreshPendingCount } = useUserAuth();
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // 2. ดึงข้อมูลใบแจ้งโอน (เฉพาะที่สถานะ pending)
    const fetchData = async () => {
        try {
            const q = query(
                collection(db, "enrollments"),
                where("status", "==", "pending"), // เอาแค่ที่รอตรวจ
                orderBy("createdAt", "desc")
            );
            const snapshot = await getDocs(q);

            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // จัดรูปแบบวันที่
                formattedDate: doc.data().createdAt?.toDate
                    ? doc.data().createdAt.toDate().toLocaleString('th-TH', {
                        day: 'numeric', month: 'short', year: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                    })
                    : '-'
            }));

            setEnrollments(data);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Realtime: a single push-based listener so newly-submitted slips appear
    // instantly (no polling / no manual refresh). Same query as fetchData, so it
    // reuses the existing composite index. Cleaned up on unmount.
    useEffect(() => {
        const q = query(
            collection(db, "enrollments"),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc")
        );
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                setEnrollments(snapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    formattedDate: d.data().createdAt?.toDate
                        ? d.data().createdAt.toDate().toLocaleString('th-TH', {
                            day: 'numeric', month: 'short', year: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                        })
                        : '-'
                })));
                setLoading(false);
            },
            (error) => { console.error("Enrollments listener error:", error); setLoading(false); }
        );
        return () => unsubscribe();
    }, []);

    const [selectedDurations, setSelectedDurations] = useState<Record<string, string>>({});

    // Presentational only: which slip row is highlighted in the master list
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Presentational only: keep the highlighted slip valid after reloads
    useEffect(() => {
        if (enrollments.length === 0) {
            setSelectedId(null);
        } else if (!enrollments.some((e) => e.id === selectedId)) {
            setSelectedId(enrollments[0].id);
        }
    }, [enrollments, selectedId]);

    // State สำหรับ Modal ยืนยัน
    const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null);

    // ฟังก์ชันอนุมัติ (เมื่อกดยืนยันใน Modal)
    const handleConfirmApprove = async () => {
        if (!confirmApproveId) return;
        const id = confirmApproveId;

        // Default to 5 years automatically
        const duration = selectedDurations[id] || "5_years";

        try {
            const now = new Date();
            let expiryDate = new Date();
            let accessType = "limited";

            // Default logic: 5 Years
            if (duration === "lifetime") {
                accessType = "lifetime";
                expiryDate.setFullYear(now.getFullYear() + 100);
            } else {
                // Force 5 years default if not specified, otherwise use selection
                const years = duration === "5_years" ? 5 : parseInt(duration.split("_")[0]);
                expiryDate = new Date(now); // Clone now
                expiryDate.setFullYear(expiryDate.getFullYear() + years);
            }

            await updateDoc(doc(db, "enrollments", id), {
                status: "approved",
                approvedAt: now,
                expiryDate: expiryDate,
                accessType: accessType
            });

            // ✅ Update Coupon Usage Logic
            const enrollment = enrollments.find(e => e.id === id);
            if (enrollment && enrollment.couponCode) {
                try {
                    const qCoupon = query(collection(db, "coupons"), where("code", "==", enrollment.couponCode));
                    const couponSnap = await getDocs(qCoupon);

                    if (!couponSnap.empty) {
                        const couponDoc = couponSnap.docs[0];
                        await updateDoc(doc(db, "coupons", couponDoc.id), {
                            usedCount: (couponDoc.data().usedCount || 0) + 1,
                            isUsed: true // Mark as used for single-use coupons (review rewards)
                        });
                    }
                } catch (couponError) {
                    console.error("Error updating coupon stats:", couponError);
                    // Don't block approval if coupon update fails, just log it
                }
            }

            // ✅ Recalculate and update public_stats for total unique enrolled students
            try {
                const qAppr = query(collection(db, "enrollments"), where("status", "==", "approved"));
                const snapAppr = await getDocs(qAppr);
                const uniqueEmails = new Set<string>();
                snapAppr.docs.forEach(d => {
                    const email = d.data().userEmail;
                    if (email) uniqueEmails.add(email);
                });
                const totalStudents = uniqueEmails.size > 0 ? uniqueEmails.size : snapAppr.size;
                await setDoc(doc(db, "public_stats", "enrollments"), { count: totalStudents }, { merge: true });
            } catch (statError) {
                console.error("Error updating public_stats:", statError);
            }

            alert("✅ อนุมัติเรียบร้อย! (กำหนดเวลาเรียน 5 ปี)");
            setConfirmApproveId(null);
            fetchData(); // รีโหลดข้อมูล
            refreshPendingCount(); // recount badge immediately (self-guarded, fire-and-forget)
        } catch (error) {
            console.error("Error:", error);
            alert("เกิดข้อผิดพลาด");
        }
    };

    // ฟังก์ชันปฏิเสธ/ลบ
    const handleDelete = async (id: string) => {
        confirmModal("ยืนยันการลบ", "ยืนยันการลบรายการนี้? (กรณีสลิปปลอมหรือข้อมูลผิด)", async () => {
            try {
                await deleteDoc(doc(db, "enrollments", id));
                
                // ✅ Recalculate public stats if needed
                const qAppr = query(collection(db, "enrollments"), where("status", "==", "approved"));
                const snapAppr = await getDocs(qAppr);
                const uniqueEmails = new Set<string>();
                snapAppr.docs.forEach(d => {
                    const email = d.data().userEmail;
                    if (email) uniqueEmails.add(email);
                });
                const totalStudents = uniqueEmails.size > 0 ? uniqueEmails.size : snapAppr.size;
                await setDoc(doc(db, "public_stats", "enrollments"), { count: totalStudents }, { merge: true });

                fetchData();
                refreshPendingCount(); // deleting a pending row changes the badge — recount now
            } catch (error) {
                console.error("Error:", error);
            }
        }, true);
    };

    const selected = enrollments.find((e) => e.id === selectedId) || null;

    return (

        <div className="space-y-6">

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <span className="kh-eyebrow">รอตรวจสอบ</span>
                    <span className="kh-pill kh-pill-warn">{enrollments.length} รายการ</span>
                </div>
                <Link href="/admin/students/add" className="kh-btn">
                    <UserPlus size={16} /> เพิ่มนักเรียนเอง
                </Link>
            </div>

            {loading ? (
                <div className="kh-card p-10 text-center" style={{ color: "var(--ink-3)" }}>กำลังโหลดรายการ...</div>
            ) : enrollments.length === 0 ? (
                <div className="kh-card p-16 flex flex-col items-center justify-center text-center gap-3" style={{ color: "var(--ink-3)" }}>
                    <Inbox size={40} style={{ color: "var(--ink-3)" }} />
                    <p className="font-bold kh-ink2">ไม่มีรายการแจ้งโอนใหม่</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">

                    {/* ===== LEFT: master list of pending slips ===== */}
                    <div className="kh-card p-3 space-y-2">
                        {enrollments.map((item) => {
                            const isActive = item.id === selectedId;
                            const initial = (item.userName || "?").trim().charAt(0).toUpperCase();
                            const amount = item.discountAmount > 0 ? item.finalPrice : item.price;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setSelectedId(item.id)}
                                    className="w-full text-left rounded-xl px-3 py-3 flex items-center gap-3 transition"
                                    style={{
                                        background: isActive ? "var(--accent-soft)" : "transparent",
                                        borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                                    }}
                                >
                                    <span className="kh-avatar w-10 h-10 text-sm flex-shrink-0">{initial}</span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block font-bold kh-ink truncate">{item.userName || "ไม่ระบุชื่อ"}</span>
                                        <span className="block text-xs kh-ink3 truncate">{item.courseTitle}</span>
                                    </span>
                                    <span className="font-black text-sm flex-shrink-0" style={{ color: "var(--good)" }}>฿{amount?.toLocaleString()}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* ===== RIGHT: detail panel ===== */}
                    {selected && (() => {
                        const item = selected;
                        const amount = item.discountAmount > 0 ? item.finalPrice : item.price;
                        const slipUrls = ((item.slipUrls && item.slipUrls.length > 0 ? item.slipUrls : [item.slipUrl]) as string[]).filter(Boolean);
                        return (
                            <div className="space-y-4">

                                {/* Header */}
                                <div className="kh-card p-5 flex items-center gap-4 flex-wrap">
                                    <span className="kh-avatar w-12 h-12 text-lg flex-shrink-0">{(item.userName || "?").trim().charAt(0).toUpperCase()}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-lg font-black kh-ink truncate">{item.userName || "ไม่ระบุชื่อ"}</div>
                                        <div className="text-sm kh-ink3 truncate">{item.courseTitle}</div>
                                    </div>
                                    <div className="text-right">
                                        {item.discountAmount > 0 && (
                                            <div className="text-xs line-through font-bold kh-ink3">฿{item.price?.toLocaleString()}</div>
                                        )}
                                        <div className="text-2xl font-black" style={{ color: "var(--good)" }}>฿{amount?.toLocaleString()}</div>
                                    </div>
                                    <span className="kh-pill kh-pill-warn"><Clock size={13} /> รอตรวจสอบ</span>
                                </div>

                                {/* Transfer slip — deep teal/green card */}
                                <div
                                    className="rounded-2xl p-5"
                                    style={{
                                        background: "linear-gradient(135deg, #0B3D36, #0D5448 55%, #0F6356)",
                                        color: "#D6F5EE",
                                        border: "1px solid rgba(94,234,212,0.18)",
                                        boxShadow: "0 14px 30px -16px rgba(11,61,54,0.7)",
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="inline-flex items-center gap-2 text-xs font-bold tracking-wide" style={{ color: "#A7F3E5" }}>
                                            <ArrowDownLeft size={15} /> สลิปการโอนเงิน
                                        </span>
                                        <span className="text-xs" style={{ color: "#8FD8CB" }}>{item.paymentMethod || "โอนผ่านธนาคาร"}</span>
                                    </div>

                                    <div className="text-3xl font-black mb-5" style={{ color: "#FFFFFF" }}>฿{amount?.toLocaleString()}</div>

                                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                                        <div>
                                            <div className="text-[11px] uppercase tracking-wide mb-0.5" style={{ color: "#7FCEC0" }}>จาก</div>
                                            <div className="font-bold" style={{ color: "#EAFBF6" }}>{item.bankFrom || item.userName || "-"}</div>
                                        </div>
                                        <div>
                                            <div className="text-[11px] uppercase tracking-wide mb-0.5 flex items-center gap-1" style={{ color: "#7FCEC0" }}><Building2 size={12} /> เข้าบัญชี</div>
                                            <div className="font-bold" style={{ color: "#EAFBF6" }}>KruHeem SCB</div>
                                        </div>
                                        <div>
                                            <div className="text-[11px] uppercase tracking-wide mb-0.5 flex items-center gap-1" style={{ color: "#7FCEC0" }}><Calendar size={12} /> วันเวลา</div>
                                            <div className="font-bold" style={{ color: "#EAFBF6" }}>{item.formattedDate}</div>
                                        </div>
                                        <div>
                                            <div className="text-[11px] uppercase tracking-wide mb-0.5 flex items-center gap-1" style={{ color: "#7FCEC0" }}><Hash size={12} /> อ้างอิง</div>
                                            <div className="font-bold font-mono text-xs" style={{ color: "#EAFBF6" }}>{item.ref || item.id?.slice(0, 12) || "-"}</div>
                                        </div>
                                    </div>

                                    {slipUrls.length > 0 && (
                                        <div className="mt-5 grid grid-cols-2 gap-2">
                                            {slipUrls.map((url: string, i: number) => (
                                                <a key={i} href={url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden relative group cursor-pointer" style={{ border: "1px solid rgba(94,234,212,0.22)", background: "rgba(255,255,255,0.05)" }}>
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={url} alt={`Slip ${i + 1}`} className="w-full h-40 object-cover transition-transform group-hover:scale-105" />
                                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-sm font-bold gap-1" style={{ background: "rgba(0,0,0,0.35)" }}>
                                                        <ZoomIn size={16} /> ดูรูปใหญ่
                                                    </div>
                                                    {slipUrls.length > 1 && <span className="absolute top-2 left-2 text-white text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(0,0,0,0.55)" }}>{i + 1}/{slipUrls.length}</span>}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Order detail table */}
                                <div className="kh-card overflow-hidden">
                                    <table className="kh-table">
                                        <thead>
                                            <tr>
                                                <th>รายละเอียดคำสั่งซื้อ</th>
                                                <th>ข้อมูล</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="flex items-center gap-2"><Mail size={14} style={{ color: "var(--ink-3)" }} /> อีเมล</td>
                                                <td className="font-bold kh-ink">{item.userEmail || "-"}</td>
                                            </tr>
                                            <tr>
                                                <td className="flex items-center gap-2"><Phone size={14} style={{ color: "var(--ink-3)" }} /> เบอร์โทรศัพท์</td>
                                                <td className="font-bold kh-ink">{item.userTel || "-"}</td>
                                            </tr>
                                            <tr>
                                                <td>LINE ID</td>
                                                <td className="font-bold" style={{ color: "var(--good)" }}>{item.lineId || "-"}</td>
                                            </tr>
                                            <tr>
                                                <td className="flex items-center gap-2"><Calendar size={14} style={{ color: "var(--ink-3)" }} /> วันที่แจ้งโอน</td>
                                                <td className="font-bold kh-ink">{item.formattedDate}</td>
                                            </tr>
                                            {item.couponCode && (
                                                <tr>
                                                    <td>คูปองส่วนลด</td>
                                                    <td>
                                                        <span className="kh-pill kh-pill-good no-dot">🎟️ {item.couponCode}</span>
                                                        <span className="ml-2 font-black" style={{ color: "var(--good)" }}>-฿{item.discountAmount?.toLocaleString()}</span>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* ยอดตรงกัน confirm bar */}
                                <div className="kh-card p-4 flex items-center gap-3" style={{ background: "var(--good-soft)", borderColor: "color-mix(in srgb, var(--good) 30%, transparent)" }}>
                                    <CheckCircle2 size={20} style={{ color: "var(--good)" }} />
                                    <div className="flex-1">
                                        <div className="font-bold" style={{ color: "var(--good)" }}>ยอดตรงกัน</div>
                                        <div className="text-xs kh-ink3">ยอดสลิป ฿{amount?.toLocaleString()} ตรงกับยอดคำสั่งซื้อ</div>
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-3 flex-wrap">
                                    <button
                                        onClick={() => setConfirmApproveId(item.id)}
                                        className="kh-btn flex-[2]"
                                    >
                                        <Check size={16} /> อนุมัติ (5 ปี)
                                    </button>

                                    <button
                                        onClick={async () => {
                                            if (!item.userId) return alert("ไม่พบข้อมูล User ID");
                                            try {
                                                // Ensure chat exists
                                                await setDoc(doc(db, "chats", item.userId), {
                                                    userId: item.userId,
                                                    userName: item.userName || "Student",
                                                    userEmail: item.userEmail,
                                                    userTel: item.userTel || "",
                                                    lineId: item.lineId || "",
                                                    lastUpdated: serverTimestamp(),
                                                    // Preserve existing fields if any, but ensure these are set
                                                }, { merge: true });

                                                // Redirect using window.location to force refresh if needed, or router
                                                window.location.href = `/admin/chat?chatId=${item.userId}`;
                                            } catch (err) {
                                                console.error(err);
                                                alert("เกิดข้อผิดพลาดในการเปิดแชท");
                                            }
                                        }}
                                        className="kh-btn-ghost flex-1"
                                    >
                                        <MessageCircle size={16} /> ขอสลิปใหม่ / ทักแชท
                                    </button>

                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="kh-btn-ghost flex-1"
                                        style={{ color: "var(--danger)", borderColor: "color-mix(in srgb, var(--danger) 40%, transparent)" }}
                                    >
                                        <X size={16} /> ปฏิเสธ
                                    </button>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Custom Modal สำหรับยืนยันการอนุมัติ */}
            {confirmApproveId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(11,32,29,0.55)", backdropFilter: "blur(4px)" }}>
                    <div className="kh-card p-8 max-w-md w-full animate-in fade-in zoom-in-95 duration-200 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ background: "var(--good-soft)", color: "var(--good)" }}>
                            <Check size={32} strokeWidth={2.5} />
                        </div>
                        <h3 className="text-2xl font-black kh-ink mb-2">ยืนยันการอนุมัติ</h3>
                        <p className="kh-ink3 mb-8 leading-relaxed">
                            ผู้เรียนจะสามารถเข้าเรียนในคอร์สนี้ได้ทันทีหลังจากที่คุณกดยืนยัน (ระยะเวลาเรียน 5 ปี)
                        </p>
                        <div className="flex w-full gap-3">
                            <button
                                onClick={() => setConfirmApproveId(null)}
                                className="kh-btn-ghost flex-1"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleConfirmApprove}
                                className="kh-btn flex-1"
                            >
                                <Check size={16} /> ยืนยัน
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmDialog />
        </div>

    );
}