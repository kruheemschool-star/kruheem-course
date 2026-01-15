import Link from 'next/link';

interface MenuGridProps {
    pendingCount: number;
    ticketsCount: number;
}

export default function MenuGrid({ pendingCount, ticketsCount }: MenuGridProps) {
    return (
        <div>
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-stone-800 mb-1">ภาพรวมวันนี้</h2>
                <p className="text-stone-500 font-light">ระบบจัดการโรงเรียนออนไลน์ครบวงจร</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. ตรวจสอบชำระเงิน */}
                <Link href="/admin/enrollments" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-orange-100 to-rose-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="text-4xl drop-shadow-sm">💰</span>
                        {pendingCount > 0 && (
                            <span className="bg-white/80 text-rose-500 text-xs font-bold px-3 py-1 rounded-full shadow-sm animate-bounce">
                                {pendingCount} รอตรวจ
                            </span>
                        )}
                    </div>
                    <h3 className="font-bold text-xl text-rose-900/80 group-hover:text-rose-900 relative z-10">ตรวจสอบชำระเงิน</h3>
                    <p className="text-sm text-rose-800/60 mt-1 relative z-10">อนุมัติสลิปโอนเงิน</p>
                </Link>

                {/* Exam Management Link */}
                <Link href="/admin/exams" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-purple-100 to-fuchsia-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="text-4xl drop-shadow-sm">📝</span>
                    </div>
                    <h3 className="font-bold text-xl text-purple-900/80 group-hover:text-purple-900 relative z-10">คลังข้อสอบ</h3>
                    <p className="text-sm text-purple-800/60 mt-1 relative z-10">เพิ่ม/ลบ ชุดข้อสอบ</p>
                </Link>

                {/* 2. ทะเบียนนักเรียน */}
                <Link href="/admin/students" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-sky-100 to-blue-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="text-4xl drop-shadow-sm">👨‍🎓</span>
                    </div>
                    <h3 className="font-bold text-xl text-blue-900/80 group-hover:text-blue-900 relative z-10">ทะเบียนนักเรียน</h3>
                    <p className="text-sm text-blue-800/60 mt-1 relative z-10">ดูรายชื่อและประวัติ</p>
                </Link>

                {/* 3. จัดการคอร์ส */}
                <Link href="/admin/courses" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-emerald-100 to-teal-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="text-4xl drop-shadow-sm">📚</span>
                    </div>
                    <h3 className="font-bold text-xl text-teal-900/80 group-hover:text-teal-900 relative z-10">จัดการคอร์สเรียน</h3>
                    <p className="text-sm text-teal-800/60 mt-1 relative z-10">เพิ่ม/ลบ บทเรียน</p>
                </Link>

                {/* 4. สรุปเนื้อหา */}
                <Link href="/admin/summaries" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-teal-100 to-cyan-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="text-4xl drop-shadow-sm">✨</span>
                    </div>
                    <h3 className="font-bold text-xl text-cyan-900/80 group-hover:text-cyan-900 relative z-10">สรุปเนื้อหา</h3>
                    <p className="text-sm text-cyan-800/60 mt-1 relative z-10">เขียน/แก้ไข บทสรุป</p>
                </Link>

                {/* 5. ประกาศข่าวสาร */}
                <Link href="/admin/notifications" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-amber-100 to-orange-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer opacity-90 hover:opacity-100">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="text-4xl drop-shadow-sm">📢</span>
                    </div>
                    <h3 className="font-bold text-xl text-orange-900/80 group-hover:text-orange-900 relative z-10">ประกาศข่าวสาร</h3>
                    <p className="text-sm text-orange-800/60 mt-1 relative z-10">แจ้งเตือนนักเรียนทุกคน</p>
                </Link>

                {/* 6. จัดการโฆษณา */}
                <Link href="/admin/banners" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-pink-100 to-rose-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer opacity-90 hover:opacity-100">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="text-4xl drop-shadow-sm">🖼️</span>
                    </div>
                    <h3 className="font-bold text-xl text-pink-900/80 group-hover:text-pink-900 relative z-10">จัดการโฆษณา</h3>
                    <p className="text-sm text-pink-800/60 mt-1 relative z-10">เปลี่ยนรูปภาพหน้าเว็บ</p>
                </Link>

                {/* 7. ระบบแชท */}
                <Link href="/admin/chat" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-indigo-100 to-violet-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer opacity-90 hover:opacity-100">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="text-4xl drop-shadow-sm">💬</span>
                    </div>
                    <h3 className="font-bold text-xl text-indigo-900/80 group-hover:text-indigo-900 relative z-10">แชทกับลูกค้า</h3>
                    <p className="text-sm text-indigo-800/60 mt-1 relative z-10">ตอบแชทสด Real-time</p>
                </Link>

                {/* 8. ถาม-ตอบ / แจ้งปัญหา */}
                <Link href="/admin/support" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-cyan-100 to-blue-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer opacity-90 hover:opacity-100">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="text-4xl drop-shadow-sm">🎫</span>
                        {ticketsCount > 0 && (
                            <span className="bg-white/80 text-blue-600 text-xs font-bold px-3 py-1 rounded-full shadow-sm animate-bounce">
                                {ticketsCount} ใหม่
                            </span>
                        )}
                    </div>
                    <h3 className="font-bold text-xl text-blue-900/80 group-hover:text-blue-900 relative z-10">แจ้งปัญหา (Ticket)</h3>
                    <p className="text-sm text-blue-800/60 mt-1 relative z-10">ระบบตั๋วแจ้งซ่อม/ปัญหา</p>
                </Link>

                {/* 9. จัดการรีวิว */}
                <Link href="/admin/reviews" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-fuchsia-100 to-purple-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer opacity-90 hover:opacity-100">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="text-4xl drop-shadow-sm">⭐</span>
                    </div>
                    <h3 className="font-bold text-xl text-purple-900/80 group-hover:text-purple-900 relative z-10">จัดการรีวิว</h3>
                    <p className="text-sm text-purple-800/60 mt-1 relative z-10">ซ่อน/ลบ รีวิวที่ไม่เหมาะสม</p>
                </Link>

                {/* 10. แบบสอบถาม */}
                <Link href="/admin/poll" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-indigo-100 to-violet-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer opacity-90 hover:opacity-100">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="text-4xl drop-shadow-sm">📝</span>
                    </div>
                    <h3 className="font-bold text-xl text-indigo-900/80 group-hover:text-indigo-900 relative z-10">แบบสอบถาม</h3>
                    <p className="text-sm text-indigo-800/60 mt-1 relative z-10">สร้าง Poll ถามความเห็น</p>
                </Link>

                {/* 11. Activity Log */}
                <Link href="/admin/activity" className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-cyan-100 to-teal-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer opacity-90 hover:opacity-100">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="text-4xl drop-shadow-sm">📊</span>
                    </div>
                    <h3 className="font-bold text-xl text-teal-900/80 group-hover:text-teal-900 relative z-10">Activity Log</h3>
                    <p className="text-sm text-teal-800/60 mt-1 relative z-10">ติดตามกิจกรรมนักเรียน</p>
                </Link>
            </div>
        </div>
    );
}
