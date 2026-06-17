"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy, limit, where, collectionGroup, Timestamp, doc, getDoc } from "firebase/firestore";
import { RefreshCw, Search, CheckCircle2, Rocket, KeyRound, BookOpen, FileText, Activity, Inbox, Loader2 } from "lucide-react";

interface ActivityItem {
    id: string;
    type: 'lesson_complete' | 'course_start' | 'login' | 'enrollment' | 'exam_submit';
    userId: string;
    userName: string;
    userLastName?: string;
    userEmail: string;
    courseTitle?: string;
    courseId?: string;
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
                ? query(collection(db, "enrollments"), where("status", "==", "approved"), where("approvedAt", ">=", Timestamp.fromDate(startDate)), orderBy("approvedAt", "desc"), limit(20))
                : query(collection(db, "enrollments"), where("status", "==", "approved"), orderBy("approvedAt", "desc"), limit(20));

            try {
                const enrollmentSnap = await getDocs(enrollmentQuery);
                
                // Fetch user info for all enrollment users in parallel
                const enrollUserIds = enrollmentSnap.docs.map(d => d.data().userId).filter(Boolean);
                const uniqueEnrollUserIds = [...new Set(enrollUserIds)];
                const enrollUserMap = new Map<string, { name: string, lastName: string, email: string }>();
                
                await Promise.all(uniqueEnrollUserIds.map(async (uid) => {
                    try {
                        const userDoc = await getDoc(doc(db, "users", uid));
                        if (userDoc.exists()) {
                            const uData = userDoc.data();
                            enrollUserMap.set(uid, {
                                name: uData.displayName || uData.email?.split('@')[0] || '',
                                lastName: uData.lastName || '',
                                email: uData.email || ''
                            });
                        }
                    } catch (err) {
                        // Failed to fetch enrollment user
                    }
                }));

                for (const enrollDoc of enrollmentSnap.docs) {
                    const data = enrollDoc.data();
                    const userInfo = enrollUserMap.get(data.userId) || { name: '', lastName: '', email: '' };
                    const displayName = userInfo.name || data.userName || data.userEmail?.split('@')[0] || 'ไม่ระบุชื่อ';
                    
                    activityList.push({
                        id: `enrollment-${enrollDoc.id}`,
                        type: 'enrollment',
                        userId: data.userId || '',
                        userName: displayName,
                        userLastName: userInfo.lastName,
                        userEmail: userInfo.email || data.userEmail || '',
                        courseTitle: data.courseTitle,
                        courseId: data.courseId,
                        timestamp: data.approvedAt?.toDate() || new Date(),
                    });
                }
            } catch (e) {
                // Enrollment query error (index may be missing)
            }

            // 2. Fetch Recent Login Activity (from users collection)
            try {
                const usersQuery = startDate
                    ? query(collection(db, "users"), where("lastActive", ">=", Timestamp.fromDate(startDate)), orderBy("lastActive", "desc"), limit(20))
                    : query(collection(db, "users"), orderBy("lastActive", "desc"), limit(20));

                const usersSnap = await getDocs(usersQuery);
                
                // Fetch enrolled courses for each login user in batches of 5
                const loginUsers = usersSnap.docs.filter(d => d.data().lastActive);
                const loginEnrollments: string[][] = [];
                for (let i = 0; i < loginUsers.length; i += 5) {
                    const batch = loginUsers.slice(i, i + 5);
                    const batchResults = await Promise.all(
                        batch.map(async (userDoc) => {
                            try {
                                const enrollQ = query(
                                    collection(db, "enrollments"),
                                    where("userId", "==", userDoc.id),
                                    where("status", "==", "approved"),
                                    limit(3)
                                );
                                const enrollSnap = await getDocs(enrollQ);
                                return enrollSnap.docs.map(d => d.data().courseTitle || '').filter(Boolean);
                            } catch {
                                return [];
                            }
                        })
                    );
                    loginEnrollments.push(...batchResults);
                }

                loginUsers.forEach((userDoc, index) => {
                    const data = userDoc.data();
                    const enrolledCourses = loginEnrollments[index] || [];
                    activityList.push({
                        id: `login-${userDoc.id}`,
                        type: 'login',
                        userId: userDoc.id,
                        userName: data.displayName || data.email?.split('@')[0] || 'ไม่ระบุชื่อ',
                        userLastName: data.lastName || '',
                        userEmail: data.email || '',
                        courseTitle: enrolledCourses.length > 0 ? enrolledCourses.join(', ') : undefined,
                        timestamp: data.lastActive?.toDate() || new Date(),
                    });
                });
            } catch (e) {
                // Users query error
            }



