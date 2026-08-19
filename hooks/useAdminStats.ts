import { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, getDoc, deleteDoc, orderBy, limit, Timestamp, getCountFromServer } from "firebase/firestore";
import { pageLabel } from "@/lib/pageLabel";
import { ADMIN_EMAILS } from "@/lib/constants";
import { readAdminCache, writeAdminCache, tsToMs, msToTs, ADMIN_STATS_CACHE_KEY } from "@/lib/adminCache";

// Exam/course titles can contain embedded newlines (e.g. "แบบฝึกหัด\nสอบเข้า ม.1");
// collapse whitespace so the online-users activity line reads as one clean phrase.
const cleanTitle = (t: unknown): string => String(t ?? "").replace(/\s+/g, " ").trim();

export interface Enrollment {
    id: string;
    price?: number | string;
    status?: string;
    createdAt?: any;
    approvedAt?: any;
    courseTitle?: string;
    userEmail?: string;
    userName?: string;
    slipUrl?: string;
    tel?: string;
    userId?: string;
}

export interface OnlineUser {
    userEmail: string;
    userName?: string;
    currentActivity?: string;
    isMember?: boolean;
    isStudying?: boolean;
    userType?: string;
    sessionStart?: any;
    lastAccessedAt?: any;
    isAnonymous?: boolean;
    isAdmin?: boolean;
    device?: string;
}

interface MenuCovers {
    [key: string]: string | null;
}

interface RecentActivity {
    id: string;
    type: 'enrollment';
    userName: string;
    timestamp: Date;
    description: string;
}

// แคชผลสแกนแดชบอร์ด 30 นาที (sessionStorage) — เดิมทุกการเปิด/เปลี่ยนปี = สแกน
// enrollments approved ทั้งชุด (~1,435 reads) ใหม่หมด ทั้งที่กรองปีทำบนเครื่องอยู่แล้ว
// ผลชุดเดียวจึงใช้ได้ทุกปี; ปุ่ม "รีเฟรช" ยังบังคับอ่านสดเสมอ (fetchData ที่ export)
// และหน้าอนุมัติสลิป/ลงทะเบียนให้ จะ clearAdminCache(ADMIN_STATS_CACHE_KEY) หลังแก้ข้อมูล
const STATS_CACHE_TTL = 30 * 60 * 1000;

// เก็บ "เฉพาะฟิลด์ที่จอใช้จริง" — spread ทั้ง doc (สลิป/เบอร์/คูปอง ฯลฯ) ทำให้ก้อน
// JSON โต 1.5-3MB เสี่ยงชนโควตา sessionStorage (~5MB) จนแคชพังเงียบ
// ฟิลด์ชุดนี้ตรวจกับผู้ใช้ครบแล้ว: stats memo (approvedAt/createdAt/price/
// userEmail/userName/courseTitle) + admin page (userEmail, createdAt.toDate)
// + useAdminLearningStats (courseId/userId/userName/userEmail/createdAt.seconds)
interface CachedEnrollment {
    id: string;
    price?: number | string;
    status?: string;
    courseTitle?: string;
    courseId?: string;
    userId?: string;
    userEmail?: string;
    userName?: string;
    approvedAtMs?: number;
    createdAtMs?: number;
}
interface CachedStats {
    enrollments: CachedEnrollment[];
    ticketsCount: number;
    dailyVisits: Record<string, number>;
    totalVisits: number;
    deviceStats: { mobile: number; tablet: number; desktop: number };
    sourceStats: Record<string, number>;
    pageViewStats: Record<string, number>;
    menuCovers: MenuCovers;
}

