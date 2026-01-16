import Link from 'next/link';

interface MenuGridProps {
    pendingCount: number;
    ticketsCount: number;
}

// Menu items configuration
const menuItems = [
    {
        href: '/admin/enrollments',
        icon: '💰',
        title: 'ตรวจสอบชำระเงิน',
        description: 'อนุมัติสลิปโอนเงิน',
        badgeKey: 'pending' as const,
    },
    {
        href: '/admin/exams',
        icon: '📝',
        title: 'คลังข้อสอบ',
        description: 'เพิ่ม/ลบ ชุดข้อสอบ',
    },
    {
        href: '/admin/students',
        icon: '👨‍🎓',
        title: 'ทะเบียนนักเรียน',
        description: 'ดูรายชื่อและประวัติ',
    },
    {
        href: '/admin/courses',
        icon: '📚',
        title: 'จัดการคอร์สเรียน',
        description: 'เพิ่ม/ลบ บทเรียน',
    },
    {
        href: '/admin/summaries',
        icon: '✨',
        title: 'สรุปเนื้อหา',
        description: 'เขียน/แก้ไข บทสรุป',
    },
    {
        href: '/admin/notifications',
        icon: '📢',
        title: 'ประกาศข่าวสาร',
        description: 'แจ้งเตือนนักเรียน',
    },
    {
        href: '/admin/banners',
        icon: '🖼️',
        title: 'จัดการโฆษณา',
        description: 'เปลี่ยนรูปภาพหน้าเว็บ',
    },
    {
        href: '/admin/chat',
        icon: '💬',
        title: 'แชทกับลูกค้า',
        description: 'ตอบแชทสด Real-time',
    },
    {
        href: '/admin/support',
        icon: '🎫',
        title: 'แจ้งปัญหา (Ticket)',
        description: 'ระบบตั๋วแจ้งซ่อม/ปัญหา',
        badgeKey: 'tickets' as const,
    },
    {
        href: '/admin/reviews',
        icon: '⭐',
        title: 'จัดการรีวิว',
        description: 'ซ่อน/ลบ รีวิว',
    },
    {
        href: '/admin/poll',
        icon: '📊',
        title: 'แบบสอบถาม',
        description: 'สร้าง Poll ถามความเห็น',
    },
    {
        href: '/admin/activity',
        icon: '📈',
        title: 'Activity Log',
        description: 'ติดตามกิจกรรม',
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

            {/* Card Grid - Notion Style (3 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {menuItems.map((item) => {
                    const badgeCount = getBadgeCount(item.badgeKey);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="group relative bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all"
                        >
                            {/* Badge */}
                            {badgeCount > 0 && (
                                <span className="absolute top-3 right-3 bg-rose-100 text-rose-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {badgeCount}
                                </span>
                            )}

                            {/* Icon */}
                            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-xl mb-3 group-hover:bg-slate-100 transition-colors">
                                {item.icon}
                            </div>

                            {/* Content */}
                            <h3 className="font-medium text-slate-800 group-hover:text-slate-900 mb-1">
                                {item.title}
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                {item.description}
                            </p>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
