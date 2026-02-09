import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, getDoc, orderBy, limit, Timestamp } from "firebase/firestore";

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
}

export const useAdminStats = (selectedYear: number) => {
    const [loading, setLoading] = useState(true);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [ticketsCount, setTicketsCount] = useState(0);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [dailyVisits, setDailyVisits] = useState<Record<string, number>>({});
    const [totalVisits, setTotalVisits] = useState(0);

    // New Analytics States
    const [deviceStats, setDeviceStats] = useState({ mobile: 0, tablet: 0, desktop: 0 });
    const [sourceStats, setSourceStats] = useState<Record<string, number>>({});
    const [pageViewStats, setPageViewStats] = useState<Record<string, number>>({});

    useEffect(() => {
        fetchData();
        // Refresh online status every minute
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            // 1. Enrollments & Pending Counts
            const qApproved = query(collection(db, "enrollments"), where("status", "==", "approved"));
            const snapApproved = await getDocs(qApproved);
            const approvedData = snapApproved.docs.map(doc => ({ id: doc.id, ...doc.data() } as Enrollment));
            setEnrollments(approvedData);

            const qPending = query(collection(db, "enrollments"), where("status", "==", "pending"));
            const snapPending = await getDocs(qPending);
            setPendingCount(snapPending.size);

            const qTickets = query(collection(db, "support_tickets"), where("status", "==", "pending"));
            const snapTickets = await getDocs(qTickets);
            setTicketsCount(snapTickets.size);

            // 2. Stats (Visits, Devices, Sources)
            const statsDoc = await getDoc(doc(db, "stats", "daily_visits"));
            if (statsDoc.exists()) {
                const data = statsDoc.data();
                setDailyVisits(data as Record<string, number>);
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

            // 3. Page Views
            const pageDoc = await getDoc(doc(db, "stats", "page_views"));
            if (pageDoc.exists()) {
                const pageData = pageDoc.data();
                const pages: Record<string, number> = {};
                Object.keys(pageData).forEach(key => {
                    if (!key.includes('_') && key !== 'total_page_views' && key !== 'last_updated' && typeof pageData[key] === 'number') {
                        pages[key] = pageData[key];
                    } else if (key.startsWith('/')) {
                        pages[key] = pageData[key];
                    }
                });
                setPageViewStats(pages);
            }

            // 4. Online Users
            await fetchOnlineUsers(approvedData);

        } catch (error) {
            console.error("Error fetching admin stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOnlineUsers = async (approvedData: Enrollment[]) => {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        // Active in Course
        const qOnlineEnrollments = query(collection(db, "enrollments"), where("lastAccessedAt", ">", tenMinutesAgo));
        const snapOnlineEnrollments = await getDocs(qOnlineEnrollments);

        // Active on Site
        const qOnlineUsers = query(collection(db, "users"), where("lastActive", ">", tenMinutesAgo));
        const snapOnlineUsers = await getDocs(qOnlineUsers);

        const onlineMap = new Map();

        snapOnlineUsers.docs.forEach(doc => {
            const data = doc.data();
            if (data.email) {
                onlineMap.set(data.email, {
                    ...data,
                    userName: data.displayName || data.email,
                    userEmail: data.email,
                    lastAccessedAt: data.lastActive,
                    isMember: false,
                    currentActivity: 'กำลังเยี่ยมชมเว็บไซต์',
                    sessionStart: data.sessionStart,
                });
            }
        });

        snapOnlineEnrollments.docs.forEach(doc => {
            const data = doc.data();
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
            const isMember = approvedData.some(e => e.userEmail === user.userEmail);
            return {
                ...user,
                isMember: isMember,
                userType: isMember ? 'สมาชิก' : 'แขกทั่วไป'
            };
        });

        setOnlineUsers(finalOnlineUsers);
    };

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

        // --- Monthly Data Construction ---
        const monthlyData = Array(12).fill(0).map((_, i) => ({
            month: new Date(0, i).toLocaleString('th-TH', { month: 'short' }),
            revenue: 0,
            students: 0,
            prevRevenue: 0 // For comparison
        }));

        // Current Year Data
        filteredByYear.forEach(item => {
            const date = item.approvedAt?.toDate ? item.approvedAt.toDate() : (item.createdAt?.toDate ? item.createdAt.toDate() : new Date());
            const monthIndex = date.getMonth();
            monthlyData[monthIndex].revenue += (Number(item.price) || 0);
            monthlyData[monthIndex].students += 1;
        });

        // Previous Year Data
        filteredPrevYear.forEach(item => {
            const date = item.approvedAt?.toDate ? item.approvedAt.toDate() : (item.createdAt?.toDate ? item.createdAt.toDate() : new Date());
            const monthIndex = date.getMonth();
            monthlyData[monthIndex].prevRevenue += (Number(item.price) || 0);
        });

        // --- KPI Calculations ---

        // A. Revenue Growth (Month-over-Month)
        const currentMonthRevenue = monthlyData[currentMonthIndex].revenue;
        const lastMonthRevenue = currentMonthIndex > 0 ? monthlyData[currentMonthIndex - 1].revenue : 0;
        const revenueGrowth = lastMonthRevenue > 0
            ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
            : 0;

        // B. Total Stats
        const totalRevenue = filteredByYear.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
        const totalStudents = filteredByYear.length;

        // C. Student Analytics (LTV, Retention)
        const studentMap: Record<string, { totalSpent: number, courses: number, name: string, lastActive: any }> = {};

        enrollments.forEach(item => { // Use ALL time enrollments for LTV
            if (!item.userEmail) return;
            if (!studentMap[item.userEmail]) {
                studentMap[item.userEmail] = {
                    totalSpent: 0,
                    courses: 0,
                    name: item.userName || 'Unknown',
                    lastActive: item.approvedAt // Approximation
                };
            }
            studentMap[item.userEmail].totalSpent += (Number(item.price) || 0);
            studentMap[item.userEmail].courses += 1;
        });

        const studentList = Object.values(studentMap);
        const uniqueStudentsCount = studentList.length || 1;

        // Avg Order Value (AOV)
        const aov = totalStudents > 0 ? totalRevenue / totalStudents : 0; // Per Order (Enrollment)

        // Lifetime Value (LTV) -> Avg revenue per unique student
        // Here we calculate average LTV across all students
        const globalLTV = studentList.reduce((sum, s) => sum + s.totalSpent, 0) / uniqueStudentsCount;

        // Retention Rate -> % of students with > 1 course
        const retainedStudents = studentList.filter(s => s.courses > 1).length;
        const retentionRate = (retainedStudents / uniqueStudentsCount) * 100;

        // Top Students (Whales)
        const topStudents = studentList
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 5);

        // --- Course Performance ---
        const courseMap: Record<string, { title: string, revenue: number, students: number }> = {};
        filteredByYear.forEach(item => {
            const title = item.courseTitle || "ไม่ระบุชื่อคอร์ส";
            if (!courseMap[title]) {
                courseMap[title] = { title, revenue: 0, students: 0 };
            }
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
            // New Metrics
            revenueGrowth,
            aov,
            ltv: globalLTV,
            retentionRate,
            topStudents
        };
    }, [enrollments, selectedYear]);

    return {
        loading,
        enrollments,
        pendingCount,
        ticketsCount,
        onlineUsers,
        dailyVisits,
        totalVisits,
        deviceStats,
        sourceStats,
        pageViewStats,
        stats,
        fetchData
    };
};
