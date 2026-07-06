"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useUserAuth } from "@/context/AuthContext";
import { GraduationCap, PlayCircle, FileText, Target, ClipboardList, ArrowRight, Star } from "lucide-react";

// "เริ่มต้นตรงนี้" wayfinding — Liquid Glass (design 2a). Frosted cards over
// ambient colour blobs with a cursor-following specular highlight. Sits right
// under the hero so newcomers pick a path and returning students reach class.
export default function StartHereNav() {
    const { user } = useUserAuth();
    const rootRef = useRef<HTMLElement>(null);

    // Cursor spotlight: move a soft highlight to the pointer on each glass card.
    useEffect(() => {
        const cards = Array.from(rootRef.current?.querySelectorAll<HTMLElement>(".shn-glass") ?? []);
        const onMove = (e: PointerEvent) => {
            const el = e.currentTarget as HTMLElement;
            const r = el.getBoundingClientRect();
            el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
            el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
            const dark = document.documentElement.classList.contains("dark");
            el.style.setProperty("--spot", dark ? "rgba(255,255,255,0.17)" : "rgba(255,255,255,0.55)");
        };
        const onLeave = (e: PointerEvent) => (e.currentTarget as HTMLElement).style.setProperty("--spot", "transparent");
        cards.forEach((c) => {
            c.addEventListener("pointermove", onMove);
            c.addEventListener("pointerleave", onLeave);
        });
        return () => cards.forEach((c) => {
            c.removeEventListener("pointermove", onMove);
            c.removeEventListener("pointerleave", onLeave);
        });
    }, []);

    const scrollToCourses = () =>
        document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });

    return (
        <section ref={rootRef} className="shn py-10 md:py-14 px-4 sm:px-6 relative z-10">
            <div className="shn-panel max-w-6xl mx-auto">
                <div className="shn-blob b-teal" aria-hidden />
                <div className="shn-blob b-indigo" aria-hidden />
                <div className="shn-blob b-amber" aria-hidden />
                <div className="shn-blob b-rose" aria-hidden />

                <div className="shn-content">

                    {/* Returning-student bar */}
                    <div className="shn-glass shn-bar shn-rise p-4 sm:p-5 flex flex-wrap items-center gap-4" style={{ animationDelay: "0.02s" }}>
                        <div className="shn-icon w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ color: "var(--teal-deep)" }}>
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-[160px]">
                            <div className="font-bold" style={{ color: "var(--ink)" }}>
                                {user ? `ยินดีต้อนรับกลับ${user.displayName ? ` คุณ${user.displayName}` : ""}` : "เป็นนักเรียนอยู่แล้ว?"}
                            </div>
                            <div className="text-sm" style={{ color: "var(--ink2)" }}>เข้าห้องเรียน ดูคอร์ส และข้อสอบที่ซื้อไว้ได้เลย</div>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                            <Link href="/my-courses" className="inline-flex items-center gap-1.5 rounded-full text-white font-bold text-sm px-4 py-2.5 transition-transform hover:-translate-y-0.5" style={{ background: "var(--teal)" }}>
                                <PlayCircle className="w-4 h-4" /> เข้าห้องเรียน
                            </Link>
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="text-center mt-10 mb-7">
                        <div className="shn-glass shn-rise inline-flex items-center gap-2 text-[13px] font-bold px-3.5 py-1.5 rounded-full" style={{ color: "var(--teal-deep)", borderRadius: "999px", animationDelay: "0.05s" }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--teal)" }} /> สำหรับคนที่เพิ่งเริ่มต้น
                        </div>
                        <h2 className="font-mero text-3xl md:text-[46px] font-bold mt-3 leading-tight" style={{ color: "var(--ink)" }}>
                            ไม่รู้จะเริ่มตรงไหน?<br className="sm:hidden" /> เริ่มที่นี่เลย
                        </h2>
                        <p className="mt-3 text-[15px] md:text-[17px]" style={{ color: "var(--ink2)" }}>เลือกสิ่งที่อยากทำได้เลย ครูฮีมจัดเส้นทางไว้ให้แล้ว</p>
                    </div>

                    {/* Intent cards */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-[18px]">

                        <Link href="/exam" className="shn-glass is-rec shn-rise group relative p-5 flex flex-col gap-3" style={{ animationDelay: "0.08s" }}>
                            <span className="absolute -top-2.5 left-4 rounded-full text-white text-[11px] font-bold px-2.5 py-0.5" style={{ background: "var(--teal)" }}>แนะนำให้เริ่ม</span>
                            <div className="shn-icon w-11 h-11 rounded-xl flex items-center justify-center" style={{ color: "var(--teal-deep)" }}><Target className="w-6 h-6" /></div>
                            <div className="font-mero text-[19px] font-semibold" style={{ color: "var(--ink)" }}>ลองฝึกข้อสอบฟรี</div>
                            <div className="text-sm flex-1 leading-relaxed" style={{ color: "var(--ink2)" }}>คลังข้อสอบออนไลน์ จับเวลา มีเฉลย</div>
                            <div className="text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: "var(--teal-deep)" }}>เริ่มฝึกเลย <ArrowRight className="w-4 h-4" /></div>
                        </Link>

                        <button onClick={scrollToCourses} className="shn-glass shn-rise group text-left p-5 flex flex-col gap-3" style={{ animationDelay: "0.11s" }}>
                            <div className="shn-icon w-11 h-11 rounded-xl flex items-center justify-center" style={{ color: "var(--indigo)" }}><PlayCircle className="w-6 h-6" /></div>
                            <div className="font-mero text-[19px] font-semibold" style={{ color: "var(--ink)" }}>เรียนคอร์สกับครูฮีม</div>
                            <div className="text-sm flex-1 leading-relaxed" style={{ color: "var(--ink2)" }}>วิดีโอ ม.1 ถึง ม.6 เรียนซ้ำได้</div>
                            <div className="text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: "var(--indigo)" }}>ดูคอร์ส <ArrowRight className="w-4 h-4" /></div>
                        </button>

                        <Link href="/exam-papers" className="shn-glass shn-rise group p-5 flex flex-col gap-3" style={{ animationDelay: "0.14s" }}>
                            <div className="shn-icon w-11 h-11 rounded-xl flex items-center justify-center" style={{ color: "var(--amber)" }}><FileText className="w-6 h-6" /></div>
                            <div className="font-mero text-[19px] font-semibold" style={{ color: "var(--ink)" }}>แนวข้อสอบเข้า (ปีล่าสุด)</div>
                            <div className="text-sm flex-1 leading-relaxed" style={{ color: "var(--ink2)" }}>พร้อมเฉลย ซื้อครั้งเดียว โหลดได้ตลอด</div>
                            <div className="text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: "var(--amber)" }}>เลือกซื้อ <ArrowRight className="w-4 h-4" /></div>
                        </Link>

                        <Link href="/how-to-apply" className="shn-glass shn-rise group p-5 flex flex-col gap-3" style={{ animationDelay: "0.17s" }}>
                            <div className="shn-icon w-11 h-11 rounded-xl flex items-center justify-center" style={{ color: "var(--blue)" }}><ClipboardList className="w-6 h-6" /></div>
                            <div className="font-mero text-[19px] font-semibold" style={{ color: "var(--ink)" }}>วิธีการสั่งซื้อ</div>
                            <div className="text-sm flex-1 leading-relaxed" style={{ color: "var(--ink2)" }}>สมัคร จ่ายเงิน แนบสลิป ทีละขั้นตอน</div>
                            <div className="text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: "var(--blue)" }}>ดูวิธีสั่งซื้อ <ArrowRight className="w-4 h-4" /></div>
                        </Link>

                    </div>

                    {/* Reviews link */}
                    <div className="text-center mt-7">
                        <span className="text-sm" style={{ color: "var(--ink2)" }}>ยังไม่แน่ใจ? </span>
                        <Link href="/reviews" className="text-sm font-bold inline-flex items-center gap-1 hover:gap-2 transition-all" style={{ color: "var(--rose)" }}>
                            <Star className="w-4 h-4" /> อ่านรีวิวจริงจากผู้ปกครอง <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                </div>
            </div>
        </section>
    );
}
