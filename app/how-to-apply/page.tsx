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
    HelpCircle,
    Sparkles,
} from "lucide-react";
import { useInAppBrowser, openInExternalBrowser } from "@/lib/inAppBrowser";
import type { MouseEvent } from "react";

const STEPS = [
    {
        n: 1,
        c1: "#14b8a6",
        c2: "#0d9488",
        icon: UserPlus,
        title: "สมัครสมาชิก",
        desc: "สร้างบัญชีด้วยอีเมล ใช้ฟรี ไม่ถึงนาที",
        cta: { label: "สมัครสมาชิก", href: "/register" },
        sub: { label: "มีบัญชีแล้ว? เข้าสู่ระบบ", href: "/login" },
    },
    {
        n: 2,
        c1: "#f59e0b",
        c2: "#f97316",
        icon: ShoppingCart,
        title: "เลือกคอร์ส & แจ้งโอน",
        desc: "เลือกคอร์สที่อยากเรียน สแกน QR โอนเงิน แล้วแนบสลิป",
        cta: { label: "เลือกคอร์ส & แจ้งโอน", href: "/payment" },
    },
    {
        n: 3,
        c1: "#8b5cf6",
        c2: "#6366f1",
        icon: Clock,
        title: "รอครูเปิดสิทธิ์",
        desc: "ครูตรวจสลิปแล้วเปิดสิทธิ์ให้เร็วที่สุด เช็กสถานะได้ที่ “คอร์สเรียนของฉัน”",
        cta: { label: "เช็กสถานะ", href: "/my-courses" },
    },
    {
        n: 4,
        c1: "#10b981",
        c2: "#059669",
        icon: PlayCircle,
        title: "เข้าเรียนได้เลย",
        desc: "พอคอร์สขึ้นว่า “เรียนได้” กดเข้าเรียนแล้วเริ่มดูวิดีโอได้ทันที",
        cta: { label: "ไปคอร์สของฉัน", href: "/my-courses" },
    },
];

const CHIPS = [
    { emoji: "⏱️", label: "สมัครไม่ถึง 5 นาที" },
    { emoji: "🆓", label: "สมัครฟรี" },
    { emoji: "📱", label: "เรียนได้ทุกอุปกรณ์" },
];

