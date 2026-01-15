import Link from 'next/link';
import { useMemo } from 'react';

interface ActionCenterProps {
    pendingCount: number;
    ticketsCount: number;
}

export default function ActionCenter({ pendingCount, ticketsCount }: ActionCenterProps) {
    const hasActions = pendingCount > 0 || ticketsCount > 0;

    if (!hasActions) return null;

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-rose-100 animate-in slide-in-from-top-4 mb-8">
            <h3 className="font-bold text-lg text-rose-800 mb-4 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                งานที่ต้องจัดการด่วน (Action Required)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingCount > 0 && (
                    <Link href="/admin/enrollments" className="flex items-center justify-between p-4 bg-rose-50 rounded-2xl border border-rose-100 hover:bg-rose-100 transition group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">💰</div>
                            <div>
                                <p className="font-bold text-rose-900 group-hover:text-rose-700">ตรวจสอบชำระเงิน</p>
                                <p className="text-xs text-rose-600">รอยืนยันสลิป</p>
                            </div>
                        </div>
                        <span className="bg-rose-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-sm animate-pulse">
                            {pendingCount} รายการ
                        </span>
                    </Link>
                )}

                {ticketsCount > 0 && (
                    <Link href="/admin/support" className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100 hover:bg-blue-100 transition group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">🎫</div>
                            <div>
                                <p className="font-bold text-blue-900 group-hover:text-blue-700">แจ้งปัญหา (Ticket)</p>
                                <p className="text-xs text-blue-600">รอการตรวจสอบ</p>
                            </div>
                        </div>
                        <span className="bg-blue-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-sm animate-pulse">
                            {ticketsCount} รายการ
                        </span>
                    </Link>
                )}
            </div>
        </div>
    );
}
