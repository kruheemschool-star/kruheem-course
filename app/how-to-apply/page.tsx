"use client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { UserPlus, BookOpen, CreditCard, CheckCircle } from "lucide-react";

export default function HowToApplyPage() {
    return (
        <div className="min-h-screen bg-[#F0F7F4] font-sans flex flex-col">
            <Navbar />

            {/* Background Wrapper */}
            <div className="relative flex-grow flex justify-center items-start p-4 overflow-hidden pt-24 pb-24">
                {/* Orbs */}
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-pulse"></div>
                <div className="absolute top-[30%] right-[-10%] w-[400px] h-[400px] bg-emerald-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-pulse delay-1000"></div>

                {/* Content Container */}
                <div className="relative z-10 w-full max-w-4xl space-y-8">
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-600">
                            วิธีสมัครเรียน
                        </h1>
                        <p className="text-slate-500 text-lg font-medium">ขั้นตอนง่ายๆ ในการเริ่มเรียนกับ KruHeem</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Step 1 */}
                        <div className="bg-white/60 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-lg hover:transform hover:scale-105 transition-all duration-300">
                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                                <UserPlus size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">1. สมัครสมาชิก / เข้าสู่ระบบ</h3>
                            <p className="text-slate-500">สร้างบัญชีผู้ใช้งาน หรือเข้าสู่ระบบด้วย Google เพื่อเริ่มต้นใช้งาน</p>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-white/60 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-lg hover:transform hover:scale-105 transition-all duration-300 delay-100">
                            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
                                <BookOpen size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">2. เลือกคอร์สเรียน</h3>
                            <p className="text-slate-500">เลือกคอร์สที่ต้องการสมัครเรียนจากหน้ารายวิชาทั้งหมด</p>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-white/60 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-lg hover:transform hover:scale-105 transition-all duration-300 delay-200">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                                <CreditCard size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">3. ชำระเงิน & แจ้งโอน</h3>
                            <p className="text-slate-500">ชำระเงินผ่าน QR Code และแนบสลิปผ่านเมนู &quot;สั่งซื้อและแจ้งโอน&quot;</p>
                        </div>

                        {/* Step 4 */}
                        <div className="bg-white/60 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-lg hover:transform hover:scale-105 transition-all duration-300 delay-300">
                            <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center mb-4">
                                <CheckCircle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">4. รอการยืนยัน</h3>
                            <p className="text-slate-500">รอแอดมินตรวจสอบความถูกต้อง (ภายใน 24 ชม.) และเริ่มเรียนได้ทันที!</p>
                        </div>
                    </div>

                    <div className="flex justify-center pt-8">
                        <Link href="/payment" className="px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-xl rounded-full shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-105 transition-all active:scale-95 flex items-center gap-2">
                            <CreditCard size={24} />
                            <span>แจ้งโอนเงินทันที</span>
                        </Link>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
