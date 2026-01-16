import Link from 'next/link';

interface MenuGridProps {
    pendingCount: number;
    ticketsCount: number;
}

// Menu items configuration with cover colors
const menuItems = [
    {
        href: '/admin/enrollments',
        icon: '💰',
        title: 'ตรวจสอบชำระเงิน',
        description: 'อนุมัติสลิปโอนเงิน',
        badgeKey: 'pending' as const,
        coverColor: 'from-amber-100 to-orange-100',
    },
    {
        href: '/admin/exams',
        icon: '📝',
        title: 'คลังข้อสอบ',
        description: 'เพิ่ม/ลบ ชุดข้อสอบ',
        coverColor: 'from-violet-100 to-purple-100',
    },
    {
        href: '/admin/students',
        icon: '👨‍🎓',
        title: 'ทะเบียนนักเรียน',
        description: 'ดูรายชื่อและประวัติ',
        coverColor: 'from-sky-100 to-blue-100',
    },
    {
        href: '/admin/courses',
        icon: '📚',
        title: 'จัดการคอร์สเรียน',
        description: 'เพิ่ม/ลบ บทเรียน',
        coverColor: 'from-emerald-100 to-teal-100',
    },
    {
        href: '/admin/summaries',
        icon: '✨',
        title: 'สรุปเนื้อหา',
        description: 'เขียน/แก้ไข บทสรุป',
        coverColor: 'from-cyan-100 to-sky-100',
    },
    {
        href: '/admin/notifications',
        icon: '📢',
        title: 'ประกาศข่าวสาร',
        description: 'แจ้งเตือนนักเรียน',
        coverColor: 'from-yellow-100 to-amber-100',
    },
    {
        href: '/admin/banners',
        icon: '🖼️',
        title: 'จัดการโฆษณา',
        description: 'เปลี่ยนรูปภาพหน้าเว็บ',
        coverColor: 'from-pink-100 to-rose-100',
    },
    {
        href: '/admin/chat',
        icon: '💬',
        title: 'แชทกับลูกค้า',
        description: 'ตอบแชทสด Real-time',
        coverColor: 'from-indigo-100 to-violet-100',
    },
    {
        href: '/admin/support',
        icon: '🎫',
        title: 'แจ้งปัญหา (Ticket)',
        description: 'ระบบตั๋วแจ้งซ่อม/ปัญหา',
        badgeKey: 'tickets' as const,
        coverColor: 'from-blue-100 to-indigo-100',
    },
    {
        href: '/admin/reviews',
        icon: '⭐',
        title: 'จัดการรีวิว',
        description: 'ซ่อน/ลบ รีวิว',
        coverColor: 'from-fuchsia-100 to-pink-100',
    },
    {
        href: '/admin/poll',
        icon: '📊',
        title: 'แบบสอบถาม',
        description: 'สร้าง Poll ถามความเห็น',
        coverColor: 'from-slate-100 to-gray-100',
    },
    {
        href: '/admin/activity',
        icon: '📈',
        title: 'Activity Log',
        description: 'ติดตามกิจกรรม',
        coverColor: 'from-teal-100 to-emerald-100',
    },
];

export default function MenuGrid({ pendingCount, ticketsCount }: MenuGridProps) {
    const getBadgeCount = (key?: 'pending' | 'tickets') => {
        if (key === 'pending') return pendingCount;
        if (key === 'tickets') return ticketsCount;
        return 0;
    };

    return (
        <div>
            {/* Section Header */}
            <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📋</span>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">เมนูหลัก</h2>
            </div>

            {/* Card Grid - Notion Database Card Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuItems.map((item) => {
                    const badgeCount = getBadgeCount(item.badgeKey);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-md transition-all"
                        >
                            {/* Cover Image Area */}
                            <div className={`h-20 bg-gradient-to-br ${item.coverColor} relative`}>
                                {/* Badge on cover */}
                                {badgeCount > 0 && (
                                    <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-rose-600 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                                        {badgeCount} รอดำเนินการ
                                    </span>
                                )}
                            </div>

                            {/* Icon - Floating on cover edge */}
                            <div className="absolute top-14 left-3">
                                <div className="w-12 h-12 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center text-2xl">
                                    {item.icon}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="pt-8 pb-4 px-4">
                                <h3 className="font-semibold text-slate-800 group-hover:text-slate-900 mb-1">
                                    {item.title}
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {item.description}
                                </p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
