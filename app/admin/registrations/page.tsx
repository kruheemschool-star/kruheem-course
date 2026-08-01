"use client";
// ─────────────────────────────────────────────────────────────────────────────
// สมาชิกใหม่ — ทะเบียน "คนสมัครสมาชิก" (users) ไม่ใช่แค่คนที่แจ้งโอนสำเร็จ
//
// ปิดจุดบอดเดิม: นักเรียนสมัครสมาชิกเสร็จแต่แจ้งโอน/แนบสลิปไม่สำเร็จ →
// ไม่มีตัวตนในหลังบ้านเลย ครูช่วยต่อไม่ได้ หน้านี้เห็นทุกบัญชีพร้อมสถานะ และให้ครู:
//   1. จดหมายเหตุประจำคน (เช่น "โอนแล้ว 31 ก.ค. ทาง LINE ยอด 790")
//   2. แนบสลิปแทนนักเรียน (กรณีส่งสลิปมาทาง LINE/แชท)
//   3. เลือกคอร์สให้ แล้วอนุมัติเข้าเรียนทันที หรือบันทึกเป็น "รอตรวจ"
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { db, storage } from "@/lib/firebase";
import {
    collection, getDocs, query, orderBy, limit, doc, updateDoc, addDoc,
    where, setDoc, serverTimestamp,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useUserAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { prepareSlipImage, slipPrepErrorText, slipContentType } from "@/lib/slipFile";
import {
    Search, Phone, Mail, Calendar, Check, Clock, UserX, Users, Wallet,
    StickyNote, Loader2, GraduationCap, ImagePlus, MessageCircle, RefreshCw,
} from "lucide-react";

const MAX_SLIPS = 5;
const USERS_CAP = 3000; // safety cap — well above current member count

type Member = {
    id: string;
    displayName?: string;
    email?: string;
    phoneNumber?: string;
    adminNote?: string;
    authProvider?: string;
    avatar?: string;
    createdAtMs: number; // 0 = สมัครก่อนระบบเริ่มบันทึกวันที่
};

type Enr = {
    id: string;
    userId?: string;
    userEmail?: string;
    courseId?: string;
    courseTitle?: string;
    status?: string;
    createdAtMs: number;
};

type CourseLite = { id: string; title: string; price?: number; allowedExamLevel?: string | null };

type MemberStatus = "none" | "pending" | "approved";

const STATUS_META: Record<MemberStatus, { label: string; pill: string }> = {
    none: { label: "ยังไม่แจ้งโอน", pill: "kh-pill-danger" },
    pending: { label: "รอตรวจสลิป", pill: "kh-pill-warn" },
    approved: { label: "เรียนอยู่", pill: "kh-pill-good" },
};

const fmtDate = (ms: number) =>
    ms > 0
        ? new Date(ms).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })
        : "ก่อนระบบบันทึกวันที่";

