"use client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import {
    UserPlus,
    ShoppingCart,
    Clock,
    PlayCircle,
    ArrowLeft,
    ArrowRight,
    Smartphone,
    CheckCircle,
    HelpCircle,
} from "lucide-react";

const STEPS = [
    {
        n: 1,
        icon: UserPlus,
        title: "สมัครสมาชิก",
        desc: "สร้างบัญชีด้วยอีเมล ใช้ฟรี ใช้เวลาไม่ถึงนาที",
        cta: { label: "สมัครสมาชิก", href: "/register" },
        sub: { label: "มีบัญชีแล้ว? เข้าสู่ระบบ", href: "/login" },
    },
    {
        n: 2,
        icon: ShoppingCart,
        title: "เลือกคอร์ส & แจ้งโอน",
        desc: "เลือกคอร์สที่อยากเรียน สแกน QR โอนเงิน แล้วแนบสลิป",
        cta: { label: "เลือกคอร์ส & แจ้งโอน", href: "/payment" },
    },
    {
        n: 3,
        icon: Clock,
        title: "รอครูเปิดสิทธิ์",
        desc: "ครูตรวจสลิปแล้วเปิดสิทธิ์ให้ เช็กสถานะได้ที่ “คอร์สเรียนของฉัน”",
        cta: { label: "เช็กสถานะ", href: "/my-courses" },
    },
    {
        n: 4,
        icon: PlayCircle,
        title: "เข้าเรียนได้เลย",
        desc: "พอคอร์สขึ้นว่า “เรียนได้” กดเข้าเรียนแล้วเริ่มดูวิดีโอได้ทันที",
        cta: { label: "ไปคอร์สของฉัน", href: "/my-courses" },
    },
];

export default function HowToApplyPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans flex flex-col transition-colors">
            <Navbar />

            <div className="relative flex-grow flex justify-center items-start p-4 overflow-hidden pt-24 pb-24">
                {/* Soft background orbs */}
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-200 dark:bg-teal-900/30 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[100px] opacity-50 animate-pulse"></div>
                <div className="absolute top-[35%] right-[-10%] w-[400px] h-[400px] bg-emerald-200 dark:bg-emerald-900/30 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[100px] opacity-50 animate-pulse delay-1000"></div>

                <div className="relative z-10 w-full max-w-2xl space-y-8">
                    {/* Back */}
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors group">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        กลับหน้าแรก
                    </Link>

                    {/* Hero */}
                    <div className="text-center space-y-3">
                        <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400">
                            วิธีสมัครเรียน
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                            แค่ 4 ขั้นตอน เริ่มเรียนกับครูฮีมได้เลย 🎉
                        </p>
                    </div>

                    {/* Compact browser note */}
                    <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                        <Smartphone className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                            <strong>เปิดในแอป LINE/Messenger ไม่ได้นะครับ</strong> — ถ้ากดลิงก์มาจากแชต ให้กดค้างลิงก์แล้วเลือก “เปิดใน Safari” (iPhone) หรือ “เปิดใน Chrome” (Android) ก่อน
                        </p>
                    </div>

                    {/* Steps */}
                    <ol className="space-y-4">
                        {STEPS.map((s) => {
                            const Icon = s.icon;
                            return (
                                <li
                                    key={s.n}
                                    className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-100 dark:border-slate-700 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        {/* Number + icon + text */}
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="relative flex-shrink-0">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white grid place-items-center font-black text-2xl shadow-lg shadow-emerald-500/20">
                                                    {s.n}
                                                </div>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Icon className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                                                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">{s.title}</h3>
                                                </div>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
                                                {s.sub && (
                                                    <Link href={s.sub.href} className="inline-block mt-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                                        {s.sub.label} →
                                                    </Link>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action button */}
                                        <Link
                                            href={s.cta.href}
                                            className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm shadow-md shadow-teal-500/20 hover:-translate-y-0.5 active:scale-95 transition-all whitespace-nowrap"
                                        >
                                            {s.cta.label}
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>

                    {/* How to enter class — highlighted */}
                    <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-6 sm:p-8 shadow-xl shadow-emerald-500/20">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                                <PlayCircle className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white">วิธีเข้าเรียน</h2>
                                <p className="text-white/80 text-sm">หลังครูเปิดสิทธิ์แล้ว ทำตามนี้เลย</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            {[
                                "เข้าเมนู “คอร์สเรียนของฉัน”",
                                "คอร์สที่เปิดสิทธิ์แล้วจะมีปุ่ม “เข้าเรียน” — กดเข้าไป",
                                "ดูวิดีโอ ทำแบบฝึกหัด และดูความคืบหน้าได้เลย",
                            ].map((text, i) => (
                                <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-2xl p-3">
                                    <span className="w-7 h-7 rounded-full bg-white text-teal-600 grid place-items-center font-black text-sm flex-shrink-0">
                                        {i + 1}
                                    </span>
                                    <span className="text-white font-medium text-sm sm:text-base">{text}</span>
                                </div>
                            ))}
                        </div>

                        <Link
                            href="/my-courses"
                            className="flex items-center justify-center gap-2 w-full py-4 bg-white text-teal-700 rounded-2xl font-black text-lg shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all"
                        >
                            <CheckCircle className="w-5 h-5" />
                            ไปที่คอร์สเรียนของฉัน
                        </Link>
                    </div>

                    {/* Final CTA */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <Link
                            href="/register"
                            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-lg rounded-full shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <UserPlus size={20} />
                            เริ่มสมัครเลย
                        </Link>
                        <Link
                            href="/faq"
                            className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-lg rounded-full hover:border-teal-300 dark:hover:border-teal-700 hover:text-teal-600 dark:hover:text-teal-400 transition-all flex items-center justify-center gap-2"
                        >
                            <HelpCircle size={20} />
                            คำถามที่พบบ่อย
                        </Link>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
