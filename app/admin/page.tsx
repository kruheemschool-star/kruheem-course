"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useUserAuth } from "@/context/AuthContext";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useAdminLearningStats } from "@/hooks/useAdminLearningStats";
import {
    Loader2, RefreshCw, Wallet, UserPlus, Users, Repeat, Radio,
    TrendingUp, TrendingDown, AlertTriangle, ChevronRight, Receipt,
    LifeBuoy, CheckCircle2, BarChart3, GraduationCap, Eye,
} from "lucide-react";

import RevenueChart from "@/components/admin/RevenueChart";
import TopStudents from "@/components/admin/TopStudents";
import LearningHealth from "@/components/admin/LearningHealth";
import ContentPerformance from "@/components/admin/ContentPerformance";
import OnlineUsersWidget from "@/components/admin/OnlineUsersWidget";
import TrafficAnalytics from "@/components/admin/TrafficAnalytics";
import RecentActivityWidgetInline from "@/components/admin/RecentActivityWidgetInline";

/* ---------- tiny inline sparkline ---------- */
function Sparkline({ data, stroke = "var(--accent-2)" }: { data: number[]; stroke?: string }) {
    if (!data.length) return null;
    const w = 100, h = 28, max = Math.max(...data, 1), min = Math.min(...data, 0);
    const span = max - min || 1;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1 || 1)) * w;
        const y = h - ((v - min) / span) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-7 mt-2" aria-hidden>
            <polyline points={pts.join(" ")} fill="none" stroke={stroke} strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