export default function AdminRegistrationsPage() {
    const { refreshPendingCount } = useUserAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [enrollments, setEnrollments] = useState<Enr[]>([]);
    const [courses, setCourses] = useState<CourseLite[]>([]);
    const [loading, setLoading] = useState(true);
    const [capped, setCapped] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | MemberStatus>("all");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // ── หมายเหตุประจำคน ──
    const [noteDraft, setNoteDraft] = useState("");
    const [noteSaving, setNoteSaving] = useState(false);

    // ── ฟอร์มลงทะเบียนให้ ──
    const [enrollName, setEnrollName] = useState("");
    const [enrollPhone, setEnrollPhone] = useState("");
    const [selCourses, setSelCourses] = useState<string[]>([]);
    const [slipFiles, setSlipFiles] = useState<File[]>([]);
    const [slipPreviews, setSlipPreviews] = useState<string[]>([]);
    const [slipError, setSlipError] = useState("");
    const [isCompressing, setIsCompressing] = useState(false);
    const [enrollNote, setEnrollNote] = useState("");
    const [duration, setDuration] = useState<"5_years" | "lifetime">("5_years");
    const [submitting, setSubmitting] = useState<"approved" | "pending" | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [uSnap, eSnap, cSnap] = await Promise.all([
                // ไม่ orderBy เพื่อให้สมาชิกเก่าที่ยังไม่มี createdAt ติดมาด้วย แล้วค่อยเรียงฝั่งเรา
                getDocs(query(collection(db, "users"), limit(USERS_CAP))),
                getDocs(query(collection(db, "enrollments"), orderBy("createdAt", "desc"))),
                getDocs(query(collection(db, "courses"), orderBy("createdAt", "desc"))),
            ]);

            setCapped(uSnap.size >= USERS_CAP);
            setMembers(uSnap.docs.map((d) => {
                const data = d.data() as Record<string, unknown>;
                const created = data.createdAt as { toDate?: () => Date } | undefined;
                return {
                    id: d.id,
                    displayName: (data.displayName as string) || "",
                    email: (data.email as string) || "",
                    phoneNumber: (data.phoneNumber as string) || "",
                    adminNote: (data.adminNote as string) || "",
                    authProvider: (data.authProvider as string) || "",
                    avatar: (data.avatar as string) || "",
                    createdAtMs: created?.toDate ? created.toDate().getTime() : 0,
                };
            }));
            setEnrollments(eSnap.docs.map((d) => {
                const data = d.data() as Record<string, unknown>;
                const created = data.createdAt as { toDate?: () => Date } | undefined;
                return {
                    id: d.id,
                    userId: data.userId as string,
                    userEmail: data.userEmail as string,
                    courseId: data.courseId as string,
                    courseTitle: data.courseTitle as string,
                    status: data.status as string,
                    createdAtMs: created?.toDate ? created.toDate().getTime() : 0,
                };
            }));
            setCourses(cSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CourseLite, "id">) })));
        } catch (err) {
            console.error("registrations fetch failed:", err);
            toast.error("โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชอีกครั้ง");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // enrollment ของแต่ละคน — จับคู่ด้วย userId เป็นหลัก เผื่อด้วยอีเมล (บัญชีเก่า)
    const enrollmentsOf = useMemo(() => {
        const byUid = new Map<string, Enr[]>();
        const byEmail = new Map<string, Enr[]>();
        for (const e of enrollments) {
            if (e.userId) { const a = byUid.get(e.userId) || []; a.push(e); byUid.set(e.userId, a); }
            const em = (e.userEmail || "").toLowerCase();
            if (em) { const a = byEmail.get(em) || []; a.push(e); byEmail.set(em, a); }
        }
        return (m: Member): Enr[] => {
            const seen = new Set<string>();
            const out: Enr[] = [];
            for (const e of [...(byUid.get(m.id) || []), ...(byEmail.get((m.email || "").toLowerCase()) || [])]) {
                if (!seen.has(e.id)) { seen.add(e.id); out.push(e); }
            }
            return out;
        };
    }, [enrollments]);

    const statusOf = useCallback((m: Member): MemberStatus => {
        const list = enrollmentsOf(m);
        if (list.some((e) => e.status === "approved")) return "approved";
        if (list.some((e) => e.status === "pending")) return "pending";
        return "none";
    }, [enrollmentsOf]);

    const counts = useMemo(() => {
        const c = { all: members.length, none: 0, pending: 0, approved: 0 };
        for (const m of members) c[statusOf(m)]++;
        return c;
    }, [members, statusOf]);

    const filtered = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return members
            .filter((m) => statusFilter === "all" || statusOf(m) === statusFilter)
            .filter((m) => !term
                || (m.displayName || "").toLowerCase().includes(term)
                || (m.email || "").toLowerCase().includes(term)
                || (m.phoneNumber || "").includes(term))
            .sort((a, b) => (b.createdAtMs - a.createdAtMs) || (a.email || "").localeCompare(b.email || ""));
    }, [members, searchTerm, statusFilter, statusOf]);

    const selected = useMemo(() => members.find((m) => m.id === selectedId) || null, [members, selectedId]);

    // เปลี่ยนคน → รีเซ็ตร่างหมายเหตุ + ฟอร์มลงทะเบียน (prefill ชื่อ/เบอร์จากโปรไฟล์)
    useEffect(() => {
        if (!selected) return;
        setNoteDraft(selected.adminNote || "");
        setEnrollName(selected.displayName || "");
        setEnrollPhone(selected.phoneNumber || "");
        setSelCourses([]);
        setSlipPreviews((prev) => { prev.forEach((u) => URL.revokeObjectURL(u)); return []; });
        setSlipFiles([]);
        setSlipError("");
        setEnrollNote("");
        setDuration("5_years");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId]);

    // ── บันทึกหมายเหตุประจำคน (users/{uid}.adminNote) ──
    const saveNote = async () => {
        if (!selected) return;
        setNoteSaving(true);
        try {
            await updateDoc(doc(db, "users", selected.id), {
                adminNote: noteDraft.trim(),
                adminNoteUpdatedAt: serverTimestamp(),
            });
            setMembers((prev) => prev.map((m) => (m.id === selected.id ? { ...m, adminNote: noteDraft.trim() } : m)));
            toast.success("บันทึกหมายเหตุแล้ว");
        } catch (err) {
            console.error(err);
            toast.error("บันทึกหมายเหตุไม่สำเร็จ");
        } finally {
            setNoteSaving(false);
        }
    };

    // ── แนบสลิป (ตัวช่วยเดียวกับหน้าแจ้งโอนของนักเรียน) ──
    const addFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setSlipError("");
        const room = MAX_SLIPS - slipFiles.length;
        if (room <= 0) { setSlipError(`แนบสลิปได้สูงสุด ${MAX_SLIPS} รูป`); return; }
        setIsCompressing(true);
        try {
            const prepared: File[] = [];
            for (const f of Array.from(files).slice(0, room)) {
                const prep = await prepareSlipImage(f);
                if (prep.ok) prepared.push(prep.file);
                else setSlipError(slipPrepErrorText(prep.reason));
            }
            if (prepared.length) {
                setSlipFiles((prev) => [...prev, ...prepared]);
                setSlipPreviews((prev) => [...prev, ...prepared.map((f) => URL.createObjectURL(f))]);
            }
        } finally {
            setIsCompressing(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const removeSlip = (idx: number) => {
        setSlipPreviews((prev) => { const u = prev[idx]; if (u) URL.revokeObjectURL(u); return prev.filter((_, i) => i !== idx); });
        setSlipFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    const toggleCourse = (id: string) =>
        setSelCourses((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    // ── สร้างใบลงทะเบียนให้คนนี้ (อนุมัติเลย หรือบันทึกรอตรวจ) ──
    const submitEnroll = async (mode: "approved" | "pending") => {
        if (!selected) return;
        if (selCourses.length === 0) { toast.error("เลือกคอร์สอย่างน้อย 1 คอร์สก่อน"); return; }
        if (!enrollName.trim()) { toast.error("กรอกชื่อผู้เรียนก่อน (ใช้แสดงในทะเบียน)"); return; }

        setSubmitting(mode);
        try {
            // 1) อัปโหลดสลิปที่ครูแนบแทน (ถ้ามี) — ตั้งชื่อไฟล์ขึ้นต้นด้วย uid นักเรียน
            //    ตาม pattern เดิม เพื่อให้ทั้งครูและเจ้าของบัญชีเปิดดูได้ตาม storage.rules
            const slipUrls: string[] = [];
            for (let i = 0; i < slipFiles.length; i++) {
                const r = storageRef(storage, `slips/${selected.id}_${Date.now()}_admin${i}`);
                await uploadBytes(r, slipFiles[i], { contentType: slipContentType(slipFiles[i]) });
                slipUrls.push(await getDownloadURL(r));
            }

            // 2) สร้าง enrollment ต่อคอร์ส (ข้ามคอร์สที่อนุมัติไปแล้ว)
            const already = new Set(
                enrollmentsOf(selected).filter((e) => e.status === "approved").map((e) => e.courseId),
            );
            const now = new Date();
            const expiryDate = new Date(now);
            expiryDate.setFullYear(now.getFullYear() + (duration === "lifetime" ? 100 : 5));
            const accessType = duration === "lifetime" ? "lifetime" : "limited";

            const created: string[] = [];
            const skipped: string[] = [];
            for (const courseId of selCourses) {
                const c = courses.find((x) => x.id === courseId);
                const title = c?.title || "ไม่ระบุชื่อคอร์ส";
                if (already.has(courseId)) { skipped.push(title); continue; }
                await addDoc(collection(db, "enrollments"), {
                    userId: selected.id,
                    userName: enrollName.trim(),
                    userTel: enrollPhone.trim(),
                    lineId: "",
                    userEmail: selected.email || "",
                    courseId,
                    courseTitle: title,
                    allowedExamLevel: c?.allowedExamLevel ?? null,
                    price: Number(c?.price) || 0,
                    couponCode: null,
                    discountAmount: 0,
                    finalPrice: Number(c?.price) || 0,
                    slipUrl: slipUrls[0] || null,
                    slipUrls,
                    status: mode,
                    createdAt: now,
                    createdByAdmin: true,
                    adminNote: enrollNote.trim() || null,
                    ...(mode === "approved" ? { approvedAt: now, expiryDate, accessType } : {}),
                });
                created.push(title);
            }

            // 3) ชื่อ/เบอร์ที่ครูเพิ่งกรอก → เก็บกลับเข้าโปรไฟล์ ถ้าโปรไฟล์ยังว่าง
            //    (คนสมัครยุคก่อนไม่มีชื่อ — จะได้ค้นเจอในอนาคต)
            const profilePatch: Record<string, string> = {};
            if (!selected.displayName && enrollName.trim()) profilePatch.displayName = enrollName.trim();
            if (!selected.phoneNumber && enrollPhone.trim()) profilePatch.phoneNumber = enrollPhone.trim();
            if (Object.keys(profilePatch).length) {
                try { await updateDoc(doc(db, "users", selected.id), profilePatch); } catch { /* non-blocking */ }
            }

            // 4) อนุมัติแล้ว → อัปเดตตัวเลข "นักเรียนทั้งหมด" หน้าเว็บ (best-effort)
            if (mode === "approved" && created.length > 0) {
                try {
                    const snap = await getDocs(query(collection(db, "enrollments"), where("status", "==", "approved")));
                    const emails = new Set<string>();
                    snap.docs.forEach((d) => { const em = d.data().userEmail; if (em) emails.add(em); });
                    await setDoc(doc(db, "public_stats", "enrollments"), { count: emails.size || snap.size }, { merge: true });
                } catch (e) { console.warn("public_stats update failed (non-blocking):", e); }
            }

            if (created.length > 0) {
                toast.success(mode === "approved"
                    ? `อนุมัติแล้ว ${created.length} คอร์ส — เข้าเรียนได้ทันที`
                    : `บันทึกแล้ว ${created.length} คอร์ส — ไปโผล่ที่ "ตรวจสอบชำระเงิน"`);
            }
            if (skipped.length > 0) toast(`ข้าม ${skipped.length} คอร์สที่มีสิทธิ์เรียนอยู่แล้ว`, { icon: "ℹ️" });

            if (mode === "pending") refreshPendingCount();
            await fetchData();
        } catch (err) {
            console.error(err);
            toast.error("ดำเนินการไม่สำเร็จ ลองอีกครั้ง");
        } finally {
            setSubmitting(null);
        }
    };

    // ── เปิดแชทกับคนนี้ (สร้างห้องถ้ายังไม่มี — แบบเดียวกับหน้าตรวจสลิป) ──
    const openChat = async (m: Member) => {
        try {
            await setDoc(doc(db, "chats", m.id), {
                userId: m.id,
                userName: m.displayName || m.email || "Student",
                userEmail: m.email || "",
                userTel: m.phoneNumber || "",
                lastUpdated: serverTimestamp(),
            }, { merge: true });
            window.location.href = `/admin/chat?chatId=${m.id}`;
        } catch (err) {
            console.error(err);
            toast.error("เปิดแชทไม่สำเร็จ");
        }
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    {([
                        ["all", `ทั้งหมด (${counts.all})`],
                        ["none", `ยังไม่แจ้งโอน (${counts.none})`],
                        ["pending", `รอตรวจสลิป (${counts.pending})`],
                        ["approved", `เรียนอยู่ (${counts.approved})`],
                    ] as const).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setStatusFilter(key)}
                            className="kh-pill no-dot cursor-pointer"
                            style={statusFilter === key
                                ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                                : undefined}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={fetchData} className="kh-btn-ghost" title="โหลดข้อมูลใหม่">
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                    <Link href="/admin/enrollments" className="kh-btn-ghost"><Wallet size={16} /> ตรวจสอบชำระเงิน</Link>
                    <Link href="/admin/students" className="kh-btn-ghost"><Users size={16} /> ทะเบียนนักเรียน</Link>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-3)" }} />
                <input
                    className="kh-input !pl-10"
                    placeholder="ค้นหาชื่อ / อีเมล / เบอร์โทร..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {capped && (
                <div className="kh-card p-3 text-sm" style={{ color: "var(--warn)" }}>
                    ⚠️ สมาชิกเกิน {USERS_CAP.toLocaleString()} บัญชี — แสดงบางส่วน ใช้ช่องค้นหาช่วยหาคนที่ต้องการ
                </div>
            )}

            {loading ? (
                <div className="kh-card p-10 text-center flex items-center justify-center gap-2" style={{ color: "var(--ink-3)" }}>
                    <Loader2 size={18} className="animate-spin" /> กำลังโหลดสมาชิก...
                </div>
            ) : filtered.length === 0 ? (
                <div className="kh-card p-16 flex flex-col items-center gap-3 text-center" style={{ color: "var(--ink-3)" }}>
                    <UserX size={40} />
                    <p className="font-bold kh-ink2">ไม่พบสมาชิกตามเงื่อนไข</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">

                    {/* ===== ซ้าย: รายชื่อสมาชิก ===== */}
                    <div className="kh-card p-3 space-y-1.5 lg:max-h-[calc(100vh-260px)] lg:overflow-y-auto">
                        {filtered.map((m) => {
                            const st = statusOf(m);
                            const isActive = m.id === selectedId;
                            const title = m.displayName || m.email || "ไม่ระบุชื่อ";
                            const initial = title.trim().charAt(0).toUpperCase();
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setSelectedId(m.id)}
                                    className="w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition"
                                    style={{
                                        background: isActive ? "var(--accent-soft)" : "transparent",
                                        borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                                    }}
                                >
                                    <span className="kh-avatar w-9 h-9 text-sm flex-shrink-0">{initial}</span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block font-bold kh-ink truncate text-sm">{title}</span>
                                        <span className="block text-xs kh-ink3 truncate">
                                            {m.displayName ? m.email : (m.createdAtMs > 0 ? fmtDate(m.createdAtMs) : "สมาชิกรุ่นก่อน")}
                                        </span>
                                    </span>
                                    <span className={`kh-pill no-dot !text-[10px] !px-1.5 !py-0.5 flex-shrink-0 ${STATUS_META[st].pill}`}>
                                        {STATUS_META[st].label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* ===== ขวา: รายละเอียด + เครื่องมือ ===== */}
                    {!selected ? (
                        <div className="kh-card p-16 flex flex-col items-center gap-3 text-center" style={{ color: "var(--ink-3)" }}>
                            <GraduationCap size={40} />
                            <p className="font-bold kh-ink2">เลือกสมาชิกจากรายชื่อด้านซ้าย</p>
                            <p className="text-sm">ดูข้อมูล จดหมายเหตุ แนบสลิปแทน หรือลงทะเบียนคอร์สให้ได้จากตรงนี้</p>
                        </div>
                    ) : (() => {
                        const st = statusOf(selected);
                        const myEnrs = enrollmentsOf(selected).sort((a, b) => b.createdAtMs - a.createdAtMs);
                        return (
                            <div className="space-y-4 min-w-0">

                                {/* หัวโปรไฟล์ */}
                                <div className="kh-card p-5">
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <span className="kh-avatar w-12 h-12 text-lg flex-shrink-0">
                                            {(selected.displayName || selected.email || "?").trim().charAt(0).toUpperCase()}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-lg font-black kh-ink truncate">{selected.displayName || "ไม่ระบุชื่อ"}</div>
                                            <div className="text-sm kh-ink3 truncate flex items-center gap-1.5"><Mail size={13} /> {selected.email || "-"}</div>
                                        </div>
                                        <span className={`kh-pill ${STATUS_META[st].pill}`}>{STATUS_META[st].label}</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
                                        <div className="flex items-center gap-2 kh-ink2">
                                            <Phone size={14} style={{ color: "var(--ink-3)" }} />
                                            {selected.phoneNumber
                                                ? <a href={`tel:${selected.phoneNumber}`} className="font-bold kh-ink hover:underline">{selected.phoneNumber}</a>
                                                : <span className="kh-ink3">ไม่มีเบอร์โทร</span>}
                                        </div>
                                        <div className="flex items-center gap-2 kh-ink2">
                                            <Calendar size={14} style={{ color: "var(--ink-3)" }} />
                                            สมัครเมื่อ <span className="font-bold kh-ink">{fmtDate(selected.createdAtMs)}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <button type="button" onClick={() => openChat(selected)} className="kh-btn-ghost text-sm">
                                            <MessageCircle size={15} /> ทักแชทหาคนนี้
                                        </button>
                                    </div>
                                </div>

                                {/* หมายเหตุของครู */}
                                <div className="kh-card p-5">
                                    <div className="kh-eyebrow mb-2 flex items-center gap-1.5"><StickyNote size={14} /> หมายเหตุของครู (เห็นเฉพาะแอดมิน)</div>
                                    <textarea
                                        className="kh-input min-h-[76px] resize-y"
                                        placeholder={`เช่น "โทรแล้ว 1 ส.ค. — โอนแล้วแต่แนบสลิปไม่ได้ ให้ส่งมาทาง LINE"`}
                                        value={noteDraft}
                                        onChange={(e) => setNoteDraft(e.target.value)}
                                    />
                                    <div className="flex justify-end mt-2">
                                        <button
                                            type="button"
                                            onClick={saveNote}
                                            disabled={noteSaving || noteDraft.trim() === (selected.adminNote || "")}
                                            className="kh-btn text-sm disabled:opacity-50"
                                        >
                                            {noteSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} บันทึกหมายเหตุ
                                        </button>
                                    </div>
                                </div>

                                {/* คอร์สที่มีอยู่ */}
                                <div className="kh-card p-5">
                                    <div className="kh-eyebrow mb-3 flex items-center gap-1.5"><GraduationCap size={14} /> คอร์สของคนนี้ ({myEnrs.length})</div>
                                    {myEnrs.length === 0 ? (
                                        <p className="text-sm kh-ink3">ยังไม่มีรายการเลย — สมัครสมาชิกแล้ว แต่ยังไม่ได้แจ้งโอน/ยังไม่ได้รับคอร์ส</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {myEnrs.map((e) => (
                                                <div key={e.id} className="flex items-center gap-3 text-sm rounded-xl px-3 py-2" style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}>
                                                    <span className="flex-1 min-w-0 font-semibold kh-ink truncate">{e.courseTitle || "-"}</span>
                                                    <span className="text-xs kh-ink3 flex-shrink-0">{e.createdAtMs > 0 ? fmtDate(e.createdAtMs) : ""}</span>
                                                    <span className={`kh-pill no-dot !text-[10px] !px-1.5 !py-0.5 flex-shrink-0 ${e.status === "approved" ? "kh-pill-good" : e.status === "pending" ? "kh-pill-warn" : "kh-pill-ink"}`}>
                                                        {e.status === "approved" ? "เรียนอยู่" : e.status === "pending" ? "รอตรวจ" : e.status || "-"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* ลงทะเบียนคอร์สให้ */}
                                <div className="kh-card p-5 space-y-4">
                                    <div className="kh-eyebrow flex items-center gap-1.5"><ImagePlus size={14} /> ลงทะเบียน / แนบสลิปแทนคนนี้</div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-bold kh-ink2 block mb-1">ชื่อผู้เรียน (แสดงในทะเบียน) *</label>
                                            <input className="kh-input" value={enrollName} onChange={(e) => setEnrollName(e.target.value)} placeholder="เช่น ด.ช. ภูริช ใจดี" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold kh-ink2 block mb-1">เบอร์โทร</label>
                                            <input className="kh-input" value={enrollPhone} onChange={(e) => setEnrollPhone(e.target.value)} placeholder="08x-xxx-xxxx" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold kh-ink2 block mb-1.5">เลือกคอร์ส * <span className="font-normal kh-ink3">({selCourses.length} คอร์ส)</span></label>
                                        <div className="max-h-52 overflow-y-auto rounded-xl p-2 space-y-1" style={{ border: "1px solid var(--line)", background: "var(--card-2)" }}>
                                            {courses.map((c) => {
                                                const on = selCourses.includes(c.id);
                                                return (
                                                    <button key={c.id} type="button" onClick={() => toggleCourse(c.id)}
                                                        className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition"
                                                        style={{
                                                            background: on ? "var(--good-soft)" : "transparent",
                                                            border: `1px solid ${on ? "color-mix(in srgb, var(--good) 35%, transparent)" : "transparent"}`,
                                                        }}>
                                                        <span className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-white text-xs"
                                                            style={on ? { background: "var(--good)" } : { border: "2px solid var(--line-2)", background: "transparent" }}>
                                                            {on && "✓"}
                                                        </span>
                                                        <span className="flex-1 text-sm font-semibold kh-ink2 truncate">{c.title}</span>
                                                        <span className="text-xs kh-ink3 flex-shrink-0 kh-num">{Number(c.price || 0).toLocaleString()}฿</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* แนบสลิปแทน (ไม่บังคับ) */}
                                    <div>
                                        <label className="text-xs font-bold kh-ink2 block mb-1.5">
                                            สลิปโอนเงิน <span className="font-normal kh-ink3">(ไม่บังคับ — กรณีนักเรียนส่งมาทาง LINE ครูแนบแทนได้)</span>
                                        </label>
                                        {slipError && (
                                            <div className="mb-2 rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>⚠️ {slipError}</div>
                                        )}
                                        <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={(e) => addFiles(e.target.files)} className="hidden" id="admin-slip-upload" />
                                        <div className="flex flex-wrap gap-2">
                                            {slipPreviews.map((src, i) => (
                                                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden" style={{ border: "2px solid color-mix(in srgb, var(--accent) 40%, transparent)" }}>
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={src} alt={`สลิป ${i + 1}`} className="w-full h-full object-cover" />
                                                    <button type="button" onClick={() => removeSlip(i)} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center" style={{ background: "var(--danger)" }}>✕</button>
                                                </div>
                                            ))}
                                            {slipFiles.length < MAX_SLIPS && (
                                                <label htmlFor="admin-slip-upload" className="w-20 h-20 rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer text-xs font-semibold kh-ink3" style={{ border: "2px dashed var(--line-2)" }}>
                                                    {isCompressing ? <Loader2 size={16} className="animate-spin" /> : <><ImagePlus size={16} /> แนบรูป</>}
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold kh-ink2 block mb-1">หมายเหตุแนบใบลงทะเบียน <span className="font-normal kh-ink3">(ไม่บังคับ)</span></label>
                                        <input className="kh-input" value={enrollNote} onChange={(e) => setEnrollNote(e.target.value)} placeholder={`เช่น "โอนแล้ว 31 ก.ค. ยอด 790 — สลิปส่งมาทาง LINE"`} />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold kh-ink2 block mb-1">ระยะเวลาเรียน</label>
                                        <select className="kh-select" value={duration} onChange={(e) => setDuration(e.target.value as "5_years" | "lifetime")}>
                                            <option value="5_years">5 ปี (ค่าเริ่มต้น)</option>
                                            <option value="lifetime">ตลอดชีพ</option>
                                        </select>
                                    </div>

                                    <div className="flex gap-3 flex-wrap pt-1">
                                        <button
                                            type="button"
                                            onClick={() => submitEnroll("approved")}
                                            disabled={submitting !== null || isCompressing}
                                            className="kh-btn flex-[2] disabled:opacity-50"
                                        >
                                            {submitting === "approved" ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                            อนุมัติเข้าเรียนเลย
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => submitEnroll("pending")}
                                            disabled={submitting !== null || isCompressing}
                                            className="kh-btn-ghost flex-1 disabled:opacity-50"
                                        >
                                            {submitting === "pending" ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
                                            บันทึกรอตรวจ
                                        </button>
                                    </div>
                                    <p className="text-xs kh-ink3">
                                        &ldquo;อนุมัติเข้าเรียนเลย&rdquo; = เปิดสิทธิ์ทันที • &ldquo;บันทึกรอตรวจ&rdquo; = สร้างรายการไว้ที่หน้า
                                        {" "}<Link href="/admin/enrollments" className="underline font-semibold">ตรวจสอบชำระเงิน</Link> เพื่อตรวจสลิปตามปกติ
                                    </p>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