            // 3. Fetch Progress Updates (lesson completions)
            try {
                const progressQuery = query(collectionGroup(db, "progress"), limit(20));
                const progressSnap = await getDocs(progressQuery);

                // Collect userIds to fetch names
                const userIdsToFetch = new Set<string>();
                const progressEvents: any[] = [];

                for (const docSnapshot of progressSnap.docs) {
                    const data = docSnapshot.data();
                    const userId = docSnapshot.ref.parent.parent?.id; // Get userId from parent doc
                    const courseId = docSnapshot.id;

                    if (userId && data.lastUpdated && data.completed?.length > 0) {
                        const updateTime = data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date(data.lastUpdated);

                        if (!startDate || updateTime >= startDate) {
                            userIdsToFetch.add(userId);
                            progressEvents.push({
                                docId: docSnapshot.id,
                                userId,
                                courseId,
                                data,
                                updateTime
                            });
                        }
                    }
                }

                // Fetch User Profiles (in batches of 5)
                const userMap = new Map<string, { name: string, lastName: string, email: string }>();
                if (userIdsToFetch.size > 0) {
                    const uidArray = Array.from(userIdsToFetch);
                    for (let i = 0; i < uidArray.length; i += 5) {
                        const batch = uidArray.slice(i, i + 5);
                        await Promise.all(batch.map(async (uid) => {
                            try {
                                const userDoc = await getDoc(doc(db, "users", uid));
                                if (userDoc.exists()) {
                                    const uData = userDoc.data();
                                    userMap.set(uid, {
                                        name: uData.displayName || uData.email?.split('@')[0] || 'ไม่ระบุชื่อ',
                                        lastName: uData.lastName || '',
                                        email: uData.email || ''
                                    });
                                }
                            } catch (err) {
                                // Failed to fetch user
                            }
                        }));
                    }
                }

                // Fetch last completed lesson title for each progress event (in batches of 5)
                const lessonTitleMap = new Map<string, string>();
                for (let i = 0; i < progressEvents.length; i += 5) {
                    const batch = progressEvents.slice(i, i + 5);
                    await Promise.all(batch.map(async (event) => {
                        try {
                            if (event.data.completed?.length > 0) {
                                const lastLessonId = event.data.completed[event.data.completed.length - 1];
                                const lessonDoc = await getDoc(doc(db, "courses", event.courseId, "lessons", lastLessonId));
                                if (lessonDoc.exists()) {
                                    const lessonData = lessonDoc.data();
                                    lessonTitleMap.set(
                                        `${event.userId}-${event.courseId}`,
                                        lessonData.title || lessonData.name || `บทที่ ${event.data.completed.length}`
                                    );
                                }
                            }
                        } catch (err) {
                            // Failed to fetch lesson title
                        }
                    }));
                }

                // Add to activity list
                progressEvents.forEach(event => {
                    const userInfo = userMap.get(event.userId) || { name: 'ไม่ระบุชื่อ', lastName: '', email: '' };
                    const lastLessonTitle = lessonTitleMap.get(`${event.userId}-${event.courseId}`);
                    activityList.push({
                        id: `progress-${event.docId}-${event.userId}`,
                        type: 'lesson_complete',
                        userId: event.userId,
                        userName: userInfo.name,
                        userLastName: userInfo.lastName,
                        userEmail: userInfo.email,
                        courseId: event.courseId,
                        courseTitle: event.courseId,
                        lessonTitle: lastLessonTitle
                            ? `บทล่าสุด: ${lastLessonTitle} (${event.data.completed.length} บท)`
                            : `เรียนครบ ${event.data.completed.length} บท`,
                        timestamp: event.updateTime,
                        metadata: { completed: event.data.completed.length }
                    });
                });

            } catch (e) {
                // Progress query error
            }

