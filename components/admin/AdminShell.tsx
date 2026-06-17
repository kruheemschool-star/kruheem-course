"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useUserAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import {
    LayoutDashboard, Wallet, Ticket, Gift, Download,
    BookOpen, ClipboardList, ScrollText, Newspaper,
    Users, Smile, Activity,
    MessageCircle, LifeBuoy, Megaphone, Star, BarChart3,
    Menu, Search, Bell, Sun, Moon, LogOut, Home,
    type LucideIcon,
} from "lucide-react";

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
    badge?: "pending" | "tickets";
    /** extra path prefixes that should also mark this item active */
    match?: string[];
};

type NavGroup = { title?: string; items: NavItem[] };

const NAV: NavGroup[] = [
    {
        items: [
            { href: "/admin", label: "ภาพรวมระบบ", icon: LayoutDashboard },
        ],
    },
    {
        title: "การเงิน",
        items: [
            { href: "/admin/enrollments", label: "ตรวจสอบชำระเงิน", icon: Wallet, badge: "pending" },
            { href: "/admin/coupons", label: "จัดการคูปอง", icon: Ticket },
            { href: "/admin/promotions", label: "โปรโมชันหน้าแรก", icon: Gift, match: ["/admin/banners"] },
            { href: "/admin/reports", label: "ส่งออกรายงาน", icon: Download, match: ["/admin/backup"] },
        ],
    },
    {
        title: "เนื้อหา",
        items: [
            { href: "/admin/courses", label: "จัดการคอร์สเรียน", icon: BookOpen, match: ["/admin/course"] },
            { href: "/admin/exams", label: "คลังข้อสอบ", icon: ClipboardList, match: ["/admin/exam-validator"] },
            { href: "/admin/summaries", label: "สรุปเนื้อหา", icon: ScrollText },
            { href: "/admin/posts", label: "จัดการบทความ", icon: Newspaper },
        ],
    },
    {
        title: "ผู้เรียน",
        items: [
            { href: "/admin/students", label: "ทะเบียนนักเรียน", icon: Users },
            { href: "/admin/avatars", label: "รูปประจำตัว", icon: Smile },
            { href: "/admin/activity", label: "Activity Log", icon: Activity },
        ],
    },
    {
        title: "การสื่อสาร",
        items: [
            { href: "/admin/chat", label: "แชทกับลูกค้า", icon: MessageCircle },
            { href: "/admin/support", label: "แจ้งปัญหา (Ticket)", icon: LifeBuoy, badge: "tickets" },
            { href: "/admin/notifications", label: "ประกาศข่าวสาร", icon: Megaphone },
            { href: "/admin/reviews", label: "จัดการรีวิว", icon: Star },
            { href: "/admin/poll", label: "แบบสอบถาม", icon: BarChart3 },
        ],
    },
];

// Page title + subtitle per route (longest-prefix match)
const PAGE_META: { prefix: string; exact?: boolean; title: string; subtitle: string }[] = [
    { prefix: "/admin", exact: true, title: "ภาพรวมระบบ", subtitle: "สรุปงานด่วน รายได้ และสุขภาพการเรียนในจอเดียว" },
    { prefix: "/admin/enrollments", title: "ตรวจสอบชำระเงิน", subtitle: "ตรวจสลิปและอนุมัติการสมัครเรียน" },
    { prefix: "/admin/coupons", title: "จัดการคูปอง", subtitle: "สร้างและติดตามโค้ดส่วนลด" },
    { prefix: "/admin/promotions", title: "โปรโมชันหน้าแรก", subtitle: "แบนเนอร์โปรโมชันเหนือ Hero" },
    { prefix: "/admin/banners", title: "แบนเนอร์คอร์ส", subtitle: "จัดการแบนเนอร์การ์ดคอร์ส" },
    { prefix: "/admin/reports", title: "ส่งออกรายงาน", subtitle: "Export รายงานให้ AI ช่วยวิเคราะห์" },
    { prefix: "/admin/backup", title: "สำรองข้อมูล", subtitle: "ดาวน์โหลดข้อมูลระบบเป็น JSON" },
    { prefix: "/admin/courses", title: "จัดการคอร์สเรียน", subtitle: "เพิ่ม/แก้ไขคอร์สและบทเรียน" },
    { prefix: "/admin/course", title: "แก้ไขคอร์สเรียน", subtitle: "จัดการบทเรียนและเนื้อหาในคอร์ส" },
    { prefix: "/admin/exams", title: "คลังข้อสอบ", subtitle: "เพิ่ม/แก้ไขชุดข้อสอบ" },
    { prefix: "/admin/exam-validator", title: "ตรวจทานข้อสอบ", subtitle: "ตรวจความถูกต้องของชุดข้อสอบ" },
    { prefix: "/admin/summaries", title: "สรุปเนื้อหา", subtitle: "เขียน/แก้ไขบทสรุป" },
    { prefix: "/admin/posts", title: "จัดการบทความ", subtitle: "เขียน/แก้ไขเทคนิคการเรียน" },
    { prefix: "/admin/students", title: "ทะเบียนนักเรียน", subtitle: "รายชื่อ ความคืบหน้า และสถานะนักเรียน" },
    { prefix: "/admin/avatars", title: "รูปประจำตัว", subtitle: "อัปโหลดรูปให้นักเรียนเลือกใช้" },
    { prefix: "/admin/activity", title: "Activity Log", subtitle: "ติดตามกิจกรรมในระบบ" },
    { prefix: "/admin/chat", title: "แชทกับลูกค้า", subtitle: "ตอบแชทสด Real-time" },
    { prefix: "/admin/support", title: "แจ้งปัญหา (Ticket)", subtitle: "ระบบตั๋วแจ้งปัญหา" },
    { prefix: "/admin/notifications", title: "ประกาศข่าวสาร", subtitle: "แจ้งเตือนถึงนักเรียน" },
    { prefix: "/admin/reviews", title: "จัดการรีวิว", subtitle: "อนุมัติ/ซ่อน/ลบรีวิว" },
    { prefix: "/admin/poll", title: "แบบสอบถาม", subtitle: "สร้าง Poll ถามความเห็น" },
    { prefix: "/admin/settings", title: "ตั้งค่า", subtitle: "ปรับแต่งหน้าปกเมนูและระบบ" },
];

