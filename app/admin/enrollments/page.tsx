"use client";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import Link from "next/link";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { useUserAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { UserPlus, Check, X, MessageCircle, ArrowDownLeft, Building2, Calendar, Hash, Phone, Mail, CheckCircle2, Clock, Inbox, ZoomIn, Users, StickyNote, BookOpen, Pencil, Search, Loader2, ArrowRight } from "lucide-react";

type CourseLite = { id: string; title: string; price?: number; allowedExamLevel?: string | null; category?: string };

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

    // ===== แก้ไขคอร์สของใบแจ้งโอน =====
    // รายชื่อคอร์สโหลดแบบ lazy (ตอนเปิดหน้าต่างแก้ไขครั้งแรกเท่านั้น) แล้ว cache ไว้
    // — หน้านี้เปิดบ่อย ไม่ควรสแกน collection courses ทุกครั้งที่เข้าหน้า
    const [editingId, setEditingId] = useState<string | null>(null);
    const [courseOptions, setCourseOptions] = useState<CourseLite[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(false);
    const [courseSearch, setCourseSearch] = useState("");
    const [pickedCourseId, setPickedCourseId] = useState<string>("");
    const [syncPrice, setSyncPrice] = useState(false);
    const [savingCourse, setSavingCourse] = useState(false);

    const editing = enrollments.find((e) => e.id === editingId) || null;
    const pickedCourse = courseOptions.find((c) => c.id === pickedCourseId) || null;

    const openCourseEditor = async (item: { id: string; courseId?: string }) => {
        setEditingId(item.id);
        setPickedCourseId(item.courseId || "");
        setCourseSearch("");
        setSyncPrice(false);
        if (courseOptions.length > 0 || coursesLoading) return;
        setCoursesLoading(true);
        try {
            const snap = await getDocs(query(collection(db, "courses"), orderBy("createdAt", "desc")));
            setCourseOptions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CourseLite, "id">) })));
        } catch (error) {
            console.error("Error loading courses:", error);
            toast.error("โหลดรายชื่อคอร์สไม่สำเร็จ ลองใหม่อีกครั้ง");
        } finally {
            setCoursesLoading(false);
        }
    };

    const closeCourseEditor = () => {
        setEditingId(null);
        setPickedCourseId("");
        setCourseSearch("");
        setSyncPrice(false);
    };

    const handleSaveCourse = async () => {
        if (!editing || !pickedCourse) return;
        setSavingCourse(true);
        try {
            const patch: Record<string, unknown> = {
                courseId: pickedCourse.id,
                courseTitle: pickedCourse.title,
                // ต้องย้ายสิทธิ์คลังข้อสอบตามคอร์สใหม่ด้วย ไม่งั้น ExamAccessGuard จะจับคู่ผิด
                allowedExamLevel: pickedCourse.allowedExamLevel ?? null,
            };
            // เก็บร่องรอยว่าใครเปลี่ยนจากคอร์สอะไร (ไว้ย้อนดูเวลาสงสัย)
            if (pickedCourse.id !== editing.courseId) {
                patch.courseChangedAt = new Date();
                patch.previousCourseTitle = editing.courseTitle || null;
            }
            // ปรับยอดตามราคาคอร์สใหม่ (ถ้าติ๊ก) — ส่วนลดคูปองเดิมยังคงอยู่
            if (syncPrice) {
                const newPrice = Number(pickedCourse.price) || 0;
                const currentDiscount = Number(editing.discountAmount) || 0;
                patch.price = newPrice;
                patch.finalPrice = Math.max(0, newPrice - currentDiscount);
            }
            await updateDoc(doc(db, "enrollments", editing.id), patch);
            toast.success("บันทึกคอร์สใหม่เรียบร้อย");
            closeCourseEditor();
        } catch (error) {
            console.error("Error updating course:", error);
            toast.error("บันทึกไม่สำเร็จ ลองอีกครั้ง");
        } finally {
            setSavingCourse(false);
        }
    };

    const filteredCourses = (() => {
        const kw = courseSearch.trim().toLowerCase();
        if (!kw) return courseOptions;
        return courseOptions.filter(
            (c) => (c.title || "").toLowerCase().includes(kw) || (c.category || "").toLowerCase().includes(kw)
        );
    })();

    const courseChanged = !!editing && !!pickedCourse && (pickedCourse.id !== editing.courseId || syncPrice);

    // Debounced public_stats recalculation. Recomputing the unique-student
    // counter needs a scan of every approved enrollment (~600 reads), and it
    // used to run INSIDE every approve/delete click — approving 10 slips in a
    // row cost 10 full scans and made each click wait on one. Debouncing runs
    // ONE scan ~5s after the last action in a burst; same numbers, ~90% fewer
    // reads, and the approve button responds immediately. Deliberately not
    // cleared on unmount so a pending recalc still completes after navigating
    // away (it touches Firestore only, no component state).
    const statsRecalcTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const schedulePublicStatsRecalc = () => {
        if (statsRecalcTimer.current) clearTimeout(statsRecalcTimer.current);
        statsRecalcTimer.current = setTimeout(async () => {
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
        }, 5000);
    };

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

            // ✅ Recalculate public_stats — debounced (one scan per burst of approvals)
            schedulePublicStatsRecalc();

            toast.success("อนุมัติเรียบร้อย! (กำหนดเวลาเรียน 5 ปี)");
            setConfirmApproveId(null);
            fetchData(); // รีโหลดข้อมูล
            refreshPendingCount(); // recount badge immediately (self-guarded, fire-and-forget)
        } catch (error) {
            console.error("Error:", error);
            toast.error("เกิดข้อผิดพลาด ลองอีกครั้ง");
        }
    };

    // ฟังก์ชันปฏิเสธ/ลบ
    const handleDelete = async (id: string) => {
        confirmModal("ยืนยันการลบ", "ยืนยันการลบรายการนี้? (กรณีสลิปปลอมหรือข้อมูลผิด)", async () => {
            try {
                await deleteDoc(doc(db, "enrollments", id));

                // ✅ Recalculate public_stats — debounced (one scan per burst)
                schedulePublicStatsRecalc();

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
                <div className="flex items-center gap-2 flex-wrap">
                    <Link href="/admin/registrations" className="kh-btn-ghost">
                        <Users size={16} /> สมาชิกใหม่ (ยังไม่แจ้งโอน)
                    </Link>
                    <Link href="/admin/students/add" className="kh-btn">
                        <UserPlus size={16} /> เพิ่มนักเรียนเอง
                    </Link>
                </div>
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
                                    className="w-full text-left rounded-xl px-3 py-3 flex items-start gap-3 transition"
                                    style={{
                                        background: isActive ? "var(--accent-soft)" : "transparent",
                                        borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                                    }}
                                >
                                    <span className="kh-avatar w-10 h-10 text-sm flex-shrink-0">{initial}</span>
                                    <span className="flex-1 min-w-0">
                                        <span className="flex items-center gap-2">
                                            <span className="flex-1 min-w-0 block text-sm font-bold kh-ink3 truncate">{item.userName || "ไม่ระบุชื่อ"}</span>
                                            <span className="font-black text-sm flex-shrink-0" style={{ color: "var(--good)" }}>฿{amount?.toLocaleString()}</span>
                                        </span>
                                        {/* ชื่อคอร์สคือสิ่งที่ต้องอ่านออกก่อนใคร — ตัวใหญ่ เข้ม สองบรรทัดได้ */}
                                        <span className="block text-[15px] font-black leading-snug mt-0.5" style={{ color: "var(--accent-ink)" }}>
                                            {item.courseTitle || "ไม่ระบุคอร์ส"}
                                        </span>
                                    </span>
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
                            <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(320px,400px)] gap-4 items-start">
                              {/* ===== LEFT: slip-related details ===== */}
                              <div className="space-y-4 min-w-0">

                                {/* Header */}
                                <div className="kh-card p-5 space-y-4">
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <span className="kh-avatar w-12 h-12 text-lg flex-shrink-0">{(item.userName || "?").trim().charAt(0).toUpperCase()}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-lg font-black kh-ink truncate">{item.userName || "ไม่ระบุชื่อ"}</div>
                                            <div className="text-sm kh-ink3 truncate">{item.userEmail || "-"}</div>
                                        </div>
                                        <div className="text-right">
                                            {item.discountAmount > 0 && (
                                                <div className="text-xs line-through font-bold kh-ink3">฿{item.price?.toLocaleString()}</div>
                                            )}
                                            <div className="text-2xl font-black" style={{ color: "var(--good)" }}>฿{amount?.toLocaleString()}</div>
                                        </div>
                                        <span className="kh-pill kh-pill-warn"><Clock size={13} /> รอตรวจสอบ</span>
                                    </div>

                                    {/* คอร์สที่แจ้งโอน — ตัวใหญ่ เห็นแล้วรู้ทันทีว่าคอร์สไหน + กดแก้ได้ */}
                                    <div
                                        className="rounded-xl p-4 flex items-start gap-3 flex-wrap"
                                        style={{
                                            background: "var(--accent-soft)",
                                            border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
                                        }}
                                    >
                                        <BookOpen size={22} className="flex-shrink-0 mt-1" style={{ color: "var(--accent)" }} />
                                        <div className="flex-1 min-w-0" style={{ minWidth: "min(100%, 220px)" }}>
                                            <div className="kh-eyebrow mb-1">คอร์สที่แจ้งโอน</div>
                                            <div className="text-xl md:text-2xl font-black leading-snug break-words" style={{ color: "var(--accent-ink)" }}>
                                                {item.courseTitle || "ไม่ระบุคอร์ส"}
                                            </div>
                                            {item.previousCourseTitle && (
                                                <div className="text-xs kh-ink3 mt-1.5">
                                                    แอดมินเปลี่ยนจาก “{item.previousCourseTitle}”
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => openCourseEditor(item)}
                                            className="kh-btn-ghost flex-shrink-0"
                                            style={{ background: "var(--card)" }}
                                        >
                                            <Pencil size={15} /> เปลี่ยนคอร์ส
                                        </button>
                                    </div>
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
                                        <div className="mt-4 text-xs xl:hidden" style={{ color: "#8FD8CB" }}>
                                            ดูรูปสลิปเต็มใบด้านล่าง ↓
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
                                            {item.adminNote && (
                                                <tr>
                                                    <td className="flex items-center gap-2"><StickyNote size={14} style={{ color: "var(--ink-3)" }} /> หมายเหตุแอดมิน</td>
                                                    <td className="font-bold" style={{ color: "var(--warn)" }}>{item.adminNote}</td>
                                                </tr>
                                            )}
                                            {item.createdByAdmin && (
                                                <tr>
                                                    <td>ที่มา</td>
                                                    <td><span className="kh-pill kh-pill-ink no-dot">สร้างโดยแอดมิน</span></td>
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
                                            if (!item.userId) { toast.error("ไม่พบข้อมูล User ID"); return; }
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
                                                toast.error("เกิดข้อผิดพลาดในการเปิดแชท");
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
                              </div>{/* end LEFT column */}

                              {/* ===== RIGHT: full transfer-slip image(s), uncropped ===== */}
                              <div className="xl:sticky xl:top-20">
                                <div className="kh-card p-3">
                                    <div className="kh-eyebrow px-1 mb-2 flex items-center gap-1.5">
                                        <ArrowDownLeft size={14} /> สลิปที่แนบมา
                                    </div>
                                    {slipUrls.length === 0 ? (
                                        <div className="p-8 text-center text-sm kh-ink3">ไม่มีไฟล์สลิปแนบมา</div>
                                    ) : (
                                        <div className="space-y-3 xl:max-h-[calc(100vh-160px)] xl:overflow-y-auto">
                                            {slipUrls.map((url: string, i: number) => (
                                                <a key={i} href={url} target="_blank" rel="noreferrer"
                                                    className="group block relative rounded-xl overflow-hidden"
                                                    style={{ border: "1px solid var(--line)", background: "var(--card-2)" }}>
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={url} alt={`สลิป ${i + 1}`} className="w-full h-auto block" />
                                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-sm font-bold gap-1" style={{ background: "rgba(0,0,0,0.35)" }}>
                                                        <ZoomIn size={16} /> เปิดรูปเต็ม
                                                    </div>
                                                    {slipUrls.length > 1 && <span className="absolute top-2 left-2 text-white text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(0,0,0,0.55)" }}>{i + 1}/{slipUrls.length}</span>}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
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
                        <h3 className="text-2xl font-black kh-ink mb-3">ยืนยันการอนุมัติ</h3>
                        {(() => {
                            const target = enrollments.find((e) => e.id === confirmApproveId);
                            if (!target) return null;
                            return (
                                <div
                                    className="w-full rounded-xl p-4 mb-5"
                                    style={{ background: "var(--accent-soft)", border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)" }}
                                >
                                    <div className="kh-eyebrow mb-1">คอร์สที่จะเปิดให้เรียน</div>
                                    <div className="text-xl font-black leading-snug break-words" style={{ color: "var(--accent-ink)" }}>
                                        {target.courseTitle || "ไม่ระบุคอร์ส"}
                                    </div>
                                    <div className="text-sm kh-ink3 mt-1">{target.userName || "ไม่ระบุชื่อ"}</div>
                                </div>
                            );
                        })()}
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
            {/* Modal เปลี่ยนคอร์สของใบแจ้งโอน */}
            {editing && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(11,32,29,0.55)", backdropFilter: "blur(4px)" }}
                    onClick={closeCourseEditor}
                >
                    <div
                        className="kh-card w-full max-w-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200"
                        style={{ maxHeight: "88vh" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* หัวหน้าต่าง */}
                        <div className="p-5 flex items-start gap-3 flex-wrap" style={{ borderBottom: "1px solid var(--line)" }}>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xl font-black kh-ink">เปลี่ยนคอร์สเรียน</h3>
                                <p className="text-sm kh-ink3 mt-0.5 truncate">
                                    ใบแจ้งโอนของ {editing.userName || "ไม่ระบุชื่อ"} · ฿{(editing.discountAmount > 0 ? editing.finalPrice : editing.price)?.toLocaleString()}
                                </p>
                            </div>
                            <button type="button" onClick={closeCourseEditor} className="kh-btn-ghost flex-shrink-0" aria-label="ปิด">
                                <X size={16} />
                            </button>
                        </div>

                        {/* คอร์สเดิม → คอร์สใหม่ */}
                        <div className="px-5 pt-4 flex items-center gap-3 flex-wrap text-sm">
                            <div className="min-w-0">
                                <div className="kh-eyebrow mb-0.5">คอร์สเดิม</div>
                                <div className="font-bold kh-ink2 break-words">{editing.courseTitle || "ไม่ระบุคอร์ส"}</div>
                            </div>
                            <ArrowRight size={18} className="flex-shrink-0" style={{ color: "var(--ink-3)" }} />
                            <div className="min-w-0">
                                <div className="kh-eyebrow mb-0.5">คอร์สใหม่</div>
                                <div className="font-black break-words" style={{ color: "var(--accent-ink)" }}>
                                    {pickedCourse ? pickedCourse.title : "— ยังไม่ได้เลือก —"}
                                </div>
                            </div>
                        </div>

                        {/* ช่องค้นหา */}
                        <div className="px-5 pt-4 pb-3">
                            <div className="relative">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-3)" }} />
                                <input
                                    type="text"
                                    value={courseSearch}
                                    onChange={(e) => setCourseSearch(e.target.value)}
                                    placeholder="ค้นหาชื่อคอร์ส..."
                                    className="kh-input"
                                    style={{ paddingLeft: "34px" }}
                                />
                            </div>
                        </div>

                        {/* รายชื่อคอร์ส */}
                        <div className="px-5 flex-1 overflow-y-auto space-y-2 min-h-[120px]">
                            {coursesLoading ? (
                                <div className="py-10 flex items-center justify-center gap-2 kh-ink3">
                                    <Loader2 size={18} className="animate-spin" /> กำลังโหลดรายชื่อคอร์ส...
                                </div>
                            ) : filteredCourses.length === 0 ? (
                                <div className="py-10 text-center kh-ink3">ไม่พบคอร์สที่ค้นหา</div>
                            ) : (
                                filteredCourses.map((c) => {
                                    const isPicked = c.id === pickedCourseId;
                                    const isCurrent = c.id === editing.courseId;
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setPickedCourseId(c.id)}
                                            className="w-full text-left rounded-xl p-3 flex items-center gap-3 transition"
                                            style={{
                                                background: isPicked ? "var(--accent-soft)" : "var(--card-2)",
                                                border: isPicked
                                                    ? "1px solid color-mix(in srgb, var(--accent) 45%, transparent)"
                                                    : "1px solid var(--line)",
                                            }}
                                        >
                                            <span
                                                className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                                                style={{
                                                    border: isPicked ? "6px solid var(--accent)" : "2px solid var(--line-2)",
                                                    background: isPicked ? "var(--card)" : "transparent",
                                                }}
                                            />
                                            <span className="flex-1 min-w-0">
                                                <span className="block font-bold kh-ink leading-snug break-words">{c.title || "(ไม่มีชื่อคอร์ส)"}</span>
                                                <span className="block text-xs kh-ink3 mt-0.5">
                                                    {c.category || "ไม่ระบุหมวด"}
                                                    {isCurrent && <span className="ml-2 kh-pill kh-pill-ink no-dot">คอร์สปัจจุบัน</span>}
                                                </span>
                                            </span>
                                            <span className="font-black text-sm flex-shrink-0" style={{ color: "var(--ink-2)" }}>
                                                ฿{Number(c.price || 0).toLocaleString()}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* ยอดเงิน + ปุ่มบันทึก */}
                        <div className="p-5 space-y-3" style={{ borderTop: "1px solid var(--line)" }}>
                            {pickedCourse && Number(pickedCourse.price || 0) !== Number(editing.price || 0) && (
                                <label
                                    className="flex items-start gap-3 rounded-xl p-3 cursor-pointer"
                                    style={{ background: "var(--warn-soft)", border: "1px solid color-mix(in srgb, var(--warn) 30%, transparent)" }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={syncPrice}
                                        onChange={(e) => setSyncPrice(e.target.checked)}
                                        className="mt-1 w-4 h-4 flex-shrink-0"
                                        style={{ accentColor: "var(--warn)" }}
                                    />
                                    <span className="text-sm">
                                        <span className="block font-bold" style={{ color: "var(--warn)" }}>
                                            ปรับยอดเป็นราคาคอร์สใหม่ (฿{Number(pickedCourse.price || 0).toLocaleString()})
                                        </span>
                                        <span className="block kh-ink3 mt-0.5">
                                            ถ้าไม่ติ๊ก จะเก็บยอดที่โอนมาจริงไว้เท่าเดิม (฿{Number(editing.price || 0).toLocaleString()})
                                        </span>
                                    </span>
                                </label>
                            )}
                            <div className="flex gap-3">
                                <button type="button" onClick={closeCourseEditor} className="kh-btn-ghost flex-1" disabled={savingCourse}>
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveCourse}
                                    className="kh-btn flex-[2]"
                                    disabled={!courseChanged || savingCourse}
                                >
                                    {savingCourse ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : <><Check size={16} /> บันทึกคอร์สใหม่</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog />
        </div>

    );
}