            // Fetch course names for all courseIds
            const courseIds = new Set<string>();
            activityList.forEach(activity => {
                if (activity.courseId) {
                    courseIds.add(activity.courseId);
                }
            });

            const courseMap = new Map<string, string>();
            if (courseIds.size > 0) {
                const courseIdArray = Array.from(courseIds);
                for (let i = 0; i < courseIdArray.length; i += 5) {
                    const batch = courseIdArray.slice(i, i + 5);
                    await Promise.all(batch.map(async (courseId) => {
                        try {
                            const courseDoc = await getDoc(doc(db, "courses", courseId));
                            if (courseDoc.exists()) {
                                courseMap.set(courseId, courseDoc.data().title || courseId);
                            }
                        } catch (err) {
                            // Failed to fetch course
                        }
                    }));
                }
            }

            // Replace courseId with actual course title
            activityList.forEach(activity => {
                if (activity.courseId && courseMap.has(activity.courseId)) {
                    activity.courseTitle = courseMap.get(activity.courseId);
                }
            });

            // Sort by timestamp
            activityList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            setActivities(activityList.slice(0, 20));
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
            case 'lesson_complete': return CheckCircle2;
            case 'course_start': return Rocket;
            case 'login': return KeyRound;
            case 'enrollment': return BookOpen;
            case 'exam_submit': return FileText;
            default: return Activity;
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

    // Token-based color tile per type: finance/enrollment=accent, students/login=good, content=warn, etc.
    const getActivityTone = (type: ActivityItem['type']): { soft: string; tone: string; pill: string } => {
        switch (type) {
            case 'lesson_complete': return { soft: 'var(--good-soft)', tone: 'var(--good)', pill: 'kh-pill-good' };
            case 'course_start': return { soft: 'var(--accent-soft)', tone: 'var(--accent-ink)', pill: 'kh-pill-accent' };
            case 'login': return { soft: 'var(--good-soft)', tone: 'var(--good)', pill: 'kh-pill-good' };
            case 'enrollment': return { soft: 'var(--accent-soft)', tone: 'var(--accent-ink)', pill: 'kh-pill-accent' };
            case 'exam_submit': return { soft: 'var(--warn-soft)', tone: 'var(--warn)', pill: 'kh-pill-warn' };
            default: return { soft: 'var(--card-2)', tone: 'var(--ink-2)', pill: 'kh-pill-ink' };
        }
    };

