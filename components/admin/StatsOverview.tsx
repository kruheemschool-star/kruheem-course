interface StatsOverviewProps {
    stats: {
        totalRevenue: number;
        totalStudents: number;
        courseData: any[];
        maxMonthlyRevenue: number;
    };
    selectedYear: number;
}

export default function StatsOverview({ stats, selectedYear }: StatsOverviewProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Revenue Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                    <span>💰</span>
                    <span>รายได้รวม (ปี {selectedYear + 543})</span>
                </div>
                <p className="text-3xl font-bold text-slate-800">
                    ฿{stats.totalRevenue.toLocaleString()}
                </p>
            </div>

            {/* Students Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                    <span>👨‍🎓</span>
                    <span>นักเรียนใหม่</span>
                </div>
                <p className="text-3xl font-bold text-slate-800">
                    {stats.totalStudents.toLocaleString()} <span className="text-lg font-normal text-slate-400">คน</span>
                </p>
            </div>

            {/* Courses Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                    <span>📚</span>
                    <span>คอร์สที่ขายออก</span>
                </div>
                <p className="text-3xl font-bold text-slate-800">
                    {stats.courseData.length} <span className="text-lg font-normal text-slate-400">วิชา</span>
                </p>
            </div>
        </div>
    );
}