export const useAdminStats = (selectedYear: number, pendingCountFromAuth: number) => {
    const [loading, setLoading] = useState(true);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [ticketsCount, setTicketsCount] = useState(0);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [onlineLoading, setOnlineLoading] = useState(false);
    const [onlineFetched, setOnlineFetched] = useState(false);
    const [dailyVisits, setDailyVisits] = useState<Record<string, number>>({});
    const [totalVisits, setTotalVisits] = useState(0);

    // New Analytics States
    const [deviceStats, setDeviceStats] = useState({ mobile: 0, tablet: 0, desktop: 0 });
    const [sourceStats, setSourceStats] = useState<Record<string, number>>({});
    const [pageViewStats, setPageViewStats] = useState<Record<string, number>>({});

    // Lifted from child components
    const [menuCovers, setMenuCovers] = useState<MenuCovers>({});
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

    useEffect(() => {
        // เปลี่ยนปี = กรองบนเครื่องจาก state เดิม — ไม่ต้อง parse แคช/สแกนใหม่
        if (enrollments.length > 0) { setLoading(false); return; }
        setLoading(true);
        fetchData(false); // mount แรก → ใช้แคชก่อนถ้ายังสด
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedYear]);

    /** shape ใน cache = shape เดียวที่ใช้คืน state ทั้งสองเส้นทาง (สด/แคช)
     *  — กันสองก๊อปปี้ของ logic เดียวกันเพี้ยนจากกันเงียบๆ */
    const applyStats = (data: CachedStats) => {
        setEnrollments(data.enrollments.map((e) => ({
            ...e,
            approvedAt: msToTs(e.approvedAtMs),
            createdAt: msToTs(e.createdAtMs),
        } as Enrollment)));
        setTicketsCount(data.ticketsCount);
        setDailyVisits(data.dailyVisits);
        setTotalVisits(data.totalVisits);
        setDeviceStats(data.deviceStats);
        setSourceStats(data.sourceStats);
        setPageViewStats(data.pageViewStats);
        setMenuCovers(data.menuCovers);
        const sorted = data.enrollments
            .filter((e) => typeof e.approvedAtMs === "number")
            .sort((a, b) => (b.approvedAtMs || 0) - (a.approvedAtMs || 0))
            .slice(0, 5);
        setRecentActivities(sorted.map((e) => ({
            id: e.id,
            type: 'enrollment' as const,
            userName: e.userName || e.userEmail || 'Unknown',
            timestamp: new Date(e.approvedAtMs || 0),
            description: `ลงทะเบียนคอร์ส ${e.courseTitle}`,
        })));
    };

    const fetchData = async (force = true) => {
        if (!force) {
            const cached = readAdminCache<CachedStats>(ADMIN_STATS_CACHE_KEY, STATS_CACHE_TTL);
            if (cached) {
                applyStats(cached);
                setLoading(false);
                return;
            }
        }
        try {
            // === ALL initial queries in ONE Promise.all ===
            // Total: 4 queries (was 5+2 child = 7)
            // Removed: duplicate pending count (use AuthContext), menu covers & recent activity lifted here
            // enrollOk: ห้ามเก็บแคชถ้าคิวรีหลักล้ม — ไม่งั้นค่าศูนย์จาก fallback
            // จะค้างโชว์ 30 นาที (เดิม fail แล้วหายเองตอนเปิดหน้าครั้งถัดไป)
            let enrollOk = true;
            const [snapApproved, countTickets, statsDoc, pageDoc, menuDoc] = await Promise.all([
                getDocs(query(collection(db, "enrollments"), where("status", "==", "approved")))
                    .catch(err => { console.error("Enrollments fetch err:", err); enrollOk = false; return { docs: [] }; }),
                getCountFromServer(query(collection(db, "support_tickets"), where("status", "==", "pending")))
                    .catch(err => { console.error("Tickets fetch err:", err); return { data: () => ({ count: 0 }) }; }),
                getDoc(doc(db, "stats", "daily_visits"))
                    .catch(err => { console.error("Stats daily fetch err:", err); return { exists: () => false, data: () => ({}) }; }),
                getDoc(doc(db, "stats", "page_views"))
                    .catch(err => { console.error("PageViews fetch err:", err); return { exists: () => false, data: () => ({}) }; }),
                getDoc(doc(db, "settings", "admin_menu"))
                    .catch(err => { console.error("Menu covers fetch err:", err); return { exists: () => false, data: () => ({}) }; }),
            ]);

            // แปลงผลทุกคิวรีเป็น CachedStats "ครั้งเดียว" แล้วใช้ทั้งคืน state และเก็บแคช
            const statsData = statsDoc.exists() ? (statsDoc.data() as Record<string, unknown>) : {};
            const dailyVisits: Record<string, number> = {};
            Object.keys(statsData).forEach((k) => {
                if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof statsData[k] === 'number') dailyVisits[k] = statsData[k] as number;
            });
            const sourceStats: Record<string, number> = {};
            ['google', 'facebook', 'line', 'instagram', 'youtube', 'tiktok', 'direct', 'other'].forEach((src) => {
                if (statsData[`source_${src}`]) sourceStats[src] = statsData[`source_${src}`] as number;
            });
            const pageData = pageDoc.exists() ? (pageDoc.data() as Record<string, unknown>) : {};
            const pageViewStats: Record<string, number> = {};
            Object.keys(pageData).forEach((k) => {
                if (k.startsWith('/') && typeof pageData[k] === 'number') pageViewStats[k] = pageData[k] as number;
            });

            const snapshot: CachedStats = {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                enrollments: (snapApproved.docs || []).map((d: any) => {
                    const e = d.data();
                    return {
                        id: d.id,
                        price: e.price,
                        status: e.status,
                        courseTitle: e.courseTitle,
                        courseId: e.courseId,
                        userId: e.userId,
                        userEmail: e.userEmail,
                        userName: e.userName,
                        approvedAtMs: tsToMs(e.approvedAt),
                        createdAtMs: tsToMs(e.createdAt),
                    };
                }),
                ticketsCount: countTickets.data().count,
                dailyVisits,
                totalVisits: (statsData.total_visits as number) || 0,
                deviceStats: {
                    mobile: (statsData.device_mobile as number) || 0,
                    tablet: (statsData.device_tablet as number) || 0,
                    desktop: (statsData.device_desktop as number) || 0,
                },
                sourceStats,
                pageViewStats,
                menuCovers: menuDoc.exists() ? ((menuDoc.data() as { covers?: MenuCovers })?.covers || {}) : {},
            };

            applyStats(snapshot);
            if (enrollOk) writeAdminCache<CachedStats>(ADMIN_STATS_CACHE_KEY, snapshot);

        } catch (error) {
            console.error("Error fetching admin stats:", error);
        } finally {
            setLoading(false);
        }
    };

    // === Online Users: Lazy-loaded on demand ===
    const fetchOnlineUsers = useCallback(async () => {
        if (onlineLoading) return;
        setOnlineLoading(true);
        try {
            // Cleanup stale anonymous visitors before fetching fresh data
            try {
                const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
                const staleSnap = await getDocs(query(collection(db, "anonymous_visitors"), where("lastActive", "<", fifteenMinutesAgo)));
                staleSnap.docs.forEach(d => deleteDoc(d.ref).catch(() => {}));
            } catch (_) {}

            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

            // 3 presence queries + 2 lightweight title feeds (so we can name the
            // specific course classroom / exam set a user is on). The title feeds
            // are the cached, metadata-only /api/* endpoints — no extra heavy
            // Firestore reads here. No fallbacks — if anything fails, just show empty.
            const [snapOnlineEnrollments, snapOnlineUsers, snapAnonymous, examTitles, courseTitles] = await Promise.all([
                getDocs(query(collection(db, "enrollments"), where("lastAccessedAt", ">", tenMinutesAgo)))
                    .catch(() => ({ docs: [] as any[] })),
                getDocs(query(collection(db, "users"), where("lastActive", ">", tenMinutesAgo)))
                    .catch(() => ({ docs: [] as any[] })),
                getDocs(query(collection(db, "anonymous_visitors"), where("lastActive", ">", tenMinutesAgo)))
                    .catch(() => ({ docs: [] as any[] })),
                fetch("/api/feature-exams")
                    .then(r => r.ok ? r.json() : { exams: [] })
                    .then((d: any) => Object.fromEntries((d.exams || []).map((e: any) => [e.id, cleanTitle(e.title)])) as Record<string, string>)
                    .catch(() => ({} as Record<string, string>)),
                fetch("/api/home-courses")
                    .then(r => r.ok ? r.json() : { courses: [] })
                    .then((d: any) => Object.fromEntries((d.courses || []).map((c: any) => [c.id, cleanTitle(c.title)])) as Record<string, string>)
                    .catch(() => ({} as Record<string, string>)),
            ]);

            const titleMaps = { examTitles, courseTitles };

            const onlineMap = new Map();

            snapOnlineUsers.docs.forEach((userDoc: any) => {
                const data = userDoc.data();
                const key = data.email || userDoc.id;
                onlineMap.set(key, {
                    ...data,
                    userName: data.displayName || data.email || userDoc.id,
                    userEmail: data.email || userDoc.id,
                    lastAccessedAt: data.lastActive,
                    isMember: false,
                    currentActivity: data.currentPage ? pageLabel(data.currentPage, titleMaps) : 'กำลังเยี่ยมชมเว็บไซต์',
                    sessionStart: data.sessionStart,
                });
            });

            snapOnlineEnrollments.docs.forEach((d: any) => {
                const data = d.data();
                if (data.userEmail) {
                    const existing = onlineMap.get(data.userEmail) || {};
                    onlineMap.set(data.userEmail, {
                        ...existing,
                        ...data,
                        userName: data.userName || existing.userName || data.userEmail,
                        userEmail: data.userEmail,
                        currentActivity: `กำลังเรียน: ${data.courseTitle || 'ไม่ระบุวิชา'}`,
                        isStudying: true
                    });
                }
            });

            // Admins log in like anyone else, so AuthContext writes their
            // `lastActive` and they surface in this list — but they have no
            // enrollment, so without this check they'd be mislabeled "แขกทั่วไป".
            const adminSet = new Set(ADMIN_EMAILS.map(e => e.toLowerCase()));
            const uniqueOnline = Array.from(onlineMap.values());
            const finalOnlineUsers = uniqueOnline.map((user: any) => {
                const isAdmin = adminSet.has((user.userEmail || '').toLowerCase());
                const isMember = enrollments.some(e => e.userEmail === user.userEmail);
                return {
                    ...user,
                    isAdmin,
                    isMember,
                    userType: isAdmin ? 'แอดมิน' : (isMember ? 'สมาชิก' : 'แขกทั่วไป')
                };
            });

            const anonymousUsers: OnlineUser[] = snapAnonymous.docs.map((d: any, idx: number) => {
                const data = d.data();
                return {
                    userEmail: `anonymous_${d.id}`,
                    userName: `เยี่ยมชม ${idx + 1}`,
                    currentActivity: pageLabel(data.currentPage || '/', titleMaps),
                    isMember: false,
                    isStudying: false,
                    userType: 'ผู้เยี่ยมชม',
                    sessionStart: data.createdAt,
                    lastAccessedAt: data.lastActive,
                    isAnonymous: true,
                    device: data.device,
                } as OnlineUser;
            });

            setOnlineUsers([...finalOnlineUsers, ...anonymousUsers]);
            setOnlineFetched(true);
        } catch (err) {
            console.error("Error computing online users:", err);
        } finally {
            setOnlineLoading(false);
        }
    }, [enrollments, onlineLoading]);

    // Calculate Financial Stats
    const stats = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const isCurrentYear = selectedYear === currentYear;
        const currentMonthIndex = new Date().getMonth();

        // 1. Filter Enrollments by Year
        const filteredByYear = enrollments.filter(item => {
            if (!item.approvedAt && !item.createdAt) return false;
            const date = item.approvedAt?.toDate ? item.approvedAt.toDate() : (item.createdAt?.toDate ? item.createdAt.toDate() : new Date());
            return date.getFullYear() === selectedYear;
        });

        // 2. Filter Previous Year for Comparison
        const filteredPrevYear = enrollments.filter(item => {
            if (!item.approvedAt && !item.createdAt) return false;
            const date = item.approvedAt?.toDate ? item.approvedAt.toDate() : (item.createdAt?.toDate ? item.createdAt.toDate() : new Date());
            return date.getFullYear() === selectedYear - 1;
        });

        // --- Monthly Data ---
        const monthlyData = Array(12).fill(0).map((_, i) => ({
            month: new Date(0, i).toLocaleString('th-TH', { month: 'short' }),
            revenue: 0,
            students: 0,
            prevRevenue: 0
        }));

        filteredByYear.forEach(item => {
            const date = item.approvedAt?.toDate ? item.approvedAt.toDate() : (item.createdAt?.toDate ? item.createdAt.toDate() : new Date());
            const monthIndex = date.getMonth();
            monthlyData[monthIndex].revenue += (Number(item.price) || 0);
            monthlyData[monthIndex].students += 1;
        });

        filteredPrevYear.forEach(item => {
            const date = item.approvedAt?.toDate ? item.approvedAt.toDate() : (item.createdAt?.toDate ? item.createdAt.toDate() : new Date());
            const monthIndex = date.getMonth();
            monthlyData[monthIndex].prevRevenue += (Number(item.price) || 0);
        });

        // --- KPIs ---
        const currentMonthRevenue = monthlyData[currentMonthIndex].revenue;
        const lastMonthRevenue = currentMonthIndex > 0 ? monthlyData[currentMonthIndex - 1].revenue : 0;
        const revenueGrowth = lastMonthRevenue > 0
            ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
            : 0;

        const totalRevenue = filteredByYear.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
        const totalStudents = filteredByYear.length;

        const studentMap: Record<string, { totalSpent: number, courses: number, name: string, lastActive: any }> = {};
        enrollments.forEach(item => {
            if (!item.userEmail) return;
            if (!studentMap[item.userEmail]) {
                studentMap[item.userEmail] = {
                    totalSpent: 0,
                    courses: 0,
                    name: item.userName || 'Unknown',
                    lastActive: item.approvedAt
                };
            }
            studentMap[item.userEmail].totalSpent += (Number(item.price) || 0);
            studentMap[item.userEmail].courses += 1;
        });

        const studentList = Object.values(studentMap);
        const uniqueStudentsCount = studentList.length || 1;
        const aov = totalStudents > 0 ? totalRevenue / totalStudents : 0;
        const globalLTV = studentList.reduce((sum, s) => sum + s.totalSpent, 0) / uniqueStudentsCount;
        const retainedStudents = studentList.filter(s => s.courses > 1).length;
        const retentionRate = (retainedStudents / uniqueStudentsCount) * 100;

        // --- Daily Data ---
        const dailyMap: Record<string, { revenue: number; students: number }> = {};
        filteredByYear.forEach(item => {
            const date = item.approvedAt?.toDate ? item.approvedAt.toDate() : (item.createdAt?.toDate ? item.createdAt.toDate() : new Date());
            const dateStr = date.toISOString().split('T')[0];
            if (!dailyMap[dateStr]) dailyMap[dateStr] = { revenue: 0, students: 0 };
            dailyMap[dateStr].revenue += (Number(item.price) || 0);
            dailyMap[dateStr].students += 1;
        });

        const dailyData: { date: string; revenue: number; students: number }[] = [];
        for (let i = 89; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            dailyData.push({
                date: dateStr,
                revenue: dailyMap[dateStr]?.revenue || 0,
                students: dailyMap[dateStr]?.students || 0
            });
        }

        // --- Course Performance ---
        const courseMap: Record<string, { title: string, revenue: number, students: number }> = {};
        filteredByYear.forEach(item => {
            const title = item.courseTitle || "ไม่ระบุชื่อคอร์ส";
            if (!courseMap[title]) courseMap[title] = { title, revenue: 0, students: 0 };
            courseMap[title].revenue += (Number(item.price) || 0);
            courseMap[title].students += 1;
        });

        const courseData = Object.values(courseMap).sort((a, b) => b.revenue - a.revenue);
        const maxMonthlyRevenue = Math.max(...monthlyData.map(m => m.revenue), ...monthlyData.map(m => m.prevRevenue), 1);

        return {
            totalRevenue,
            totalStudents,
            monthlyData,
            courseData,
            maxMonthlyRevenue,
            revenueGrowth,
            aov,
            ltv: globalLTV,
            retentionRate,
            dailyData
        };
    }, [enrollments, selectedYear]);

    return {
        loading,
        enrollments,
        pendingCount: pendingCountFromAuth,
        ticketsCount,
        onlineUsers,
        onlineLoading,
        onlineFetched,
        fetchOnlineUsers,
        dailyVisits,
        totalVisits,
        deviceStats,
        sourceStats,
        pageViewStats,
        stats,
        fetchData,
        menuCovers,
        recentActivities,
    };
};
