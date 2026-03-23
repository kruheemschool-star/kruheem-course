import { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, getDoc, deleteDoc, orderBy, limit, Timestamp, getCountFromServer } from "firebase/firestore";

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
        setLoading(true);
        fetchData();
    }, [selectedYear]);

    const fetchData = async () => {
        try {
            // === ALL initial queries in ONE Promise.all ===
            // Total: 4 queries (was 5+2 child = 7)
            // Removed: duplicate pending count (use AuthContext), menu covers & recent activity lifted here
            const [snapApproved, countTickets, statsDoc, pageDoc, menuDoc] = await Promise.all([
                getDocs(query(collection(db, "enrollments"), where("status", "==", "approved")))
                    .catch(err => { console.error("Enrollments fetch err:", err); return { docs: [] }; }),
                getCountFromServer(query(collection(db, "support_tickets"), where("status", "==", "pending")))
                    .catch(err => { console.error("Tickets fetch err:", err); return { data: () => ({ count: 0 }) }; }),
                getDoc(doc(db, "stats", "daily_visits"))
                    .catch(err => { console.error("Stats daily fetch err:", err); return { exists: () => false, data: () => ({}) }; }),
                getDoc(doc(db, "stats", "page_views"))
                    .catch(err => { console.error("PageViews fetch err:", err); return { exists: () => false, data: () => ({}) }; }),
                getDoc(doc(db, "settings", "admin_menu"))
                    .catch(err => { console.error("Menu covers fetch err:", err); return { exists: () => false, data: () => ({}) }; }),
            ]);

            // Process enrollments
            const approvedData = snapApproved.docs ? snapApproved.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment)) : [];
            setEnrollments(approvedData);
            setTicketsCount(countTickets.data().count);

            // Derive recent activities from approved enrollments (no separate query needed!)
            const sorted = [...approvedData]
                .filter(e => e.approvedAt?.toDate)
                .sort((a, b) => (b.approvedAt?.toDate?.()?.getTime() || 0) - (a.approvedAt?.toDate?.()?.getTime() || 0))
                .slice(0, 5);
            setRecentActivities(sorted.map(e => ({
                id: e.id,
                type: 'enrollment' as const,
                userName: e.userName || e.userEmail || 'Unknown',
                timestamp: e.approvedAt?.toDate() || new Date(),
                description: `ลงทะเบียนคอร์ส ${e.courseTitle}`
            })));

            // Process stats
            if (statsDoc.exists()) {
                const data = statsDoc.data();
                const datePattern = /^\d{4}-\d{2}-\d{2}$/;
                const filteredVisits: Record<string, number> = {};
                Object.keys(data).forEach(key => {
                    if (datePattern.test(key) && typeof data[key] === 'number') {
                        filteredVisits[key] = data[key];
                    }
                });
                setDailyVisits(filteredVisits);
                setTotalVisits(data.total_visits || 0);
                setDeviceStats({
                    mobile: data.device_mobile || 0,
                    tablet: data.device_tablet || 0,
                    desktop: data.device_desktop || 0,
                });
                const sources: Record<string, number> = {};
                ['google', 'facebook', 'line', 'instagram', 'youtube', 'tiktok', 'direct', 'other'].forEach(src => {
                    if (data[`source_${src}`]) sources[src] = data[`source_${src}`];
                });
                setSourceStats(sources);
            }

            // Page Views
            if (pageDoc.exists()) {
                const pageData = pageDoc.data();
                const pages: Record<string, number> = {};
                Object.keys(pageData).forEach(key => {
                    if (key.startsWith('/') && typeof pageData[key] === 'number') {
                        pages[key] = pageData[key];
                    }
                });
                setPageViewStats(pages);
            }

            // Menu Covers (lifted from useMenuCovers)
            if (menuDoc.exists()) {
                setMenuCovers(menuDoc.data()?.covers || {});
            }

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

            // 3 queries for online presence (no fallbacks — if index missing, just show empty)
            const [snapOnlineEnrollments, snapOnlineUsers, snapAnonymous] = await Promise.all([
                getDocs(query(collection(db, "enrollments"), where("lastAccessedAt", ">", tenMinutesAgo)))
                    .catch(() => ({ docs: [] as any[] })),
                getDocs(query(collection(db, "users"), where("lastActive", ">", tenMinutesAgo)))
                    .catch(() => ({ docs: [] as any[] })),
                getDocs(query(collection(db, "anonymous_visitors"), where("lastActive", ">", tenMinutesAgo)))
                    .catch(() => ({ docs: [] as any[] })),
            ]);

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
                    currentActivity: 'กำลังเยี่ยมชมเว็บไซต์',
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

            const uniqueOnline = Array.from(onlineMap.values());
            const finalOnlineUsers = uniqueOnline.map((user: any) => {
                const isMember = enrollments.some(e => e.userEmail === user.userEmail);
                return {
                    ...user,
                    isMember,
                    userType: isMember ? 'สมาชิก' : 'แขกทั่วไป'
                };
            });

            const anonymousUsers: OnlineUser[] = snapAnonymous.docs.map((d: any, idx: number) => {
                const data = d.data();
                return {
                    userEmail: `anonymous_${d.id}`,
                    userName: `เยี่ยมชม ${idx + 1}`,
                    currentActivity: `กำลังดูหน้า: ${data.currentPage || '/'}`,
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
