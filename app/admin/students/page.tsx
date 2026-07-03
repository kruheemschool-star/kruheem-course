"use client";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, deleteDoc, updateDoc, where, getDoc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { Search, Edit3, Trash2, Eye, Phone, MessageCircle, ChevronLeft, ChevronRight, GraduationCap, X, UserX, Loader2, Users, PauseCircle, CalendarX } from "lucide-react";
import { useUserAuth } from "@/context/AuthContext";
import { useConfirmModal } from "@/hooks/useConfirmModal";

// Session-scoped cache of users/{uid} profile reads. Every table refresh
// (initial load, after each approve/edit/delete, paging) remounts the rows,
// and each UserAvatar used to getDoc() its user again — ~30 reads per
// refresh, hundreds per admin session. Caching the promise dedupes to at
// most ONE read per distinct user per page session.
const userProfileCache = new Map<string, Promise<{ avatar: string | null; authProvider: string | null }>>();
const fetchUserProfile = (userId: string) => {
    let cached = userProfileCache.get(userId);
    if (!cached) {
        cached = getDoc(doc(db, "users", userId)).then(snap => {
            if (!snap.exists()) return { avatar: null, authProvider: null };
            const data = snap.data();
            return {
                avatar: (data.avatar as string) || null,
                authProvider: (data.authProvider as string) || null,
            };
        }).catch(err => {
            console.error(err);
            userProfileCache.delete(userId); // allow retry next mount
            return { avatar: null, authProvider: null };
        });
        userProfileCache.set(userId, cached);
    }
    return cached;
};

// Hoisted so it isn't re-created on every UserAvatar render
// (react-hooks/static-components).
const AvatarImage = ({ avatar, imageError, name, onImageError }: {
    avatar: string | null; imageError: boolean; name?: string; onImageError: () => void;
}) => {
    if (avatar && !imageError) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={avatar}
                alt={name || "User"}
                className="w-8 h-8 rounded-full object-cover"
                onError={onImageError}
            />
        );
    }
    return (
        <div className="kh-avatar w-8 h-8 !rounded-full text-sm">
            {name?.charAt(0).toUpperCase() || "?"}
        </div>
    );
};

// User Avatar Component with Auth Provider
const UserAvatar = ({ userId, name, email }: { userId?: string, name?: string, email?: string }) => {
    const [avatar, setAvatar] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    const [fetchedProvider, setFetchedProvider] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        fetchUserProfile(userId).then(profile => {
            if (cancelled) return;
            if (profile.avatar) {
                setAvatar(profile.avatar);
                setImageError(false);
            }
            if (profile.authProvider) setFetchedProvider(profile.authProvider);
        });
        return () => { cancelled = true; };
    }, [userId]);

    // Derived during render (no setState-in-effect): the stored provider wins,
    // otherwise infer from the email domain — same display logic as before.
    const authProvider = fetchedProvider
        || (email ? (email.endsWith('@gmail.com') ? 'google' : 'email') : null);

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <AvatarImage avatar={avatar} imageError={imageError} name={name} onImageError={() => setImageError(true)} />
                {authProvider && (
                    <span className={`kh-pill no-dot !text-[10px] !px-1.5 !py-0.5 ${authProvider === 'google' ? 'kh-pill-accent' : 'kh-pill-ink'}`}>
                        {authProvider === 'google' ? (
                            <span className="flex items-center gap-1">
                                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Google
                            </span>
                        ) : (
                            <span className="flex items-center gap-1">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Email
                            </span>
                        )}
                    </span>
                )}
            </div>
        </div>
    );
};

const ITEMS_PER_PAGE = 30;

