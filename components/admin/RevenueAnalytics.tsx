"use client";

import { ArrowUpRight, ArrowDownRight, TrendingUp, Users, DollarSign, Activity } from "lucide-react";
import RevenueChart from "./RevenueChart";
import TopStudents from "./TopStudents";
import type { ActiveStudent } from "@/hooks/useAdminLearningStats";

interface RevenueAnalyticsProps {
    stats: any;
    selectedYear: number;
    topActiveStudents?: ActiveStudent[];
}

export default function RevenueAnalytics({ stats, selectedYear, topActiveStudents = [] }: RevenueAnalyticsProps) {
    const {
        monthlyData,
        dailyData,
        revenueGrowth,
        totalRevenue,
        ltv,
        retentionRate,
        aov,
    } = stats;

    // Helper for Growth Indicator
    const GrowthIndicator = ({ value, prefix = "", suffix = "%" }: { value: number, prefix?: string, suffix?: string }) => {
        const isPositive = value >= 0;
        return (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {prefix}{Math.abs(value).toFixed(1)}{suffix}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 1. Key Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Revenue */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                            <DollarSign size={20} />
                        </div>
                        <GrowthIndicator value={revenueGrowth} />
                    </div>
                    <div className="mt-2">
                        <p className="text-sm text-slate-500 font-medium">รายได้รวม</p>
                        <h3 className="text-2xl font-bold text-slate-800">฿{totalRevenue.toLocaleString()}</h3>
                        <p className="text-xs text-slate-400 mt-1">ปี {selectedYear + 543}</p>
                    </div>
                </div>

                {/* LTV */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <p className="text-sm text-slate-500 font-medium">Lifetime Value (LTV)</p>
                        <h3 className="text-2xl font-bold text-slate-800">฿{ltv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                        <p className="text-xs text-slate-400 mt-1">รายได้เฉลี่ยต่อนักเรียน</p>
                    </div>
                </div>

                {/* AOV */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                            <Activity size={20} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <p className="text-sm text-slate-500 font-medium">ยอดสมัครเฉลี่ย</p>
                        <h3 className="text-2xl font-bold text-slate-800">฿{aov.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                        <p className="text-xs text-slate-400 mt-1">ต่อการสมัคร 1 ครั้ง</p>
                    </div>
                </div>

                {/* Retention */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <p className="text-sm text-slate-500 font-medium">อัตราซื้อซ้ำ</p>
                        <h3 className="text-2xl font-bold text-slate-800">{retentionRate.toFixed(1)}%</h3>
                        <p className="text-xs text-slate-400 mt-1">นักเรียนที่สมัคร {'>'}1 คอร์ส</p>
                    </div>
                </div>
            </div>

            {/* 2. Main Chart & Top Active Students */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Revenue Chart (Bar + Line) */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-800">รายได้ & จำนวนสมัคร</h3>
                        <p className="text-sm text-slate-500">เปรียบเทียบรายได้กับจำนวนนักเรียนที่สมัคร</p>
                    </div>

                    <RevenueChart data={monthlyData} dailyData={dailyData} selectedYear={selectedYear} />
                </div>

                {/* Right: Top Active Students (แทน Whales) */}
                <div className="lg:col-span-1">
                    <TopStudents students={topActiveStudents} />
                </div>
            </div>
        </div>
    );
}
