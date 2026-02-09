import Link from "next/link";
import { User, Trophy, BookOpen } from "lucide-react";

interface Student {
    name: string;
    totalSpent: number;
    courses: number;
    lastActive: any;
}

interface TopStudentsProps {
    students: Student[];
}

export default function TopStudents({ students }: TopStudentsProps) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-700">
                    <Trophy className="text-amber-500" size={20} />
                    <h3 className="font-semibold text-sm uppercase tracking-wide">Top Learners (Whales)</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded-md">
                    Lifetime Value
                </span>
            </div>

            <div className="p-2 flex-1 overflow-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="text-xs text-slate-400 border-b border-slate-50">
                            <th className="px-4 py-3 font-medium">Rank</th>
                            <th className="px-4 py-3 font-medium">Student</th>
                            <th className="px-4 py-3 font-medium text-right">Courses</th>
                            <th className="px-4 py-3 font-medium text-right">LTV</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student, index) => (
                            <tr key={index} className="group hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3">
                                    <div className={`
                                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                        ${index === 0 ? 'bg-amber-100 text-amber-600' :
                                            index === 1 ? 'bg-slate-200 text-slate-600' :
                                                index === 2 ? 'bg-orange-100 text-orange-600' : 'text-slate-400'}
                                    `}>
                                        {index + 1}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="font-medium text-slate-700">{student.name}</div>
                                    <div className="text-xs text-slate-400">Active recently</div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full text-xs">
                                        <BookOpen size={10} />
                                        {student.courses}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                                    ฿{student.totalSpent.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                        {students.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                                    No data available yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-4 border-t border-slate-100 text-center">
                <Link href="/admin/students" className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
                    View All Students →
                </Link>
            </div>
        </div>
    );
}
