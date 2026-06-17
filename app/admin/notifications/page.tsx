"use client";
import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, deleteDoc, doc, addDoc } from "firebase/firestore";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { Megaphone, Send, Globe, Target, Pin, BookOpen, Trash2, CheckCircle2, Clock, History, Inbox } from "lucide-react";

export default function NotificationsPage() {
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // ✅ Course Selection State
    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
    const [targetType, setTargetType] = useState<'all' | 'specific'>('all');

    useEffect(() => {
        fetchNotifications();
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const fetchNotifications = async () => {
        try {
            const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        if (targetType === 'specific' && selectedCourseIds.length === 0) {
            return alert("กรุณาเลือกคอร์สอย่างน้อย 1 คอร์ส");
        }

        setSubmitting(true);
        try {
            const notificationData: any = {
                message: message,
                type: "general",
                createdAt: new Date(),
                target: targetType === 'all' ? 'all' : 'specific_courses'
            };

            if (targetType === 'specific') {
                notificationData.targetCourseIds = selectedCourseIds;
            }

            await addDoc(collection(db, "notifications"), notificationData);

            setMessage("");
            setSelectedCourseIds([]);
            setTargetType('all');
            fetchNotifications();
            alert("ส่งประกาศเรียบร้อยแล้ว!");
        } catch (error) {
            console.error("Error sending notification:", error);
            alert("เกิดข้อผิดพลาดในการส่งประกาศ");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        confirmModal("ยืนยันการลบ", "ต้องการลบประกาศนี้ใช่ไหม?", async () => {
            try {
                await deleteDoc(doc(db, "notifications", id));
                fetchNotifications();
            } catch (error) {
                console.error("Error deleting notification:", error);
            }
        }, true);
    };

    const toggleCourseSelection = (courseId: string) => {
        setSelectedCourseIds(prev =>
            prev.includes(courseId)
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        );
    };

    const groupedCourses = useMemo(() => {
        const groups: Record<string, any[]> = {
            "ระดับประถม (ป.6)": [],
            "ระดับมัธยมต้น (ม.1)": [],
            "ระดับมัธยมต้น (ม.2)": [],
            "ระดับมัธยมต้น (ม.3)": [],
            "ระดับมัธยมปลาย (ม.4-6)": [],
            "คอร์สอื่นๆ": []
        };

        courses.forEach(course => {
            const title = course.title || "";
            if (title.includes("ป.6")) groups["ระดับประถม (ป.6)"].push(course);
            else if (title.includes("ม.1")) groups["ระดับมัธยมต้น (ม.1)"].push(course);
            else if (title.includes("ม.2")) groups["ระดับมัธยมต้น (ม.2)"].push(course);
            else if (title.includes("ม.3")) groups["ระดับมัธยมต้น (ม.3)"].push(course);
            else if (title.includes("ม.4") || title.includes("ม.5") || title.includes("ม.6")) groups["ระดับมัธยมปลาย (ม.4-6)"].push(course);
            else groups["คอร์สอื่นๆ"].push(course);
        });

        return Object.entries(groups).filter(([_, list]) => list.length > 0);
    }, [courses]);

    return (
        <div className="space-y-6">
            <div className="kh-eyebrow">
                <Megaphone size={15} strokeWidth={1.9} /> ประกาศข่าวสาร
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* LEFT — Form ส่งประกาศ */}
                <div className="kh-card p-6">
                    <h2 className="text-lg font-bold kh-ink mb-5 flex items-center gap-2">
                        <Send size={18} strokeWidth={1.9} style={{ color: "var(--accent)" }} />
                        สร้างประกาศใหม่
                    </h2>
                    <form onSubmit={handleSendNotification} className="space-y-5">

                        {/* Target Selection */}
                        <div className="space-y-2.5">
                            <label className="block text-sm font-bold kh-ink2">ส่งถึงใคร?</label>
                            <div className="flex gap-3">
                                <label
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition font-bold text-sm"
                                    style={targetType === 'all'
                                        ? { background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent-ink)" }
                                        : { background: "var(--card-2)", borderColor: "var(--line)", color: "var(--ink-3)" }}
                                >
                                    <input type="radio" name="targetType" value="all" checked={targetType === 'all'} onChange={() => setTargetType('all')} className="hidden" />
                                    <Globe size={15} strokeWidth={1.9} /> นักเรียนทุกคน
                                </label>
                                <label
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition font-bold text-sm"
                                    style={targetType === 'specific'
                                        ? { background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent-ink)" }
                                        : { background: "var(--card-2)", borderColor: "var(--line)", color: "var(--ink-3)" }}
                                >
                                    <input type="radio" name="targetType" value="specific" checked={targetType === 'specific'} onChange={() => setTargetType('specific')} className="hidden" />
                                    <Target size={15} strokeWidth={1.9} /> เลือกคอร์สเฉพาะ
                                </label>
                            </div>
                        </div>

                        {/* Course Selection List (Only show if specific) */}
                        {targetType === 'specific' && (
                            <div className="p-4 rounded-xl border animate-in fade-in slide-in-from-top-2" style={{ background: "var(--card-2)", borderColor: "var(--line)" }}>
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                    <p className="kh-eyebrow">เลือกคอร์สที่ต้องการแจ้งเตือน ({selectedCourseIds.length})</p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCourseIds(courses.map(c => c.id))}
                                            className="kh-pill kh-pill-good no-dot"
                                            style={{ cursor: "pointer" }}
                                        >
                                            เลือกทั้งหมด
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCourseIds([])}
                                            className="kh-pill kh-pill-ink no-dot"
                                            style={{ cursor: "pointer" }}
                                        >
                                            ยกเลิกทั้งหมด
                                        </button>
                                    </div>
                                </div>
                                <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar space-y-5">
                                    {groupedCourses.map(([category, items]) => (
                                        <div key={category}>
                                            <div className="flex items-center justify-between mb-2 p-2 rounded-lg border sticky top-0 backdrop-blur-sm z-10" style={{ background: "var(--accent-soft)", borderColor: "var(--line)" }}>
                                                <h4 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--accent-ink)" }}>
                                                    <Pin size={13} strokeWidth={1.9} /> {category} ({items.length})
                                                </h4>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const categoryIds = items.map((c: any) => c.id);
                                                        const allSelected = categoryIds.every((id: string) => selectedCourseIds.includes(id));
                                                        if (allSelected) {
                                                            setSelectedCourseIds(prev => prev.filter(id => !categoryIds.includes(id)));
                                                        } else {
                                                            setSelectedCourseIds(prev => [...new Set([...prev, ...categoryIds])]);
                                                        }
                                                    }}
                                                    className={items.every((c: any) => selectedCourseIds.includes(c.id)) ? "kh-pill kh-pill-accent no-dot" : "kh-pill kh-pill-ink no-dot"}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    {items.every((c: any) => selectedCourseIds.includes(c.id)) ? '✓ เลือกแล้ว' : 'เลือกทั้งกลุ่ม'}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {items.map((course: any) => (
                                                    <label
                                                        key={course.id}
                                                        className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition"
                                                        style={selectedCourseIds.includes(course.id)
                                                            ? { background: "var(--card)", borderColor: "var(--accent)", boxShadow: "var(--shadow-sm)" }
                                                            : { background: "var(--card)", borderColor: "var(--line)" }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedCourseIds.includes(course.id)}
                                                            onChange={() => toggleCourseSelection(course.id)}
                                                            className="w-5 h-5 rounded"
                                                            style={{ accentColor: "var(--accent)" }}
                                                        />
                                                        <span className="text-sm font-medium" style={{ color: selectedCourseIds.includes(course.id) ? "var(--ink)" : "var(--ink-2)" }}>{course.title}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2.5">
                            <label className="block text-sm font-bold kh-ink2">เนื้อหา</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="พิมพ์ข้อความประกาศที่นี่..."
                                className="kh-textarea min-h-[120px]"
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting || !message.trim()}
                                className="kh-btn"
                            >
                                <Send size={15} strokeWidth={1.9} />
                                {submitting ? 'กำลังส่ง...' : 'ส่งประกาศ'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* RIGHT — รายการประกาศ */}
                <div className="space-y-3">
                    <h2 className="text-lg font-bold kh-ink mb-1 flex items-center gap-2">
                        <History size={18} strokeWidth={1.9} style={{ color: "var(--accent)" }} />
                        ประวัติการประกาศ
                    </h2>
                    {loading ? (
                        <p className="text-center kh-ink3 py-6">กำลังโหลด...</p>
                    ) : notifications.length === 0 ? (
                        <div className="kh-card p-10 text-center kh-ink3 flex flex-col items-center gap-2">
                            <Inbox size={28} strokeWidth={1.6} />
                            ยังไม่มีประกาศใดๆ
                        </div>
                    ) : (
                        notifications.map((note) => (
                            <div key={note.id} className="kh-card kh-card-h p-5 flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center flex-wrap gap-2 mb-2">
                                        {note.type === 'new_lesson' ? (
                                            <span className="kh-pill kh-pill-accent no-dot"><BookOpen size={12} strokeWidth={2} /> บทเรียนใหม่</span>
                                        ) : (
                                            <span className="kh-pill kh-pill-warn no-dot"><Megaphone size={12} strokeWidth={2} /> ประกาศทั่วไป</span>
                                        )}
                                        {note.target === 'specific_courses' ? (
                                            <span className="kh-pill kh-pill-warn"><Clock size={12} strokeWidth={2} /> ตั้งเวลา ({note.targetCourseIds?.length || 0} คอร์ส)</span>
                                        ) : (
                                            <span className="kh-pill kh-pill-good"><CheckCircle2 size={12} strokeWidth={2} /> ส่งแล้ว</span>
                                        )}
                                        <span className="text-xs kh-ink3 kh-num">
                                            {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleString('th-TH') : 'เมื่อสักครู่'}
                                        </span>
                                    </div>
                                    <h3 className="font-bold kh-ink text-base">
                                        {note.lessonTitle || note.message || "ไม่มีหัวข้อ"}
                                    </h3>
                                    {note.courseTitle && (
                                        <p className="text-sm kh-ink2 mt-1">คอร์ส: {note.courseTitle}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDelete(note.id)}
                                    className="kh-btn-ghost p-2"
                                    style={{ color: "var(--danger)" }}
                                    title="ลบประกาศ"
                                >
                                    <Trash2 size={16} strokeWidth={1.9} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
            <ConfirmDialog />
        </div>
    );
}
