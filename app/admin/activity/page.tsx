"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy, limit, where, collectionGroup, Timestamp } from "firebase/firestore";
import Link from "next/link";

interface ActivityItem {
    id: string;
    type: 'lesson_complete' | 'course_start' | 'login' | 'enrollment' | 'exam_submit';
    userId: string;
    userName: string;
    userEmail: string;
    courseTitle?: string;
    lessonTitle?: string;
    examTitle?: string;
    timestamp: Date;
    metadata?: any;
}

export default function ActivityLogPage() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

    useEffect(() => {
        fetchActivities();
    }, [dateRange]);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const activityList: ActivityItem[] = [];

            // Calculate date filter
            let startDate: Date | null = null;
            const now = new Date();
            if (dateRange === 'today') {
                startDate = new Date(now.setHours(0, 0, 0, 0));
            } else if (dateRange === 'week') {
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (dateRange === 'month') {
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            }

            // 1. Fetch Recent Enrollments (course_start)
            const enrollmentQuery = startDate
                ? query(collection(db, "enrollments"), where("status", "==", "approved"), where("approvedAt", ">=", Timestamp.fromDate(startDate)), orderBy("approvedAt", "desc"), limit(50))
                : query(collection(db, "enrollments"), where("status", "==", "approved"), orderBy("approvedAt", "desc"), limit(50));

            try {
                const enrollmentSnap = await getDocs(enrollmentQuery);
                enrollmentSnap.docs.forEach(doc => {
                    const data = doc.data();
                    activityList.push({
                        id: `enrollment-${doc.id}`,
                        type: 'enrollment',
                        userId: data.userId || '',
                        userName: data.userName || data.userEmail || 'Unknown',
                        userEmail: data.userEmail || '',
                        courseTitle: data.courseTitle,
                        timestamp: data.approvedAt?.toDate() || new Date(),
                    });
                });
            } catch (e) {
                console.log("Enrollment query error (index may be missing):", e);
            }

            // 2. Fetch Recent Login Activity (from users collection)
            try {
                const usersQuery = startDate
                    ? query(collection(db, "users"), where("lastActive", ">=", Timestamp.fromDate(startDate)), orderBy("lastActive", "desc"), limit(50))
                    : query(collection(db, "users"), orderBy("lastActive", "desc"), limit(30));

                const usersSnap = await getDocs(usersQuery);
                usersSnap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.lastActive) {
                        activityList.push({
                            id: `login-${doc.id}`,
                            type: 'login',
                            userId: doc.id,
                            userName: data.displayName || data.email || 'Unknown',
                            userEmail: data.email || '',
                            timestamp: data.lastActive?.toDate() || new Date(),
                        });
                    }
                });
            } catch (e) {
                console.log("Users query error:", e);
            }

            // 3. Fetch Progress Updates (lesson completions)
            try {
                const progressQuery = query(collectionGroup(db, "progress"), limit(100));
                const progressSnap = await getDocs(progressQuery);

                for (const doc of progressSnap.docs) {
                    const data = doc.data();
                    const userId = doc.ref.parent.parent?.id;
                    const courseId = doc.id;

                    if (data.lastUpdated && data.completed?.length > 0) {
                        const updateTime = data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date(data.lastUpdated);

                        if (!startDate || updateTime >= startDate) {
                            // Get user info
                            activityList.push({
                                id: `progress-${doc.id}-${userId}`,
                                type: 'lesson_complete',
                                userId: userId || '',
                                userName: 'นักเรียน',
                                userEmail: '',
                                courseTitle: courseId,
                                lessonTitle: `เรียนครบ ${data.completed.length} บท`,
                                timestamp: updateTime,
                                metadata: { completed: data.completed.length }
                            });
                        }
                    }
                }
            } catch (e) {
                console.log("Progress query error:", e);
            }

            // Sort by timestamp
            activityList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            setActivities(activityList.slice(0, 100));
        } catch (error) {
            console.error("Error fetching activities:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredActivities = activities.filter(activity => {
        const matchesType = filterType === 'all' || activity.type === filterType;
        const matchesSearch = searchQuery === '' ||
            activity.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            activity.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
            activity.courseTitle?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    const getActivityIcon = (type: ActivityItem['type']) => {
        switch (type) {
            case 'lesson_complete': return '✅';
            case 'course_start': return '🚀';
            case 'login': return '🔑';
            case 'enrollment': return '📚';
            case 'exam_submit': return '📝';
            default: return '📌';
        }
    };

    const getActivityLabel = (type: ActivityItem['type']) => {
        switch (type) {
            case 'lesson_complete': return 'เรียนจบบท';
            case 'course_start': return 'เริ่มเรียน';
            case 'login': return 'เข้าสู่ระบบ';
            case 'enrollment': return 'ลงทะเบียน';
            case 'exam_submit': return 'ทำข้อสอบ';
            default: return 'กิจกรรม';
        }
    };

    const getActivityColor = (type: ActivityItem['type']) => {
        switch (type) {
            case 'lesson_complete': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'course_start': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'login': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'enrollment': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'exam_submit': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'เมื่อสักครู่';
        if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
        if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
        if (days < 7) return `${days} วันที่แล้ว`;
        return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="text-slate-500 flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    กำลังโหลดกิจกรรม...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-sans">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="text-slate-400 hover:text-slate-600 transition">
                            ← กลับ Dashboard
                        </Link>
                    </div>
                    <button
                        onClick={fetchActivities}
                        className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-200 transition"
                    >
                        🔄 รีเฟรช
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-6 md:p-10">
                {/* Title */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                        📊 Activity Log
                    </h1>
                    <p className="text-slate-500">ติดตามกิจกรรมของนักเรียนแบบ Real-time</p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="🔍 ค้นหาชื่อ, อีเมล, หรือคอร์ส..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition"
                            />
                        </div>

                        {/* Type Filter */}
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer font-medium"
                        >
                            <option value="all">📌 ทุกประเภท</option>
                            <option value="enrollment">📚 ลงทะเบียน</option>
                            <option value="login">🔑 เข้าสู่ระบบ</option>
                            <option value="lesson_complete">✅ เรียนจบบท</option>
                            <option value="exam_submit">📝 ทำข้อสอบ</option>
                        </select>

                        {/* Date Range */}
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {(['today', 'week', 'month', 'all'] as const).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setDateRange(range)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition ${dateRange === range
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {range === 'today' && 'วันนี้'}
                                    {range === 'week' && '7 วัน'}
                                    {range === 'month' && '30 วัน'}
                                    {range === 'all' && 'ทั้งหมด'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                        <div className="text-2xl mb-1">📚</div>
                        <p className="text-2xl font-bold text-slate-800">
                            {activities.filter(a => a.type === 'enrollment').length}
                        </p>
                        <p className="text-xs text-slate-500">ลงทะเบียน</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                        <div className="text-2xl mb-1">🔑</div>
                        <p className="text-2xl font-bold text-slate-800">
                            {activities.filter(a => a.type === 'login').length}
                        </p>
                        <p className="text-xs text-slate-500">เข้าสู่ระบบ</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                        <div className="text-2xl mb-1">✅</div>
                        <p className="text-2xl font-bold text-slate-800">
                            {activities.filter(a => a.type === 'lesson_complete').length}
                        </p>
                        <p className="text-xs text-slate-500">เรียนจบบท</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                        <div className="text-2xl mb-1">📊</div>
                        <p className="text-2xl font-bold text-slate-800">
                            {activities.length}
                        </p>
                        <p className="text-xs text-slate-500">กิจกรรมทั้งหมด</p>
                    </div>
                </div>

                {/* Activity List */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="font-bold text-lg text-slate-800">
                            กิจกรรมล่าสุด ({filteredActivities.length} รายการ)
                        </h2>
                    </div>

                    {filteredActivities.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                            {filteredActivities.map((activity) => (
                                <div key={activity.id} className="p-5 hover:bg-slate-50/50 transition flex items-center gap-4">
                                    {/* Icon */}
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl flex-shrink-0">
                                        {getActivityIcon(activity.type)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-slate-800 truncate">
                                                {activity.userName}
                                            </span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getActivityColor(activity.type)}`}>
                                                {getActivityLabel(activity.type)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 truncate">
                                            {activity.courseTitle && `📚 ${activity.courseTitle}`}
                                            {activity.lessonTitle && ` • ${activity.lessonTitle}`}
                                            {!activity.courseTitle && activity.userEmail}
                                        </p>
                                    </div>

                                    {/* Time */}
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-medium text-slate-600">
                                            {formatTime(activity.timestamp)}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {activity.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-16 text-center text-slate-400">
                            <div className="text-5xl mb-4">📭</div>
                            <p className="font-medium">ไม่พบกิจกรรมในช่วงเวลานี้</p>
                            <p className="text-sm mt-1">ลองเปลี่ยนตัวกรองหรือช่วงเวลา</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
