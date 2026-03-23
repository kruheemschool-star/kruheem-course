import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, getDoc, deleteDoc, orderBy, limit, Timestamp } from "firebase/firestore";

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
        let interval: NodeJS.Timeout;
        let isMounted = true;

        fetchData().then(() => {
            // Only start refresh interval if component is still mounted after initial load
            if (isMounted) {
                interval = setInterval(fetchData, 5 * 60 * 1000); // 5 min refresh
            }
        });

        return () => {
            isMounted = false;
            if (interval) clearInterval(interval);
        };
    }, []);

    const fetchData = async () => {
        try {
            // Run ALL independent queries in parallel
            const [snapApproved, snapPending, snapTickets, statsDoc, pageDoc] = await Promise.all([
                getDocs(query(collection(db, "enrollments"), where("status", "==", "approved")))
                    .catch(err => { console.error("Enrollments fetch err:", err); return { docs: [], size: 0 }; }),
                getDocs(query(collection(db, "enrollments"), where("status", "==", "pending")))
                    .catch(err => { console.error("Pending enrollments err:", err); return { size: 0 }; }),
                getDocs(query(collection(db, "support_tickets"), where("status", "==", "pending")))
                    .catch(err => { console.error("Tickets fetch err:", err); return { size: 0 }; }),
                getDoc(doc(db, "stats", "daily_visits"))
                    .catch(err => { console.error("Stats daily fetch err:", err); return { exists: () => false, data: () => ({}) }; }),
                getDoc(doc(db, "stats", "page_views"))
                    .catch(err => { console.error("PageViews fetch err:", err); return { exists: () => false, data: () => ({}) }; }),
            ]);

            // Process results
            const approvedData = snapApproved.docs.map(doc => ({ id: doc.id, ...doc.data() } as Enrollment));
            setEnrollments(approvedData);
            setPendingCount(snapPending.size);
            setTicketsCount(snapTickets.size);

            // Stats (Visits, Devices, Sources)
            if (statsDoc.exists()) {
                const data = statsDoc.data();

                // Filter: only keep date keys (YYYY-MM-DD format)
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
                    // Only include actual page paths (start with /)
                    if (key.startsWith('/') && typeof pageData[key] === 'number') {
                        pages[key] = pageData[key];
                    }
                });
                setPageViewStats(pages);
            }

            // Online Users (depends on approvedData)
            await fetchOnlineUsers(approvedData);

        } catch (error) {
            console.error("Error fetching admin stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOnlineUsers = async (approvedData: Enrollment[]) => {
        try {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

            // Fetch registered online users AND anonymous visitors in parallel
            // If the indexed query fails (e.g. missing composite index), fallback to fetching all and filtering in memory
            const [snapOnlineEnrollments, snapOnlineUsers, snapAnonymous] = await Promise.all([
                getDocs(query(collection(db, "enrollments"), where("lastAccessedAt", ">", tenMinutesAgo)))
                    .catch(async (e) => {
                        console.warn("Online enrollments index missing, using fallback filtering in memory.");
                        const allDocs = await getDocs(collection(db, "enrollments"));
                        return { docs: allDocs.docs.filter(d => {
                            const date = d.data().lastAccessedAt?.toDate?.();
                            return date ? date > tenMinutesAgo : false;
                        }) };
                    }),
                getDocs(query(collection(db, "users"), where("lastActive", ">", tenMinutesAgo)))
                    .catch(async (e) => {
                        console.warn("Online users index missing, using fallback filtering in memory.");
                        const allDocs = await getDocs(collection(db, "users"));
                        return { docs: allDocs.docs.filter(d => {
                            const date = d.data().lastActive?.toDate?.();
                            return date ? date > tenMinutesAgo : false;
                        }) };
                    }),
                getDocs(query(collection(db, "anonymous_visitors"), where("lastActive", ">", tenMinutesAgo)))
                    .catch(async (e) => {
                        console.warn("Anon visitors index missing, using fallback filtering in memory.");
                        const allDocs = await getDocs(collection(db, "anonymous_visitors"));
                        return { docs: allDocs.docs.filter(d => {
                            const date = d.data().lastActive?.toDate?.();
                            return date ? date > tenMinutesAgo : false;
                        }) };
                    }),
            ]);

        const onlineMap = new Map();

        snapOnlineUsers.docs.forEach(userDoc => {
            const data = userDoc.data();
            const key = data.email || userDoc.id; // Use email if available, else uid
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

        // Add anonymous visitors as "เยี่ยมชม 1", "เยี่ยมชม 2", etc.
        const anonymousUsers: OnlineUser[] = snapAnonymous.docs.map((doc: any, idx: number) => {
            const data = doc.data();
            return {
                userEmail: `anonymous_${doc.id}`,
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

        // Cleanup stale anonymous visitors (older than 15 min) in background
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        getDocs(query(collection(db, "anonymous_visitors"), where("lastActive", "<", fifteenMinutesAgo)))
            .then(staleSnap => {
                staleSnap.docs.forEach(d => deleteDoc(d.ref).catch(() => {}));
            })
            .catch(() => {});
        } catch (err) {
            console.error("Error computing online users:", err);
        }
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

        // --- Daily Data (for 30-day chart view) ---
        const dailyMap: Record<string, { revenue: number; students: number }> = {};
        filteredByYear.forEach(item => {
            const date = item.approvedAt?.toDate ? item.approvedAt.toDate() : (item.createdAt?.toDate ? item.createdAt.toDate() : new Date());
            const dateStr = date.toISOString().split('T')[0];
            if (!dailyMap[dateStr]) dailyMap[dateStr] = { revenue: 0, students: 0 };
            dailyMap[dateStr].revenue += (Number(item.price) || 0);
            dailyMap[dateStr].students += 1;
        });

        // Fill in last 90 days for complete chart
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
            dailyData
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
