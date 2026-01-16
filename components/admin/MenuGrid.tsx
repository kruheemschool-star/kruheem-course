import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

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

            {/* Menu List - Notion Style */}
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {menuItems.map((item) => {
                    const badgeCount = getBadgeCount(item.badgeKey);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="group flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors"
                        >
                            {/* Icon */}
                            <span className="text-xl w-8 text-center flex-shrink-0">
                                {item.icon}
                            </span>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-medium text-slate-800 group-hover:text-slate-900">
                                        {item.title}
                                    </h3>
                                    {badgeCount > 0 && (
                                        <span className="bg-rose-100 text-rose-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                            {badgeCount}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-500 truncate">
                                    {item.description}
                                </p>
                            </div>

                            {/* Arrow */}
                            <ChevronRight
                                size={18}
                                className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                            />
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
