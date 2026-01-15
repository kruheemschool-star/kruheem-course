
interface StatsOverviewProps {
    stats: {
        totalRevenue: number;
        totalStudents: number;
        courseData: any[]; // Or specific type
        maxMonthlyRevenue: number;
    };
    selectedYear: number;
}

export default function StatsOverview({ stats, selectedYear }: StatsOverviewProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="rounded-3xl p-8 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-xl shadow-fuchsia-200/50 transform hover:scale-105 transition duration-500">
                <p className="text-fuchsia-100 font-medium mb-2 text-sm uppercase tracking-wider">💰 รายได้รวม (ปี {selectedYear + 543})</p>
                <h3 className="text-5xl font-black tracking-tight">฿{stats.totalRevenue.toLocaleString()}</h3>
            </div>
            <div className="rounded-3xl p-8 bg-white shadow-sm hover:shadow-md transition border-none relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-32 h-32 bg-sky-50 rounded-bl-full -mr-8 -mt-8 transition group-hover:scale-110"></div>
                <p className="text-stone-400 font-bold text-sm mb-2 uppercase tracking-wide relative z-10">👨‍🎓 นักเรียนใหม่</p>
                <h3 className="text-4xl font-bold text-stone-800 relative z-10">{stats.totalStudents.toLocaleString()} <span className="text-xl text-stone-400 font-normal">คน</span></h3>
            </div>
            <div className="rounded-3xl p-8 bg-white shadow-sm hover:shadow-md transition border-none relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition group-hover:scale-110"></div>
                <p className="text-stone-400 font-bold text-sm mb-2 uppercase tracking-wide relative z-10">📚 คอร์สที่ขายออก</p>
                <h3 className="text-4xl font-bold text-stone-800 relative z-10">{stats.courseData.length} <span className="text-xl text-stone-400 font-normal">วิชา</span></h3>
            </div>
        </div>
    );
}
