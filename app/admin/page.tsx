"use client";
import { useState } from "react";
import Link from "next/link";
import { useUserAuth } from "@/context/AuthContext";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useAdminLearningStats } from "@/hooks/useAdminLearningStats";
import { Home, LogOut, Loader2 } from "lucide-react";

// Components
import StatsOverview from "@/components/admin/StatsOverview";
import RevenueAnalytics from "@/components/admin/RevenueAnalytics";
import LearningHealth from "@/components/admin/LearningHealth";
import ContentPerformance from "@/components/admin/ContentPerformance";
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

    // Learning Stats Hook (manual trigger — only fetches when user clicks "โหลดข้อมูลการเรียน")
    const {
        loading: learningLoading,
        hasFetched: learningFetched,
        fetchStats: fetchLearningStats,
        overallCompletionRate,
        courseCompletionRates,
        averageActiveDays,
        activeStudentsTrend,
        mostEngagingLessons,
        dropOffPoints,
        topActiveStudents
    } = useAdminLearningStats();

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

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-700">

            {/* Header - Clean & Minimal (always visible immediately) */}
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

                {/* Top Section: Action Center & Menu Grid (show immediately with loading state) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* 1. Action Center (Pending Tasks) */}
                        {loading ? (
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <div className="animate-pulse flex gap-4">
                                    <div className="h-16 w-32 bg-slate-100 rounded-lg" />
                                    <div className="h-16 w-32 bg-slate-100 rounded-lg" />
                                </div>
                            </div>
                        ) : (
                            <ActionCenter pendingCount={pendingCount} ticketsCount={ticketsCount} />
                        )}

                        {/* 2. Menu Grid (always show — no data dependency) */}
                        <MenuGrid pendingCount={loading ? 0 : pendingCount} ticketsCount={loading ? 0 : ticketsCount} />
                    </div>

                    <div className="lg:col-span-1">
                        {/* Recent Activity Feed */}
                        <RecentActivityWidget />
                    </div>
                </div>

                {/* Section 2: Online Users & Website Traffic (Related) */}
                {loading ? (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <div className="animate-pulse space-y-3">
                                <div className="h-5 bg-slate-100 rounded w-40" />
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="h-12 bg-slate-50 rounded-lg" />
                                    <div className="h-12 bg-slate-50 rounded-lg" />
                                    <div className="h-12 bg-slate-50 rounded-lg" />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
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
                )}

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

                    {/* Revenue Analytics (KPIs + Chart + Active Students) */}
                    {loading ? (
                        <div className="mb-8 bg-white rounded-xl border border-slate-200 p-6">
                            <div className="animate-pulse space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-50 rounded-lg" />)}
                                </div>
                                <div className="h-48 bg-slate-50 rounded-lg" />
                            </div>
                        </div>
                    ) : (
                        <div className="mb-8">
                            <RevenueAnalytics stats={stats} selectedYear={selectedYear} topActiveStudents={topActiveStudents} />
                        </div>
                    )}

                    {/* Learning Health Section (loaded on demand to reduce Firestore reads) */}
                    {!learningFetched && !learningLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <p className="text-sm text-slate-400">ข้อมูลสถิติการเรียนยังไม่ถูกโหลด</p>
                            <button
                                onClick={fetchLearningStats}
                                className="px-5 py-2.5 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
                            >
                                📊 โหลดข้อมูลการเรียน
                            </button>
                        </div>
                    ) : learningLoading ? (
                        <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                            <Loader2 className="animate-spin" size={18} />
                            <span className="text-sm">กำลังโหลดข้อมูลการเรียน...</span>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <LearningHealth
                                overallCompletionRate={overallCompletionRate}
                                courseCompletionRates={courseCompletionRates}
                                averageActiveDays={averageActiveDays}
                                activeStudentsTrend={activeStudentsTrend}
                            />

                            <ContentPerformance
                                mostEngagingLessons={mostEngagingLessons}
                                dropOffPoints={dropOffPoints}
                            />
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}