function resolvePageMeta(pathname: string) {
    let best: (typeof PAGE_META)[number] | null = null;
    for (const m of PAGE_META) {
        if (m.exact) {
            if (pathname === m.prefix) return m;
            continue;
        }
        if (pathname === m.prefix || pathname.startsWith(m.prefix + "/")) {
            if (!best || m.prefix.length > best.prefix.length) best = m;
        }
    }
    return best ?? { title: "ผู้ดูแลระบบ", subtitle: "" };
}

function isActive(item: NavItem, pathname: string) {
    const hrefs = [item.href, ...(item.match ?? [])];
    if (item.href === "/admin") return pathname === "/admin";
    return hrefs.some((h) => pathname === h || pathname.startsWith(h + "/"));
}

function initialsOf(email?: string | null) {
    if (!email) return "AD";
    const name = email.split("@")[0];
    return name.slice(0, 2).toUpperCase();
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || "/admin";
    const { user, logOut, pendingCount } = useUserAuth();
    const { theme, setTheme } = useTheme();

    const [mounted, setMounted] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [ticketsCount, setTicketsCount] = useState(0);

    // restore collapse preference
    useEffect(() => {
        setMounted(true);
        try {
            setCollapsed(localStorage.getItem("kh-collapsed") === "1");
        } catch { /* ignore */ }
    }, []);

    // lightweight pending-tickets count for the sidebar badge
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const snap = await getCountFromServer(
                    query(collection(db, "support_tickets"), where("status", "==", "pending"))
                );
                if (alive) setTicketsCount(snap.data().count);
            } catch { /* index/perms — just hide the badge */ }
        })();
        return () => { alive = false; };
    }, []);

    // close the mobile drawer whenever the route changes
    useEffect(() => { setMobileOpen(false); }, [pathname]);

    const toggleMenu = useCallback(() => {
        if (typeof window !== "undefined" && window.innerWidth < 1024) {
            setMobileOpen((o) => !o);
            return;
        }
        setCollapsed((c) => {
            const next = !c;
            try { localStorage.setItem("kh-collapsed", next ? "1" : "0"); } catch { /* ignore */ }
            return next;
        });
    }, []);

    const meta = resolvePageMeta(pathname);
    const isDark = mounted && theme === "dark";
    const badgeFor = (k?: NavItem["badge"]) =>
        k === "pending" ? pendingCount : k === "tickets" ? ticketsCount : 0;

    return (
        <div className={`kh-admin kh-shell ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`}>
            {/* backdrop (mobile drawer) */}
            <div className="kh-backdrop" onClick={() => setMobileOpen(false)} aria-hidden />

            {/* ============ SIDEBAR ============ */}
            <aside className="kh-side">
                {/* brand */}
                <div className="flex items-center gap-3 px-4 h-16 shrink-0">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "linear-gradient(135deg,#2DD4BF,#0D9488)" }}
                    >
                        <svg viewBox="0 0 24 24" width="19" height="19" fill="none"
                            stroke="#06231F" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 13l3 6 5-15h8" />
                        </svg>
                    </div>
                    <div className="kh-brand-text leading-tight overflow-hidden">
                        <div className="kh-brand text-[15px] font-semibold text-white">ครูฮีม</div>
                        <div className="text-[10px] font-bold tracking-[0.18em]" style={{ color: "var(--side-ink-2)" }}>
                            ADMIN PANEL
                        </div>
                    </div>
                </div>

                {/* nav */}
                <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
                    {NAV.map((group, gi) => (
                        <div key={gi} className="space-y-1">
                            {group.title && <div className="kh-side-group mb-1 mt-1">{group.title}</div>}
                            {group.items.map((item) => {
                                const active = isActive(item, pathname);
                                const Icon = item.icon;
                                const count = badgeFor(item.badge);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        data-active={active}
                                        className="kh-side-link"
                                        title={item.label}
                                    >
                                        <Icon size={18} strokeWidth={1.8} className="shrink-0" />
                                        <span className="kh-label flex-1">{item.label}</span>
                                        {count > 0 && (
                                            <span
                                                className={`kh-label text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0`}
                                                style={{ background: item.badge === "pending" ? "var(--danger)" : "var(--warn)" }}
                                            >
                                                {count}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* profile + logout */}
                <div className="shrink-0 border-t p-3" style={{ borderColor: "var(--side-line)" }}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-semibold text-white shrink-0"
                            style={{ background: "linear-gradient(135deg,#5EEAD4,#0D9488)", color: "#06231F" }}>
                            {initialsOf(user?.email)}
                        </div>
                        <div className="kh-label flex-1 min-w-0">
                            <div className="text-[12.5px] font-medium text-white truncate">{user?.email || "ผู้ดูแลระบบ"}</div>
                            <div className="text-[10.5px]" style={{ color: "var(--side-ink-2)" }}>ผู้ดูแลระบบ</div>
                        </div>
                        <button
                            onClick={() => logOut()}
                            title="ออกจากระบบ"
                            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                            style={{ color: "var(--side-ink)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--side-line)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                            <LogOut size={16} strokeWidth={1.8} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ============ CONTENT ============ */}
            <div className="kh-content">
                {/* topbar */}
                <header className="kh-topbar">
                    <button
                        onClick={toggleMenu}
                        aria-label="สลับเมนู"
                        className="w-9 h-9 rounded-lg flex items-center justify-center kh-ink2 hover:kh-ink shrink-0"
                        style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}
                    >
                        <Menu size={18} strokeWidth={1.8} />
                    </button>

                    <div className="min-w-0">
                        <h1 className="text-[19px] font-semibold kh-ink leading-tight truncate">{meta.title}</h1>
                        {meta.subtitle && <p className="text-[12px] kh-ink3 truncate -mt-0.5">{meta.subtitle}</p>}
                    </div>

                    <div className="flex-1" />

                    {/* search (cosmetic for now) */}
                    <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-lg"
                        style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}>
                        <Search size={15} strokeWidth={1.8} className="kh-ink3" />
                        <input
                            placeholder="ค้นหา..."
                            className="bg-transparent outline-none text-[13px] kh-ink w-32 lg:w-44 placeholder:opacity-60"
                            style={{ color: "var(--ink)" }}
                        />
                    </div>

                    {/* notifications */}
                    <Link
                        href="/admin/notifications"
                        aria-label="การแจ้งเตือน"
                        className="relative w-9 h-9 rounded-lg flex items-center justify-center kh-ink2 shrink-0"
                        style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}
                    >
                        <Bell size={17} strokeWidth={1.8} />
                        {(pendingCount + ticketsCount) > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                                style={{ background: "var(--danger)" }} />
                        )}
                    </Link>

                    {/* dark / light */}
                    <button
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                        aria-label="สลับโหมดมืด/สว่าง"
                        className="w-9 h-9 rounded-lg flex items-center justify-center kh-ink2 shrink-0"
                        style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}
                    >
                        {mounted ? (isDark ? <Sun size={17} strokeWidth={1.8} /> : <Moon size={17} strokeWidth={1.8} />) : <Moon size={17} strokeWidth={1.8} />}
                    </button>

                    {/* back to site */}
                    <Link
                        href="/"
                        aria-label="กลับหน้าบ้าน"
                        className="hidden sm:flex w-9 h-9 rounded-lg items-center justify-center kh-ink2 shrink-0"
                        style={{ background: "var(--card-2)", border: "1px solid var(--line)" }}
                    >
                        <Home size={17} strokeWidth={1.8} />
                    </Link>
                </header>

                {/* page body */}
                <main className="kh-main flex-1">
                    <div className="kh-container">{children}</div>
                </main>
            </div>
        </div>
    );
}
