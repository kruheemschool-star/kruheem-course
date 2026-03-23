import Link from 'next/link';
import { ChevronRight, Clock } from 'lucide-react';

interface ActivityItem {
    id: string;
    type: 'enrollment';
    userName: string;
    timestamp: Date;
    description: string;
}

interface Props {
    activities: ActivityItem[];
    loading: boolean;
}

export default function RecentActivityWidgetInline({ activities, loading }: Props) {
    if (loading) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🚀</span>
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">กิจกรรมล่าสุด</h2>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="animate-pulse space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-3">
                                <div className="w-8 h-8 bg-slate-100 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                                    <div className="h-3 bg-slate-50 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (activities.length === 0) return null;

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🚀</span>
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">กิจกรรมล่าสุด</h2>
                </div>
                <Link
                    href="/admin/activity"
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                >
                    ดูทั้งหมด
                    <ChevronRight size={14} />
                </Link>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {activities.map(item => (
                    <div key={item.id} className="flex items-start gap-3 p-3">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-sm flex-shrink-0">
                            💰
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 text-sm truncate">
                                {item.userName}
                            </p>
                            <p className="text-slate-500 text-xs truncate">
                                {item.description}
                            </p>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 text-xs flex-shrink-0">
                            <Clock size={12} />
                            <span>
                                {item.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
