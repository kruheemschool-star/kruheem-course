"use client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { UserPlus, BookOpen, CreditCard, CheckCircle, ArrowLeft, AlertTriangle, Chrome, Smartphone, Check, X, Zap, Shield, Clock, Key } from "lucide-react";

export default function HowToApplyPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans flex flex-col transition-colors">
            <Navbar />

            {/* Background Wrapper */}
            <div className="relative flex-grow flex justify-center items-start p-4 overflow-hidden pt-24 pb-24">
                {/* Orbs - hidden in dark mode */}
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-200 dark:bg-teal-900/30 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[100px] opacity-60 animate-pulse"></div>
                <div className="absolute top-[30%] right-[-10%] w-[400px] h-[400px] bg-emerald-200 dark:bg-emerald-900/30 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[100px] opacity-60 animate-pulse delay-1000"></div>

                {/* Content Container */}
                <div className="relative z-10 w-full max-w-4xl space-y-8">
                    {/* Back Button */}
                    <div>
                        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors group">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            กลับหน้าแรก
                        </Link>
                    </div>

                    {/* Browser Warning Section */}
                    <div className="bg-gradient-to-r from-rose-500 to-red-600 p-6 rounded-3xl shadow-xl border-2 border-red-700">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-black text-xl mb-2">⚠️ ข้อควรระวัง: อย่าเปิดลิงก์จาก LINE/Messenger โดยตรง!</h3>
                                <p className="text-white/90 mb-4">
                                    เพื่อความปลอดภัย ระบบลงทะเบียนจะทำงานได้เฉพาะใน <strong className="underline">Safari</strong> หรือ <strong className="underline">Chrome</strong> เท่านั้น
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="bg-white/10 backdrop-blur p-3 rounded-xl">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-2xl">🍎</span>
                                            <span className="text-white font-bold">iPhone/iPad</span>
                                        </div>
                                        <p className="text-white/80 text-sm">กดค้างลิงก์ → เลือก &quot;เปิดใน Safari&quot;</p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur p-3 rounded-xl">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-2xl">🤖</span>
                                            <span className="text-white font-bold">Android</span>
                                        </div>
                                        <p className="text-white/80 text-sm">กดค้างลิงก์ → เลือก &quot;เปิดใน Chrome&quot;</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-center space-y-4">
                        <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400">
                            วิธีสมัครเรียน
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">ขั้นตอนง่ายๆ ในการเริ่มเรียนกับ KruHeem</p>
                    </div>

                    {/* Registration Method Comparison */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 text-center">
                            เลือกวิธีลงทะเบียนที่เหมาะกับคุณ
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Google Method */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-3xl border-2 border-blue-200 dark:border-blue-800 shadow-lg">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md">
                                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">ลงทะเบียนด้วย Google</h3>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">✨ แนะนำ - สะดวกที่สุด</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-3 mb-4">
                                    <div className="flex items-start gap-2">
                                        <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300"><strong>ไม่ต้องจำรหัสผ่าน</strong> - ใช้บัญชี Google ที่มีอยู่แล้ว</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300"><strong>เข้าสู่ระบบรวดเร็ว</strong> - เพียง 1 คลิก</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300"><strong>ปลอดภัยสูง</strong> - ใช้ระบบรักษาความปลอดภัยของ Google</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300"><strong>กู้คืนบัญชีง่าย</strong> - ผ่านระบบ Google</span>
                                    </div>
                                </div>

                                <div className="bg-amber-50 dark:bg-amber-900/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                                    <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span><strong>ข้อควรระวัง:</strong> ต้องมีบัญชี Gmail และต้องเข้าสู่ระบบ Google ในเบราว์เซอร์</span>
                                    </p>
                                </div>
                            </div>

                            {/* Email/Password Method */}
                            <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-800/50 dark:to-gray-800/50 p-6 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-slate-600 dark:bg-slate-700 rounded-2xl flex items-center justify-center">
                                        <Key className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">ลงทะเบียนด้วย Email</h3>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">ทางเลือกอื่น</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-3 mb-4">
                                    <div className="flex items-start gap-2">
                                        <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300"><strong>ใช้อีเมลอะไรก็ได้</strong> - ไม่จำเป็นต้องเป็น Gmail</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300"><strong>ควบคุมรหัสผ่านเอง</strong> - ไม่ต้องพึ่งพา Google</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <X className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300"><strong>ต้องจำรหัสผ่าน</strong> - อาจลืมได้</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <X className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300"><strong>ลืมรหัสผ่าน</strong> - ต้องรีเซ็ตผ่านอีเมล</span>
                                    </div>
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl border border-blue-200 dark:border-blue-800">
                                    <p className="text-xs text-blue-800 dark:text-blue-200">
                                        💡 <strong>เหมาะสำหรับ:</strong> ผู้ที่ไม่มี Gmail หรือต้องการควบคุมรหัสผ่านเอง
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4 Steps Section */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 text-center">
                            ขั้นตอนการสมัครเรียน (4 ขั้นตอน)
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Step 0 - Browser Warning */}
                        <div className="bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 border-2 border-rose-300 dark:border-rose-800 p-6 rounded-3xl shadow-lg">
                            <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center mb-4">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">0. เตรียมตัว (สำคัญมาก!)</h3>
                            <ul className="space-y-2 text-slate-700 dark:text-slate-300 text-sm">
                                <li className="flex items-start gap-2">
                                    <X className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                                    <span><strong>อย่า</strong>เปิดลิงก์จาก LINE/Messenger โดยตรง</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span><strong>ให้</strong>คัดลอกลิงก์ → เปิดใน Safari/Chrome</span>
                                </li>
                            </ul>
                        </div>

                        {/* Step 1 */}
                        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/60 dark:border-slate-700 p-6 rounded-3xl shadow-lg hover:transform hover:scale-105 transition-all duration-300">
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-4">
                                <UserPlus size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">1. สมัครสมาชิก / เข้าสู่ระบบ</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-3">เลือกวิธีลงทะเบียน:</p>
                            <ul className="space-y-2 text-slate-600 dark:text-slate-400 text-sm">
                                <li className="flex items-center gap-2">
                                    <span className="text-lg">✨</span>
                                    <span><strong>แนะนำ:</strong> ใช้ Google (ถ้ามี Gmail)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-lg">📧</span>
                                    <span><strong>ทางเลือก:</strong> ใช้ Email/Password</span>
                                </li>
                            </ul>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/60 dark:border-slate-700 p-6 rounded-3xl shadow-lg hover:transform hover:scale-105 transition-all duration-300 delay-100">
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-4">
                                <BookOpen size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">2. เลือกคอร์สเรียน</h3>
                            <p className="text-slate-500 dark:text-slate-400">เลือกคอร์สที่ต้องการสมัครเรียนจากหน้ารายวิชาทั้งหมด</p>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/60 dark:border-slate-700 p-6 rounded-3xl shadow-lg hover:transform hover:scale-105 transition-all duration-300 delay-200">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4">
                                <CreditCard size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">3. ชำระเงิน & แจ้งโอน</h3>
                            <p className="text-slate-500 dark:text-slate-400">ชำระเงินผ่าน QR Code และแนบสลิปผ่านเมนู &quot;สั่งซื้อและแจ้งโอน&quot;</p>
                        </div>

                        {/* Step 4 */}
                        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/60 dark:border-slate-700 p-6 rounded-3xl shadow-lg hover:transform hover:scale-105 transition-all duration-300 delay-300">
                            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center mb-4">
                                <CheckCircle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">4. รอการยืนยัน</h3>
                            <p className="text-slate-500 dark:text-slate-400">รอแอดมินตรวจสอบความถูกต้อง (ภายใน 24 ชม.) และเริ่มเรียนได้ทันที!</p>
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
