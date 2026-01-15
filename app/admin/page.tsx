"use client";
import { useState } from "react";
import Link from "next/link";
import { useUserAuth } from "@/context/AuthContext";
import { useAdminStats } from "@/hooks/useAdminStats";

// Components
import StatsOverview from "@/components/admin/StatsOverview";
import MenuGrid from "@/components/admin/MenuGrid";
import ActionCenter from "@/components/admin/ActionCenter";
import OnlineUsersWidget from "@/components/admin/OnlineUsersWidget";
import TrafficAnalytics from "@/components/admin/TrafficAnalytics";
import RecentActivityWidget from "@/components/admin/RecentActivityWidget";

export default function AdminDashboard() {
    const { user, logOut } = useUserAuth();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Custom Hook to fetch all data
    const {
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
        stats
    } = useAdminStats(selectedYear);

    const handleLogout = async () => {
        if (confirm("ต้องการออกจากระบบใช่ไหม?")) {
            await logOut();
        }
    };

    const formatOnlineDuration = (startTime: Date | null): string => {
        if (!startTime) return 'เพิ่งเข้าชมเมื่อสักครู่';
        const now = new Date();
        const diffMs = now.getTime() - startTime.getTime();
        if (diffMs < 0) return 'เพิ่งเข้าชมเมื่อสักครู่';
        const totalMinutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours === 0 && minutes === 0) return 'เพิ่งเข้าชมเมื่อสักครู่';
        if (hours === 0) return `ออนไลน์มา ${minutes} นาที`;
        if (minutes === 0) return `ออนไลน์มา ${hours} ชั่วโมง`;
        return `ออนไลน์มา ${hours} ชม. ${minutes} น.`;
    };

    const enrollmentHours = enrollments.map(e => (e.createdAt?.toDate ? e.createdAt.toDate().getHours() : new Date().getHours()));

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

                {/* Top Section: Action Center & Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* 1. Action Center (Pending Tasks) */}
                        <ActionCenter pendingCount={pendingCount} ticketsCount={ticketsCount} />

                        {/* 2. Menu Grid */}
                        <MenuGrid pendingCount={pendingCount} ticketsCount={ticketsCount} />
                    </div>

                    <div className="lg:col-span-1 space-y-8">
                        {/* Recent Activity Feed */}
                        <RecentActivityWidget />
                    </div>
                </div>

                {/* 3. Online Users */}
                <OnlineUsersWidget onlineUsers={onlineUsers} formatOnlineDuration={formatOnlineDuration} />

                {/* 4. Stats & Analytics */}
                <div id="report-section" className="">
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

                    {/* Stats Cards */}
                    <StatsOverview stats={stats} selectedYear={selectedYear} />

                    {/* Visual Charts */}
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
                                {stats.courseData.length === 0 && <div className="text-center py-10 text-stone-300 italic">ยังไม่มีข้อมูลคอร์ส</div>}
                            </div>
                        </div>
                    </div>

                    {/* Traffic Analytics (Charts & Demographics) */}
                    <TrafficAnalytics
                        dailyVisits={dailyVisits}
                        totalVisits={totalVisits}
                        deviceStats={deviceStats}
                        sourceStats={sourceStats}
                        pageViewStats={pageViewStats}
                        enrollmentHours={enrollmentHours}
                    />

                </div>

            </main >
        </div >
    );
}