export default function HowToApplyPage() {
    const inApp = useInAppBrowser();

    // Inside a chat app's in-app browser (LINE / Messenger / FB / IG), sign-up,
    // login + checkout are unreliable, so bounce those CTAs straight to the real
    // browser. Android and iOS-LINE open automatically; iOS Meta webviews block the
    // jump, so after a beat we fall through to the in-app page (whose banner has a
    // one-tap escape). Normal browsers fall through to the plain <Link>.
    const bounceForAuth = (e: MouseEvent, href: string) => {
        if (!inApp.isInApp || inApp.platform === "other") return;
        if (!/^\/(register|login|payment|my-courses)/.test(href)) return;
        e.preventDefault();
        openInExternalBrowser(`${window.location.origin}${href}`, inApp.platform);
        if (inApp.platform === "ios") {
            let escaped = false;
            const mark = () => { escaped = true; };
            document.addEventListener("visibilitychange", mark, { once: true });
            window.addEventListener("pagehide", mark, { once: true });
            window.setTimeout(() => {
                document.removeEventListener("visibilitychange", mark);
                window.removeEventListener("pagehide", mark);
                if (!escaped) window.location.assign(href);
            }, 1500);
        }
    };

    return (
        <div className="hta-root min-h-screen bg-[#F4F1E9] dark:bg-[#060c18] font-sans flex flex-col transition-colors">
            <Navbar />

            {/* Decorative, fully static background */}
            <div className="hta-bg" aria-hidden="true">
                <span className="hta-blob hta-blob-1" />
                <span className="hta-blob hta-blob-2" />
                <span className="hta-blob hta-blob-3" />
                <span className="hta-sym" style={{ top: "12%", left: "7%" }}>＋</span>
                <span className="hta-sym" style={{ top: "30%", right: "8%" }}>÷</span>
                <span className="hta-sym" style={{ top: "55%", left: "5%" }}>√</span>
                <span className="hta-sym" style={{ top: "72%", right: "9%" }}>π</span>
                <span className="hta-sym" style={{ top: "88%", left: "12%" }}>×</span>
                <span className="hta-sym" style={{ top: "44%", right: "16%" }}>−</span>
            </div>

            <main className="relative z-10 flex-grow flex justify-center px-4 pt-24 pb-24">
                <div className="w-full max-w-[760px] space-y-10">
                    {/* Back */}
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm font-bold text-[#6b7686] dark:text-[#9fb0c6] hover:text-teal-600 dark:hover:text-teal-400 transition-colors group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        กลับหน้าแรก
                    </Link>

                    {/* Hero */}
                    <header className="text-center flex flex-col items-center">
                        <div className="hta-mascot-wrap">
                            <span className="hta-ring" aria-hidden="true" />
                            <div className="hta-mascot-circle">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/assets/kruheem_avatar.png" alt="ครูฮีม" className="hta-mascot-img" />
                            </div>
                            <div className="hta-bubble font-mero">สวัสดีครับ! 👋</div>
                        </div>

                        <p className="hta-eyebrow font-mero">
                            <Sparkles size={14} /> เริ่มเรียนกับครูฮีม
                        </p>
                        <h1 className="hta-h1 font-mero">วิธีสมัครเรียน</h1>
                        <p className="mt-2 text-lg font-medium text-[#6b7686] dark:text-[#9fb0c6]">
                            แค่ 4 ขั้นตอนง่ายๆ ไม่น่ากลัวเลยครับ 🎉
                        </p>

                        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                            {CHIPS.map((c) => (
                                <span key={c.label} className="hta-chip font-mero">
                                    <span className="text-base leading-none">{c.emoji}</span>
                                    {c.label}
                                </span>
                            ))}
                        </div>
                    </header>

                    {/* Steps timeline */}
                    <ol className="hta-steps">
                        {STEPS.map((s) => {
                            const Icon = s.icon;
                            return (
                                <li
                                    key={s.n}
                                    className="hta-step"
                                    style={{ ["--c1" as string]: s.c1, ["--c2" as string]: s.c2 }}
                                >
                                    <div className="hta-node font-mero">{s.n}</div>
                                    <div className="hta-card">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="hta-step-icon">
                                                        <Icon className="w-5 h-5" />
                                                    </span>
                                                    <h3 className="hta-step-title font-mero">{s.title}</h3>
                                                </div>
                                                <p className="text-[15px] leading-relaxed text-[#6b7686] dark:text-[#9fb0c6]">
                                                    {s.desc}
                                                </p>
                                                {s.sub && (
                                                    <Link href={s.sub.href} onClick={(e) => bounceForAuth(e, s.sub.href)} className="hta-sublink font-mero">
                                                        {s.sub.label} →
                                                    </Link>
                                                )}
                                            </div>
                                            <Link href={s.cta.href} onClick={(e) => bounceForAuth(e, s.cta.href)} className="hta-cta font-mero">
                                                {s.cta.label}
                                                <ArrowRight className="hta-cta-arrow w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>

                    {/* Final CTA */}
                    <section className="hta-final">
                        <h2 className="text-2xl sm:text-3xl font-black text-[#243042] dark:text-[#eef2f8] font-mero leading-snug">
                            พร้อมเริ่มเรียนกับครูฮีมแล้วหรือยัง?
                        </h2>
                        <p className="mt-2 mb-6 text-[#6b7686] dark:text-[#9fb0c6]">สมัครวันนี้ เริ่มต้นเส้นทางเก่งเลขกันเลย!</p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link href="/register" onClick={(e) => bounceForAuth(e, "/register")} className="hta-btn-primary font-mero">
                                <UserPlus size={20} />
                                เริ่มสมัครเลย
                            </Link>
                            <Link href="/faq" className="hta-btn-ghost font-mero">
                                <HelpCircle size={20} />
                                คำถามที่พบบ่อย
                            </Link>
                        </div>
                    </section>
                </div>
            </main>

            <Footer />

            <style>{`
                /* ===== Decorative background (static) ===== */
                .hta-bg { position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: 0;
                    background-image:
                        linear-gradient(to right, rgba(20,184,166,.05) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(20,184,166,.05) 1px, transparent 1px);
                    background-size: 44px 44px; }
                .dark .hta-bg {
                    background-image:
                        linear-gradient(to right, rgba(148,163,184,.06) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(148,163,184,.06) 1px, transparent 1px); }
                .hta-blob { position: absolute; border-radius: 9999px; filter: blur(90px); opacity: .5; }
                .dark .hta-blob { opacity: .28; }
                .hta-blob-1 { width: 460px; height: 460px; top: -8%; left: -10%; background: #5eead4; }
                .hta-blob-2 { width: 380px; height: 380px; top: 40%; right: -12%; background: #fcd34d; }
                .hta-blob-3 { width: 360px; height: 360px; bottom: -10%; left: 25%; background: #c4b5fd; }
                .hta-sym { position: absolute; font-size: 40px; font-weight: 700; color: rgba(36,48,66,.05);
                    user-select: none; }
                .dark .hta-sym { color: rgba(238,242,248,.06); }

                /* ===== Hero mascot ===== */
                .hta-mascot-wrap { position: relative; width: 168px; height: 168px; margin-bottom: 18px; }
                .hta-ring { position: absolute; inset: -8px; border-radius: 9999px;
                    border: 2px dashed rgba(20,184,166,.45); }
                .dark .hta-ring { border-color: rgba(45,212,191,.4); }
                .hta-mascot-circle { position: absolute; inset: 0; border-radius: 9999px;
                    background: radial-gradient(circle at 50% 35%, #fffaf0, #f4ead3);
                    box-shadow: 0 14px 36px rgba(20,184,166,.18); display: grid; place-items: center;
                    overflow: hidden; }
                .dark .hta-mascot-circle { background: radial-gradient(circle at 50% 35%, #1b2942, #121d31);
                    box-shadow: 0 14px 36px rgba(0,0,0,.4); }
                .hta-mascot-img { width: 88%; height: 88%; object-fit: contain; }
                .hta-bubble { position: absolute; top: 2px; right: -18px; background: #14b8a6; color: #fff;
                    font-size: 13px; font-weight: 600; padding: 6px 12px; border-radius: 14px 14px 14px 4px;
                    box-shadow: 0 8px 18px rgba(20,184,166,.35); white-space: nowrap; }

                /* ===== Hero text ===== */
                .hta-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600;
                    color: #0d9488; background: rgba(20,184,166,.12); padding: 5px 14px; border-radius: 9999px;
                    margin-bottom: 12px; }
                .dark .hta-eyebrow { color: #5eead4; background: rgba(20,184,166,.16); }
                .hta-h1 { font-size: clamp(34px, 7vw, 52px); font-weight: 700; line-height: 1.5;
                    background: linear-gradient(90deg, #14b8a6, #059669); -webkit-background-clip: text;
                    background-clip: text; color: transparent; padding-bottom: 4px; }
                .hta-chip { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600;
                    color: #243042; background: #fff; border: 1px solid rgba(36,48,66,.08);
                    padding: 8px 15px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(36,48,66,.05); }
                .dark .hta-chip { color: #eef2f8; background: #121d31; border-color: rgba(255,255,255,.08); }

                /* ===== Steps timeline ===== */
                .hta-steps { position: relative; display: flex; flex-direction: column; gap: 18px; }
                .hta-steps::before { content: ""; position: absolute; left: 27px; top: 30px; bottom: 30px;
                    border-left: 2px dashed rgba(36,48,66,.16); z-index: 0; }
                .dark .hta-steps::before { border-color: rgba(255,255,255,.14); }
                .hta-step { position: relative; display: flex; align-items: flex-start; gap: 18px;
                    transition: opacity .3s ease, filter .3s ease, transform .3s ease; }
                .hta-node { position: relative; z-index: 1; flex-shrink: 0; width: 54px; height: 54px;
                    border-radius: 18px; display: grid; place-items: center; color: #fff; font-size: 24px;
                    font-weight: 700; background: linear-gradient(135deg, var(--c1), var(--c2));
                    box-shadow: 0 8px 20px color-mix(in srgb, var(--c1) 30%, transparent);
                    transition: transform .3s ease; }
                .hta-card { flex: 1; min-width: 0; background: #fff; border: 1px solid rgba(36,48,66,.07);
                    border-radius: 22px; padding: 20px 22px; box-shadow: 0 6px 22px rgba(36,48,66,.05);
                    transition: box-shadow .3s ease, border-color .3s ease; }
                .dark .hta-card { background: #121d31; border-color: rgba(255,255,255,.07);
                    box-shadow: 0 6px 22px rgba(0,0,0,.25); }
                .hta-step-icon { display: grid; place-items: center; color: var(--c1); }
                .dark .hta-step-icon { color: color-mix(in srgb, var(--c1) 70%, white); }
                .hta-step-title { font-size: 18px; font-weight: 700; color: #243042; line-height: 1.5; }
                .dark .hta-step-title { color: #eef2f8; }
                .hta-sublink { display: inline-block; margin-top: 8px; font-size: 13px; font-weight: 600;
                    color: #6366f1; }
                .dark .hta-sublink { color: #a5b4fc; }
                .hta-sublink:hover { text-decoration: underline; }
                .hta-cta { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
                    gap: 8px; padding: 13px 22px; border-radius: 16px; color: #fff; font-size: 14px; font-weight: 600;
                    white-space: nowrap; background: linear-gradient(135deg, var(--c1), var(--c2));
                    box-shadow: 0 8px 18px color-mix(in srgb, var(--c1) 28%, transparent);
                    transition: transform .2s ease, box-shadow .2s ease; }
                .hta-cta:hover { transform: translateY(-2px); }
                .hta-cta:active { transform: translateY(0) scale(.98); }
                .hta-cta-arrow { transition: transform .2s ease; }
                .hta-cta:hover .hta-cta-arrow { transform: translateX(3px); }

                /* Hover-focus: lift the hovered step, dim the rest (mouse devices only) */
                @media (hover: hover) {
                    .hta-steps:hover .hta-step { opacity: .5; filter: blur(1px); }
                    .hta-steps:hover .hta-step:hover { opacity: 1; filter: none; transform: translateY(-4px); }
                    .hta-steps:hover .hta-step:hover .hta-node { transform: scale(1.08); }
                    .hta-step:hover .hta-card { box-shadow: 0 14px 32px color-mix(in srgb, var(--c1) 22%, transparent); }
                }

                /* ===== Final CTA ===== */
                .hta-final { text-align: center; background: #fff; border: 1px solid rgba(36,48,66,.07);
                    border-radius: 26px; padding: 32px 24px; box-shadow: 0 6px 22px rgba(36,48,66,.05); }
                .dark .hta-final { background: #121d31; border-color: rgba(255,255,255,.07); }
                .hta-btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px;
                    width: 100%; padding: 15px 32px; border-radius: 9999px; font-size: 18px; font-weight: 600;
                    color: #fff; background: linear-gradient(135deg, #14b8a6, #059669);
                    box-shadow: 0 12px 26px rgba(20,184,166,.32); transition: transform .2s ease; }
                .hta-btn-ghost { display: inline-flex; align-items: center; justify-content: center; gap: 8px;
                    width: 100%; padding: 15px 32px; border-radius: 9999px; font-size: 18px; font-weight: 600;
                    color: #6b7686; background: transparent; border: 1px solid rgba(36,48,66,.14);
                    transition: color .2s ease, border-color .2s ease, transform .2s ease; }
                .dark .hta-btn-ghost { color: #9fb0c6; border-color: rgba(255,255,255,.14); }
                .hta-btn-primary:hover, .hta-btn-ghost:hover { transform: translateY(-2px); }
                .hta-btn-ghost:hover { color: #0d9488; border-color: rgba(20,184,166,.4); }
                @media (min-width: 640px) { .hta-btn-primary, .hta-btn-ghost { width: auto; } }

                /* ===== Reduced motion ===== */
                @media (prefers-reduced-motion: reduce) {
                    .hta-root *, .hta-root *::before { transition: none !important; animation: none !important; }
                    .hta-steps:hover .hta-step { opacity: 1 !important; filter: none !important; transform: none !important; }
                }
            `}</style>
        </div>
    );
}
