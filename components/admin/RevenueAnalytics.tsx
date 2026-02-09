"use client";

import { ArrowUpRight, ArrowDownRight, TrendingUp, Users, DollarSign, Activity } from "lucide-react";
import RevenueChart from "./RevenueChart";
import TopStudents from "./TopStudents";

interface RevenueAnalyticsProps {
    stats: any; // Using any for flexibility based on the hook update
    selectedYear: number;
}

export default function RevenueAnalytics({ stats, selectedYear }: RevenueAnalyticsProps) {
    const {
        monthlyData,
        revenueGrowth,
        totalRevenue,
        ltv,
        retentionRate,
        aov,
        topStudents
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
            {/* 1. Key Metrics Cards (New Design) */}
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
                        <p className="text-sm text-slate-500 font-medium">Total Revenue</p>
                        <h3 className="text-2xl font-bold text-slate-800">฿{totalRevenue.toLocaleString()}</h3>
                        <p className="text-xs text-slate-400 mt-1">For Year {selectedYear + 543}</p>
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
                        <p className="text-xs text-slate-400 mt-1">Avg. revenue per student</p>
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
                        <p className="text-sm text-slate-500 font-medium">Avg. Order Value</p>
                        <h3 className="text-2xl font-bold text-slate-800">฿{aov.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                        <p className="text-xs text-slate-400 mt-1">Avg. per enrollment</p>
                    </div>
                </div>

                {/* Retention - Showing as conversion for now if retention calc is complex */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <p className="text-sm text-slate-500 font-medium">Repurchase Rate</p>
                        <h3 className="text-2xl font-bold text-slate-800">{retentionRate.toFixed(1)}%</h3>
                        <p className="text-xs text-slate-400 mt-1">Students with {'>'}1 course</p>
                    </div>
                </div>
            </div>

            {/* 2. Main Chart & Top Students */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Revenue Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Revenue Trends</h3>
                            <p className="text-sm text-slate-500">Compare with previous year performance</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-medium">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                <span className="text-slate-600">Current Year</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                                <span className="text-slate-400">Previous Year</span>
                            </div>
                        </div>
                    </div>

                    <RevenueChart data={monthlyData} />
                </div>

                {/* Right: Top Students */}
                <div className="lg:col-span-1">
                    <TopStudents students={topStudents} />
                </div>
            </div>
        </div>
    );
}
