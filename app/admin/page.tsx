"use client";
import { useState } from "react";
import Link from "next/link";
import { useUserAuth } from "@/context/AuthContext";
import { useAdminStats } from "@/hooks/useAdminStats";
import { Home, LogOut, Loader2 } from "lucide-react";

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

    // Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex items-center gap-3 text-slate-500">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="font-medium">กำลังโหลด...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-700">

            {/* Header - Clean & Minimal */}
            <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-lg">
                            🛠️
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-slate-800">Admin Dashboard</h1>
                            <p className="text-xs text-slate-500">{user?.email}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href="/"
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            <Home size={16} />
                            หน้าบ้าน
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
                        >
                            <LogOut size={16} />
                            ออกจากระบบ
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">

                {/* Top Section: Action Center & Menu Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* 1. Action Center (Pending Tasks) */}
                        <ActionCenter pendingCount={pendingCount} ticketsCount={ticketsCount} />

                        {/* 2. Menu Grid */}
                        <MenuGrid pendingCount={pendingCount} ticketsCount={ticketsCount} />
                    </div>

                    <div className="lg:col-span-1">
                        {/* Recent Activity Feed */}
                        <RecentActivityWidget />
                    </div>
                </div>

                {/* Section 2: Online Users & Website Traffic (Related) */}
                <div className="space-y-6">
                    {/* Online Users */}
                    <OnlineUsersWidget
                        onlineUsers={onlineUsers}
                        formatOnlineDuration={formatOnlineDuration}
                        todayVisitors={dailyVisits[new Date().toISOString().split('T')[0]] || 0}
                    />

                    {/* Traffic Analytics */}
                    <TrafficAnalytics
                        dailyVisits={dailyVisits}
                        totalVisits={totalVisits}
                        deviceStats={deviceStats}
                        sourceStats={sourceStats}
                        pageViewStats={pageViewStats}
                        enrollmentHours={enrollmentHours}
                    />
                </div>

                {/* 4. Stats & Analytics */}
                <div id="report-section">
                    {/* Section Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📈</span>
                            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">รายงานสถิติ</h2>
                        </div>
                        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg">
                            <span className="text-sm">📅</span>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer text-sm"
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
                        {/* Monthly Summary */}
                        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
                            <div className="flex items-center gap-2 text-sm text-slate-500 mb-5">
                                <span>📅</span>
                                <span>สรุปรายได้และจำนวนนักเรียนรายเดือน</span>
                            </div>

                            <div className="space-y-3">
                                {stats.monthlyData.map((m, index) => {
                                    const maxRevenue = stats.maxMonthlyRevenue || 1;
                                    const widthPercent = m.revenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;

                                    return (
                                        <div key={index} className="flex items-center gap-4">
                                            <div className="w-8 text-sm text-slate-400 font-medium">{m.month}</div>
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-0.5 min-h-[24px]">
                                                    {m.students > 0 ? (
                                                        <>
                                                            {Array.from({ length: m.students }).map((_, i) => (
                                                                <span key={i} className="text-[10px] text-emerald-500/80 leading-none" title={`คนที่ ${i + 1}`}>
                                                                    👤
                                                                </span>
                                                            ))}
                                                            <span className="text-[10px] text-slate-500 font-medium ml-1.5 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200">
                                                                {m.students} คน
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-sm text-slate-300 italic pt-0.5">-</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="w-24 text-right">
                                                <span className={`text-sm font-medium ${m.revenue > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                                    {m.revenue > 0 ? `฿${m.revenue.toLocaleString()}` : '-'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Course Ranking */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <div className="flex items-center gap-2 text-sm text-slate-500 mb-5">
                                <span>🏆</span>
                                <span>อันดับคอร์สขายดี</span>
                            </div>

                            <div className="space-y-2">
                                {stats.courseData.map((c, index) => (
                                    <div key={index} className="flex items-center gap-3 py-2">
                                        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold
                                            ${index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-100 text-slate-600' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-400'}`}
                                        >
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-700 truncate">{c.title}</p>
                                            <p className="text-xs text-slate-400">{c.students} คน</p>
                                        </div>
                                        <div className="text-sm font-medium text-slate-700">
                                            ฿{c.revenue.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                                {stats.courseData.length === 0 && (
                                    <div className="text-center py-6 text-slate-400 italic text-sm">
                                        ยังไม่มีข้อมูลคอร์ส
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}