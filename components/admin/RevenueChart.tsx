"use client";

import { useState } from "react";
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export type TimeframeOption = '30d' | '3m' | 'year';

export interface MonthlyData {
    month: string;
    revenue: number;
    students: number;
    prevRevenue: number;
}

interface RevenueChartProps {
    data: MonthlyData[];
    dailyData?: { date: string; revenue: number; students: number }[];
    selectedYear: number;
}

export default function RevenueChart({ data, dailyData = [], selectedYear }: RevenueChartProps) {
    const [timeframe, setTimeframe] = useState<TimeframeOption>('30d');

    // Prepare chart data based on timeframe
    const getChartData = () => {
        const now = new Date();
        const currentMonthIndex = now.getMonth();

        if (timeframe === '30d' && dailyData.length > 0) {
            // Last 30 days - daily bars
            return dailyData.slice(-30).map(d => ({
                label: new Date(d.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
                revenue: d.revenue,
                students: d.students
            }));
        }

        if (timeframe === '3m') {
            // Last 3 months only
            const startMonth = Math.max(0, currentMonthIndex - 2);
            return data.slice(startMonth, currentMonthIndex + 1).map(d => ({
                label: d.month,
                revenue: d.revenue,
                students: d.students
            }));
        }

        // Full year - only show months up to current month
        const isCurrentYear = selectedYear === now.getFullYear();
        const endMonth = isCurrentYear ? currentMonthIndex + 1 : 12;
        return data.slice(0, endMonth).map(d => ({
            label: d.month,
            revenue: d.revenue,
            students: d.students
        }));
    };

    const chartData = getChartData();
    const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1);
    const maxStudents = Math.max(...chartData.map(d => d.students), 1);

    const timeframeOptions: { key: TimeframeOption; label: string }[] = [
        { key: '30d', label: '30 วัน' },
        { key: '3m', label: '3 เดือน' },
        { key: 'year', label: `ปี ${selectedYear + 543}` }
    ];

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || payload.length === 0) return null;
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-3 min-w-[160px]">
                <p className="text-xs font-bold text-slate-500 mb-2">{label}</p>
                {payload.map((entry: any, i: number) => (
                    <div key={i} className="flex justify-between items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                            <span className="text-slate-600">{entry.dataKey === 'revenue' ? 'รายได้' : 'สมัคร'}</span>
                        </div>
                        <span className="font-bold text-slate-800">
                            {entry.dataKey === 'revenue'
                                ? `฿${Number(entry.value).toLocaleString()}`
                                : `${entry.value} คน`}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div>
            {/* Timeframe Selector */}
            <div className="flex items-center gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
                {timeframeOptions.map(opt => (
                    <button
                        key={opt.key}
                        onClick={() => setTimeframe(opt.key)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            timeframe === opt.key
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Chart */}
            <div className="w-full h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            dy={10}
                            interval={timeframe === '30d' ? 4 : 0}
                        />
                        <YAxis
                            yAxisId="revenue"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            tickFormatter={(value) => `฿${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                            width={55}
                        />
                        <YAxis
                            yAxisId="students"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            tickFormatter={(value) => `${value} คน`}
                            width={50}
                            allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="top"
                            align="right"
                            height={36}
                            formatter={(value: string) => (
                                <span className="text-xs text-slate-500 font-medium">
                                    {value === 'revenue' ? '💰 รายได้' : '👤 จำนวนสมัคร'}
                                </span>
                            )}
                        />
                        <Bar
                            yAxisId="revenue"
                            dataKey="revenue"
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={timeframe === '30d' ? 16 : 48}
                            name="revenue"
                        />
                        <Line
                            yAxisId="students"
                            type="monotone"
                            dataKey="students"
                            stroke="#f59e0b"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                            activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                            name="students"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
