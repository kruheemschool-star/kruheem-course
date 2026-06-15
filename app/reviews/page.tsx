"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, limit, updateDoc, deleteDoc, doc } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Star, Quote, Clock, BookOpen, ThumbsUp, BadgeCheck, Search, EyeOff, Eye, Trash2, Rocket, MessageCircle } from "lucide-react";
import { useUserAuth } from "@/context/AuthContext";
import { useConfirmModal } from "@/hooks/useConfirmModal";

// LINE consult link (matches Footer / guide page)
const LINE_URL = "https://line.me/ti/p/~kruheemschool";

interface Review {
    id: string;
    userName: string;
    userPhoto?: string;
    rating: number;
    comment: string;
    createdAt?: { seconds: number } | null;
    matchLevel?: string;
    isHidden?: boolean;
    courseName?: string;
    courseId?: string;
    featured?: boolean;
    helpfulCount?: number;
}

type FilterKey = "all" | "5" | "4";

// ---- helpers -------------------------------------------------------------

function getTimeAgo(seconds: number): string {
    const now = Date.now() / 1000;
    const diff = now - seconds;
    if (diff < 60) return "เพิ่งรีวิว";
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} วันที่แล้ว`;
    return new Date(seconds * 1000).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

const AVATAR_GRADIENTS = [
    "linear-gradient(135deg, var(--khrv-teal), var(--khrv-teal2))",
    "linear-gradient(135deg, var(--khrv-amber), var(--khrv-gold))",
    "linear-gradient(135deg, var(--khrv-rose), #fb7185)",
    "linear-gradient(135deg, #8b5cf6, #6366f1)",
    "linear-gradient(135deg, #0ea5e9, #14b8a6)",
];

function getAvatarGradient(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function prefersReducedMotion() {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ---- avatar (emoji / image / initial) ------------------------------------

function ReviewAvatar({ photo, name }: { photo?: string; name: string }) {
    const [error, setError] = useState(false);
    if (!photo || error) {
        return <span className="text-white font-bold text-base">{name?.[0]?.toUpperCase() || "?"}</span>;
    }
    if (photo.startsWith("http") || photo.startsWith("/")) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={name} className="w-full h-full object-cover" onError={() => setError(true)} />
        );
    }
    return <span className="text-2xl" role="img" aria-label="avatar">{photo}</span>;
}

// ---- count-up number -----------------------------------------------------

function CountUp({ to, decimals = 0, duration = 1400, suffix = "" }: { to: number; decimals?: number; duration?: number; suffix?: string }) {
    const [value, setValue] = useState(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (prefersReducedMotion()) {
            // jump straight to the value (inside rAF so it's not a sync setState in the effect body)
            rafRef.current = requestAnimationFrame(() => setValue(to));
            return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
        }
        const start = performance.now();
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
            setValue(to * eased);
            if (t < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [to, duration]);

    return <>{value.toFixed(decimals)}{suffix}</>;
}

// ---- star row ------------------------------------------------------------

function Stars({ rating, size = 15 }: { rating: number; size?: number }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star
                    key={s}
                    size={size}
                    style={{ color: s <= Math.round(rating) ? "var(--khrv-gold)" : "var(--khrv-line)" }}
                    fill={s <= Math.round(rating) ? "currentColor" : "none"}
                />
            ))}
        </div>
    );
}

// =========================================================================

export default function ReviewsPage() {
    const { userProfile } = useUserAuth();
    const isAdmin = userProfile?.role === "Admin";
    const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();

    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterKey>("all");
    const [barsReady, setBarsReady] = useState(false);
    const [helpful, setHelpful] = useState<Record<string, boolean>>({});

    // fetch reviews once
    useEffect(() => {
        const run = async () => {
            try {
                const snap = await getDocs(query(collection(db, "reviews"), orderBy("createdAt", "desc"), limit(200)));
                const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Review[];
                setReviews(data);
            } catch (err) {
                console.error("Error fetching reviews:", err);
            } finally {
                setLoading(false);
            }
        };
        run();
    }, []);

    // restore "helpful" votes from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem("kh_rv_helpful");
            if (raw) setHelpful(JSON.parse(raw));
        } catch { /* ignore */ }
    }, []);

    // trigger bar growth shortly after reviews load
    useEffect(() => {
        if (loading) return;
        const t = setTimeout(() => setBarsReady(true), 120);
        return () => clearTimeout(t);
    }, [loading]);

    const toggleHelpful = (id: string) => {
        setHelpful((prev) => {
            const next = { ...prev, [id]: !prev[id] };
            try { localStorage.setItem("kh_rv_helpful", JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
    };

    // admin moderation
    const toggleHide = (review: Review) => {
        confirmModal("ยืนยันการตั้งค่า", `ต้องการ${review.isHidden ? "แสดง" : "ซ่อน"}รีวิวนี้ใช่ไหม?`, async () => {
            try {
                await updateDoc(doc(db, "reviews", review.id), { isHidden: !review.isHidden });
                setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, isHidden: !review.isHidden } : r)));
            } catch (err) {
                console.error("Error updating review:", err);
                alert("เกิดข้อผิดพลาด");
            }
        });
    };

    const removeReview = (id: string) => {
        confirmModal("ยืนยันการลบ", "ยืนยันการลบรีวิวนี้ถาวร? (กู้คืนไม่ได้)", async () => {
            try {
                await deleteDoc(doc(db, "reviews", id));
                setReviews((prev) => prev.filter((r) => r.id !== id));
            } catch (err) {
                console.error("Error deleting review:", err);
                alert("เกิดข้อผิดพลาด");
            }
        }, true);
    };

    // visible reviews (admins also see hidden ones, dimmed)
    const visible = useMemo(() => (isAdmin ? reviews : reviews.filter((r) => !r.isHidden)), [reviews, isAdmin]);

    // stats from publicly visible reviews
    const stats = useMemo(() => {
        const pub = reviews.filter((r) => !r.isHidden);
        const total = pub.length;
        const dist = [0, 0, 0, 0, 0]; // index 0 => 1★ ... index 4 => 5★
        let sum = 0;
        pub.forEach((r) => {
            sum += r.rating || 0;
            if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
        });
        const avg = total ? sum / total : 0;
        const satisfaction = total ? Math.round(((dist[3] + dist[4]) / total) * 100) : 0;
        const recommend = total ? Math.round((dist[4] / total) * 100) : 0;
        return { total, dist, avg, satisfaction, recommend };
    }, [reviews]);

    // editorial "featured" highlight — emphasises genuine, detailed 5★ reviews
    // (respects an explicit `featured` flag if an admin sets one)
    const featuredIds = useMemo(() => {
        const explicit = visible.filter((r) => r.featured).map((r) => r.id);
        if (explicit.length) return new Set(explicit);
        if (visible.length < 4) return new Set<string>();
        const pick = visible.length >= 8 ? 2 : 1;
        const top = [...visible]
            .filter((r) => r.rating === 5 && (r.comment?.length || 0) >= 80)
            .sort((a, b) => (b.comment?.length || 0) - (a.comment?.length || 0))
            .slice(0, pick)
            .map((r) => r.id);
        return new Set(top);
    }, [visible]);

    const filtered = useMemo(() => {
        if (filter === "all") return visible;
        const want = Number(filter);
        return visible.filter((r) => r.rating === want);
    }, [visible, filter]);

    const filters: { key: FilterKey; label: string }[] = [
        { key: "all", label: "ทั้งหมด" },
        { key: "5", label: "★ 5 ดาว" },
        { key: "4", label: "★ 4 ดาว" },
    ];

    return (
        <div className="khrv min-h-screen">
            <Navbar />

            {/* ambient background */}
            <div className="khrv-bg" aria-hidden>
                <span className="khrv-blob b1" />
                <span className="khrv-blob b2" />
                <span className="khrv-blob b3" />
            </div>

            <main className="khrv-content pt-24 pb-24 px-4 sm:px-6">
                {/* ---------- Hero ---------- */}
                <section className="max-w-[880px] mx-auto text-center">
                    <div className="mb-7">
                        <Link
                            href="/"
                            className="khrv-link inline-flex items-center gap-2 text-sm font-semibold group"
                            style={{ color: "var(--khrv-ink3)" }}
                        >
                            <span className="transition-transform group-hover:-translate-x-1">←</span> กลับหน้าแรก
                        </Link>
                    </div>

                    <div
                        className="khrv-pop khrv-pill inline-flex items-center gap-2 px-4 py-1.5 text-sm font-semibold mb-6"
                        style={{ background: "var(--khrv-surface)", border: "1px solid var(--khrv-line)", color: "var(--khrv-amber)", boxShadow: "var(--khrv-shadow-sm)" }}
                    >
                        <Star size={15} className="khrv-twinkle" fill="currentColor" />
                        เสียงจริงจากผู้เรียน{stats.total > 0 ? ` ${stats.total.toLocaleString()}+ คน` : ""}
                    </div>

                    <h1 className="khrv-display text-[36px] sm:text-[44px] md:text-[52px] font-semibold leading-tight tracking-tight">
                        ทำไมใคร ๆ ก็เลือกเรียนกับ{" "}
                        <span style={{ background: "var(--khrv-head)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                            ครูฮีม
                        </span>
                    </h1>
                    <p className="mt-5 text-lg max-w-xl mx-auto" style={{ color: "var(--khrv-ink2)" }}>
                        เปลี่ยนคณิตจาก &quot;วิชาที่กลัว&quot; ให้เป็น &quot;วิชาที่รัก&quot; — ฟังเสียงจริงจากผู้เรียนของเราเอง
                    </p>
                </section>

                {/* ---------- Stats Band ---------- */}
                <section className="max-w-[1080px] mx-auto mt-12">
                    {loading ? (
                        <div className="khrv-panel khrv-skeleton" style={{ height: 280, borderRadius: 30 }} />
                    ) : stats.total > 0 ? (
                        <div className="khrv-panel khrv-rise relative overflow-hidden p-7 sm:p-9" style={{ borderRadius: 30 }}>
                            <div className="absolute top-0 inset-x-0 h-1.5" style={{ background: "var(--khrv-warm)" }} />

                            <div className="grid md:grid-cols-2 gap-8 items-center">
                                {/* average score */}
                                <div className="text-center md:border-r md:pr-8" style={{ borderColor: "var(--khrv-line)" }}>
                                    <div
                                        className="khrv-num font-semibold leading-none"
                                        style={{ fontSize: 76, background: "var(--khrv-warm)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
                                    >
                                        <CountUp to={stats.avg} decimals={1} />
                                    </div>
                                    <div className="mt-3 flex justify-center">
                                        <Stars rating={stats.avg} size={22} />
                                    </div>
                                    <p className="mt-2 text-sm font-semibold" style={{ color: "var(--khrv-ink2)" }}>
                                        คะแนนเฉลี่ยจาก {stats.total.toLocaleString()} รีวิว
                                    </p>
                                </div>

                                {/* rating distribution bars */}
                                <div className="space-y-2.5">
                                    {[5, 4, 3, 2, 1].map((star) => {
                                        const count = stats.dist[star - 1];
                                        const pct = stats.total ? (count / stats.total) * 100 : 0;
                                        return (
                                            <div key={star} className="flex items-center gap-3">
                                                <span className="text-xs font-bold w-3 text-right" style={{ color: "var(--khrv-ink2)" }}>{star}</span>
                                                <Star size={12} style={{ color: "var(--khrv-gold)" }} fill="currentColor" />
                                                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--khrv-bg2)" }}>
                                                    <div className="khrv-bar-fill h-full" style={{ width: barsReady ? `${pct}%` : 0 }} />
                                                </div>
                                                <span className="text-xs font-bold w-7 text-right" style={{ color: "var(--khrv-ink3)" }}>{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* stat chips */}
                            <div className="grid sm:grid-cols-3 gap-3 mt-8 pt-7 border-t" style={{ borderColor: "var(--khrv-line)" }}>
                                {[
                                    { emoji: "😊", value: <CountUp to={stats.satisfaction} suffix="%" />, label: "ความพึงพอใจ (4–5 ดาว)" },
                                    { emoji: "💬", value: <CountUp to={stats.total} />, label: "รีวิวจริงจากผู้เรียน" },
                                    { emoji: "💛", value: <CountUp to={stats.recommend} suffix="%" />, label: "ให้คะแนนเต็ม 5 ดาว" },
                                ].map((chip, i) => (
                                    <div
                                        key={i}
                                        className="rounded-2xl px-4 py-4 text-center"
                                        style={{ background: "var(--khrv-surface2)", border: "1px solid var(--khrv-line)" }}
                                    >
                                        <div className="text-2xl mb-1">{chip.emoji}</div>
                                        <div className="khrv-num text-2xl font-semibold" style={{ color: "var(--khrv-teal)" }}>{chip.value}</div>
                                        <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--khrv-ink2)" }}>{chip.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </section>

                {/* ---------- Filters ---------- */}
                {!loading && stats.total > 0 && (
                    <section className="max-w-[1080px] mx-auto mt-14 flex flex-wrap items-center justify-between gap-4">
                        <h2 className="text-[22px] font-semibold flex items-center gap-2" style={{ color: "var(--khrv-ink)" }}>
                            <MessageCircle size={22} style={{ color: "var(--khrv-teal)" }} /> รีวิวล่าสุด
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {filters.map((f) => (
                                <button
                                    key={f.key}
                                    onClick={() => setFilter(f.key)}
                                    data-active={filter === f.key}
                                    className="khrv-chip px-4 py-2 text-sm font-semibold"
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* ---------- Reviews grid ---------- */}
                <section className="max-w-[1080px] mx-auto mt-6">
                    {loading ? (
                        <div style={{ columnWidth: 332, columnGap: 20 }}>
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="khrv-panel mb-5" style={{ borderRadius: 24, padding: 24, breakInside: "avoid" }}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="khrv-skeleton w-11 h-11 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <div className="khrv-skeleton h-3 w-24 rounded" />
                                            <div className="khrv-skeleton h-2 w-16 rounded" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="khrv-skeleton h-3 w-full rounded" />
                                        <div className="khrv-skeleton h-3 w-3/4 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div
                            className="text-center py-20 rounded-3xl"
                            style={{ border: "2px dashed var(--khrv-line)", background: "var(--khrv-surface2)" }}
                        >
                            <Search size={44} className="mx-auto mb-4" style={{ color: "var(--khrv-ink3)" }} />
                            <p className="font-semibold text-lg" style={{ color: "var(--khrv-ink2)" }}>
                                {stats.total === 0 ? "ยังไม่มีรีวิว เป็นคนแรกที่แบ่งปันได้เลย!" : "ยังไม่มีรีวิวในหมวดนี้"}
                            </p>
                        </div>
                    ) : (
                        <div style={{ columnWidth: 332, columnGap: 20 }}>
                            {filtered.map((review, idx) => {
                                const featured = featuredIds.has(review.id);
                                const voted = !!helpful[review.id];
                                const helpfulCount = (review.helpfulCount || 0) + (voted ? 1 : 0);
                                const verified = !!(review.courseId || review.courseName);
                                return (
                                    <article
                                        key={review.id}
                                        className={`khrv-card khrv-rise mb-5 p-6 ${featured ? "is-featured" : ""}`}
                                        style={{ breakInside: "avoid", animationDelay: `${Math.min(idx * 60, 600)}ms`, opacity: review.isHidden ? 0.55 : undefined }}
                                    >
                                        {/* admin controls */}
                                        {isAdmin && (
                                            <div className="absolute top-3 right-3 flex gap-1.5 z-20">
                                                <button
                                                    onClick={() => toggleHide(review)}
                                                    className="p-1.5 rounded-lg"
                                                    style={{ background: "var(--khrv-surface2)", color: "var(--khrv-ink2)" }}
                                                    title={review.isHidden ? "แสดงรีวิว" : "ซ่อนรีวิว"}
                                                >
                                                    {review.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                                                </button>
                                                <button
                                                    onClick={() => removeReview(review.id)}
                                                    className="p-1.5 rounded-lg"
                                                    style={{ background: "rgba(244,63,94,0.12)", color: "var(--khrv-rose)" }}
                                                    title="ลบรีวิว"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}

                                        {/* decorative quote */}
                                        <Quote
                                            className="khrv-quote absolute top-5 right-5"
                                            size={30}
                                            style={{ color: "var(--khrv-line)" }}
                                            fill="currentColor"
                                        />

                                        {/* header */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <div
                                                className="khrv-avatar w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                                                style={{ background: getAvatarGradient(review.userName), border: "2px solid var(--khrv-surface)", boxShadow: "var(--khrv-shadow-sm)" }}
                                            >
                                                <ReviewAvatar photo={review.userPhoto} name={review.userName} />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-sm truncate" style={{ color: "var(--khrv-ink)" }}>{review.userName}</h3>
                                                <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--khrv-ink3)" }}>
                                                    <Clock size={10} />
                                                    {review.createdAt?.seconds ? getTimeAgo(review.createdAt.seconds) : "เพิ่งรีวิว"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* course badge */}
                                        {review.courseName && (
                                            <div
                                                className="khrv-course mb-3 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                                                style={{ background: "var(--khrv-surface2)", color: "var(--khrv-teal)", border: "1px solid var(--khrv-line)" }}
                                            >
                                                <BookOpen size={11} />
                                                <span className="truncate max-w-[210px]">{review.courseName}</span>
                                            </div>
                                        )}

                                        {/* rating */}
                                        <div className="mb-3"><Stars rating={review.rating} /></div>

                                        {/* comment */}
                                        <p className="text-[15px] leading-relaxed" style={{ color: "var(--khrv-ink)" }}>
                                            &ldquo;{review.comment}&rdquo;
                                        </p>

                                        {/* footer: helpful + verified */}
                                        <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t" style={{ borderColor: "var(--khrv-line)" }}>
                                            <button
                                                onClick={() => toggleHelpful(review.id)}
                                                className="khrv-helpful inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                                                style={
                                                    voted
                                                        ? { background: "var(--khrv-teal)", color: "#fff" }
                                                        : { background: "var(--khrv-surface2)", color: "var(--khrv-ink2)", border: "1px solid var(--khrv-line)" }
                                                }
                                                aria-pressed={voted}
                                            >
                                                <ThumbsUp size={13} fill={voted ? "currentColor" : "none"} />
                                                เป็นประโยชน์{helpfulCount > 0 ? ` · ${helpfulCount}` : ""}
                                            </button>

                                            {verified && (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--khrv-teal)" }}>
                                                    <BadgeCheck size={14} fill="currentColor" stroke="var(--khrv-surface)" />
                                                    เรียนจริง
                                                </span>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* ---------- Closing CTA ---------- */}
                <section className="max-w-[1080px] mx-auto mt-20">
                    <div
                        className="relative overflow-hidden text-center px-6 py-12 sm:px-10 sm:py-14"
                        style={{ borderRadius: 32, background: "var(--khrv-cta)", boxShadow: "0 30px 60px -30px rgba(13,148,136,0.6)" }}
                    >
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1.5px)", backgroundSize: "22px 22px" }} aria-hidden />
                        <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/assets/kruheem_avatar.png"
                                alt="ครูฮีม"
                                className="khrv-float w-24 h-24 mx-auto mb-5 rounded-full object-cover"
                                style={{ border: "4px solid rgba(255,255,255,0.85)", boxShadow: "0 16px 30px -16px rgba(0,0,0,0.5)" }}
                            />
                            <h2 className="khrv-display text-[28px] sm:text-[34px] font-semibold text-white leading-tight">
                                พร้อมเปลี่ยนคณิตให้เป็นวิชาที่รักหรือยัง?
                            </h2>
                            <p className="mt-3 text-white/85 max-w-lg mx-auto">
                                เริ่มต้นวันนี้ แล้วรีวิวต่อไปอาจเป็นของคุณเอง 💛
                            </p>
                            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
                                <Link
                                    href="/#courses"
                                    className="khrv-cta-btn inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-base"
                                    style={{ background: "#fff", color: "var(--khrv-teal)", boxShadow: "0 14px 28px -16px rgba(0,0,0,0.5)" }}
                                >
                                    <Rocket size={18} className="khrv-rocket" /> ดูคอร์สเรียนทั้งหมด
                                </Link>
                                <a
                                    href={LINE_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="khrv-cta-btn inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-base text-white"
                                    style={{ background: "rgba(255,255,255,0.16)", border: "1.5px solid rgba(255,255,255,0.5)" }}
                                >
                                    💬 ปรึกษาครูฮีมฟรี
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
            <ConfirmDialog />
        </div>
    );
}