/* ---------- KPI card ---------- */
function Kpi({
    icon: Icon, label, value, sub, delta, series, live, highlight,
}: {
    icon: any; label: string; value: string; sub?: string;
    delta?: number; series?: number[]; live?: boolean; highlight?: boolean;
}) {
    const hasDelta = typeof delta === "number" && isFinite(delta);
    const up = (delta ?? 0) >= 0;
    return (
        <div
            className="kh-card kh-card-h p-4 flex flex-col"
            style={highlight ? { background: "linear-gradient(135deg,var(--accent),var(--accent-ink))", borderColor: "transparent", color: "#fff" } : undefined}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={highlight ? { background: "rgba(255,255,255,.18)" } : { background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                        <Icon size={16} strokeWidth={1.8} color={highlight ? "#fff" : undefined} />
                    </div>
                    <span className="text-[12px] font-medium" style={{ color: highlight ? "rgba(255,255,255,.85)" : "var(--ink-2)" }}>{label}</span>
                </div>
                {live && (
                    <span className="kh-pulse text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}>LIVE</span>
                )}
                {!live && hasDelta && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{
                            background: up ? "var(--good-soft)" : "var(--danger-soft)",
                            color: up ? "var(--good)" : "var(--danger)",
                        }}>
                        {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{Math.abs(delta!).toFixed(1)}%
                    </span>
                )}
            </div>
            <div className="kh-num kh-display mt-3 text-[26px] font-semibold leading-none"
                style={{ color: highlight ? "#fff" : "var(--ink)" }}>{value}</div>
            {sub && <div className="text-[11.5px] mt-1" style={{ color: highlight ? "rgba(255,255,255,.8)" : "var(--ink-3)" }}>{sub}</div>}
            {series && <Sparkline data={series} stroke={highlight ? "rgba(255,255,255,.85)" : "var(--accent-2)"} />}
        </div>
    );
}

/* ---------- section header ---------- */
function SectionHead({ icon: Icon, title, children }: { icon: any; title: string; children?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between mb-3 mt-2">
            <div className="kh-eyebrow"><Icon size={15} strokeWidth={1.9} />{title}</div>
            {children}
        </div>
    );
}

export default function AdminDashboard() {
    const { pendingCount: authPendingCount } = useUserAuth();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const {
        loading, enrollments, pendingCount, ticketsCount,
        onlineUsers, onlineLoading, onlineFetched, fetchOnlineUsers,
        dailyVisits, totalVisits, deviceStats, sourceStats, pageViewStats,
        stats, fetchData: refreshStats, recentActivities,
    } = useAdminStats(selectedYear, authPendingCount);

    const {
        loading: learningLoading, hasFetched: learningFetched, fetchStats: fetchLearningStats,
        overallCompletionRate, courseCompletionRates, averageActiveDays, activeStudentsTrend,
        mostEngagingLessons, dropOffPoints, topActiveStudents,
    } = useAdminLearningStats();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshStats();
        setIsRefreshing(false);
    };

    // Auto-load online users ONCE per visit, after the main data is ready (so member
    // status resolves correctly). Not polled — admin can hit "รีเฟรช" to update.
    useEffect(() => {
        if (!loading && !onlineFetched && !onlineLoading) {
            fetchOnlineUsers();
        }
    }, [loading, onlineFetched, onlineLoading, fetchOnlineUsers]);

    // ---- derived KPI values (all from real data) ----
    const cm = new Date().getMonth();
    const uniqueStudents = useMemo(
        () => new Set(enrollments.map((e) => e.userEmail).filter(Boolean)).size,
        [enrollments]
    );
    const signupsThisMonth = stats.monthlyData?.[cm]?.students ?? 0;
    const signupsLastMonth = cm > 0 ? stats.monthlyData?.[cm - 1]?.students ?? 0 : 0;
    const signupDelta = signupsLastMonth > 0 ? ((signupsThisMonth - signupsLastMonth) / signupsLastMonth) * 100 : 0;
    const revSeries = (stats.dailyData ?? []).slice(-30).map((d: any) => d.revenue);
    const signupSeries = (stats.dailyData ?? []).slice(-30).map((d: any) => d.students);

    const formatOnlineDuration = (startTime: Date | null): string => {
        if (!startTime) return "เพิ่งเข้าชมเมื่อสักครู่";
        const diffMs = Date.now() - startTime.getTime();
        if (diffMs < 0) return "เพิ่งเข้าชมเมื่อสักครู่";
        const totalMinutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours === 0 && minutes === 0) return "เพิ่งเข้าชมเมื่อสักครู่";
        if (hours === 0) return `ออนไลน์มา ${minutes} นาที`;
        if (minutes === 0) return `ออนไลน์มา ${hours} ชั่วโมง`;
        return `ออนไลน์มา ${hours} ชม. ${minutes} น.`;
    };
    const enrollmentHours = enrollments.map((e) =>
        e.createdAt?.toDate ? e.createdAt.toDate().getHours() : new Date().getHours());

    const totalUrgent = pendingCount + ticketsCount;

    return (
        <div className="space-y-7">
            {/* ============ ผู้ใช้งานออนไลน์ (auto-load, top) ============ */}
            <div>
                <SectionHead icon={Radio} title="ผู้ใช้งานออนไลน์">
                    {onlineFetched && (
                        <button onClick={fetchOnlineUsers} disabled={onlineLoading} className="kh-btn-ghost text-[12px]">
                            <RefreshCw size={13} className={onlineLoading ? "animate-spin" : ""} />รีเฟรช
                        </button>
                    )}
                </SectionHead>
                {!onlineFetched ? (
                    <div className="kh-card p-10 flex items-center justify-center gap-2 kh-ink3">
                        <Loader2 className="animate-spin" size={18} /><span className="text-[13px]">กำลังโหลดข้อมูลผู้ใช้งานออนไลน์...</span>
                    </div>
                ) : (
                    <OnlineUsersWidget
                        onlineUsers={onlineUsers}
                        formatOnlineDuration={formatOnlineDuration}
                        todayVisitors={dailyVisits[new Date().toISOString().split("T")[0]] || 0} />
                )}
            </div>

            {/* ============ HERO: urgent tasks ============ */}
            {totalUrgent > 0 ? (
                <section className="kh-card p-5" style={{ background: "var(--card)" }}>
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                            <AlertTriangle size={20} strokeWidth={1.9} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-[18px] font-semibold kh-ink">
                                มี {totalUrgent} รายการรอดำเนินการ
                            </h2>
                            <p className="text-[12.5px] kh-ink3">เคลียร์งานด่วนเหล่านี้ก่อนเริ่มงานอื่น</p>

                            <div className="grid sm:grid-cols-2 gap-3 mt-4">
                                {pendingCount > 0 && (
                                    <Link href="/admin/enrollments"
                                        className="kh-card-h group flex items-center gap-3 p-3 rounded-xl"
                                        style={{ background: "var(--danger-soft)", border: "1px solid color-mix(in srgb,var(--danger) 22%,transparent)" }}>
                                        <Receipt size={20} style={{ color: "var(--danger)" }} />
                                        <div className="flex-1">
                                            <div className="text-[13px] font-semibold" style={{ color: "var(--danger)" }}>สลิปรออนุมัติ</div>
                                            <div className="text-[11.5px] kh-ink3">{pendingCount} รายการ</div>
                                        </div>
                                        <ChevronRight size={16} style={{ color: "var(--danger)" }} className="group-hover:translate-x-0.5 transition-transform" />
                                    </Link>
                                )}
                                {ticketsCount > 0 && (
                                    <Link href="/admin/support"
                                        className="kh-card-h group flex items-center gap-3 p-3 rounded-xl"
                                        style={{ background: "var(--warn-soft)", border: "1px solid color-mix(in srgb,var(--warn) 22%,transparent)" }}>
                                        <LifeBuoy size={20} style={{ color: "var(--warn)" }} />
                                        <div className="flex-1">
                                            <div className="text-[13px] font-semibold" style={{ color: "var(--warn)" }}>Ticket รอตรวจ</div>
                                            <div className="text-[11.5px] kh-ink3">{ticketsCount} รายการ</div>
                                        </div>
                                        <ChevronRight size={16} style={{ color: "var(--warn)" }} className="group-hover:translate-x-0.5 transition-transform" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            ) : !loading ? (
                <section className="kh-card p-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "var(--good-soft)", color: "var(--good)" }}>
                        <CheckCircle2 size={20} strokeWidth={1.9} />
                    </div>
                    <div>
                        <h2 className="text-[16px] font-semibold kh-ink">เคลียร์งานด่วนหมดแล้ว 🎉</h2>
                        <p className="text-[12.5px] kh-ink3">ไม่มีสลิปหรือ Ticket รอดำเนินการตอนนี้</p>
                    </div>
                </section>
            ) : null}

            {/* ============ KPI STRIP ============ */}
            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="kh-card p-4 h-[120px] animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <Kpi icon={Wallet} label={`รายได้รวม ปี ${selectedYear + 543}`}
                        value={`฿${stats.totalRevenue.toLocaleString()}`}
                        delta={stats.revenueGrowth} series={revSeries} />
                    <Kpi icon={UserPlus} label="สมัครเดือนนี้"
                        value={signupsThisMonth.toLocaleString()} sub="คนที่สมัครเดือนนี้"
                        delta={signupDelta} series={signupSeries} />
                    <Kpi icon={Users} label="นักเรียนทั้งหมด"
                        value={uniqueStudents.toLocaleString()} sub="นับจากผู้ที่เคยสมัคร" />
                    <Kpi icon={Repeat} label="อัตราซื้อซ้ำ"
                        value={`${stats.retentionRate.toFixed(1)}%`} sub="สมัคร > 1 คอร์ส" />
                    <Kpi icon={Radio} label="ออนไลน์ตอนนี้"
                        value={onlineFetched ? onlineUsers.length.toLocaleString() : "—"}
                        sub={onlineFetched ? "ผู้ใช้กำลังออนไลน์" : "กำลังโหลด..."} live highlight />
                </div>
            )}

            {/* ============ REVENUE & SIGNUPS + RECENT ACTIVITY ============ */}
            <div>
                <SectionHead icon={BarChart3} title="รายได้ & การสมัคร">
                    <div className="flex items-center gap-2">
                        <button onClick={handleRefresh} disabled={isRefreshing || loading} className="kh-btn-ghost text-[12px]">
                            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
                            {isRefreshing ? "กำลังโหลด..." : "รีเฟรช"}
                        </button>
                        <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="kh-select w-auto text-[13px] py-2 cursor-pointer">
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                                <option key={y} value={y}>ปี {y + 543}</option>
                            ))}
                        </select>
                    </div>
                </SectionHead>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 kh-card p-5">
                        <h3 className="text-[15px] font-semibold kh-ink mb-0.5">รายได้ & จำนวนสมัคร</h3>
                        <p className="text-[12px] kh-ink3 mb-3">เปรียบเทียบรายได้กับจำนวนนักเรียนที่สมัคร</p>
                        {loading
                            ? <div className="h-[350px] animate-pulse rounded-lg" style={{ background: "var(--card-2)" }} />
                            : <RevenueChart data={stats.monthlyData} dailyData={stats.dailyData} selectedYear={selectedYear} />}
                    </div>
                    <div className="lg:col-span-1">
                        <RecentActivityWidgetInline activities={recentActivities} loading={loading} />
                    </div>
                </div>
            </div>

            {/* ============ LEARNING HEALTH (lazy) ============ */}
            <div>
                <SectionHead icon={GraduationCap} title="สุขภาพการเรียน" />
                {!learningFetched && !learningLoading ? (
                    <div className="kh-card p-8 flex flex-col items-center gap-3">
                        <GraduationCap size={26} className="kh-ink3" />
                        <p className="text-[13px] kh-ink3">ข้อมูลสถิติการเรียนยังไม่ถูกโหลด</p>
                        <button onClick={fetchLearningStats} className="kh-btn"><BarChart3 size={15} />โหลดข้อมูลการเรียน</button>
                    </div>
                ) : learningLoading ? (
                    <div className="kh-card p-10 flex items-center justify-center gap-2 kh-ink3">
                        <Loader2 className="animate-spin" size={18} /><span className="text-[13px]">กำลังโหลดข้อมูลการเรียน...</span>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            <div className="lg:col-span-2">
                                <LearningHealth
                                    overallCompletionRate={overallCompletionRate}
                                    courseCompletionRates={courseCompletionRates}
                                    averageActiveDays={averageActiveDays}
                                    activeStudentsTrend={activeStudentsTrend} />
                            </div>
                            <div className="lg:col-span-1">
                                <TopStudents students={topActiveStudents} />
                            </div>
                        </div>
                        <ContentPerformance mostEngagingLessons={mostEngagingLessons} dropOffPoints={dropOffPoints} />
                    </div>
                )}
            </div>

            {/* ============ TRAFFIC ============ */}
            <div>
                <SectionHead icon={Eye} title="ทราฟฟิกเว็บไซต์" />
                {loading ? (
                    <div className="kh-card p-6"><div className="h-40 animate-pulse rounded-lg" style={{ background: "var(--card-2)" }} /></div>
                ) : (
                    <TrafficAnalytics
                        dailyVisits={dailyVisits}
                        totalVisits={totalVisits}
                        deviceStats={deviceStats}
                        sourceStats={sourceStats}
                        pageViewStats={pageViewStats}
                        enrollmentHours={enrollmentHours} />
                )}
            </div>
        </div>
    );
}