    // Presentational: group activities by day bucket label (วันนี้ / เมื่อวาน / date).
    const dayLabel = (date: Date): string => {
        const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const today = startOfDay(new Date());
        const target = startOfDay(date);
        const dayMs = 86400000;
        if (target === today) return 'วันนี้';
        if (target === today - dayMs) return 'เมื่อวาน';
        return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const groupedActivities: { label: string; items: ActivityItem[] }[] = (() => {
        const groups: { label: string; items: ActivityItem[] }[] = [];
        for (const activity of filteredActivities) {
            const label = dayLabel(activity.timestamp);
            const last = groups[groups.length - 1];
            if (last && last.label === label) {
                last.items.push(activity);
            } else {
                groups.push({ label, items: [activity] });
            }
        }
        return groups;
    })();

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
            <div className="flex items-center justify-center py-24">
                <div className="kh-ink3 flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin" /> กำลังโหลดกิจกรรม...
                </div>
            </div>
        );
    }

    const typeTabs: { value: string; label: string }[] = [
        { value: 'all', label: 'ทั้งหมด' },
        { value: 'enrollment', label: 'การเงิน' },
        { value: 'login', label: 'นักเรียน' },
        { value: 'lesson_complete', label: 'เนื้อหา' },
        { value: 'exam_submit', label: 'ระบบ' },
    ];

    const statChips: { label: string; value: number; icon: typeof BookOpen; soft: string; tone: string }[] = [
        { label: 'ลงทะเบียน', value: activities.filter(a => a.type === 'enrollment').length, icon: BookOpen, soft: 'var(--accent-soft)', tone: 'var(--accent-ink)' },
        { label: 'เข้าสู่ระบบ', value: activities.filter(a => a.type === 'login').length, icon: KeyRound, soft: 'var(--good-soft)', tone: 'var(--good)' },
        { label: 'เรียนจบบท', value: activities.filter(a => a.type === 'lesson_complete').length, icon: CheckCircle2, soft: 'var(--good-soft)', tone: 'var(--good)' },
        { label: 'กิจกรรมทั้งหมด', value: activities.length, icon: Activity, soft: 'var(--card-2)', tone: 'var(--ink-2)' },
    ];

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

            {/* Toolbar: filter tabs + search + date range + refresh */}
            <div className="kh-card p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    {typeTabs.map((t) => (
                        <button
                            key={t.value}
                            type="button"
                            className="kh-tab"
                            data-active={filterType === t.value}
                            onClick={() => setFilterType(t.value)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 kh-ink3" />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อ, อีเมล, หรือคอร์ส..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="kh-input !pl-9"
                        />
                    </div>
                    <div className="flex items-center gap-1 p-1 rounded-[10px]" style={{ background: 'var(--card-2)', border: '1px solid var(--line)' }}>
                        {(['today', 'week', 'month', 'all'] as const).map((range) => (
                            <button
                                key={range}
                                type="button"
                                className="kh-tab"
                                data-active={dateRange === range}
                                onClick={() => setDateRange(range)}
                            >
                                {range === 'today' && 'วันนี้'}
                                {range === 'week' && '7 วัน'}
                                {range === 'month' && '30 วัน'}
                                {range === 'all' && 'ทั้งหมด'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchActivities}
                        className="kh-btn-ghost whitespace-nowrap"
                    >
                        <RefreshCw size={15} /> รีเฟรช
                    </button>
                </div>
            </div>

            {/* Timeline feed */}
            {filteredActivities.length > 0 ? (
                <div className="space-y-5">
                    {groupedActivities.map((group) => (
                        <div key={group.label} className="kh-card overflow-hidden">
                            <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
                                <span className="kh-eyebrow">{group.label}</span>
                                <span className="kh-ink3 text-xs kh-num">{group.items.length} รายการ</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {group.items.map((activity) => {
                                    const Icon = getActivityIcon(activity.type);
                                    const t = getActivityTone(activity.type);
                                    return (
                                        <div key={activity.id} className="p-5 flex items-center gap-4 hover:bg-slate-50 transition">
                                            {/* Icon tile */}
                                            <span
                                                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                                                style={{ background: t.soft, color: t.tone }}
                                            >
                                                <Icon size={20} />
                                            </span>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="kh-ink font-semibold truncate">
                                                        {activity.userName}{activity.userLastName ? ` ${activity.userLastName}` : ''}
                                                    </span>
                                                    <span className={`kh-pill no-dot !text-[10px] !px-1.5 !py-0.5 shrink-0 ${t.pill}`}>
                                                        {getActivityLabel(activity.type)}
                                                    </span>
                                                </div>
                                                {activity.userEmail && (
                                                    <p className="kh-ink3 text-xs truncate mb-0.5">{activity.userEmail}</p>
                                                )}
                                                <p className="kh-ink2 text-sm truncate">
                                                    {activity.courseTitle && activity.courseTitle}
                                                    {activity.lessonTitle && ` • ${activity.lessonTitle}`}
                                                </p>
                                            </div>

                                            {/* Time */}
                                            <div className="text-right shrink-0">
                                                <p className="kh-ink2 text-sm font-medium kh-num">
                                                    {activity.timestamp.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                                <p className="kh-ink3 text-xs kh-num">
                                                    {activity.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="kh-card p-16 text-center">
                    <Inbox size={48} className="mx-auto mb-4 kh-ink3" strokeWidth={1.5} />
                    <p className="kh-ink2 font-medium">ไม่พบกิจกรรมในช่วงเวลานี้</p>
                    <p className="kh-ink3 text-sm mt-1">ลองเปลี่ยนตัวกรองหรือช่วงเวลา</p>
                </div>
            )}
        </div>
    );
}
