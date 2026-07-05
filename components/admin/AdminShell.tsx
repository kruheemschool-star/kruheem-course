"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useUserAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    LayoutDashboard, Wallet, Ticket, Gift, Download,
    BookOpen, ClipboardList, ScrollText, Newspaper, FileText,
    Users, Smile, Activity,
    MessageCircle, LifeBuoy, Megaphone, Star, BarChart3,
    Menu, Search, Bell, Sun, Moon, LogOut, Home, GripVertical,
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

type NavGroup = { key: string; title?: string; items: NavItem[] };

const NAV: NavGroup[] = [
    {
        key: "overview",
        items: [
            { href: "/admin", label: "ภาพรวมระบบ", icon: LayoutDashboard },
        ],
    },
    {
        key: "finance",
        title: "การเงิน",
        items: [
            { href: "/admin/enrollments", label: "ตรวจสอบชำระเงิน", icon: Wallet, badge: "pending" },
            { href: "/admin/coupons", label: "จัดการคูปอง", icon: Ticket },
            { href: "/admin/promotions", label: "โปรโมชันหน้าแรก", icon: Gift, match: ["/admin/banners"] },
            { href: "/admin/reports", label: "ส่งออกรายงาน", icon: Download, match: ["/admin/backup"] },
        ],
    },
    {
        key: "content",
        title: "เนื้อหา",
        items: [
            { href: "/admin/courses", label: "จัดการคอร์สเรียน", icon: BookOpen, match: ["/admin/course"] },
            { href: "/admin/exams", label: "คลังข้อสอบ", icon: ClipboardList, match: ["/admin/exam-validator"] },
            { href: "/admin/exam-papers", label: "ขายข้อสอบ PDF", icon: FileText },
            { href: "/admin/summaries", label: "สรุปเนื้อหา", icon: ScrollText },
            { href: "/admin/posts", label: "จัดการบทความ", icon: Newspaper },
        ],
    },
    {
        key: "learners",
        title: "ผู้เรียน",
        items: [
            { href: "/admin/students", label: "ทะเบียนนักเรียน", icon: Users },
            { href: "/admin/avatars", label: "รูปประจำตัว", icon: Smile },
            { href: "/admin/activity", label: "Activity Log", icon: Activity },
        ],
    },
    {
        key: "comms",
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

const ITEM_BY_HREF: Record<string, NavItem> = {};
for (const g of NAV) for (const it of g.items) ITEM_BY_HREF[it.href] = it;
const ALL_HREFS = Object.keys(ITEM_BY_HREF);

const FAV_KEY = "kh-fav-menu";
const ORDER_KEY = "kh-nav-order";

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

/** merge a saved order with the canonical list: saved-first (existing only), then any new items */
function applyOrder(base: string[], saved: string[]): string[] {
    const set = new Set(base);
    return [...saved.filter((h) => set.has(h)), ...base.filter((h) => !saved.includes(h))];
}

/* ---------- one draggable nav row ---------- */
function NavRow({
    sortId, item, active, count, fav, canEdit, onToggleFav,
}: {
    sortId: string;
    item: NavItem;
    active: boolean;
    count: number;
    fav: boolean;
    canEdit: boolean;
    onToggleFav: (href: string) => void;
}) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
        useSortable({ id: sortId, disabled: !canEdit });
    const Icon = item.icon;
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={`kh-nav-row ${isDragging ? "is-dragging" : ""}`}>
            <Link href={item.href} data-active={active} className="kh-side-link" title={item.label}>
                <Icon size={18} strokeWidth={1.8} className="shrink-0" />
                <span className="kh-label flex-1">{item.label}</span>
                {count > 0 && (
                    <span
                        className="kh-label text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0"
                        style={{ background: item.badge === "pending" ? "var(--danger)" : "var(--warn)" }}
                    >
                        {count}
                    </span>
                )}
            </Link>

            {canEdit && (
                <div className="kh-row-actions kh-label">
                    <button
                        type="button"
                        aria-label={fav ? "เอาออกจากรายการโปรด" : "เพิ่มเข้ารายการโปรด"}
                        title={fav ? "เอาออกจากรายการโปรด" : "เพิ่มเข้ารายการโปรด"}
                        data-fav={fav}
                        className="kh-fav-star"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(item.href); }}
                    >
                        <Star size={14} strokeWidth={2} fill={fav ? "currentColor" : "none"} />
                    </button>
                    <button
                        type="button"
                        aria-label="ลากเพื่อจัดเรียง"
                        title="ลากเพื่อจัดเรียง"
                        className="kh-row-grip"
                        ref={setActivatorNodeRef}
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical size={15} strokeWidth={1.8} />
                    </button>
                </div>
            )}
        </div>
    );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || "/admin";
    const { user, logOut, pendingCount } = useUserAuth();
    const { theme, setTheme } = useTheme();

    const [mounted, setMounted] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [ticketsCount, setTicketsCount] = useState(0);

    // user-customisable nav
    const [favs, setFavs] = useState<string[]>([]);
    const [order, setOrder] = useState<Record<string, string[]>>({});

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    // restore preferences
    useEffect(() => {
        setMounted(true);
        try {
            setCollapsed(localStorage.getItem("kh-collapsed") === "1");
            const f = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
            if (Array.isArray(f)) setFavs(f.filter((h) => ALL_HREFS.includes(h)));
            const o = JSON.parse(localStorage.getItem(ORDER_KEY) || "{}");
            if (o && typeof o === "object") setOrder(o);
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

    const persistFavs = (next: string[]) => {
        try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    };
    const persistOrder = (next: Record<string, string[]>) => {
        try { localStorage.setItem(ORDER_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    };

    const toggleFav = useCallback((href: string) => {
        setFavs((prev) => {
            const next = prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href];
            persistFavs(next);
            return next;
        });
    }, []);

    const favSet = useMemo(() => new Set(favs), [favs]);

    // favourite items (in saved order)
    const favItems = useMemo(
        () => favs.map((h) => ITEM_BY_HREF[h]).filter(Boolean) as NavItem[],
        [favs]
    );

    // per-group items: saved order, minus anything that's been favourited
    const groupsView = useMemo(() => {
        return NAV.map((g) => {
            const base = g.items.map((i) => i.href);
            const ordered = applyOrder(base, order[g.key] || []);
            const items = ordered.filter((h) => !favSet.has(h)).map((h) => ITEM_BY_HREF[h]);
            return { ...g, view: items };
        });
    }, [order, favSet]);

    const canEdit = mounted && !collapsed; // drag/star only when expanded

    const handleDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const [cA, hA] = String(active.id).split("::");
        const [cB, hB] = String(over.id).split("::");
        if (cA !== cB) return; // reorder only within the same list

        if (cA === "_fav") {
            setFavs((prev) => {
                const from = prev.indexOf(hA), to = prev.indexOf(hB);
                if (from < 0 || to < 0) return prev;
                const next = arrayMove(prev, from, to);
                persistFavs(next);
                return next;
            });
            return;
        }
        const grp = NAV.find((g) => g.key === cA);
        if (!grp) return;
        const base = grp.items.map((i) => i.href);
        const current = applyOrder(base, order[cA] || []);
        const from = current.indexOf(hA), to = current.indexOf(hB);
        if (from < 0 || to < 0) return;
        const next = { ...order, [cA]: arrayMove(current, from, to) };
        setOrder(next);
        persistOrder(next);
    };

    const meta = resolvePageMeta(pathname);
    const isDark = mounted && theme === "dark";
    const badgeFor = (k?: NavItem["badge"]) =>
        k === "pending" ? pendingCount : k === "tickets" ? ticketsCount : 0;

    return (
        <div className={`kh-admin kh-shell ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`}>
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
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        {/* favourites */}
                        {favItems.length > 0 && (
                            <div className="space-y-1">
                                <div className="kh-side-group mb-1 mt-1 flex items-center gap-1.5">
                                    <Star size={11} strokeWidth={2.4} fill="currentColor" />
                                    รายการโปรด
                                </div>
                                <SortableContext
                                    items={favItems.map((it) => `_fav::${it.href}`)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {favItems.map((it) => (
                                        <NavRow
                                            key={`fav-${it.href}`}
                                            sortId={`_fav::${it.href}`}
                                            item={it}
                                            active={isActive(it, pathname)}
                                            count={badgeFor(it.badge)}
                                            fav
                                            canEdit={canEdit}
                                            onToggleFav={toggleFav}
                                        />
                                    ))}
                                </SortableContext>
                            </div>
                        )}

                        {/* grouped nav */}
                        {groupsView.map((group) =>
                            group.view.length === 0 ? null : (
                                <div key={group.key} className="space-y-1">
                                    {group.title && <div className="kh-side-group mb-1 mt-1">{group.title}</div>}
                                    <SortableContext
                                        items={group.view.map((it) => `${group.key}::${it.href}`)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {group.view.map((it) => (
                                            <NavRow
                                                key={`${group.key}-${it.href}`}
                                                sortId={`${group.key}::${it.href}`}
                                                item={it}
                                                active={isActive(it, pathname)}
                                                count={badgeFor(it.badge)}
                                                fav={false}
                                                canEdit={canEdit}
                                                onToggleFav={toggleFav}
                                            />
                                        ))}
                                    </SortableContext>
                                </div>
                            )
                        )}
                    </DndContext>
                </nav>

                {/* profile + logout */}
                <div className="shrink-0 border-t p-3" style={{ borderColor: "var(--side-line)" }}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-semibold shrink-0"
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

                    {/* notifications → ลัดไปหน้าอนุมัติสลิป (ที่กระดิ่งนับรออยู่) */}
                    <Link
                        href="/admin/enrollments"
                        aria-label="การแจ้งเตือน (สลิปรออนุมัติ)"
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
