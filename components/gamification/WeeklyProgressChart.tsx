'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface WeeklyProgressChartProps {
    completedCourses: number;
    totalCourses: number;
    // In real implementation, this would come from user's learning history
    weeklyData?: number[]; // Array of 7 days (lessons watched per day)
}

export default function WeeklyProgressChart({
    completedCourses,
    totalCourses,
    weeklyData = [2, 3, 1, 4, 2, 5, 3] // Mock data - would be from user's actual activity
}: WeeklyProgressChartProps) {

    // Calculate stats
    const stats = useMemo(() => {
        const total = weeklyData.reduce((a, b) => a + b, 0);
        const avg = total / weeklyData.length;
        const max = Math.max(...weeklyData);

        // Trend: compare last 3 days avg vs first 3 days avg
        const firstHalf = weeklyData.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const lastHalf = weeklyData.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const trend = lastHalf > firstHalf ? 'up' : lastHalf < firstHalf ? 'down' : 'stable';

        return { total, avg: avg.toFixed(1), max, trend };
    }, [weeklyData]);

    const days = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
    const maxHeight = 40;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Weekly Activity
                </h4>
                <div className="flex items-center gap-1">
                    {stats.trend === 'up' && (
                        <>
                            <TrendingUp size={14} className="text-emerald-500" />
                            <span className="text-[10px] text-emerald-500 font-medium">Improving</span>
                        </>
                    )}
                    {stats.trend === 'down' && (
                        <>
                            <TrendingDown size={14} className="text-orange-500" />
                            <span className="text-[10px] text-orange-500 font-medium">Review needed</span>
                        </>
                    )}
                    {stats.trend === 'stable' && (
                        <>
                            <Minus size={14} className="text-slate-400" />
                            <span className="text-[10px] text-slate-400 font-medium">Stable</span>
                        </>
                    )}
                </div>
            </div>

            {/* Mini Bar Chart */}
            <div className="flex items-end justify-between gap-1 h-12 mb-3">
                {weeklyData.map((value, index) => {
                    const height = stats.max > 0 ? (value / stats.max) * maxHeight : 0;
                    const isToday = index === weeklyData.length - 1;

                    return (
                        <div key={index} className="flex-1 flex flex-col items-center group relative">
                            {/* Bar */}
                            <div
                                className={`
                  w-full rounded-t transition-all duration-300 cursor-pointer
                  ${isToday
                                        ? 'bg-gradient-to-t from-indigo-500 to-indigo-400'
                                        : value > 0
                                            ? 'bg-gradient-to-t from-emerald-400 to-emerald-300 group-hover:from-emerald-500 group-hover:to-emerald-400'
                                            : 'bg-slate-200 dark:bg-slate-600'
                                    }
                `}
                                style={{ height: `${Math.max(height, 4)}px` }}
                            />

                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                <div className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                    {value} lessons
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Day Labels */}
            <div className="flex justify-between">
                {days.map((day, index) => (
                    <span
                        key={day}
                        className={`text-[10px] flex-1 text-center ${index === days.length - 1
                                ? 'text-indigo-500 font-bold'
                                : 'text-slate-400'
                            }`}
                    >
                        {day}
                    </span>
                ))}
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div className="text-center">
                    <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{stats.total}</p>
                    <p className="text-[10px] text-slate-400">This week</p>
                </div>
                <div className="text-center">
                    <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{stats.avg}</p>
                    <p className="text-[10px] text-slate-400">Daily avg</p>
                </div>
                <div className="text-center">
                    <p className="text-lg font-bold text-emerald-500">{Math.round((completedCourses / Math.max(totalCourses, 1)) * 100)}%</p>
                    <p className="text-[10px] text-slate-400">Progress</p>
                </div>
            </div>
        </div>
    );
}
