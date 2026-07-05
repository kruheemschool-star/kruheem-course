"use client";

import Link from "next/link";
import { useUserAuth } from "@/context/AuthContext";
import { DoorOpen, PlayCircle, FileText, Target, ClipboardList, ArrowRight, Star, Download } from "lucide-react";

// "เริ่มต้นตรงนี้" wayfinding — sits right under the hero so a first-time
// visitor can jump straight to what they want, and a returning student can
// reach their classroom without wading through the sales cards.
export default function StartHereNav() {
    const { user } = useUserAuth();

    const scrollToCourses = () =>
        document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });

    return (
        <section className="py-10 md:py-14 px-6 relative z-10">
            <div className="max-w-6xl mx-auto">

                {/* Returning-student bar — always shown, copy adapts to login state */}
                <div className="rounded-3xl border border-teal-100 dark:border-teal-900 bg-teal-50/80 dark:bg-teal-950/40 p-4 sm:p-5 flex flex-wrap items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-teal-600 flex items-center justify-center text-white shrink-0">
                        <DoorOpen className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-[160px]">
                        <div className="font-bold text-teal-900 dark:text-teal-100">
                            {user ? `ยินดีต้อนรับกลับ${user.displayName ? ` คุณ${user.displayName}` : ""}` : "เป็นนักเรียนอยู่แล้ว?"}
                        </div>
                        <div className="text-sm text-teal-700 dark:text-teal-300">เข้าห้องเรียน ดูคอร์ส และข้อสอบที่ซื้อไว้ได้เลย</div>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                        <Link href="/my-courses" className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm px-4 py-2.5 transition-colors">
                            <PlayCircle className="w-4 h-4" /> เข้าห้องเรียน
                        </Link>
                        <Link href="/my-exam-papers" className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 font-bold text-sm px-4 py-2.5 hover:border-teal-400 transition-colors">
                            <Download className="w-4 h-4" /> ข้อสอบที่ซื้อไว้
                        </Link>
                    </div>
                </div>

                {/* Heading */}
                <div className="text-center mt-10 mb-6">
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> ยังไม่เริ่ม? เริ่มตรงนี้
                    </div>
                    <h2 className="font-mero text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 mt-2">เลือกสิ่งที่อยากทำได้เลย</h2>
                </div>

                {/* Intent cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* Recommended — free practice */}
                    <Link href="/exam" className="group relative rounded-2xl border-2 border-teal-500 bg-white dark:bg-slate-900 p-5 flex flex-col gap-3 hover:-translate-y-1 hover:shadow-xl transition-all">
                        <span className="absolute -top-2.5 left-4 rounded-full bg-teal-600 text-white text-[11px] font-bold px-2.5 py-0.5">แนะนำให้เริ่ม</span>
                        <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center"><Target className="w-6 h-6" /></div>
                        <div className="font-bold text-slate-900 dark:text-white">ลองฝึกข้อสอบฟรี</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 flex-1 leading-relaxed">คลังข้อสอบออนไลน์ จับเวลา มีเฉลย</div>
                        <div className="text-sm font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 group-hover:gap-2 transition-all">เริ่มฝึกเลย <ArrowRight className="w-4 h-4" /></div>
                    </Link>

                    {/* Courses — scroll to on-page list */}
                    <button onClick={scrollToCourses} className="group text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col gap-3 hover:-translate-y-1 hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 flex items-center justify-center"><PlayCircle className="w-6 h-6" /></div>
                        <div className="font-bold text-slate-900 dark:text-white">เรียนคอร์สกับครูฮีม</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 flex-1 leading-relaxed">วิดีโอ ม.1 ถึง ม.6 เรียนซ้ำได้</div>
                        <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all">ดูคอร์ส <ArrowRight className="w-4 h-4" /></div>
                    </button>

                    {/* Buy PDF */}
                    <Link href="/exam-papers" className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col gap-3 hover:-translate-y-1 hover:shadow-xl hover:border-amber-200 dark:hover:border-amber-800 transition-all">
                        <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center"><FileText className="w-6 h-6" /></div>
                        <div className="font-bold text-slate-900 dark:text-white">ซื้อข้อสอบ PDF</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 flex-1 leading-relaxed">พร้อมเฉลย ซื้อครั้งเดียว โหลดได้ตลอด</div>
                        <div className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 group-hover:gap-2 transition-all">เลือกซื้อ <ArrowRight className="w-4 h-4" /></div>
                    </Link>

                    {/* How to order */}
                    <Link href="/how-to-apply" className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col gap-3 hover:-translate-y-1 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                        <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 flex items-center justify-center"><ClipboardList className="w-6 h-6" /></div>
                        <div className="font-bold text-slate-900 dark:text-white">วิธีการสั่งซื้อ</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 flex-1 leading-relaxed">สมัคร จ่ายเงิน แนบสลิป ทีละขั้นตอน</div>
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:gap-2 transition-all">ดูวิธีสั่งซื้อ <ArrowRight className="w-4 h-4" /></div>
                    </Link>

                </div>

                {/* Reviews link for the undecided */}
                <div className="text-center mt-6">
                    <span className="text-sm text-slate-500 dark:text-slate-400">ยังไม่แน่ใจ? </span>
                    <Link href="/reviews" className="text-sm font-bold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1 hover:gap-2 transition-all">
                        <Star className="w-4 h-4" /> อ่านรีวิวจริงจากผู้ปกครอง <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

            </div>
        </section>
    );
}
