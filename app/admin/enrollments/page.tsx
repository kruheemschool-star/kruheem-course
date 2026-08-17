"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import Link from "next/link";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { useUserAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { UserPlus, Check, X, MessageCircle, ArrowDownLeft, Mail, Phone, Clock, Inbox, ZoomIn, Users, StickyNote, BookOpen, Pencil, Search, Loader2, ArrowRight, Receipt, Ticket } from "lucide-react";

type CourseLite = { id: string; title: string; price?: number; allowedExamLevel?: string | null; category?: string; image?: string };

/** บันไดสีคอลัมน์รายชื่อ — เข้มบนสุดไล่อ่อนลงล่าง (design-spec §2) */
const LADDER = ["var(--en-l1)", "var(--en-l2)", "var(--en-l3)", "var(--en-l4)", "var(--en-l5)", "var(--en-l6)"];

const baht = (n: unknown) => "฿" + (Number(n) || 0).toLocaleString("th-TH");

export default function AdminEnrollmentsPage() {
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();
    const { refreshPendingCount } = useUserAuth();
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Realtime: a single push-based listener so newly-submitted slips appear
    // instantly (no polling / no manual refresh). It is also the ONLY read of
    // this collection — approve/delete rely on the listener's local echo instead
    // of re-running getDocs (ที่เดิมยิงอ่านซ้ำทั้งคิวทุกครั้งที่กดอนุมัติ).
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

    // Presentational only: which slip row is highlighted in the master list
    const [selectedId, setSelectedId] = useState<string | null>(null);
    // ติ๊กเลือกหลายรายการเพื่ออนุมัติรวด (spec §5)
    const [checkedIds, setCheckedIds] = useState<string[]>([]);
    // ยืนยันด้วยตาว่ายอดในรูปสลิปตรงกับคำสั่งซื้อ (ต่อ 1 ใบ, อยู่ในหน้าจอเท่านั้น)
    const [amountVerifiedMap, setAmountVerifiedMap] = useState<Record<string, boolean>>({});

    const amountOf = (e?: { price?: number; finalPrice?: number; discountAmount?: number }) =>
        (Number(e?.discountAmount) || 0) > 0 ? e?.finalPrice : e?.price;

    /* ---------- สัญญาณที่ "คำนวณได้จริง" จากข้อมูล (ไม่เดา) ---------- */
    // 1) สลิปใบเดียวแนบมาหลายคอร์ส — ผู้ปกครองซื้อทีเดียวหลายคอร์ส ระบบแตกเป็นหลายใบ
    //    ยอดในสลิปต้องเท่ากับ "ผลรวม" ไม่ใช่ยอดของแถวเดียว จึงต้องดูด้วยตาก่อนอนุมัติ
    // 2) รายการซ้ำ — ผู้เรียนคนเดียว คอร์สเดียว ค้างสองใบ
    // 3) ไม่มีสลิปแนบ
    const signals = useMemo(() => {
        const bySlip = new Map<string, string[]>();
        const byUserCourse = new Map<string, number>();
        enrollments.forEach((e) => {
            const slipKey = (e.slipUrls?.[0] || e.slipUrl || "") as string;
            if (slipKey) bySlip.set(slipKey, [...(bySlip.get(slipKey) || []), e.id]);
            const ucKey = `${e.userId || "?"}::${e.courseId || "?"}`;
            byUserCourse.set(ucKey, (byUserCourse.get(ucKey) || 0) + 1);
        });
        const map = new Map<string, { note: string; needsEye: boolean }>();
        enrollments.forEach((e) => {
            const slipKey = (e.slipUrls?.[0] || e.slipUrl || "") as string;
            const group = slipKey ? bySlip.get(slipKey) || [] : [];
            const dup = (byUserCourse.get(`${e.userId || "?"}::${e.courseId || "?"}`) || 0) > 1;
            if (!slipKey) {
                map.set(e.id, { note: "ไม่มีสลิปแนบ", needsEye: true });
            } else if (dup) {
                map.set(e.id, { note: "ซ้ำกับอีกรายการ", needsEye: true });
            } else if (group.length > 1) {
                const total = group.reduce((s, id) => s + (Number(amountOf(enrollments.find((x) => x.id === id))) || 0), 0);
                map.set(e.id, { note: `สลิปเดียว ${group.length} คอร์ส รวม ${baht(total)}`, needsEye: true });
            } else if (e.couponCode) {
                map.set(e.id, { note: `คูปอง ${e.couponCode}`, needsEye: false });
            } else {
                map.set(e.id, { note: "", needsEye: false });
            }
        });
        return map;
    }, [enrollments]);

    // ครูฮีมสั่งถอดช่องค้นหาออก (2026-08-17) — หน้านี้มีไว้กวาดคิวที่รออนุมัติซึ่งปกติมีไม่กี่ใบ
    // การค้นหาเลยเป็นขั้นตอนส่วนเกิน ตัวแปรนี้คงชื่อเดิมไว้เพื่อไม่ต้องแก้จุดที่เรียกใช้ทั้งหน้า
    const visibleEnrollments = enrollments;

    // แถวที่ "เลือกทั้งหน้า" จะติ๊กให้ — ข้ามรายการที่ระบบสะกิดว่าต้องดูด้วยตา (spec §5)
    const autoSelectableIds = useMemo(
        () => visibleEnrollments.filter((e) => !signals.get(e.id)?.needsEye).map((e) => e.id),
        [visibleEnrollments, signals]
    );

    const pendingTotal = useMemo(
        () => enrollments.reduce((s, e) => s + (Number(amountOf(e)) || 0), 0),
        [enrollments]
    );
    const checkedTotal = useMemo(
        () => enrollments.filter((e) => checkedIds.includes(e.id)).reduce((s, e) => s + (Number(amountOf(e)) || 0), 0),
        [enrollments, checkedIds]
    );

    // Presentational only: keep the highlighted slip valid after reloads
    useEffect(() => {
        if (enrollments.length === 0) {
            setSelectedId(null);
        } else if (!enrollments.some((e) => e.id === selectedId)) {
            setSelectedId(enrollments[0].id);
        }
    }, [enrollments, selectedId]);

    // อนุมัติ/ลบไปแล้ว ต้องหลุดจากรายการที่ติ๊กไว้ด้วย
    useEffect(() => {
        setCheckedIds((prev) => {
            const alive = prev.filter((id) => enrollments.some((e) => e.id === id));
            return alive.length === prev.length ? prev : alive;
        });
    }, [enrollments]);

    const masterRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (!masterRef.current) return;
        masterRef.current.indeterminate = checkedIds.length > 0 && checkedIds.length < autoSelectableIds.length;
    }, [checkedIds, autoSelectableIds]);

    const toggleChecked = (id: string) =>
        setCheckedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const toggleSelectAll = () =>
        setCheckedIds((prev) => (prev.length > 0 ? [] : autoSelectableIds));

    // เหลือการติ๊กเดียวคือ "ยอดในสลิปตรงกับคำสั่งซื้อ" (อยู่บนแถบเทียบยอด)
    // — อยู่ในหน้าจอเท่านั้น ไม่บันทึกลง DB และไม่บังคับก่อนอนุมัติ
    const isAmountVerified = (id: string) => !!amountVerifiedMap[id];
    const toggleAmountVerified = (id: string) =>
        setAmountVerifiedMap((prev) => ({ ...prev, [id]: !prev[id] }));

    // State สำหรับ Modal ยืนยันอนุมัติ (ใบเดียวหรือหลายใบก็ใช้ตัวเดียวกัน)
    const [confirmApproveIds, setConfirmApproveIds] = useState<string[] | null>(null);
    const [approving, setApproving] = useState(false);

    // ===== รายชื่อคอร์ส (ใช้ทั้งรูปปกคู่ปุ่มอนุมัติ และหน้าต่างเปลี่ยนคอร์ส) =====
    // อ่าน collection courses ครั้งเดียวต่อการเปิดหน้า แล้ว cache ไว้ และจะไม่อ่านเลย
    // ถ้าคิวว่าง — หน้านี้เปิดบ่อย ไม่ควรสแกนคอร์สทิ้งเปล่าๆ ทุกครั้งที่เข้าหน้า
    const [editingId, setEditingId] = useState<string | null>(null);
    const [courseOptions, setCourseOptions] = useState<CourseLite[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(false);
    const [courseSearch, setCourseSearch] = useState("");
    const [pickedCourseId, setPickedCourseId] = useState<string>("");
    const [syncPrice, setSyncPrice] = useState(false);
    const [savingCourse, setSavingCourse] = useState(false);

    const editing = enrollments.find((e) => e.id === editingId) || null;
    const pickedCourse = courseOptions.find((c) => c.id === pickedCourseId) || null;

    const coursesLoadedRef = useRef(false);
    const ensureCourses = useCallback(async () => {
        if (coursesLoadedRef.current) return;
        coursesLoadedRef.current = true;
        setCoursesLoading(true);
        try {
            const snap = await getDocs(query(collection(db, "courses"), orderBy("createdAt", "desc")));
            setCourseOptions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CourseLite, "id">) })));
        } catch (error) {
            console.error("Error loading courses:", error);
            coursesLoadedRef.current = false; // ให้ลองใหม่ได้ในครั้งถัดไป
            toast.error("โหลดรายชื่อคอร์สไม่สำเร็จ ลองใหม่อีกครั้ง");
        } finally {
            setCoursesLoading(false);
        }
    }, []);

    // มีใบรออนุมัติเมื่อไหร่ค่อยดึงคอร์ส (เอารูปปกมาโชว์คู่ปุ่มอนุมัติ)
    useEffect(() => {
        if (enrollments.length > 0) ensureCourses();
    }, [enrollments.length, ensureCourses]);

    /** รูปปกคอร์ส (field `image` ของ courses) — ใบไหนคอร์สถูกลบไปแล้วจะได้ undefined */
    const coverOf = (courseId?: string) => courseOptions.find((c) => c.id === courseId)?.image;

    const openCourseEditor = (item: { id: string; courseId?: string }) => {
        setEditingId(item.id);
        setPickedCourseId(item.courseId || "");
        setCourseSearch("");
        setSyncPrice(false);
        ensureCourses();
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

    /** อนุมัติ 1 ใบ (ระยะเวลาเรียน 5 ปี) — ใช้ทั้งปุ่มเดี่ยวและปุ่มอนุมัติรวม */
    const approveOne = async (id: string) => {
        const now = new Date();
        const expiryDate = new Date(now);
        expiryDate.setFullYear(expiryDate.getFullYear() + 5);

        await updateDoc(doc(db, "enrollments", id), {
            status: "approved",
            approvedAt: now,
            expiryDate: expiryDate,
            accessType: "limited",
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
    };

    const handleConfirmApprove = async () => {
        if (!confirmApproveIds || confirmApproveIds.length === 0) return;
        setApproving(true);
        let ok = 0;
        const failed: string[] = [];
        for (const id of confirmApproveIds) {
            try {
                await approveOne(id);
                ok++;
            } catch (error) {
                console.error("Error approving", id, error);
                failed.push(enrollments.find((e) => e.id === id)?.userName || id);
            }
        }

        // ✅ Recalculate public_stats — debounced (one scan per burst of approvals)
        schedulePublicStatsRecalc();

        if (ok > 0) toast.success(`อนุมัติ ${ok} รายการเรียบร้อย (กำหนดเวลาเรียน 5 ปี)`);
        if (failed.length > 0) toast.error(`ไม่สำเร็จ ${failed.length} รายการ: ${failed.join(", ")}`);

        setCheckedIds((prev) => prev.filter((id) => !confirmApproveIds.includes(id)));
        setConfirmApproveIds(null);
        setApproving(false);
        refreshPendingCount(); // recount badge immediately (self-guarded, fire-and-forget)
    };

    // ฟังก์ชันปฏิเสธ/ลบ
    const handleDelete = async (id: string) => {
        confirmModal("ยืนยันการลบ", "ยืนยันการลบรายการนี้? (กรณีสลิปปลอมหรือข้อมูลผิด)", async () => {
            try {
                await deleteDoc(doc(db, "enrollments", id));
                schedulePublicStatsRecalc();
                setCheckedIds((prev) => prev.filter((x) => x !== id));
                refreshPendingCount(); // deleting a pending row changes the badge — recount now
            } catch (error) {
                console.error("Error:", error);
                toast.error("ลบไม่สำเร็จ ลองอีกครั้ง");
            }
        }, true);
    };

    const selected = enrollments.find((e) => e.id === selectedId) || null;
    const confirmTargets = confirmApproveIds
        ? confirmApproveIds.map((id) => enrollments.find((e) => e.id === id)).filter(Boolean)
        : [];

    return (
        <div className="khen khen-page">
            <div className="khen-wrap space-y-4">

                {/* ===== แถบหัวหน้า ===== */}
                <div
                    className="khen-box px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
                    style={{ background: "var(--en-b-top)", borderColor: "var(--en-b-top-l)" }}
                >
                    <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="khen-t text-[17px]" style={{ color: "var(--en-ink)" }}>
                            รอตรวจสอบ {enrollments.length} รายการ
                        </span>
                        <span className="khen-num text-[13.5px]" style={{ color: "var(--en-ink-2)" }}>
                            ยอดรวมที่รอ {baht(pendingTotal)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Link href="/admin/registrations" className="khen-btn-soft khen-btn-sm">
                            <Users size={15} /> สมาชิกใหม่ (ยังไม่แจ้งโอน)
                        </Link>
                        <Link href="/admin/students/add" className="khen-btn khen-btn-sm">
                            <UserPlus size={15} /> เพิ่มนักเรียนเอง
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="khen-card p-10 text-center text-[13.5px]" style={{ color: "var(--en-ink-2)" }}>กำลังโหลดรายการ...</div>
                ) : enrollments.length === 0 ? (
                    <div className="khen-card p-16 flex flex-col items-center justify-center text-center gap-3">
                        <Inbox size={40} style={{ color: "var(--en-ink-3)" }} />
                        <p className="khen-t text-[16px]" style={{ color: "var(--en-ink)" }}>ไม่มีรายการแจ้งโอนใหม่</p>
                    </div>
                ) : (
                    <div className="khen-grid">

                        {/* ===== คอลัมน์ซ้าย: รายการรอตรวจ ===== */}
                        <div className="khen-card overflow-hidden khen-sticky">
                            <div
                                className="p-3 space-y-2.5"
                                style={{ background: "var(--en-b-list)", borderBottom: "1px solid var(--en-b-list-l)" }}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            ref={masterRef}
                                            type="checkbox"
                                            className="khen-check"
                                            checked={checkedIds.length > 0 && checkedIds.length === autoSelectableIds.length}
                                            onChange={toggleSelectAll}
                                        />
                                        <span className="text-[12.5px] font-semibold" style={{ color: "var(--en-ink-2)" }}>
                                            {checkedIds.length > 0 ? `เลือกแล้ว ${checkedIds.length}` : "เลือกทั้งหน้า"}
                                        </span>
                                    </label>
                                    {checkedIds.length > 0 && (
                                        <span className="khen-num text-[12.5px]" style={{ color: "var(--en-ink)" }}>{baht(checkedTotal)}</span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    className="khen-btn w-full"
                                    disabled={checkedIds.length === 0}
                                    onClick={() => setConfirmApproveIds([...checkedIds])}
                                >
                                    <Check size={16} />
                                    {checkedIds.length > 0 ? `อนุมัติ ${checkedIds.length} รายการที่เลือก` : "อนุมัติรายการที่เลือก"}
                                </button>
                            </div>

                            <div className="khen-scroll-list p-2 space-y-1.5">
                                {visibleEnrollments.length === 0 ? (
                                    <div className="py-10 text-center text-[13px]" style={{ color: "var(--en-ink-3)" }}>ไม่มีรายการรอตรวจสอบ</div>
                                ) : visibleEnrollments.map((item, idx) => {
                                    const isActive = item.id === selectedId;
                                    const isChecked = checkedIds.includes(item.id);
                                    const amount = amountOf(item);
                                    const thumb = (item.slipUrls?.[0] || item.slipUrl || "") as string;
                                    const note = signals.get(item.id)?.note || "";
                                    return (
                                        <div
                                            key={item.id}
                                            className="khen-row flex items-stretch"
                                            data-active={isActive}
                                            style={{ background: LADDER[Math.min(idx, LADDER.length - 1)] }}
                                        >
                                            <label className="flex items-center pl-2.5 pr-1 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="khen-check"
                                                    checked={isChecked}
                                                    onChange={() => toggleChecked(item.id)}
                                                    aria-label={`เลือก ${item.userName || "รายการนี้"}`}
                                                />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedId(item.id)}
                                                className="khen-row-main flex-1 min-w-0 flex items-center gap-2.5 py-2.5 pr-2.5 text-left"
                                            >
                                                {thumb ? (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img
                                                        src={thumb}
                                                        alt=""
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="w-8 h-10 rounded-md object-cover flex-shrink-0"
                                                        style={{ border: "1px solid var(--en-line-2)", background: "var(--en-card)" }}
                                                    />
                                                ) : (
                                                    <span
                                                        className="w-8 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                                                        style={{ border: "1px solid var(--en-line-2)", background: "var(--en-card)", color: "var(--en-ink-3)" }}
                                                    >
                                                        <Receipt size={14} />
                                                    </span>
                                                )}
                                                <span className="flex-1 min-w-0">
                                                    <span className="flex items-baseline gap-2">
                                                        <span className="flex-1 min-w-0 truncate text-[12.5px] font-semibold" style={{ color: "var(--en-ink-2)" }}>
                                                            {item.userName || "ไม่ระบุชื่อ"}
                                                        </span>
                                                        <span className="khen-num text-[13.5px] flex-shrink-0" style={{ color: "var(--en-ink)" }}>
                                                            {baht(amount)}
                                                        </span>
                                                    </span>
                                                    <span className="khen-t block truncate text-[14px] leading-snug" style={{ color: "var(--en-accent-deep)" }}>
                                                        {item.courseTitle || "ไม่ระบุคอร์ส"}
                                                    </span>
                                                    <span className="block truncate text-[11.5px]" style={{ color: "var(--en-ink-2)" }}>
                                                        {item.formattedDate}{note ? ` · ${note}` : ""}
                                                    </span>
                                                </span>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ===== คอลัมน์กลาง: รายละเอียด ===== */}
                        {selected && (() => {
                            const item = selected;
                            const amount = amountOf(item);
                            const amountVerified = isAmountVerified(item.id);
                            const note = signals.get(item.id)?.note || "";
                            const needsEye = signals.get(item.id)?.needsEye;
                            return (
                                <div className="space-y-4 min-w-0">

                                    <div className="khen-card overflow-hidden">
                                        {/* 1) หัวการ์ดผู้แจ้งโอน */}
                                        <div
                                            className="p-4 flex items-center gap-3.5 flex-wrap"
                                            style={{ background: "var(--en-b-person)", borderBottom: "1px solid var(--en-b-person-l)" }}
                                        >
                                            <span
                                                className="khen-t w-12 h-12 rounded-2xl flex items-center justify-center text-[18px] flex-shrink-0"
                                                style={{ background: "var(--en-accent)", color: "#FFFFFF" }}
                                            >
                                                {(item.userName || "?").trim().charAt(0).toUpperCase()}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="khen-t text-[20px] leading-tight truncate" style={{ color: "var(--en-ink)" }}>
                                                    {item.userName || "ไม่ระบุชื่อ"}
                                                </div>
                                                <div className="text-[12.5px] truncate flex items-center gap-2 flex-wrap" style={{ color: "var(--en-ink-2)" }}>
                                                    <span className="inline-flex items-center gap-1"><Mail size={12} /> {item.userEmail || "-"}</span>
                                                    <span className="inline-flex items-center gap-1"><Phone size={12} /> {item.userTel || "-"}</span>
                                                </div>
                                            </div>
                                            <span className="khen-pill flex-shrink-0"><Clock size={12} /> รอตรวจสอบ</span>
                                        </div>

                                        <div className="p-4 space-y-4">
                                            {/* 2) แถบเทียบยอด */}
                                            <div
                                                className="khen-box khen-compare p-4"
                                                style={{ background: "var(--en-b-money)", borderColor: "var(--en-b-money-l)" }}
                                            >
                                                <div className="min-w-0">
                                                    <div className="khen-eyebrow mb-1">ยอดในสลิป</div>
                                                    <div className="khen-num text-[28px] leading-none truncate" style={{ color: amountVerified ? "var(--en-ink)" : "var(--en-ink-3)" }}>
                                                        {amountVerified ? baht(amount) : "— ตรวจจากรูป"}
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => toggleAmountVerified(item.id)}
                                                    title="กดเพื่อยืนยันว่ายอดในรูปสลิปตรงกับคำสั่งซื้อ"
                                                    className="flex flex-col items-center gap-1.5 flex-shrink-0"
                                                >
                                                    <span
                                                        className="w-[38px] h-[38px] rounded-full flex items-center justify-center"
                                                        style={{ background: "var(--en-card)", border: "1px solid var(--en-b-money-l)", color: amountVerified ? "var(--en-good)" : "var(--en-ink-3)" }}
                                                    >
                                                        {amountVerified ? <Check size={20} strokeWidth={3} /> : <Clock size={18} />}
                                                    </span>
                                                    <span className="text-[11.5px] font-semibold whitespace-nowrap" style={{ color: amountVerified ? "var(--en-good)" : "var(--en-ink-2)" }}>
                                                        {amountVerified ? "ตรงกัน" : "ยังไม่ตรวจ"}
                                                    </span>
                                                </button>

                                                <div className="khen-compare-right min-w-0 text-right">
                                                    <div className="khen-eyebrow mb-1">ยอดคำสั่งซื้อ</div>
                                                    <div className="khen-num text-[28px] leading-none truncate" style={{ color: "var(--en-ink)" }}>{baht(amount)}</div>
                                                    <div className="text-[11.5px] mt-1.5 truncate" style={{ color: "var(--en-ink-2)" }}>
                                                        แจ้งโอน {item.formattedDate}
                                                    </div>
                                                </div>
                                            </div>

                                            {needsEye && note && (
                                                <div className="flex items-start gap-2 text-[12.5px] px-1" style={{ color: "var(--en-ink-2)" }}>
                                                    <ArrowDownLeft size={14} className="mt-0.5 flex-shrink-0" />
                                                    <span>{note} — ดูรูปสลิปให้ครบก่อนอนุมัติ</span>
                                                </div>
                                            )}

                                            {/* 3) กล่องคอร์สที่แจ้งโอน */}
                                            <div
                                                className="khen-box p-4 flex items-start gap-3 flex-wrap"
                                                style={{ background: "var(--en-b-course)", borderColor: "var(--en-b-course-l)" }}
                                            >
                                                {coverOf(item.courseId) ? (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img
                                                        src={coverOf(item.courseId)}
                                                        alt=""
                                                        loading="lazy"
                                                        className="w-[84px] h-[56px] rounded-[10px] object-cover flex-shrink-0"
                                                        style={{ border: "1px solid var(--en-b-course-l)", background: "var(--en-card)" }}
                                                    />
                                                ) : (
                                                    <BookOpen size={22} className="flex-shrink-0 mt-1" style={{ color: "var(--en-accent)" }} />
                                                )}
                                                <div className="flex-1 min-w-0" style={{ minWidth: "min(100%, 200px)" }}>
                                                    <div className="khen-eyebrow mb-1">คอร์สที่แจ้งโอน</div>
                                                    <div className="khen-t text-[22px] leading-snug break-words" style={{ color: "var(--en-accent-deep)" }}>
                                                        {item.courseTitle || "ไม่ระบุคอร์ส"}
                                                    </div>
                                                    {item.previousCourseTitle && (
                                                        <div className="text-[11.5px] mt-1.5" style={{ color: "var(--en-ink-2)" }}>
                                                            แอดมินเปลี่ยนจาก “{item.previousCourseTitle}”
                                                        </div>
                                                    )}
                                                </div>
                                                <button type="button" onClick={() => openCourseEditor(item)} className="khen-btn-soft khen-btn-sm flex-shrink-0">
                                                    <Pencil size={14} /> เปลี่ยนคอร์ส
                                                </button>
                                            </div>

                                            {/* ครูฮีมสั่งถอดสามช่อง ชื่อบัญชีผู้โอน / เข้าบัญชี / เลขที่รายการ ออก (2026-08-17)
                                                — ข้อมูลพวกนี้อ่านจากรูปสลิปได้อยู่แล้ว การมีซ้ำทำให้ต้องเลื่อนจอนานกว่าจะถึงปุ่มอนุมัติ */}

                                            {/* ข้อมูลเสริมที่มีเฉพาะบางใบ */}
                                            {(item.lineId || item.couponCode || item.adminNote || item.createdByAdmin) && (
                                                <div className="rounded-[14px] divide-y" style={{ border: "1px solid var(--en-line)", borderColor: "var(--en-line)" }}>
                                                    {item.lineId && (
                                                        <div className="flex items-center gap-3 px-3.5 py-2.5 text-[12.5px]">
                                                            <span className="w-28 flex-shrink-0" style={{ color: "var(--en-ink-2)" }}>LINE ID</span>
                                                            <span className="font-semibold" style={{ color: "var(--en-ink)" }}>{item.lineId}</span>
                                                        </div>
                                                    )}
                                                    {item.couponCode && (
                                                        <div className="flex items-center gap-3 px-3.5 py-2.5 text-[12.5px]" style={{ borderTop: "1px solid var(--en-line)" }}>
                                                            <span className="w-28 flex-shrink-0 inline-flex items-center gap-1.5" style={{ color: "var(--en-ink-2)" }}><Ticket size={13} /> คูปองส่วนลด</span>
                                                            <span className="font-semibold" style={{ color: "var(--en-ink)" }}>
                                                                {item.couponCode} <span className="khen-num" style={{ color: "var(--en-good)" }}>-{baht(item.discountAmount)}</span>
                                                                <span className="khen-num ml-2" style={{ color: "var(--en-ink-2)" }}>(เต็ม {baht(item.price)})</span>
                                                            </span>
                                                        </div>
                                                    )}
                                                    {item.adminNote && (
                                                        <div className="flex items-center gap-3 px-3.5 py-2.5 text-[12.5px]" style={{ borderTop: "1px solid var(--en-line)" }}>
                                                            <span className="w-28 flex-shrink-0 inline-flex items-center gap-1.5" style={{ color: "var(--en-ink-2)" }}><StickyNote size={13} /> หมายเหตุแอดมิน</span>
                                                            <span className="font-semibold" style={{ color: "var(--en-warn)" }}>{item.adminNote}</span>
                                                        </div>
                                                    )}
                                                    {item.createdByAdmin && (
                                                        <div className="flex items-center gap-3 px-3.5 py-2.5 text-[12.5px]" style={{ borderTop: "1px solid var(--en-line)" }}>
                                                            <span className="w-28 flex-shrink-0" style={{ color: "var(--en-ink-2)" }}>ที่มา</span>
                                                            <span className="font-semibold" style={{ color: "var(--en-ink)" }}>สร้างโดยแอดมิน</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 5) แผ่นการ์ดคอร์ส + ปุ่มอนุมัติในที่เดียว
                                        — เห็นปกกับชื่อคอร์สตรงปุ่ม กดอนุมัติได้เลยโดยไม่ต้องเลื่อนขึ้นไปอ่าน */}
                                    <div
                                        className="khen-box p-4 space-y-3.5"
                                        style={{ background: "var(--en-b-course)", borderColor: "var(--en-b-course-l)" }}
                                    >
                                      <div className="flex items-center gap-4">
                                        {coverOf(item.courseId) ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={coverOf(item.courseId)}
                                                alt={item.courseTitle || "ปกคอร์ส"}
                                                loading="lazy"
                                                className="w-[112px] h-[68px] rounded-[12px] object-cover flex-shrink-0"
                                                style={{ border: "1px solid var(--en-b-course-l)", background: "var(--en-card)" }}
                                            />
                                        ) : (
                                            <span
                                                className="w-[112px] h-[68px] rounded-[12px] flex items-center justify-center flex-shrink-0 text-[11.5px] text-center px-2"
                                                style={{ border: "1px dashed var(--en-b-course-l)", background: "var(--en-card)", color: "var(--en-ink-3)" }}
                                            >
                                                {coursesLoading ? "กำลังโหลดปก..." : "ไม่มีรูปปกคอร์ส"}
                                            </span>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="khen-eyebrow mb-1">คอร์สที่จะเปิดให้เรียน</div>
                                            <div className="khen-t text-[19px] leading-snug break-words" style={{ color: "var(--en-accent-deep)" }}>
                                                {item.courseTitle || "ไม่ระบุคอร์ส"}
                                            </div>
                                            <div className="text-[12.5px] mt-1 truncate" style={{ color: "var(--en-ink-2)" }}>
                                                {item.userName || "ไม่ระบุชื่อ"} · <span className="khen-num">{baht(amount)}</span> · เรียนได้ 5 ปี
                                            </div>
                                        </div>
                                      </div>
                                      <button
                                          onClick={() => setConfirmApproveIds([item.id])}
                                          className="khen-btn w-full"
                                          style={{ minHeight: "52px", fontSize: "15px" }}
                                      >
                                          <Check size={18} /> อนุมัติ (5 ปี)
                                      </button>
                                    </div>

                                    {/* ปุ่มรอง */}
                                    <div className="flex gap-3 flex-wrap">
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
                                                    }, { merge: true });

                                                    window.location.href = `/admin/chat?chatId=${item.userId}`;
                                                } catch (err) {
                                                    console.error(err);
                                                    toast.error("เกิดข้อผิดพลาดในการเปิดแชท");
                                                }
                                            }}
                                            className="khen-btn-soft"
                                            style={{ flex: 1, minWidth: "150px" }}
                                        >
                                            <MessageCircle size={15} /> ขอสลิปใหม่ / ทักแชท
                                        </button>

                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="khen-btn-soft khen-btn-bad"
                                            style={{ flex: 1, minWidth: "120px" }}
                                        >
                                            <X size={15} /> ปฏิเสธ
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ===== คอลัมน์ขวา: สลิป ===== */}
                        {selected && (() => {
                            const item = selected;
                            const slipUrls = ((item.slipUrls && item.slipUrls.length > 0 ? item.slipUrls : [item.slipUrl]) as string[]).filter(Boolean);
                            return (
                                <div className="khen-col-slip space-y-4 khen-sticky">
                                    {/* แผ่นรองสีฟ้าครอบการ์ดสลิปขาว */}
                                    <div
                                        className="khen-box p-3.5"
                                        style={{ background: "var(--en-b-mat)", borderColor: "var(--en-b-mat-l)" }}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-2.5 px-0.5">
                                            <span className="khen-eyebrow flex items-center gap-1.5" style={{ color: "var(--en-accent-deep)" }}>
                                                <ArrowDownLeft size={13} /> สลิปที่แนบมา
                                            </span>
                                            {slipUrls.length > 0 && (
                                                <a href={slipUrls[0]} target="_blank" rel="noreferrer" className="khen-pill">
                                                    <ZoomIn size={12} /> เปิดเต็ม
                                                </a>
                                            )}
                                        </div>

                                        {slipUrls.length === 0 ? (
                                            <div
                                                className="rounded-[14px] p-8 text-center text-[13px]"
                                                style={{ background: "var(--en-card)", border: "1px solid var(--en-b-mat-l)", color: "var(--en-ink-3)" }}
                                            >
                                                ไม่มีไฟล์สลิปแนบมา
                                            </div>
                                        ) : (
                                            <div className="khen-scroll-slip space-y-2.5">
                                                {slipUrls.map((url: string, i: number) => (
                                                    <a
                                                        key={i}
                                                        href={url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="group block relative rounded-[14px] overflow-hidden"
                                                        style={{ background: "var(--en-card)", border: "1px solid var(--en-b-mat-l)" }}
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={url} alt={`สลิป ${i + 1}`} className="w-full h-auto block" />
                                                        <div
                                                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[13px] font-semibold gap-1.5"
                                                            style={{ background: "rgba(26,42,60,0.42)" }}
                                                        >
                                                            <ZoomIn size={16} /> เปิดรูปเต็ม
                                                        </div>
                                                        {slipUrls.length > 1 && (
                                                            <span
                                                                className="khen-num absolute top-2 left-2 text-white text-[11px] px-2 py-0.5 rounded-full"
                                                                style={{ background: "rgba(26,42,60,0.62)" }}
                                                            >
                                                                {i + 1}/{slipUrls.length}
                                                            </span>
                                                        )}
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* ครูฮีมสั่งถอดเช็กลิสต์ "เทียบกับคำสั่งซื้อ" ออกทั้งหมด (2026-08-17)
                                        — เป็นการติ๊กที่ไม่ได้บันทึกลงฐานข้อมูลและไม่ได้บังคับก่อนอนุมัติ
                                        จึงเป็นแค่ขั้นตอนคั่นระหว่างการดูสลิปกับการกดอนุมัติ */}
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* ===== Modal ยืนยันการอนุมัติ (ใบเดียว / หลายใบ) ===== */}
            {confirmApproveIds && confirmApproveIds.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(26,42,60,0.55)", backdropFilter: "blur(4px)" }}>
                    <div className="khen-card p-7 max-w-md w-full flex flex-col items-center text-center">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                            style={{ background: "var(--en-b-money)", color: "var(--en-good)" }}
                        >
                            <Check size={32} strokeWidth={2.5} />
                        </div>
                        <h3 className="khen-t text-[22px] mb-3" style={{ color: "var(--en-ink)" }}>
                            {confirmApproveIds.length > 1 ? `ยืนยันอนุมัติ ${confirmApproveIds.length} รายการ` : "ยืนยันการอนุมัติ"}
                        </h3>

                        <div
                            className="w-full khen-box p-3.5 mb-5 text-left space-y-2 overflow-y-auto"
                            style={{ background: "var(--en-b-course)", borderColor: "var(--en-b-course-l)", maxHeight: "230px" }}
                        >
                            {confirmTargets.map((t) => (
                                <div key={t.id} className="min-w-0 flex items-center gap-3">
                                    {coverOf(t.courseId) && (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                            src={coverOf(t.courseId)}
                                            alt=""
                                            loading="lazy"
                                            className="w-[64px] h-[42px] rounded-[9px] object-cover flex-shrink-0"
                                            style={{ border: "1px solid var(--en-b-course-l)", background: "var(--en-card)" }}
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="khen-t text-[15px] leading-snug break-words" style={{ color: "var(--en-accent-deep)" }}>
                                            {t.courseTitle || "ไม่ระบุคอร์ส"}
                                        </div>
                                        <div className="text-[12px] flex items-center justify-between gap-2" style={{ color: "var(--en-ink-2)" }}>
                                            <span className="truncate">{t.userName || "ไม่ระบุชื่อ"}</span>
                                            <span className="khen-num flex-shrink-0">{baht(amountOf(t))}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="text-[13px] mb-6 leading-relaxed" style={{ color: "var(--en-ink-2)" }}>
                            ผู้เรียนจะเข้าเรียนได้ทันทีหลังกดยืนยัน (ระยะเวลาเรียน 5 ปี)
                        </p>

                        <div className="flex w-full gap-3">
                            <button onClick={() => setConfirmApproveIds(null)} className="khen-btn-soft flex-1" disabled={approving}>
                                ยกเลิก
                            </button>
                            <button onClick={handleConfirmApprove} className="khen-btn flex-1" disabled={approving}>
                                {approving ? <><Loader2 size={16} className="animate-spin" /> กำลังอนุมัติ...</> : <><Check size={16} /> ยืนยัน</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Modal เปลี่ยนคอร์สของใบแจ้งโอน ===== */}
            {editing && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(26,42,60,0.55)", backdropFilter: "blur(4px)" }}
                    onClick={closeCourseEditor}
                >
                    <div
                        className="khen-card w-full max-w-2xl flex flex-col"
                        style={{ maxHeight: "88vh" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-5 flex items-start gap-3 flex-wrap" style={{ borderBottom: "1px solid var(--en-line)" }}>
                            <div className="flex-1 min-w-0">
                                <h3 className="khen-t text-[20px]" style={{ color: "var(--en-ink)" }}>เปลี่ยนคอร์สเรียน</h3>
                                <p className="text-[12.5px] mt-0.5 truncate" style={{ color: "var(--en-ink-2)" }}>
                                    ใบแจ้งโอนของ {editing.userName || "ไม่ระบุชื่อ"} · <span className="khen-num">{baht(amountOf(editing))}</span>
                                </p>
                            </div>
                            <button type="button" onClick={closeCourseEditor} className="khen-btn-soft khen-btn-sm flex-shrink-0" aria-label="ปิด">
                                <X size={15} />
                            </button>
                        </div>

                        <div className="px-5 pt-4 flex items-center gap-3 flex-wrap">
                            <div className="min-w-0">
                                <div className="khen-eyebrow mb-0.5">คอร์สเดิม</div>
                                <div className="text-[13px] font-semibold break-words" style={{ color: "var(--en-ink-2)" }}>{editing.courseTitle || "ไม่ระบุคอร์ส"}</div>
                            </div>
                            <ArrowRight size={18} className="flex-shrink-0" style={{ color: "var(--en-ink-3)" }} />
                            <div className="min-w-0">
                                <div className="khen-eyebrow mb-0.5">คอร์สใหม่</div>
                                <div className="khen-t text-[14px] break-words" style={{ color: "var(--en-accent-deep)" }}>
                                    {pickedCourse ? pickedCourse.title : "— ยังไม่ได้เลือก —"}
                                </div>
                            </div>
                        </div>

                        <div className="px-5 pt-4 pb-3">
                            <div className="relative">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--en-ink-3)" }} />
                                <input
                                    type="text"
                                    value={courseSearch}
                                    onChange={(e) => setCourseSearch(e.target.value)}
                                    placeholder="ค้นหาชื่อคอร์ส..."
                                    className="khen-input"
                                />
                            </div>
                        </div>

                        <div className="px-5 flex-1 overflow-y-auto space-y-2 min-h-[120px]">
                            {coursesLoading ? (
                                <div className="py-10 flex items-center justify-center gap-2 text-[13px]" style={{ color: "var(--en-ink-2)" }}>
                                    <Loader2 size={18} className="animate-spin" /> กำลังโหลดรายชื่อคอร์ส...
                                </div>
                            ) : filteredCourses.length === 0 ? (
                                <div className="py-10 text-center text-[13px]" style={{ color: "var(--en-ink-3)" }}>ไม่พบคอร์สที่ค้นหา</div>
                            ) : (
                                filteredCourses.map((c) => {
                                    const isPicked = c.id === pickedCourseId;
                                    const isCurrent = c.id === editing.courseId;
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setPickedCourseId(c.id)}
                                            className="w-full text-left rounded-[14px] p-3 flex items-center gap-3"
                                            style={{
                                                background: isPicked ? "var(--en-b-course)" : "var(--en-card)",
                                                border: `1px solid ${isPicked ? "var(--en-b-course-l)" : "var(--en-line)"}`,
                                            }}
                                        >
                                            <span
                                                className="w-5 h-5 rounded-full flex-shrink-0"
                                                style={{
                                                    border: isPicked ? "6px solid var(--en-accent)" : "2px solid var(--en-line-2)",
                                                    background: isPicked ? "var(--en-card)" : "transparent",
                                                }}
                                            />
                                            {c.image && (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img
                                                    src={c.image}
                                                    alt=""
                                                    loading="lazy"
                                                    className="w-[62px] h-[40px] rounded-[9px] object-cover flex-shrink-0"
                                                    style={{ border: "1px solid var(--en-line)", background: "var(--en-card)" }}
                                                />
                                            )}
                                            <span className="flex-1 min-w-0">
                                                <span className="khen-t block text-[14px] leading-snug break-words" style={{ color: "var(--en-ink)" }}>
                                                    {c.title || "(ไม่มีชื่อคอร์ส)"}
                                                </span>
                                                <span className="block text-[11.5px] mt-0.5" style={{ color: "var(--en-ink-2)" }}>
                                                    {c.category || "ไม่ระบุหมวด"}
                                                    {isCurrent && <span className="khen-pill ml-2">คอร์สปัจจุบัน</span>}
                                                </span>
                                            </span>
                                            <span className="khen-num text-[13.5px] flex-shrink-0" style={{ color: "var(--en-ink-2)" }}>
                                                {baht(c.price)}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        <div className="p-5 space-y-3" style={{ borderTop: "1px solid var(--en-line)" }}>
                            {pickedCourse && Number(pickedCourse.price || 0) !== Number(editing.price || 0) && (
                                <label
                                    className="flex items-start gap-3 rounded-[14px] p-3 cursor-pointer"
                                    style={{ background: "var(--en-b-i3)", border: "1px solid var(--en-b-i3-l)" }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={syncPrice}
                                        onChange={(e) => setSyncPrice(e.target.checked)}
                                        className="khen-check mt-0.5"
                                        style={{ accentColor: "var(--en-warn)" }}
                                    />
                                    <span className="text-[12.5px]">
                                        <span className="block font-semibold" style={{ color: "var(--en-ink)" }}>
                                            ปรับยอดเป็นราคาคอร์สใหม่ (<span className="khen-num">{baht(pickedCourse.price)}</span>)
                                        </span>
                                        <span className="block mt-0.5" style={{ color: "var(--en-ink-2)" }}>
                                            ถ้าไม่ติ๊ก จะเก็บยอดที่โอนมาจริงไว้เท่าเดิม (<span className="khen-num">{baht(editing.price)}</span>)
                                        </span>
                                    </span>
                                </label>
                            )}
                            <div className="flex gap-3">
                                <button type="button" onClick={closeCourseEditor} className="khen-btn-soft flex-1" disabled={savingCourse}>
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveCourse}
                                    className="khen-btn"
                                    style={{ flex: 2 }}
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
