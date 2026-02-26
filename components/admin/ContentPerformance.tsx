"use client";

import { Sparkles, AlertTriangle, BookOpen, TrendingDown } from "lucide-react";
import type { EngagingLesson, DropOffPoint } from "@/hooks/useAdminLearningStats";

interface ContentPerformanceProps {
    mostEngagingLessons: EngagingLesson[];
    dropOffPoints: DropOffPoint[];
}

export default function ContentPerformance({
    mostEngagingLessons,
    dropOffPoints
}: ContentPerformanceProps) {
    const maxCount = mostEngagingLessons.length > 0 ? mostEngagingLessons[0].completionCount : 1;

    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                    <Sparkles size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">แชมป์เปี้ยนคอนเทนต์ (Content Performance)</h3>
                    <p className="text-sm text-slate-500">บทไหนปัง บทไหนพัง?</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Most Engaging Lessons */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <BookOpen size={16} className="text-emerald-500" />
                            <h4 className="font-semibold text-sm text-slate-700">เนื้อหายอดฮิต (Most Engaging)</h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">บทเรียนที่มีคนเรียนจบมากที่สุด</p>
                    </div>
                    <div className="p-3">
                        {mostEngagingLessons.length > 0 ? (
                            <div className="space-y-2">
                                {mostEngagingLessons.slice(0, 8).map((lesson, i) => {
                                    const barWidth = (lesson.completionCount / maxCount) * 100;
                                    return (
                                        <div key={`${lesson.courseId}-${lesson.lessonId}`} className="group relative px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                                            {/* Background bar */}
                                            <div
                                                className="absolute inset-y-0 left-0 bg-emerald-50 rounded-lg transition-all group-hover:bg-emerald-100"
                                                style={{ width: `${barWidth}%` }}
                                            />
                                            <div className="relative flex items-center gap-3">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                                    i === 0 ? 'bg-amber-100 text-amber-700' :
                                                    i === 1 ? 'bg-slate-200 text-slate-600' :
                                                    i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {i + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 truncate">{lesson.title}</p>
                                                    <p className="text-xs text-slate-400 truncate">{lesson.courseTitle}</p>
                                                </div>
                                                <span className="text-sm font-bold text-emerald-600 flex-shrink-0">
                                                    {lesson.completionCount} คน
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic text-center py-8">ยังไม่มีข้อมูลการเรียน</p>
                        )}
                    </div>
                </div>

                {/* Drop-off Points */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={16} className="text-rose-500" />
                            <h4 className="font-semibold text-sm text-slate-700">จุดที่เด็กเท (Drop-off Points)</h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">บทเรียนที่นักเรียนหยุดเรียนมากที่สุดในแต่ละคอร์ส</p>
                    </div>
                    <div className="p-3">
                        {dropOffPoints.length > 0 ? (
                            <div className="space-y-2">
                                {dropOffPoints.map((point, i) => (
                                    <div key={`${point.courseId}-${point.lessonIndex}`} className="px-3 py-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-700 truncate">{point.courseTitle}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <TrendingDown size={12} className="text-rose-500 flex-shrink-0" />
                                                    <p className="text-xs text-rose-600 font-medium truncate">
                                                        หยุดที่: {point.lessonTitle}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0 text-right">
                                                <span className="text-lg font-black text-rose-600">{point.dropOffPercent}%</span>
                                                <p className="text-[10px] text-slate-400">หลุดออก</p>
                                            </div>
                                        </div>
                                        {/* Visual indicator */}
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <span>บทที่ {point.lessonIndex + 1}/{point.totalLessons}</span>
                                            <span>•</span>
                                            <span>{point.studentsReachedHere}/{point.studentsTotal} คนผ่านจุดนี้</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                                            <div
                                                className="h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-rose-400"
                                                style={{ width: `${((point.lessonIndex + 1) / point.totalLessons) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic text-center py-8">ยังไม่มีข้อมูลเพียงพอ (ต้องมีอย่างน้อย 2 คนต่อคอร์ส)</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