export default function AdminStudentsPage() {
    const { user, refreshPendingCount } = useUserAuth();
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [filteredEnrollments, setFilteredEnrollments] = useState<any[]>([]);
    const [allCourses, setAllCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [courseFilter, setCourseFilter] = useState("All");
    const [courseList, setCourseList] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [slipModalUrl, setSlipModalUrl] = useState<string | null>(null);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();
    const [unifying, setUnifying] = useState(false);

    const fetchData = async () => {
        try {
            const qEnroll = query(collection(db, "enrollments"), orderBy("createdAt", "desc"));
            const snapshotEnroll = await getDocs(qEnroll);
            const data = snapshotEnroll.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                formattedDate: doc.data().createdAt?.toDate?.()
                    ? doc.data().createdAt.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
                    : '-',
                formattedApprovedDate: doc.data().approvedAt?.toDate?.()
                    ? doc.data().approvedAt.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
                    : null
            }));
            setEnrollments(data);
            setFilteredEnrollments(data);
            const coursesFromEnrollments = Array.from(new Set(data.map((item: any) => item.courseTitle).filter(Boolean)));
            setCourseList(coursesFromEnrollments as string[]);

            const qCourses = query(collection(db, "courses"), orderBy("createdAt", "desc"));
            const snapshotCourses = await getDocs(qCourses);
            setAllCourses(snapshotCourses.docs.map(doc => ({ id: doc.id, title: doc.data().title })));
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // One-time admin tool: unify every exam-bank enrollment's courseTitle to
    // the single canonical "คลังข้อสอบ" so the admin filter shows one group
    // and the count is in one place. Reads nothing extra (uses the already
    // in-memory `enrollments`); writes ONLY the `courseTitle` field, and ONLY
    // on docs whose title already contains "คลังข้อสอบ" (so ExamAccessGuard's
    // substring access stays valid) and is not already exactly "คลังข้อสอบ"
    // (idempotent). courseId / status / expiryDate / accessType / userId are
    // never touched → video access, expiry and login are all unaffected.
    const CANON_TITLE = "คลังข้อสอบ";
    const EXCLUDE_TITLES: string[] = []; // add a title here ONLY if it contains "คลังข้อสอบ" but is a different product

    const handleUnifyExamBankTitles = () => {
        const scoped = enrollments.filter((e: any) =>
            typeof e.courseTitle === "string" &&
            e.courseTitle.includes(CANON_TITLE) &&
            e.courseTitle !== CANON_TITLE &&
            !EXCLUDE_TITLES.includes(e.courseTitle)
        );
        const counts: Record<string, number> = {};
        scoped.forEach((e: any) => { counts[e.courseTitle] = (counts[e.courseTitle] || 0) + 1; });
        const variants = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const total = scoped.length;

        if (total === 0) {
            confirmModal(
                "ไม่มีรายการที่ต้องรวม",
                <p className="text-sm">ทุกใบที่เป็นคลังข้อสอบมีชื่อ &ldquo;{CANON_TITLE}&rdquo; เรียบร้อยแล้ว — ไม่มีอะไรต้องแก้</p>,
                () => { },
                false
            );
            return;
        }

        confirmModal(
            "รวมชื่อคอร์สคลังข้อสอบให้เป็นชื่อเดียว",
            <div className="text-left text-sm space-y-2">
                <p>จะเปลี่ยน <b>เฉพาะ &ldquo;ชื่อคอร์ส&rdquo;</b> ของรายการเหล่านี้ให้เป็น <b>&ldquo;{CANON_TITLE}&rdquo;</b>:</p>
                <ul className="list-disc pl-5 space-y-1 max-h-48 overflow-y-auto">
                    {variants.map(([t, c]) => (
                        <li key={t}><span className="font-mono">{t}</span> — <b>{c}</b> ใบ</li>
                    ))}
                </ul>
                <p className="font-bold">รวมทั้งหมด {total} ใบ</p>
                <p className="text-xs text-slate-500">
                    ไม่แตะ courseId / สถานะ / วันหมดอายุ → คนเก่าทุกคนยังเข้าคลังข้อสอบและเรียนได้เหมือนเดิม
                    (ชื่อใหม่ยังมีคำว่า &ldquo;คลังข้อสอบ&rdquo;) · คอร์สอื่นไม่ถูกแตะ · กดซ้ำได้ปลอดภัย
                </p>
            </div>,
            async () => {
                setUnifying(true);
                try {
                    const CHUNK = 400;
                    let done = 0;
                    for (let i = 0; i < scoped.length; i += CHUNK) {
                        const batch = writeBatch(db);
                        for (const e of scoped.slice(i, i + CHUNK)) {
                            batch.update(doc(db, "enrollments", e.id), { courseTitle: CANON_TITLE });
                        }
                        await batch.commit();
                        done += Math.min(CHUNK, scoped.length - i);
                    }
                    await fetchData();
                    alert(`รวมชื่อสำเร็จ — แก้ ${done} ใบให้เป็น "${CANON_TITLE}"`);
                } catch (err) {
                    console.error("Unify exam-bank titles failed:", err);
                    alert("เกิดข้อผิดพลาดระหว่างรวมชื่อ — บางใบอาจยังไม่ถูกแก้ กดอีกครั้งได้ (ปลอดภัย/ทำซ้ำได้)");
                } finally {
                    setUnifying(false);
                }
            },
            false
        );
    };

    useEffect(() => {
        let result = enrollments;
        if (courseFilter !== "All") {
            result = result.filter(item => item.courseTitle === courseFilter);
        }
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(item =>
                (item.userName?.toLowerCase().includes(lowerTerm)) ||
                (item.userEmail?.toLowerCase().includes(lowerTerm)) ||
                (item.userTel?.includes(lowerTerm)) ||
                (item.courseTitle?.toLowerCase().includes(lowerTerm))
            );
        }
        setFilteredEnrollments(result);
        setCurrentPage(1);
    }, [searchTerm, courseFilter, enrollments]);

    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = filteredEnrollments.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredEnrollments.length / ITEMS_PER_PAGE);

    // Stat chips — derived from real enrollment data already in memory.
    const isExpiredEnrollment = (item: any) => {
        if (item.status !== 'approved') return false;
        if (item.accessType === 'lifetime') return false;
        if (!item.expiryDate) return false;
        const expiry = new Date(item.expiryDate.seconds ? item.expiryDate.seconds * 1000 : item.expiryDate);
        return expiry < new Date();
    };
    const stats = {
        total: enrollments.length,
        learning: enrollments.filter(e => e.status === 'approved' && !isExpiredEnrollment(e)).length,
        suspended: enrollments.filter(e => e.status === 'suspended').length,
        expired: enrollments.filter(e => isExpiredEnrollment(e)).length,
    };
    const statChips = [
        { label: "ทั้งหมด", value: stats.total, icon: Users, tone: "var(--accent)", soft: "var(--accent-soft)" },
        { label: "กำลังเรียน", value: stats.learning, icon: GraduationCap, tone: "var(--good)", soft: "var(--good-soft)" },
        { label: "พักการเรียน", value: stats.suspended, icon: PauseCircle, tone: "var(--warn)", soft: "var(--warn-soft)" },
        { label: "หมดอายุ", value: stats.expired, icon: CalendarX, tone: "var(--danger)", soft: "var(--danger-soft)" },
    ];

    // Quick course-filter tabs reuse the existing `courseFilter` state + effect
    // (no new filter logic): "ทุกคอร์ส" + the first few course titles.
    const tabCourses = ["All", ...courseList.slice(0, 4)];

    // Recompute the public student counter from the enrollments already in
    // memory (the table always holds the full collection) instead of
    // re-querying Firestore — the old version re-read every approved
    // enrollment (~600 docs) on every page load AND after every admin action.
    // Same numbers as before: unique userEmail among approved, falling back
    // to the approved row count. Writes only when the value actually changed.
    const lastPublishedCount = useRef<number | null>(null);
    const recalculatePublicStats = async (data: any[]) => {
        try {
            const approved = data.filter(e => e.status === "approved");
            const uniqueEmails = new Set<string>();
            approved.forEach(e => { if (e.userEmail) uniqueEmails.add(e.userEmail); });
            const totalStudents = uniqueEmails.size > 0 ? uniqueEmails.size : approved.length;

            if (lastPublishedCount.current === null) {
                // Seed the comparison from the published doc once (1 read) so a
                // mere page visit doesn't rewrite an unchanged counter.
                const statSnap = await getDoc(doc(db, "public_stats", "enrollments"));
                lastPublishedCount.current = statSnap.exists() ? (statSnap.data().count as number) : -1;
            }
            if (totalStudents === lastPublishedCount.current) return;

            await setDoc(doc(db, "public_stats", "enrollments"), { count: totalStudents }, { merge: true });
            lastPublishedCount.current = totalStudents;
        } catch (error) {
            console.error("Error updating public_stats:", error);
        }
    };

    const handleDelete = async (id: string) => {
        confirmModal("ยืนยันการลบ", "ยืนยันการลบข้อมูลการลงทะเบียนนี้?", async () => {
            await deleteDoc(doc(db, "enrollments", id));
            // fetchData() refreshes the table; the [enrollments] effect then
            // recalculates public_stats from the fresh in-memory data (0 reads).
            fetchData();
            refreshPendingCount(); // may have removed a pending row — recount badge
        }, true);
    };

    const handleDeleteUser = async (item: any) => {
        if (!item.userId) return alert("ไม่พบ User ID สำหรับรายการนี้");
        if (!user) return alert("กรุณาเข้าสู่ระบบก่อน");

        const userName = item.userName || item.userEmail || 'ไม่ระบุ';
        const msg = `⚠️ ลบบัญชีผู้ใช้: ${userName}\nอีเมล: ${item.userEmail || '-'}\n\nการดำเนินการนี้จะ:\n• ลบบัญชี Firebase Authentication\n• ลบข้อมูล Profile ใน Firestore\n• ลบข้อมูลความคืบหน้าการเรียน\n• ลบข้อมูลกิจกรรม\n\n(ข้อมูลการลงทะเบียนจะยังเก็บไว้เป็นหลักฐาน)\n\nยืนยันการลบบัญชีผู้ใช้นี้?`;

        confirmModal("ยืนยันการลบบัญชี", msg, async () => {
            setDeletingUserId(item.userId);
            try {
                const idToken = await user.getIdToken();
                const res = await fetch('/api/admin/delete-user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        userId: item.userId,
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'เกิดข้อผิดพลาด');
                }

                alert(
                    `✅ ลบบัญชีผู้ใช้สำเร็จ\n\n` +
                    `${data.details?.map((d: any) => `• ${d.step}: ${d.status}`).join('\n') || ''}`
                );
                fetchData();
            } catch (err: any) {
                console.error('Delete user error:', err);
                alert(`❌ ลบบัญชีไม่สำเร็จ: ${err.message}`);
            } finally {
                setDeletingUserId(null);
            }
        }, true);
    };

    const handleEdit = (item: any) => {
        let currentCourseId = item.courseId;
        if (!currentCourseId && item.courseTitle) {
            const foundCourse = allCourses.find(c => c.title === item.courseTitle);
            if (foundCourse) currentCourseId = foundCourse.id;
        }
        setEditingItem({ ...item, courseId: currentCourseId || "", lineId: item.lineId || "", userTel: item.userTel || "" });
        setIsEditOpen(true);
    };

    const saveEdit = async () => {
        if (!editingItem) return;
        try {
            await updateDoc(doc(db, "enrollments", editingItem.id), {
                userName: editingItem.userName,
                userEmail: editingItem.userEmail,
                userTel: editingItem.userTel,
                lineId: editingItem.lineId,
                status: editingItem.status,
                courseId: editingItem.courseId,
                courseTitle: editingItem.courseTitle,
                accessType: editingItem.accessType || "limited",
                expiryDate: editingItem.expiryDate || null
            });
            setIsEditOpen(false);
            // fetchData() refreshes the table; the [enrollments] effect then
            // recalculates public_stats from the fresh in-memory data (0 reads).
            fetchData();
            refreshPendingCount(); // status edit may add/remove a pending row — recount badge
        } catch (error) {
            console.error("Error:", error);
        }
    };

    const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCourseId = e.target.value;
        const selectedCourse = allCourses.find(c => c.id === newCourseId);
        if (selectedCourse) {
            setEditingItem({ ...editingItem, courseId: newCourseId, courseTitle: selectedCourse.title });
        }
    };

    const handleMessage = async (item: any) => {
        if (!item.userId) return alert("ไม่พบข้อมูล User ID");
        try {
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
        }
    };

    const getStatusBadge = (item: any) => {
        if (item.status === 'approved') {
            const expiry = item.expiryDate ? new Date(item.expiryDate.seconds ? item.expiryDate.seconds * 1000 : item.expiryDate) : null;
            const isExpired = expiry && expiry < new Date();
            const isLifetime = item.accessType === 'lifetime';

            return (
                <div className="flex flex-col gap-0.5 items-start">
                    <span className={`kh-pill !text-xs ${isExpired ? 'kh-pill-danger' : 'kh-pill-good'}`}>
                        {isExpired ? 'หมดอายุ' : 'เรียนได้'}
                    </span>
                    {isLifetime ? (
                        <span className="text-[10px] kh-ink3">ตลอดชีพ</span>
                    ) : expiry && (
                        <span className="text-[10px] kh-ink3">
                            หมด {expiry.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </span>
                    )}
                </div>
            );
        }
        if (item.status === 'pending') return <span className="kh-pill kh-pill-warn !text-xs">รอตรวจสอบ</span>;
        if (item.status === 'suspended') return <span className="kh-pill kh-pill-warn !text-xs">พักการเรียน</span>;
        return <span className="kh-pill kh-pill-danger !text-xs">ยกเลิก</span>;
    };

    // Auto fix expiry data
    useEffect(() => {
        if (enrollments.length > 0) {
            const needsFix = enrollments.some(item => item.status === 'approved' && (!item.expiryDate || !item.approvedAt));
            if (needsFix) {
                const fixData = async () => {
                    const q = query(collection(db, "enrollments"), where("status", "==", "approved"));
                    const snapshot = await getDocs(q);
                    const updates = [];
                    for (const docSnap of snapshot.docs) {
                        const data = docSnap.data();
                        if (!data.expiryDate || !data.approvedAt) {
                            const upd: any = {};
                            let startDate = data.approvedAt ? data.approvedAt.toDate() : (data.createdAt ? data.createdAt.toDate() : new Date());
                            if (!data.approvedAt) upd.approvedAt = data.createdAt || new Date();
                            if (!data.expiryDate) {
                                const exp = new Date(startDate);
                                exp.setFullYear(exp.getFullYear() + 5);
                                upd.expiryDate = exp;
                                upd.accessType = "limited";
                            }
                            if (Object.keys(upd).length > 0) updates.push(updateDoc(doc(db, "enrollments", docSnap.id), upd));
                        }
                    }
                    if (updates.length > 0) { 
                        await Promise.all(updates); 
                        fetchData(); 
                    }
                };
                fixData();
            }
            
            // Auto sync stats on load / after each table refresh — computed
            // from the in-memory table, writes only when the count changed.
            recalculatePublicStats(enrollments);
        }
    }, [enrollments]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="kh-ink3 flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin" /> กำลังโหลด...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stat chips */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statChips.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className="kh-card p-4 flex items-center justify-between">
                            <div>
                                <p className="kh-ink2 text-xs mb-1">{s.label}</p>
                                <p className="kh-num kh-ink text-2xl leading-none">{s.value}</p>
                            </div>
                            <span
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: s.soft, color: s.tone }}
                            >
                                <Icon size={20} />
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Toolbar: tabs + search + course filter + actions */}
            <div className="kh-card p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    {tabCourses.map((c) => (
                        <button
                            key={c}
                            type="button"
                            className="kh-tab"
                            data-active={courseFilter === c}
                            onClick={() => setCourseFilter(c)}
                        >
                            {c === "All" ? "ทุกคอร์ส" : c}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 kh-ink3" />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อ, เบอร์, อีเมล..."
                            className="kh-input !pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="kh-select md:w-56 cursor-pointer"
                        value={courseFilter}
                        onChange={(e) => setCourseFilter(e.target.value)}
                    >
                        <option value="All">ทุกคอร์ส</option>
                        {courseList.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                    <button
                        onClick={handleUnifyExamBankTitles}
                        disabled={unifying || loading}
                        className="kh-btn-ghost whitespace-nowrap"
                        title='รวมทุกชื่อคอร์สที่มีคำว่า "คลังข้อสอบ" ให้เป็นชื่อเดียว (มี preview ให้ดูก่อนยืนยัน)'
                    >
                        {unifying ? "กำลังรวม..." : "รวมชื่อคลังข้อสอบ"}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="kh-card !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="kh-table">
                        <thead>
                            <tr>
                                <th className="w-12">#</th>
                                <th>นักเรียน</th>
                                <th>ติดต่อ</th>
                                <th>คอร์ส</th>
                                <th>วันที่</th>
                                <th>สถานะ</th>
                                <th className="!text-right w-32"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.map((item, index) => (
                                <tr key={item.id}>
                                    <td className="kh-ink3 text-xs">
                                        {filteredEnrollments.length - ((currentPage - 1) * ITEMS_PER_PAGE + index)}
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <UserAvatar userId={item.userId} name={item.userName} email={item.userEmail} />
                                            <div>
                                                <p className="font-medium kh-ink">{item.userName || "ไม่ระบุ"}</p>
                                                <p className="text-xs kh-ink3">{item.userEmail}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-0.5">
                                            {item.userTel && (
                                                <span className="text-xs kh-ink2 flex items-center gap-1">
                                                    <Phone size={12} /> {item.userTel}
                                                </span>
                                            )}
                                            {item.lineId && <span className="text-xs" style={{ color: "var(--good)" }}>Line: {item.lineId}</span>}
                                            {!item.userTel && !item.lineId && <span className="text-xs kh-ink3">-</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="kh-pill kh-pill-ink no-dot !text-xs">
                                            {item.courseTitle || "-"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="text-xs kh-ink2">{item.formattedDate}</span>
                                            {item.formattedApprovedDate && (
                                                <span className="text-[10px]" style={{ color: "var(--good)" }}>อนุมัติ: {item.formattedApprovedDate}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{getStatusBadge(item)}</td>
                                    <td>
                                        <div className="flex items-center justify-end gap-1">
                                            {item.slipUrl && (
                                                <button onClick={() => setSlipModalUrl(item.slipUrl)} className="p-1.5 rounded-lg transition kh-ink3 hover:bg-[var(--card-2)] hover:text-[var(--accent)]" title="ดูสลิป">
                                                    <Eye size={16} />
                                                </button>
                                            )}
                                            <button onClick={() => handleMessage(item)} className="p-1.5 rounded-lg transition kh-ink3 hover:bg-[var(--card-2)] hover:text-[var(--accent)]" title="ส่งข้อความ">
                                                <MessageCircle size={16} />
                                            </button>
                                            <button onClick={() => handleEdit(item)} className="p-1.5 rounded-lg transition kh-ink3 hover:bg-[var(--card-2)] hover:text-[var(--accent)]" title="แก้ไข">
                                                <Edit3 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg transition kh-ink3 hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]" title="ลบรายการลงทะเบียน">
                                                <Trash2 size={16} />
                                            </button>
                                            {item.userId && (
                                                <button
                                                    onClick={() => handleDeleteUser(item)}
                                                    disabled={deletingUserId === item.userId}
                                                    className="p-1.5 rounded-lg transition kh-ink3 hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] disabled:opacity-50"
                                                    title="ลบบัญชีผู้ใช้ (Auth + Firestore)"
                                                >
                                                    {deletingUserId === item.userId ? <Loader2 size={16} className="animate-spin" /> : <UserX size={16} />}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {currentItems.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="!text-center kh-ink3 py-12">ไม่พบข้อมูล</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-4 py-3 flex items-center justify-between text-sm" style={{ borderTop: "1px solid var(--line)" }}>
                    <span className="kh-ink3">
                        แสดง {filteredEnrollments.length === 0 ? 0 : indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredEnrollments.length)} จาก {filteredEnrollments.length}
                    </span>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                                className="kh-btn-ghost !px-2 !py-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="kh-ink2 px-2">{currentPage} / {totalPages}</span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="kh-btn-ghost !px-2 !py-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {isEditOpen && editingItem && (
                <div className="kh-admin fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="kh-card !p-0 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--line)" }}>
                            <h3 className="font-semibold kh-ink">แก้ไขข้อมูล</h3>
                            <button onClick={() => setIsEditOpen(false)} className="kh-ink3 hover:text-[var(--ink)]">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs kh-ink2 mb-1">ชื่อนักเรียน</label>
                                <input type="text" className="kh-input" value={editingItem.userName} onChange={(e) => setEditingItem({ ...editingItem, userName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs kh-ink2 mb-1">เบอร์โทร</label>
                                <input type="text" className="kh-input" value={editingItem.userTel} onChange={(e) => setEditingItem({ ...editingItem, userTel: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs kh-ink2 mb-1">อีเมล</label>
                                <input type="email" className="kh-input" value={editingItem.userEmail} onChange={(e) => setEditingItem({ ...editingItem, userEmail: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs kh-ink2 mb-1">LINE ID</label>
                                <input type="text" className="kh-input" value={editingItem.lineId} onChange={(e) => setEditingItem({ ...editingItem, lineId: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs kh-ink2 mb-1">คอร์ส</label>
                                <select className="kh-select cursor-pointer" value={editingItem.courseId} onChange={handleCourseChange}>
                                    <option value="" disabled>-- เลือกคอร์ส --</option>
                                    {allCourses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs kh-ink2 mb-1">สถานะ</label>
                                <select className="kh-select cursor-pointer" value={editingItem.status} onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}>
                                    <option value="pending">รอตรวจสอบ</option>
                                    <option value="approved">เรียนได้</option>
                                    <option value="suspended">พักการเรียน</option>
                                    <option value="rejected">ยกเลิก</option>
                                </select>
                            </div>
                            <div className="pt-3" style={{ borderTop: "1px solid var(--line)" }}>
                                <label className="block text-xs kh-ink2 mb-1">ประเภทสิทธิ์</label>
                                <select className="kh-select cursor-pointer mb-3" value={editingItem.accessType || "limited"} onChange={(e) => setEditingItem({ ...editingItem, accessType: e.target.value })}>
                                    <option value="limited">กำหนดวันหมดอายุ</option>
                                    <option value="lifetime">ตลอดชีพ</option>
                                </select>
                                {editingItem.accessType !== 'lifetime' && (
                                    <div>
                                        <label className="block text-xs kh-ink2 mb-1">วันหมดอายุ</label>
                                        <input type="date" className="kh-input" value={editingItem.expiryDate ? new Date(editingItem.expiryDate.seconds ? editingItem.expiryDate.seconds * 1000 : editingItem.expiryDate).toISOString().split('T')[0] : ""} onChange={(e) => setEditingItem({ ...editingItem, expiryDate: new Date(e.target.value) })} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 px-5 py-4" style={{ borderTop: "1px solid var(--line)" }}>
                            <button onClick={() => setIsEditOpen(false)} className="kh-btn-ghost flex-1">ยกเลิก</button>
                            <button onClick={saveEdit} className="kh-btn flex-1">บันทึก</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Slip Modal */}
            {slipModalUrl && (
                <div className="kh-admin fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSlipModalUrl(null)}>
                    <div className="kh-card !p-0 max-w-md w-full overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
                            <span className="text-sm font-medium kh-ink">สลิปการโอนเงิน</span>
                            <button onClick={() => setSlipModalUrl(null)} className="kh-ink3 hover:text-[var(--ink)]">
                                <X size={18} />
                            </button>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={slipModalUrl} alt="Slip" className="w-full" />
                    </div>
                </div>
            )}
            <ConfirmDialog />
        </div>
    );
}
