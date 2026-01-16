import Link from 'next/link';
import { AlertCircle, ChevronRight } from 'lucide-react';

interface ActionCenterProps {
    pendingCount: number;
    ticketsCount: number;
}

export default function ActionCenter({ pendingCount, ticketsCount }: ActionCenterProps) {
    const hasActions = pendingCount > 0 || ticketsCount > 0;

    if (!hasActions) return null;

    return (
        <div className="mb-6">
            {/* Section Header */}
            <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={16} className="text-amber-500" />
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">งานที่ต้องดำเนินการ</h2>
            </div>

            {/* Action Items - Notion Callout Style */}
            <div className="space-y-2">
                {pendingCount > 0 && (
                    <Link
                        href="/admin/enrollments"
                        className="group flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                        <span className="text-xl">💰</span>
                        <div className="flex-1">
                            <p className="font-medium text-amber-900">ตรวจสอบชำระเงิน</p>
                            <p className="text-sm text-amber-700">{pendingCount} รายการรอดำเนินการ</p>
                        </div>
                        <ChevronRight size={18} className="text-amber-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                )}

                {ticketsCount > 0 && (
                    <Link
                        href="/admin/support"
                        className="group flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        <span className="text-xl">🎫</span>
                        <div className="flex-1">
                            <p className="font-medium text-blue-900">แจ้งปัญหา (Ticket)</p>
                            <p className="text-sm text-blue-700">{ticketsCount} รายการรอตรวจสอบ</p>
                        </div>
                        <ChevronRight size={18} className="text-blue-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                )}
            </div>
        </div>
    );
}
