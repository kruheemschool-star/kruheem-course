"use client";
import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, deleteDoc, doc, addDoc } from "firebase/firestore";
import Link from "next/link";


export default function NotificationsPage() {
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
        if (!confirm("ต้องการลบประกาศนี้ใช่ไหม?")) return;
        try {
            await deleteDoc(doc(db, "notifications", id));
            fetchNotifications();
        } catch (error) {
            console.error("Error deleting notification:", error);
        }
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

        <div className="min-h-screen bg-[#EEF2FF] p-6 md:p-10 font-sans text-slate-700">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Link href="/admin" className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-700 mb-4 transition font-bold bg-white px-4 py-2 rounded-full shadow-sm">← กลับไปหน้า Dashboard</Link>
                    <h1 className="text-3xl font-extrabold text-indigo-900 flex items-center gap-3">
                        📢 ประกาศข่าวสาร (Notifications)
                    </h1>
                    <p className="text-slate-500 mt-2">จัดการประกาศและแจ้งเตือนถึงนักเรียนทุกคน</p>
                </div>

                {/* Form ส่งประกาศ */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-indigo-100 border border-indigo-50 mb-10">
                    <h2 className="text-xl font-bold text-indigo-900 mb-4">✍️ สร้างประกาศใหม่</h2>
                    <form onSubmit={handleSendNotification} className="space-y-6">

                        {/* Target Selection */}
                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-slate-700">ส่งถึงใคร?</label>
                            <div className="flex gap-4">
                                <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition ${targetType === 'all' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                                    <input type="radio" name="targetType" value="all" checked={targetType === 'all'} onChange={() => setTargetType('all')} className="hidden" />
                                    <span className="font-bold">🌍 นักเรียนทุกคน</span>
                                </label>
                                <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition ${targetType === 'specific' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                                    <input type="radio" name="targetType" value="specific" checked={targetType === 'specific'} onChange={() => setTargetType('specific')} className="hidden" />
                                    <span className="font-bold">🎯 เลือกคอร์สเฉพาะ</span>
                                </label>
                            </div>
                        </div>

                        {/* Course Selection List (Only show if specific) */}
                        {targetType === 'specific' && (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">เลือกคอร์สที่ต้องการแจ้งเตือน ({selectedCourseIds.length})</p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCourseIds(courses.map(c => c.id))}
                                            className="px-3 py-1.5 text-xs font-bold bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition"
                                        >
                                            ✅ เลือกทั้งหมด
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCourseIds([])}
                                            className="px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition"
                                        >
                                            ❌ ยกเลิกทั้งหมด
                                        </button>
                                    </div>
                                </div>
                                <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                                    {groupedCourses.map(([category, items]) => (
                                        <div key={category}>
                                            <div className="flex items-center justify-between mb-2 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 sticky top-0 backdrop-blur-sm z-10">
                                                <h4 className="text-sm font-bold text-indigo-800">
                                                    📌 {category} ({items.length})
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
                                                    className={`text-[10px] px-2 py-1 rounded-md font-bold transition ${items.every((c: any) => selectedCourseIds.includes(c.id))
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-white text-indigo-600 hover:bg-indigo-100'
                                                        }`}
                                                >
                                                    {items.every((c: any) => selectedCourseIds.includes(c.id)) ? '✓ เลือกแล้ว' : 'เลือกทั้งกลุ่ม'}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {items.map((course: any) => (
                                                    <label key={course.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${selectedCourseIds.includes(course.id) ? 'bg-white border-indigo-400 shadow-sm' : 'bg-white/50 border-transparent hover:bg-white'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedCourseIds.includes(course.id)}
                                                            onChange={() => toggleCourseSelection(course.id)}
                                                            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                        />
                                                        <span className={`text-sm font-medium ${selectedCourseIds.includes(course.id) ? 'text-indigo-900' : 'text-slate-600'}`}>{course.title}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="พิมพ์ข้อความประกาศที่นี่..."
                            className="w-full p-4 bg-slate-50 border-2 border-indigo-100 rounded-2xl outline-none focus:border-indigo-400 transition min-h-[120px]"
                        />
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting || !message.trim()}
                                className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition ${submitting || !message.trim() ? 'bg-slate-300 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:scale-105 active:scale-95'}`}
                            >
                                {submitting ? '⏳ กำลังส่ง...' : '🚀 ส่งประกาศ'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* รายการประกาศ */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-indigo-900 mb-4">📜 ประวัติการประกาศ</h2>
                    {loading ? (
                        <p className="text-center text-slate-400">กำลังโหลด...</p>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
                            ยังไม่มีประกาศใดๆ
                        </div>
                    ) : (
                        notifications.map((note) => (
                            <div key={note.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-start gap-4 hover:shadow-md transition">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${note.type === 'new_lesson' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>
                                            {note.type === 'new_lesson' ? '📚 บทเรียนใหม่' : '📢 ประกาศทั่วไป'}
                                        </span>
                                        {note.target === 'specific_courses' && (
                                            <span className="px-2 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-600">
                                                🎯 เฉพาะกลุ่ม ({note.targetCourseIds?.length || 0} คอร์ส)
                                            </span>
                                        )}
                                        <span className="text-xs text-slate-400">
                                            {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleString('th-TH') : 'เมื่อสักครู่'}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-lg">
                                        {note.lessonTitle || note.message || "ไม่มีหัวข้อ"}
                                    </h3>
                                    {note.courseTitle && (
                                        <p className="text-sm text-slate-500 mt-1">คอร์ส: {note.courseTitle}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDelete(note.id)}
                                    className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                    title="ลบประกาศ"
                                >
                                    🗑
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

    );
}
