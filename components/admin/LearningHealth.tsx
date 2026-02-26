"use client";

import { GraduationCap, Flame, TrendingDown, TrendingUp, CalendarDays } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { CourseCompletionData } from "@/hooks/useAdminLearningStats";

interface LearningHealthProps {
    overallCompletionRate: number;
    courseCompletionRates: CourseCompletionData[];
    averageActiveDays: number;
    activeStudentsTrend: { date: string; count: number }[];
}

export default function LearningHealth({
    overallCompletionRate,
    courseCompletionRates,
    averageActiveDays,
    activeStudentsTrend
}: LearningHealthProps) {
    // Determine health status
    const getHealthColor = (rate: number) => {
        if (rate >= 70) return { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: '#10b981' };
        if (rate >= 40) return { bg: 'bg-amber-50', text: 'text-amber-600', bar: '#f59e0b' };
        return { bg: 'bg-rose-50', text: 'text-rose-600', bar: '#ef4444' };
    };

    const overallColor = getHealthColor(overallCompletionRate);

    // Format trend data for chart (show last 14 days for readability)
    const trendData = activeStudentsTrend.slice(-14).map(d => ({
        date: new Date(d.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
        count: d.count
    }));

    // Trend direction
    const recentAvg = activeStudentsTrend.slice(-7).reduce((s, d) => s + d.count, 0) / 7;
    const prevAvg = activeStudentsTrend.slice(-14, -7).reduce((s, d) => s + d.count, 0) / 7;
    const trendUp = recentAvg >= prevAvg;

    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center">
                    <GraduationCap size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">พฤติกรรมการเรียน (Learning Health)</h3>
                    <p className="text-sm text-slate-500">ซื้อไปดอง หรือ ซื้อไปเรียน?</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Overall Completion Rate */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                            <GraduationCap size={16} className="text-violet-500" />
                            <span className="text-sm font-semibold text-slate-600">อัตราการเรียนจบเฉลี่ย</span>
                        </div>
                        <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${overallColor.bg} ${overallColor.text}`}>
                            {overallCompletionRate >= 70 ? 'ดีมาก' : overallCompletionRate >= 40 ? 'พอใช้' : 'ต้องปรับปรุง'}
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-800 mb-3">{overallCompletionRate}%</div>

                    {/* Progress bars per course */}
                    <div className="space-y-3 mt-4">
                        {courseCompletionRates.slice(0, 5).map((course) => {
                            const color = getHealthColor(course.avgProgress);
                            return (
                                <div key={course.courseId}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-medium text-slate-600 truncate max-w-[200px]" title={course.title}>
                                            {course.title}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500 flex-shrink-0 ml-2">
                                            {course.avgProgress}% ({course.completedStudents}/{course.totalStudents} จบ)
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div
                                            className="h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, course.avgProgress)}%`, backgroundColor: color.bar }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {courseCompletionRates.length === 0 && (
                            <p className="text-xs text-slate-400 italic text-center py-4">ยังไม่มีข้อมูลการเรียน</p>
                        )}
                    </div>
                </div>

                {/* Active Days & Trend */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                            <CalendarDays size={16} className="text-orange-500" />
                            <span className="text-sm font-semibold text-slate-600">ความสม่ำเสมอในการเรียน</span>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {trendUp ? 'กำลังดีขึ้น' : 'กำลังลดลง'}
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-3xl font-black text-slate-800">{averageActiveDays}</span>
                        <span className="text-sm text-slate-500 font-medium">วัน / คน (30 วันล่าสุด)</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-4">จำนวนวันเฉลี่ยที่นักเรียนเข้ามาเรียนใน 30 วันที่ผ่านมา</p>

                    {/* Mini trend chart */}
                    <div className="w-full h-[160px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    interval={2}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '12px'
                                    }}
                                    formatter={(value: any) => [`${value ?? 0} คน`, 'นักเรียนที่เข้าเรียน']}
                                />
                                <Bar
                                    dataKey="count"
                                    fill="#8b5cf6"
                                    radius={[3, 3, 0, 0]}
                                    maxBarSize={24}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
