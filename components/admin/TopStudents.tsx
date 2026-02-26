import Link from "next/link";
import { Trophy, BookOpen, Flame, CalendarCheck } from "lucide-react";
import type { ActiveStudent } from "@/hooks/useAdminLearningStats";

interface TopStudentsProps {
    students: ActiveStudent[];
}

export default function TopStudents({ students }: TopStudentsProps) {
    const formatLastActive = (date: Date | null): string => {
        if (!date) return 'ไม่ทราบ';
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return 'วันนี้';
        if (days === 1) return 'เมื่อวาน';
        if (days < 7) return `${days} วันที่แล้ว`;
        return `${Math.floor(days / 7)} สัปดาห์ที่แล้ว`;
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-700">
                    <Trophy className="text-amber-500" size={20} />
                    <h3 className="font-semibold text-sm uppercase tracking-wide">นักเรียนตัวตึง</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium px-2 py-1 bg-violet-50 text-violet-600 rounded-md">
                    30 วันล่าสุด
                </span>
            </div>

            <div className="p-2 flex-1 overflow-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="text-xs text-slate-400 border-b border-slate-50">
                            <th className="px-3 py-3 font-medium w-10">#</th>
                            <th className="px-3 py-3 font-medium">นักเรียน</th>
                            <th className="px-3 py-3 font-medium text-center">เข้าเรียน</th>
                            <th className="px-3 py-3 font-medium text-right">บทเรียน</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student, index) => (
                            <tr key={student.userId || index} className="group hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-3">
                                    <div className={`
                                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                        ${index === 0 ? 'bg-amber-100 text-amber-600' :
                                            index === 1 ? 'bg-slate-200 text-slate-600' :
                                                index === 2 ? 'bg-orange-100 text-orange-600' : 'text-slate-400'}
                                    `}>
                                        {index + 1}
                                    </div>
                                </td>
                                <td className="px-3 py-3">
                                    <div className="font-medium text-slate-700 truncate max-w-[140px]">{student.name}</div>
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                        {student.streak > 0 && (
                                            <span className="inline-flex items-center gap-0.5 text-orange-500 font-medium">
                                                <Flame size={10} />
                                                {student.streak} วันติด
                                            </span>
                                        )}
                                        {student.streak === 0 && (
                                            <span>{formatLastActive(student.lastActive)}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <div className="inline-flex items-center gap-1 text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full text-xs font-bold">
                                        <CalendarCheck size={10} />
                                        {student.activeDays} วัน
                                    </div>
                                </td>
                                <td className="px-3 py-3 text-right">
                                    <div className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-bold">
                                        <BookOpen size={10} />
                                        {student.lessonsCompleted}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {students.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                                    ยังไม่มีข้อมูลกิจกรรมการเรียน
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-4 border-t border-slate-100 text-center">
                <Link href="/admin/students" className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
                    ดูนักเรียนทั้งหมด →
                </Link>
            </div>
        </div>
    );
}
