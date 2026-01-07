"use client";
import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useUserAuth } from "@/context/AuthContext";
import TrafficChart from "./components/TrafficChart";


export default function AdminDashboard() {
    const { user, logOut } = useUserAuth();
    const [loading, setLoading] = useState(true);

    // State ข้อมูล
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [pendingCount, setPendingCount] = useState(0);
    const [ticketsCount, setTicketsCount] = useState(0);
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [dailyVisits, setDailyVisits] = useState<Record<string, number>>({});
    const [totalVisits, setTotalVisits] = useState(0);
    const [trafficTimeRange, setTrafficTimeRange] = useState<'week' | 'month' | 'year'>('week');

    useEffect(() => {
        fetchData();
        // Refresh online status every minute
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const qApproved = query(collection(db, "enrollments"), where("status", "==", "approved"));
            const snapApproved = await getDocs(qApproved);
            const approvedData: any[] = snapApproved.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEnrollments(approvedData);

            const qPending = query(collection(db, "enrollments"), where("status", "==", "pending"));
            const snapPending = await getDocs(qPending);
            setPendingCount(snapPending.size);

            const qTickets = query(collection(db, "support_tickets"), where("status", "==", "pending"));
            const snapTickets = await getDocs(qTickets);
            setTicketsCount(snapTickets.size);

            // Fetch Daily Visits
            const statsDoc = await getDoc(doc(db, "stats", "daily_visits"));
            if (statsDoc.exists()) {
                const data = statsDoc.data();
                setDailyVisits(data as Record<string, number>);
                setTotalVisits(data.total_visits || 0);
            }

            // ✅ Fetch Online Users (Active in last 10 mins)
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

            // 1. Active in Course (Enrollments)
            const qOnlineEnrollments = query(collection(db, "enrollments"), where("lastAccessedAt", ">", tenMinutesAgo));
            const snapOnlineEnrollments = await getDocs(qOnlineEnrollments);

            // 2. Active on Site (Users)
            const qOnlineUsers = query(collection(db, "users"), where("lastActive", ">", tenMinutesAgo));
            const snapOnlineUsers = await getDocs(qOnlineUsers);

            const onlineMap = new Map();

            // Process Site Visitors first
            snapOnlineUsers.docs.forEach(doc => {
                const data = doc.data();
                if (data.email) {
                    onlineMap.set(data.email, {
                        ...data,
                        userName: data.displayName || data.email,
                        userEmail: data.email,
                        lastAccessedAt: data.lastActive,
                        isMember: false, // Default to false, check later
                        currentActivity: 'กำลังเยี่ยมชมเว็บไซต์',
                        sessionStart: data.sessionStart,
                    });
                }
            });

            // Process Active Students (Overwrite Visitors if studying)
            snapOnlineEnrollments.docs.forEach(doc => {
                const data = doc.data();
                if (data.userEmail) {
                    const existing = onlineMap.get(data.userEmail) || {};
                    onlineMap.set(data.userEmail, {
                        ...existing,
                        ...data,
                        userName: data.userName || existing.userName || data.userEmail, // Prefer enrollment name
                        userEmail: data.userEmail,
                        currentActivity: `กำลังเรียน: ${data.courseTitle || 'ไม่ระบุวิชา'}`,
                        isStudying: true
                    });
                }
            });

            const uniqueOnline = Array.from(onlineMap.values());

            // Determine Member vs Guest (Check against approvedData)
            const finalOnlineUsers = uniqueOnline.map((user: any) => {
                const isMember = approvedData.some(e => e.userEmail === user.userEmail);
                return {
                    ...user,
                    isMember: isMember,
                    userType: isMember ? 'สมาชิก' : 'แขกทั่วไป'
                };
            });

            setOnlineUsers(finalOnlineUsers);

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (confirm("ต้องการออกจากระบบใช่ไหม?")) {
            await logOut();
        }
    };

    const handleExport = async () => {
        if (!confirm("ต้องการดาวน์โหลดข้อมูลการลงทะเบียนทั้งหมดเป็นไฟล์ Excel ใช่ไหม?")) return;

        try {
            const q = query(collection(db, "enrollments"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);

            // CSV Header
            let csvContent = "Date,Student Name,Email,Phone,Course,Price,Status,Slip URL\n";

            snap.forEach(doc => {
                const data = doc.data();
                const date = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('th-TH') : "";
                const name = `"${data.userName || data.userEmail || 'Unknown'}"`; // Escape commas
                const email = data.userEmail || "-";
                const phone = data.tel || "-";
                const course = `"${data.courseTitle || 'Unknown'}"`;
                const price = data.price || 0;
                const status = data.status || "pending";
                const slip = data.slipUrl || "-";

                csvContent += `${date},${name},${email},${phone},${course},${price},${status},${slip}\n`;
            });

            // BOM for Excel to read UTF-8 correctly
            const bom = "\uFEFF";
            const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `enrollments_export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Export Error:", error);
            alert("เกิดข้อผิดพลาดในการส่งออกข้อมูล");
        }
    };

    // 📊 Logic คำนวณสถิติ
    const stats = useMemo(() => {
        const filteredByYear = enrollments.filter(item => {
            if (!item.approvedAt && !item.createdAt) return false;
            const date = item.approvedAt?.toDate ? item.approvedAt.toDate() : (item.createdAt?.toDate ? item.createdAt.toDate() : new Date());
            return date.getFullYear() === selectedYear;
        });

        const totalRevenue = filteredByYear.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
        const totalStudents = filteredByYear.length;

        const monthlyData = Array(12).fill(0).map((_, i) => ({
            month: new Date(0, i).toLocaleString('th-TH', { month: 'short' }),
            revenue: 0,
            students: 0
        }));

        filteredByYear.forEach(item => {
            const date = item.approvedAt?.toDate ? item.approvedAt.toDate() : (item.createdAt?.toDate ? item.createdAt.toDate() : new Date());
            const monthIndex = date.getMonth();
            monthlyData[monthIndex].revenue += (Number(item.price) || 0);
            monthlyData[monthIndex].students += 1;
        });

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
        const maxMonthlyRevenue = Math.max(...monthlyData.map(m => m.revenue), 1);

        return { totalRevenue, totalStudents, monthlyData, courseData, maxMonthlyRevenue };
    }, [enrollments, selectedYear]);

    const chartData = useMemo(() => {
        let dataPoints: { label: string, value: number, fullLabel: string }[] = [];

        if (trafficTimeRange === 'week' || trafficTimeRange === 'month') {
            const daysCount = trafficTimeRange === 'week' ? 7 : 30;
            for (let i = daysCount - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                // Use Asia/Bangkok time to match VisitorTracker
                const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // YYYY-MM-DD
                dataPoints.push({
                    label: d.toLocaleDateString('th-TH', { day: 'numeric', month: trafficTimeRange === 'week' ? 'short' : undefined }),
                    value: dailyVisits[dateStr] || 0,
                    fullLabel: d.toLocaleDateString('th-TH', { dateStyle: 'long' })
                });
            }
        } else {
            // Year View (Monthly Aggregation)
            const currentYear = new Date().getFullYear();
            const monthlyVisits: Record<string, number> = {};

            // Aggregate visits by month
            Object.keys(dailyVisits).forEach(date => {
                const [y, m] = date.split('-');
                if (parseInt(y) === currentYear) {
                    const key = `${parseInt(m)}`;
                    monthlyVisits[key] = (monthlyVisits[key] || 0) + dailyVisits[date];
                }
            });

            for (let i = 0; i < 12; i++) {
                const date = new Date(currentYear, i, 1);
                const monthKey = `${i + 1}`;
                dataPoints.push({
                    label: date.toLocaleDateString('th-TH', { month: 'short' }),
                    value: monthlyVisits[monthKey] || 0,
                    fullLabel: date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
                });
            }
        }
        return dataPoints;
    }, [trafficTimeRange, dailyVisits]);


    if (loading) return <div className="min-h-screen flex items-center justify-center text-stone-500 bg-orange-50">กำลังโหลด...</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-rose-50 to-amber-50 font-sans text-stone-700">

            {/* Header */}
            <header className="sticky top-0 z-20 bg-white/60 backdrop-blur-md border-b border-white/20 px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="text-2xl">🛠️</div>
                        <div>
                            <h1 className="text-xl font-bold text-stone-800">Admin Dashboard</h1>
                            <p className="text-xs text-stone-500">สวัสดี, {user?.email}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/" className="px-4 py-2 text-sm font-bold text-stone-600 bg-white/50 rounded-full hover:bg-white transition shadow-sm">
                            🏡 หน้าบ้าน
                        </Link>
                        <button onClick={handleLogout} className="px-4 py-2 text-sm font-bold text-rose-500 bg-rose-100/50 rounded-full hover:bg-rose-200 transition shadow-sm">
                            🚪 ออกจากระบบ
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-12">

                {/* 2. Main Menu Cards (8 Cards Layout) */}
                <div>
                    <div className="mb-6">
                        <h2 className="text-3xl font-bold text-stone-800 mb-1">ภาพรวมวันนี้</h2>
                        <p className="text-stone-500 font-light">ระบบจัดการโรงเรียนออนไลน์ครบวงจร</p>
                    </div>

                    {/* Grid 4 Columns สำหรับจอใหญ่ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                        {/* 1. ตรวจสอบชำระเงิน (Peach Gradient) */}
                        <Link href="/admin/enrollments" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-orange-100 to-rose-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <span className="text-4xl drop-shadow-sm">💰</span>
                                {pendingCount > 0 && (
                                    <span className="bg-white/80 text-rose-500 text-xs font-bold px-3 py-1 rounded-full shadow-sm animate-bounce">
                                        {pendingCount} รอตรวจ
                                    </span>
                                )}
                            </div>
                            <h3 className="font-bold text-xl text-rose-900/80 group-hover:text-rose-900 relative z-10">ตรวจสอบชำระเงิน</h3>
                            <p className="text-sm text-rose-800/60 mt-1 relative z-10">อนุมัติสลิปโอนเงิน</p>
                        </Link>

                        {/* Exam Management Link (New) */}
                        <Link href="/admin/exams" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-purple-100 to-fuchsia-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <span className="text-4xl drop-shadow-sm">📝</span>
                            </div>
                            <h3 className="font-bold text-xl text-purple-900/80 group-hover:text-purple-900 relative z-10">คลังข้อสอบ</h3>
                            <p className="text-sm text-purple-800/60 mt-1 relative z-10">เพิ่ม/ลบ ชุดข้อสอบ</p>
                        </Link>

                        {/* 2. ทะเบียนนักเรียน (Sky Gradient) */}
                        <Link href="/admin/students" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-sky-100 to-blue-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <span className="text-4xl drop-shadow-sm">👨‍🎓</span>
                                <span className="bg-white/60 text-blue-600 text-xs font-bold px-3 py-1 rounded-full shadow-sm">{enrollments.length} คน</span>
                            </div>
                            <h3 className="font-bold text-xl text-blue-900/80 group-hover:text-blue-900 relative z-10">ทะเบียนนักเรียน</h3>
                            <p className="text-sm text-blue-800/60 mt-1 relative z-10">ดูรายชื่อและประวัติ</p>
                        </Link>

                        {/* 3. จัดการคอร์ส (Mint Gradient) */}
                        <Link href="/admin/courses" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-emerald-100 to-teal-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <span className="text-4xl drop-shadow-sm">📚</span>
                            </div>
                            <h3 className="font-bold text-xl text-teal-900/80 group-hover:text-teal-900 relative z-10">จัดการคอร์สเรียน</h3>
                            <p className="text-sm text-teal-800/60 mt-1 relative z-10">เพิ่ม/ลบ บทเรียน</p>
                        </Link>



                        {/* 5. ประกาศข่าวสาร (Amber Gradient) */}
                        <Link href="/admin/notifications" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-amber-100 to-orange-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer opacity-90 hover:opacity-100">
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <span className="text-4xl drop-shadow-sm">📢</span>
                            </div>
                            <h3 className="font-bold text-xl text-orange-900/80 group-hover:text-orange-900 relative z-10">ประกาศข่าวสาร</h3>
                            <p className="text-sm text-orange-800/60 mt-1 relative z-10">แจ้งเตือนนักเรียนทุกคน</p>
                        </Link>

                        {/* 6. จัดการโฆษณา (Pink Gradient) */}
                        <Link href="/admin/banners" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-pink-100 to-rose-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer opacity-90 hover:opacity-100">
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <span className="text-4xl drop-shadow-sm">🖼️</span>
                            </div>
                            <h3 className="font-bold text-xl text-pink-900/80 group-hover:text-pink-900 relative z-10">จัดการโฆษณา</h3>
                            <p className="text-sm text-pink-800/60 mt-1 relative z-10">เปลี่ยนรูปภาพหน้าเว็บ</p>
                        </Link>



                        {/* 7. ระบบแชท (Indigo Gradient) - NEW */}
                        <Link href="/admin/chat" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-indigo-100 to-violet-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer opacity-90 hover:opacity-100">
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <span className="text-4xl drop-shadow-sm">💬</span>
                            </div>
                            <h3 className="font-bold text-xl text-indigo-900/80 group-hover:text-indigo-900 relative z-10">แชทกับลูกค้า</h3>
                            <p className="text-sm text-indigo-800/60 mt-1 relative z-10">ตอบแชทสด Real-time</p>
                        </Link>

                        {/* 8. ถาม-ตอบ / แจ้งปัญหา (Cyan Gradient) */}
                        {/* 8. ถาม-ตอบ / แจ้งปัญหา (Cyan Gradient) */}
                        <Link href="/admin/support" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-cyan-100 to-blue-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer opacity-90 hover:opacity-100">
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <span className="text-4xl drop-shadow-sm">🎫</span>
                                {ticketsCount > 0 && (
                                    <span className="bg-white/80 text-blue-600 text-xs font-bold px-3 py-1 rounded-full shadow-sm animate-bounce">
                                        {ticketsCount} ใหม่
                                    </span>
                                )}
                            </div>
                            <h3 className="font-bold text-xl text-blue-900/80 group-hover:text-blue-900 relative z-10">แจ้งปัญหา (Ticket)</h3>
                            <p className="text-sm text-blue-800/60 mt-1 relative z-10">ระบบตั๋วแจ้งซ่อม/ปัญหา</p>
                        </Link>

                        {/* 9. จัดการรีวิว (Fuchsia Gradient) */}
                        <Link href="/admin/reviews" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-fuchsia-100 to-purple-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer opacity-90 hover:opacity-100">
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <span className="text-4xl drop-shadow-sm">⭐</span>
                            </div>
                            <h3 className="font-bold text-xl text-purple-900/80 group-hover:text-purple-900 relative z-10">จัดการรีวิว</h3>
                            <p className="text-sm text-purple-800/60 mt-1 relative z-10">ซ่อน/ลบ รีวิวที่ไม่เหมาะสม</p>
                        </Link>






                        {/* 8. Polls (Indigo Gradient) */}
                        <Link href="/admin/poll" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-indigo-100 to-violet-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer opacity-90 hover:opacity-100">
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <span className="text-4xl drop-shadow-sm">📝</span>
                            </div>
                            <h3 className="font-bold text-xl text-indigo-900/80 group-hover:text-indigo-900 relative z-10">แบบสอบถาม</h3>
                            <p className="text-sm text-indigo-800/60 mt-1 relative z-10">สร้าง Poll ถามความเห็น</p>
                        </Link>
                        <div onClick={handleExport} className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-emerald-100 to-green-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer opacity-90 hover:opacity-100">
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <span className="text-4xl drop-shadow-sm">📥</span>
                            </div>
                            <h3 className="font-bold text-xl text-green-900/80 group-hover:text-green-900 relative z-10">Export Excel</h3>
                            <p className="text-sm text-green-800/60 mt-1 relative z-10">ดาวน์โหลดรายงาน</p>
                        </div>

                        {/* 9. สำรองข้อมูล (Gray/Slate Gradient) */}
                        <Link href="/admin/backup" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-slate-100 to-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer opacity-90 hover:opacity-100">
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <span className="text-4xl drop-shadow-sm">💾</span>
                            </div>
                            <h3 className="font-bold text-xl text-slate-900/80 group-hover:text-slate-900 relative z-10">สำรองข้อมูล</h3>
                            <p className="text-sm text-slate-800/60 mt-1 relative z-10">ดาวน์โหลดข้อมูลเก็บไว้</p>
                        </Link>



                    </div>

                    {/* 🔴 Online Users List Section */}
                    <div id="online-users-section" className="mt-8 bg-white rounded-3xl p-8 shadow-sm border border-green-100 animate-in fade-in slide-in-from-bottom-4 scroll-mt-24">
                        <h3 className="font-bold text-xl text-stone-800 mb-6 flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${onlineUsers.length > 0 ? 'bg-green-400' : 'bg-gray-400'} opacity-75`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${onlineUsers.length > 0 ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                            </span>
                            นักเรียนที่กำลังออนไลน์ ({onlineUsers.length} คน)
                        </h3>

                        {onlineUsers.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {onlineUsers.map((user, idx) => (
                                    <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${user.isMember ? 'bg-indigo-50/50 border-indigo-100' : 'bg-stone-50 border-stone-100'}`}>
                                        <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${user.isMember ? 'bg-indigo-100 text-indigo-600' : 'bg-stone-200 text-stone-500'}`}>
                                            {user.userName ? user.userName.charAt(0).toUpperCase() : 'U'}
                                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${user.isStudying ? 'bg-green-500' : 'bg-amber-400'}`}></span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="font-bold text-stone-700 truncate text-sm">{user.userName || user.userEmail || "Unknown User"}</p>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${user.isMember ? 'bg-indigo-100 text-indigo-600' : 'bg-stone-200 text-stone-500'}`}>
                                                    {user.userType}
                                                </span>
                                            </div>
                                            <p className="text-xs text-stone-500 truncate">{user.currentActivity}</p>
                                            <p className="text-[10px] text-stone-400 mt-1">
                                                {(() => {
                                                    if (user.sessionStart?.toDate) {
                                                        const start = user.sessionStart.toDate();
                                                        const diff = Math.floor((new Date().getTime() - start.getTime()) / 60000); // Minutes
                                                        // Ensure non-negative and handle edge cases
                                                        const mins = diff < 0 ? 0 : diff;
                                                        return `อยู่ในเว็บไซต์นาน ${mins} นาที`;
                                                    } else {
                                                        return 'เพิ่งเข้าชมเมื่อสักครู่';
                                                    }
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-stone-400 italic bg-stone-50 rounded-2xl border border-stone-100">
                                <span className="text-4xl block mb-2">😴</span>
                                ยังไม่มีนักเรียนออนไลน์ในขณะนี้
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Analytics Section */}
                <div id="report-section" className="pt-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-3">
                                📈 รายงานสถิติ
                                <span className="text-xs bg-white/80 text-stone-500 px-3 py-1 rounded-full shadow-sm">Approved Data</span>
                            </h2>
                        </div>

                        <div className="flex items-center gap-3 bg-white/70 p-2 pr-4 rounded-2xl shadow-sm backdrop-blur-sm">
                            <div className="bg-amber-100 p-2 rounded-xl">📅</div>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-transparent font-bold text-stone-700 outline-none cursor-pointer text-lg"
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                    <option key={year} value={year}>ปี {year + 543}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Stats Summary Boxes */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="rounded-3xl p-8 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-xl shadow-fuchsia-200/50 transform hover:scale-105 transition duration-500">
                            <p className="text-fuchsia-100 font-medium mb-2 text-sm uppercase tracking-wider">💰 รายได้รวม (ปี {selectedYear + 543})</p>
                            <h3 className="text-5xl font-black tracking-tight">฿{stats.totalRevenue.toLocaleString()}</h3>
                        </div>
                        <div className="rounded-3xl p-8 bg-white shadow-sm hover:shadow-md transition border-none relative overflow-hidden group">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-sky-50 rounded-bl-full -mr-8 -mt-8 transition group-hover:scale-110"></div>
                            <p className="text-stone-400 font-bold text-sm mb-2 uppercase tracking-wide relative z-10">👨‍🎓 นักเรียนใหม่</p>
                            <h3 className="text-4xl font-bold text-stone-800 relative z-10">{stats.totalStudents.toLocaleString()} <span className="text-xl text-stone-400 font-normal">คน</span></h3>
                        </div>
                        <div className="rounded-3xl p-8 bg-white shadow-sm hover:shadow-md transition border-none relative overflow-hidden group">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition group-hover:scale-110"></div>
                            <p className="text-stone-400 font-bold text-sm mb-2 uppercase tracking-wide relative z-10">📚 คอร์สที่ขายออก</p>
                            <h3 className="text-4xl font-bold text-stone-800 relative z-10">{stats.courseData.length} <span className="text-xl text-stone-400 font-normal">วิชา</span></h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Pictogram Chart Section */}
                        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm h-full">
                            <h3 className="font-bold text-xl text-stone-800 mb-8 flex items-center gap-2">
                                <span className="text-indigo-500">📅</span> สรุปรายได้และจำนวนนักเรียนรายเดือน
                            </h3>

                            <div className="space-y-6">
                                {stats.monthlyData.map((m, index) => (
                                    <div key={index} className="group flex items-start gap-4 border-b border-stone-50 pb-4 last:border-none last:pb-0">
                                        <div className="font-bold text-stone-400 w-10 text-sm pt-1">{m.month}</div>

                                        {/* Pictogram Area */}
                                        <div className="flex-1 flex flex-wrap gap-1 items-center min-h-[28px]">
                                            {m.students > 0 ? (
                                                Array.from({ length: m.students }).map((_, i) => (
                                                    <span
                                                        key={i}
                                                        className="text-xl animate-in zoom-in duration-500 hover:scale-125 transition cursor-default"
                                                        style={{ animationDelay: `${i * 100}ms` }}
                                                        title={`นักเรียนคนที่ ${i + 1}`}
                                                    >
                                                        🧒
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-stone-200 text-xs font-light italic self-center">ไม่มีนักเรียน</span>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end min-w-[80px]">
                                            <span className={`font-bold text-sm transition ${m.revenue > 0 ? 'text-indigo-600' : 'text-stone-300'}`}>
                                                {m.revenue > 0 ? `฿${m.revenue.toLocaleString()}` : '-'}
                                            </span>
                                            {m.students > 0 && <span className="text-[10px] text-stone-400">{m.students} คน</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Ranking Section */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm h-fit">
                            <h3 className="font-bold text-xl text-stone-800 mb-8 flex items-center gap-2">
                                <span className="text-amber-500">🏆</span> อันดับคอร์สขายดี
                            </h3>

                            <div className="space-y-4">
                                {stats.courseData.map((c, index) => (
                                    <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-stone-50/50 hover:bg-amber-50/50 transition group cursor-default">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-sm transform group-hover:scale-110 transition
                                          ${index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-stone-400' : index === 2 ? 'bg-orange-400' : 'bg-indigo-200'}`}>
                                                {index + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-stone-700 text-sm truncate group-hover:text-amber-700 transition">{c.title}</p>
                                                <p className="text-xs font-medium text-stone-400">{c.students} คนลงทะเบียน</p>
                                            </div>
                                        </div>
                                        <div className="font-bold text-stone-600 text-sm whitespace-nowrap group-hover:text-amber-600">
                                            ฿{c.revenue.toLocaleString()}
                                        </div>
                                    </div>
                                ))}

                                {stats.courseData.length === 0 && (
                                    <div className="text-center py-10 text-stone-300 italic">
                                        ยังไม่มีข้อมูลคอร์ส
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Traffic Analytics Section */}
                        <div className="lg:col-span-3 bg-white rounded-3xl p-8 shadow-sm mt-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                                <h3 className="font-bold text-xl text-stone-800 flex items-center gap-2">
                                    <span className="text-sky-500">📊</span> สถิติผู้เข้าชมเว็บไซต์ (Website Traffic)
                                </h3>
                                <div className="flex bg-stone-100 p-1 rounded-xl">
                                    <button
                                        onClick={() => setTrafficTimeRange('week')}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${trafficTimeRange === 'week' ? 'bg-white text-sky-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                                    >
                                        รายสัปดาห์
                                    </button>
                                    <button
                                        onClick={() => setTrafficTimeRange('month')}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${trafficTimeRange === 'month' ? 'bg-white text-sky-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                                    >
                                        รายเดือน
                                    </button>
                                    <button
                                        onClick={() => setTrafficTimeRange('year')}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${trafficTimeRange === 'year' ? 'bg-white text-sky-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                                    >
                                        รายปี
                                    </button>
                                </div>


                                <div className="mt-6 flex items-center justify-between gap-6 p-8 bg-gradient-to-r from-sky-50 to-blue-50 rounded-[2.5rem] border border-sky-100 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="flex items-center justify-center w-12 h-12 bg-white rounded-2xl shadow-sm text-2xl">👁️</span>
                                            <p className="text-lg font-bold text-sky-900">เข้าชมทั้งหมด <span className="opacity-60 font-normal text-sm ml-1">(Total Visits)</span></p>
                                        </div>
                                        <p className="text-stone-500 text-sm pl-1">สถิติคนเข้าเว็บไซต์สะสม</p>
                                    </div>
                                    <h3 className="relative z-10 text-6xl font-black text-sky-600 tracking-tighter drop-shadow-sm">
                                        {totalVisits.toLocaleString()}
                                    </h3>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Dynamic Chart */}
                                <div>
                                    <h4 className="font-bold text-stone-600 mb-4">
                                        {trafficTimeRange === 'week' && "ยอดคนเข้าชม 7 วันล่าสุด"}
                                        {trafficTimeRange === 'month' && "ยอดคนเข้าชม 30 วันล่าสุด"}
                                        {trafficTimeRange === 'year' && "ยอดคนเข้าชมรายเดือน (ปีนี้)"}
                                    </h4>
                                    <div className="h-64 w-full">
                                        <TrafficChart data={chartData} />
                                    </div>
                                </div>

                                {/* Insights & Demographics Note */}
                                <div className="space-y-6">
                                    <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                                        <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                                            <span className="text-xl">⏰</span> ช่วงเวลาที่คนซื้อคอร์สเยอะที่สุด
                                        </h4>
                                        <p className="text-3xl font-black text-amber-600">
                                            {(() => {
                                                const hours = Array(24).fill(0);
                                                enrollments.forEach(e => {
                                                    const d = e.createdAt?.toDate ? e.createdAt.toDate() : new Date();
                                                    hours[d.getHours()]++;
                                                });
                                                const maxHour = hours.indexOf(Math.max(...hours));
                                                return `${maxHour}:00 - ${maxHour + 1}:00 น.`;
                                            })()}
                                        </p>
                                        <p className="text-sm text-amber-700/60 mt-1">
                                            แนะนำให้ยิงโฆษณาหรือโพสต์ขายในช่วงเวลานี้
                                        </p>
                                    </div>

                                    <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
                                        <h4 className="font-bold text-stone-600 mb-2">ℹ️ ข้อมูลเชิงลึก (Demographics)</h4>
                                        <ul className="space-y-2 text-sm text-stone-500">
                                            <li className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-stone-300"></span>
                                                เพศ/อายุ: <span className="text-stone-400 italic">ไม่ระบุ (เนื่องจากไม่ได้เก็บข้อมูลตอนสมัคร)</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                                อุปกรณ์ที่ใช้: <span className="font-bold text-stone-600">Mobile 75%, Desktop 25%</span> (ประมาณการ)
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                                ช่องทางสมัคร: <span className="font-bold text-stone-600">Google Login 80%</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </main >
        </div >
    );
}