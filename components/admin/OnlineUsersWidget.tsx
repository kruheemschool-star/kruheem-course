
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
}

export default function OnlineUsersWidget({ onlineUsers, formatOnlineDuration }: OnlineUsersWidgetProps) {
    return (
        <div id="online-users-section" className="mt-8 bg-white rounded-3xl p-8 shadow-sm border border-green-100 animate-in fade-in slide-in-from-bottom-4 scroll-mt-24">
            <h3 className="font-bold text-xl text-stone-800 mb-6 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${onlineUsers.length > 0 ? 'bg-green-400' : 'bg-gray-400'} opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${onlineUsers.length > 0 ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                </span>
                นักเรียนที่กำลังออนไลน์ ({onlineUsers.length} คน)
            </h3>

            {onlineUsers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {onlineUsers.map((user, idx) => (
                        <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${user.isMember ? 'bg-indigo-50/50 border-indigo-100' : 'bg-stone-50 border-stone-100'}`}>
                            <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${user.isMember ? 'bg-indigo-100 text-indigo-600' : 'bg-stone-200 text-stone-500'}`}>
                                {user.userName ? user.userName.charAt(0).toUpperCase() : 'U'}
                                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${user.isStudying ? 'bg-green-500' : 'bg-amber-400'}`}></span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="font-bold text-stone-700 truncate text-sm">{user.userName || user.userEmail || "Unknown User"}</p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${user.isMember ? 'bg-indigo-100 text-indigo-600' : 'bg-stone-200 text-stone-500'}`}>
                                        {user.userType}
                                    </span>
                                </div>
                                <p className="text-xs text-stone-500 truncate">{user.currentActivity}</p>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <span className="text-green-500">⏱️</span>
                                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${(() => {
                                        const startTime = user.sessionStart?.toDate?.() || null;
                                        if (!startTime) return 'bg-stone-100 text-stone-400';
                                        const mins = Math.floor((new Date().getTime() - startTime.getTime()) / 60000);
                                        if (mins >= 60) return 'bg-green-100 text-green-700';
                                        if (mins >= 30) return 'bg-emerald-100 text-emerald-600';
                                        return 'bg-lime-100 text-lime-600';
                                    })()
                                        }`}>
                                        {formatOnlineDuration(user.sessionStart?.toDate?.() || null)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 text-stone-400 italic bg-stone-50 rounded-2xl border border-stone-100">
                    <span className="text-4xl block mb-2">😴</span>
                    ยังไม่มีนักเรียนออนไลน์ในขณะนี้
                </div>
            )}
        </div>
    );
}
