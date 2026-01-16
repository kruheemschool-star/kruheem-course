interface OnlineUser {
    userEmail: string;
    userName?: string;
    currentActivity?: string;
    isMember?: boolean;
    isStudying?: boolean;
    userType?: string;
    sessionStart?: any;
    lastAccessedAt?: any;
}

interface OnlineUsersWidgetProps {
    onlineUsers: OnlineUser[];
    formatOnlineDuration: (date: Date | null) => string;
    todayVisitors?: number;
}

export default function OnlineUsersWidget({ onlineUsers, formatOnlineDuration, todayVisitors = 0 }: OnlineUsersWidgetProps) {
    const memberCount = onlineUsers.filter(u => u.isMember).length;
    const guestCount = onlineUsers.filter(u => !u.isMember).length;

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${onlineUsers.length > 0 ? 'bg-emerald-400' : 'bg-slate-400'} opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${onlineUsers.length > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                </span>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">ผู้ใช้งานออนไลน์</h2>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-800">{memberCount}</p>
                    <p className="text-xs text-slate-500">นักเรียน</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-800">{guestCount}</p>
                    <p className="text-xs text-slate-500">ผู้เยี่ยมชม</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-800">{todayVisitors}</p>
                    <p className="text-xs text-slate-500">เข้าชมวันนี้</p>
                </div>
            </div>

            {/* Online Users List */}
            {onlineUsers.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {onlineUsers.map((user, idx) => {
                        const startTime = user.sessionStart?.toDate?.() || null;
                        const duration = formatOnlineDuration(startTime);

                        return (
                            <div key={idx} className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors">
                                {/* Avatar */}
                                <div className="relative">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${user.isMember ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        {user.userName ? user.userName.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${user.isStudying ? 'bg-emerald-500' : 'bg-amber-400'
                                        }`}></span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-slate-700 truncate">
                                            {user.userName || user.userEmail || "Unknown"}
                                        </p>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${user.isMember ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {user.userType}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 truncate">{user.currentActivity}</p>
                                </div>

                                {/* Duration */}
                                <div className="text-xs text-slate-500">
                                    ⏱️ {duration}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                    <span className="text-3xl block mb-2">😴</span>
                    <p className="text-sm text-slate-400">ยังไม่มีผู้ใช้งานออนไลน์ในขณะนี้</p>
                </div>
            )}
        </div>
    );
}
