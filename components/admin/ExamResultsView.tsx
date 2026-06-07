"use client";
import { Users, Target, GraduationCap } from "lucide-react";

export interface ExamResultRow {
    uid: string;
    name: string;
    lessonTitle: string;
    bestPercent: number;
    attempts: number;
}

const pctColor = (p: number) => p >= 80 ? 'text-emerald-600 dark:text-emerald-400' : p >= 60 ? 'text-blue-600 dark:text-blue-400' : p >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
const barColor = (p: number) => p >= 80 ? 'bg-emerald-500' : p >= 60 ? 'bg-blue-500' : p >= 40 ? 'bg-amber-500' : 'bg-rose-500';

export function ExamResultsView({ rows, loading }: { rows: ExamResultRow[]; loading: boolean }) {
    // Aggregate by exam set and by student
    const bySet: Record<string, { sum: number; count: number }> = {};
    const byStudent: Record<string, { name: string; sum: number; count: number }> = {};
    rows.forEach((r) => {
        if (!bySet[r.lessonTitle]) bySet[r.lessonTitle] = { sum: 0, count: 0 };
        bySet[r.lessonTitle].sum += r.bestPercent;
        bySet[r.lessonTitle].count++;
        if (!byStudent[r.uid]) byStudent[r.uid] = { name: r.name, sum: 0, count: 0 };
        byStudent[r.uid].sum += r.bestPercent;
        byStudent[r.uid].count++;
    });
    const sets = Object.entries(bySet)
        .map(([title, s]) => ({ title, avg: Math.round(s.sum / s.count), count: s.count }))
        .sort((a, b) => a.avg - b.avg);
    const students = Object.entries(byStudent)
        .map(([uid, s]) => ({ uid, name: s.name, avg: Math.round(s.sum / s.count), setsDone: s.count }))
        .sort((a, b) => a.avg - b.avg);
    const classAvg = students.length > 0 ? Math.round(students.reduce((a, s) => a + s.avg, 0) / students.length) : 0;

    if (loading) return <div className="text-center py-24 text-slate-400">กำลังโหลดผลสอบ...</div>;

    if (rows.length === 0) {
        return (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="text-5xl mb-3">📭</div>
                <h3 className="text-lg font-black text-slate-600 dark:text-slate-300 mb-1">ยังไม่มีผลการทำข้อสอบ</h3>
                <p className="text-slate-400 text-sm">เมื่อนักเรียนเริ่มทำข้อสอบในคอร์สนี้ ผลจะแสดงที่นี่</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Overview tiles */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 text-center">
                    <div className="flex items-center justify-center gap-2 text-2xl font-black text-slate-800 dark:text-slate-100"><Users size={20} className="text-indigo-500" />{students.length}</div>
                    <div className="text-xs text-slate-400 mt-0.5">นักเรียนที่ทำข้อสอบ</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 text-center">
                    <div className={`text-2xl font-black ${pctColor(classAvg)}`}>{classAvg}%</div>
                    <div className="text-xs text-slate-400 mt-0.5">คะแนนเฉลี่ยทั้งห้อง</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 text-center">
                    <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{sets.length}</div>
                    <div className="text-xs text-slate-400 mt-0.5">ชุดที่มีคนทำ</div>
                </div>
            </div>

            {/* Hardest sets for the class */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-5 md:p-6 shadow-sm">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><Target size={18} className="text-amber-500" /> หัวข้อที่ห้องทำได้ยากสุด</h3>
                <p className="text-xs text-slate-400 mb-4">เรียงจากคะแนนเฉลี่ยน้อยไปมาก — ชุดบนสุดคือที่ห้องอ่อนสุด</p>
                <div className="space-y-3">
                    {sets.map((s) => (
                        <div key={s.title} className="flex items-center gap-3">
                            <div className="w-40 md:w-56 flex-shrink-0">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{s.title}</p>
                                <p className="text-[11px] text-slate-400">{s.count} คนทำ</p>
                            </div>
                            <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                <div className={`h-full rounded-full ${barColor(s.avg)}`} style={{ width: `${s.avg}%` }} />
                            </div>
                            <span className={`w-12 text-right text-sm font-black tabular-nums ${pctColor(s.avg)}`}>{s.avg}%</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Students */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-5 md:p-6 shadow-sm">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><GraduationCap size={18} className="text-indigo-500" /> รายนักเรียน ({students.length})</h3>
                <p className="text-xs text-slate-400 mb-4">เรียงจากคะแนนเฉลี่ยน้อยไปมาก — คนบนสุดคือควรช่วยก่อน</p>
                <div className="space-y-2">
                    {students.map((s) => (
                        <div key={s.uid} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-700">
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{s.name}</p>
                                <p className="text-[11px] text-slate-400">ทำไปแล้ว {s.setsDone} ชุด</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="w-24 h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden hidden sm:block">
                                    <div className={`h-full rounded-full ${barColor(s.avg)}`} style={{ width: `${s.avg}%` }} />
                                </div>
                                <span className={`w-12 text-right text-sm font-black tabular-nums ${pctColor(s.avg)}`}>{s.avg}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
