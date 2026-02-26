"use client";

import { useMemo, useState } from 'react';
import TrafficChart from "@/app/admin/components/TrafficChart";

interface TrafficAnalyticsProps {
    dailyVisits: Record<string, number>;
    totalVisits: number;
    deviceStats: { mobile: number; tablet: number; desktop: number };
    sourceStats: Record<string, number>;
    pageViewStats: Record<string, number>;
    enrollmentHours: number[];
}

export default function TrafficAnalytics({ dailyVisits, totalVisits, deviceStats, sourceStats, pageViewStats, enrollmentHours }: TrafficAnalyticsProps) {
    const [trafficTimeRange, setTrafficTimeRange] = useState<'week' | 'month' | 'year'>('week');

    // Helper: Convert technical paths to friendly Thai labels
    const getPageLabel = (path: string): string => {
        if (path === '/') return '🏠 หน้าแรก';
        if (path === '/my-courses') return '📚 คอร์สของฉัน';
        if (path.startsWith('/course/')) return '📖 หน้าคอร์สเรียน';
        if (path.startsWith('/learn/')) return '🎓 ห้องเรียน';
        if (path === '/login') return '🔐 หน้าเข้าสู่ระบบ';
        if (path === '/register') return '✍️ หน้าสมัครสมาชิก';
        if (path === '/payment') return '💳 หน้าชำระเงิน';
        if (path === '/profile') return '👤 โปรไฟล์';
        if (path === '/exam') return '📝 หน้าข้อสอบ';
        if (path.startsWith('/exam/')) return '📝 ทำข้อสอบ';
        if (path === '/practice') return '✏️ หน้าฝึกทำโจทย์';
        if (path === '/reviews') return '⭐ รีวิว';
        if (path === '/faq') return '❓ คำถามที่พบบ่อย';
        if (path.startsWith('/blog/')) return '📰 บทความ';
        if (path.startsWith('/parent-dashboard/')) return '👨‍👩‍👧 แดชบอร์ดผู้ปกครอง';
        return path; // Fallback to original path
    };

    const chartData = useMemo(() => {
        let dataPoints: { label: string, value: number, fullLabel: string }[] = [];

        if (trafficTimeRange === 'week' || trafficTimeRange === 'month') {
            const daysCount = trafficTimeRange === 'week' ? 7 : 30;
            for (let i = daysCount - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
                dataPoints.push({
                    label: d.toLocaleDateString('th-TH', { day: 'numeric', month: trafficTimeRange === 'week' ? 'short' : undefined }),
                    value: dailyVisits[dateStr] || 0,
                    fullLabel: d.toLocaleDateString('th-TH', { dateStyle: 'long' })
                });
            }
        } else {
            const currentYear = new Date().getFullYear();
            const monthlyVisits: Record<string, number> = {};

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

    // Calculate peak hour
    const peakHour = useMemo(() => {
        if (enrollmentHours.length === 0) return 0;
        const counts: Record<number, number> = {};
        enrollmentHours.forEach(h => counts[h] = (counts[h] || 0) + 1);
        return Object.keys(counts).reduce((a, b) => counts[+a] > counts[+b] ? +a : +b, 0);
    }, [enrollmentHours]);

    // Calculate device percentages
    const deviceTotal = deviceStats.mobile + deviceStats.tablet + deviceStats.desktop || 1;
    const deviceData = [
        { label: 'Mobile', value: deviceStats.mobile, icon: '📱' },
        { label: 'Desktop', value: deviceStats.desktop, icon: '💻' },
        { label: 'Tablet', value: deviceStats.tablet, icon: '📟' }
    ];

    return (
        <div className="space-y-6">
            {/* Header with Total & Time Range */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-lg">📊</span>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Website Traffic</h3>
                        <p className="text-2xl font-bold text-slate-800">{totalVisits.toLocaleString()} <span className="text-sm font-normal text-slate-400">ครั้ง</span></p>
                    </div>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {(['week', 'month', 'year'] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => setTrafficTimeRange(range)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${trafficTimeRange === range
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {range === 'week' ? '7 วัน' : range === 'month' ? '30 วัน' : 'ปีนี้'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart - Takes 2 columns */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
                    <h4 className="text-sm font-medium text-slate-600 mb-4">
                        {trafficTimeRange === 'week' && "ยอดคนเข้าชม 7 วันล่าสุด"}
                        {trafficTimeRange === 'month' && "ยอดคนเข้าชม 30 วันล่าสุด"}
                        {trafficTimeRange === 'year' && "ยอดคนเข้าชมรายเดือน (ปีนี้)"}
                    </h4>
                    <div className="h-[300px]">
                        <TrafficChart data={chartData} />
                    </div>
                </div>

                {/* Right Column - Insights */}
                <div className="space-y-4">
                    {/* Peak Hour */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                            <span>⏰</span>
                            <span>ช่วงเวลาซื้อคอร์สเยอะที่สุด</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">
                            {peakHour}:00 - {peakHour + 1}:00 น.
                        </p>
                        <p className="text-xs text-slate-400 mt-1">แนะนำให้ยิงโฆษณาหรือโพสต์ขายในช่วงนี้</p>
                    </div>

                    {/* Device Stats */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                            <span>📱</span>
                            <span>อุปกรณ์ที่ใช้เข้าชม</span>
                        </div>
                        <div className="space-y-3">
                            {deviceData.map(d => {
                                const percent = Math.round((d.value / deviceTotal) * 100);
                                return (
                                    <div key={d.label}>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="text-slate-600">{d.icon} {d.label}</span>
                                            <span className="font-medium text-slate-800">{percent}%</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-slate-400 rounded-full transition-all"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row - Sources & Top Pages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Traffic Sources */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                        <span>🔗</span>
                        <span>ช่องทางที่มาเยือน (Traffic Sources)</span>
                    </div>
                    {Object.keys(sourceStats).length > 0 ? (
                        <div className="space-y-3">
                            {Object.entries(sourceStats)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([source, count]) => {
                                    const total = Object.values(sourceStats).reduce((a, b) => a + b, 0) || 1;
                                    const percent = Math.round((count / total) * 100);
                                    return (
                                        <div key={source} className="flex items-center justify-between">
                                            <span className="text-sm text-slate-700 capitalize flex items-center gap-2">
                                                {source === 'direct' && '🔗'}
                                                {source === 'google' && '🔍'}
                                                {source === 'facebook' && '📘'}
                                                {source === 'internal' && '🏠'}
                                                {!['direct', 'google', 'facebook', 'internal'].includes(source) && '🌐'}
                                                {source}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-slate-800">{count.toLocaleString()}</span>
                                                <span className="text-xs text-slate-400 w-10 text-right">({percent}%)</span>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 italic">ยังไม่มีข้อมูล</p>
                    )}
                </div>

                {/* Top Pages */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                        <span>📄</span>
                        <span>หน้าที่มีคนเข้าชมมากที่สุด</span>
                    </div>
                    {Object.keys(pageViewStats).length > 0 ? (
                        <div className="space-y-3">
                            {Object.entries(pageViewStats)
                                .filter(([path]) => path.startsWith('/'))
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([path, count], idx) => (
                                    <div key={path} className="flex items-center justify-between">
                                        <span className="text-sm text-slate-700 truncate max-w-[200px]">
                                            <span className="text-slate-400 mr-2">{idx + 1}.</span>
                                            {getPageLabel(path)}
                                        </span>
                                        <span className="text-sm font-medium text-slate-800">{count.toLocaleString()} views</span>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 italic">ยังไม่มีข้อมูล</p>
                    )}
                </div>
            </div>
        </div>
    );
}
