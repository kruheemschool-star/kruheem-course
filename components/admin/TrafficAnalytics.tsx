import { useMemo, useState } from 'react';
import TrafficChart from "@/app/admin/components/TrafficChart";

interface TrafficAnalyticsProps {
    dailyVisits: Record<string, number>;
    totalVisits: number;
    deviceStats: { mobile: number; tablet: number; desktop: number };
    sourceStats: Record<string, number>;
    pageViewStats: Record<string, number>;
    enrollmentHours: number[]; // Array of 0-23 hours where enrollments happened
}

export default function TrafficAnalytics({ dailyVisits, totalVisits, deviceStats, sourceStats, pageViewStats, enrollmentHours }: TrafficAnalyticsProps) {
    const [trafficTimeRange, setTrafficTimeRange] = useState<'week' | 'month' | 'year'>('week');

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

    return (
        <div id="report-section" className="pt-8">
            <div className="lg:col-span-3 bg-white rounded-3xl p-8 shadow-sm mt-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <h3 className="font-bold text-xl text-stone-800 flex items-center gap-2">
                        <span className="text-sky-500">📊</span> สถิติผู้เข้าชมเว็บไซต์ (Website Traffic)
                    </h3>
                    <div className="flex bg-stone-100 p-1 rounded-xl">
                        {(['week', 'month', 'year'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setTrafficTimeRange(range)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition capitalize ${trafficTimeRange === range ? 'bg-white text-sky-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                            >
                                {range === 'week' ? 'รายสัปดาห์' : range === 'month' ? 'รายเดือน' : 'รายปี'}
                            </button>
                        ))}
                    </div>


                    <div className="mt-6 flex items-center justify-between gap-6 p-8 bg-gradient-to-r from-sky-50 to-blue-50 rounded-[2.5rem] border border-sky-100 shadow-sm relative overflow-hidden group w-full md:w-auto">
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
                    {/* Chart */}
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

                    {/* Insights & Demographics */}
                    <div className="space-y-6">
                        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                            <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                                <span className="text-xl">⏰</span> ช่วงเวลาที่คนซื้อคอร์สเยอะที่สุด
                            </h4>
                            <p className="text-3xl font-black text-amber-600">
                                {(() => {
                                    const maxHour = enrollmentHours.length > 0
                                        ? (() => {
                                            const counts: Record<number, number> = {};
                                            enrollmentHours.forEach(h => counts[h] = (counts[h] || 0) + 1);
                                            return Object.keys(counts).reduce((a, b) => counts[+a] > counts[+b] ? +a : +b, 0);
                                        })()
                                        : 0;
                                    return `${maxHour}:00 - ${maxHour + 1}:00 น.`;
                                })()}
                            </p>
                            <p className="text-sm text-amber-700/60 mt-1">
                                แนะนำให้ยิงโฆษณาหรือโพสต์ขายในช่วงเวลานี้
                            </p>
                        </div>

                        {/* Device Stats */}
                        <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                            <h4 className="font-bold text-indigo-800 mb-4 flex items-center gap-2">
                                <span className="text-xl">📱</span> อุปกรณ์ที่ใช้เข้าชม
                            </h4>
                            {(() => {
                                const total = deviceStats.mobile + deviceStats.tablet + deviceStats.desktop || 1;
                                return (
                                    <div className="space-y-3">
                                        {[
                                            { label: 'Mobile', value: deviceStats.mobile },
                                            { label: 'Desktop', value: deviceStats.desktop },
                                            { label: 'Tablet', value: deviceStats.tablet }
                                        ].map(d => (
                                            <div key={d.label} className="flex items-center justify-between">
                                                <span className="text-sm text-indigo-700">📱 {d.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-32 h-2 bg-indigo-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(d.value / total) * 100}%` }}></div>
                                                    </div>
                                                    <span className="text-sm font-bold text-indigo-600 w-12 text-right">{Math.round((d.value / total) * 100)}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* 🔗 TRAFFIC SOURCES + TOP PAGES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    {/* Traffic Sources */}
                    <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
                        <h4 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
                            <span className="text-xl">🔗</span> ช่องทางที่มาเยือน (Traffic Sources)
                        </h4>
                        {Object.keys(sourceStats).length > 0 ? (
                            <div className="space-y-2">
                                {Object.entries(sourceStats)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 6)
                                    .map(([source, count]) => {
                                        const total = Object.values(sourceStats).reduce((a, b) => a + b, 0) || 1;
                                        return (
                                            <div key={source} className="flex items-center justify-between">
                                                <span className="text-sm text-emerald-700 capitalize">🌐 {source}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-emerald-600">{count.toLocaleString()}</span>
                                                    <span className="text-xs text-emerald-500">({Math.round((count / total) * 100)}%)</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <p className="text-sm text-emerald-500 italic">ยังไม่มีข้อมูล</p>
                        )}
                    </div>

                    {/* Top Pages */}
                    <div className="bg-sky-50 rounded-2xl p-6 border border-sky-100">
                        <h4 className="font-bold text-sky-800 mb-4 flex items-center gap-2">
                            <span className="text-xl">📄</span> หน้าที่มีคนเข้าชมมากที่สุด
                        </h4>
                        {Object.keys(pageViewStats).length > 0 ? (
                            <div className="space-y-2">
                                {Object.entries(pageViewStats)
                                    .filter(([path]) => path.startsWith('/'))
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 6)
                                    .map(([path, count], idx) => (
                                        <div key={path} className="flex items-center justify-between">
                                            <span className="text-sm text-sky-700 truncate max-w-[180px]">{idx + 1}. {path}</span>
                                            <span className="text-sm font-bold text-sky-600">{count.toLocaleString()} views</span>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <p className="text-sm text-sky-500 italic">ยังไม่มีข้อมูล</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
