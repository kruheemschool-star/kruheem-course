"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Download, Eye, ShoppingBag, BadgeCheck, Printer, Clock, MessageCircle, Sparkles } from "lucide-react";
import type { ExamPaper } from "@/types";
import type { TrustReview } from "@/lib/paperTrust";
import type { ExamCountdown } from "@/lib/examCountdown";
import KruheemTrustStrip from "@/components/exampapers/KruheemTrustStrip";
import PaperReviews from "@/components/exampapers/PaperReviews";
import ExamDateStrip from "@/components/exampapers/ExamDateStrip";

const LINE_URL = "https://line.me/ti/p/~kruheemschool";

// ชั้นวางจะโชว์ชิปกรองระดับชั้นก็ต่อเมื่อของเยอะพอที่จะต้องกรองจริง ๆ —
// ร้านที่มีสินค้า 2 ชุดแต่มีตัวกรอง 2 แถวอ่านแล้วเหมือนร้านยังไม่เปิด
const FILTER_MIN_PAPERS = 6;

export default function ExamPapersShop({
    papers,
    reviews = [],
    reviewCount,
    avgRating,
    countdown = null,
}: {
    papers: ExamPaper[];
    reviews?: TrustReview[];
    reviewCount?: number;
    avgRating?: number;
    countdown?: ExamCountdown | null;
}) {
    // ชิปกรองผูกกับ URL (?level= / ?category=) — แชร์ลิงก์หมวดแล้วชิปถูกเลือกให้เอง
    // จงใจไม่ใช้ useSearchParams: บน route static มันบังคับทั้งหน้าร้านเป็น
    // client-side render (การ์ดสินค้าหายจาก HTML ที่ Google เห็น) — SSR เป็น
    // "ทั้งหมด" เสมอ แล้วค่อย sync ค่าจริงจาก URL หลัง mount แทน
    const [level, setLevel] = useState("ทั้งหมด");
    const [category, setCategory] = useState("ทั้งหมด");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const l = params.get("level");
        const c = params.get("category");
        if (l) setLevel(l);
        if (c) setCategory(c);
    }, []);

    const setFilter = (key: "level" | "category", value: string) => {
        (key === "level" ? setLevel : setCategory)(value);
        const params = new URLSearchParams(window.location.search);
        if (value === "ทั้งหมด") params.delete(key);
        else params.set(key, value);
        const qs = params.toString();
        window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    };

    const levels = useMemo(
        () => ["ทั้งหมด", ...Array.from(new Set(papers.map((p) => p.level).filter(Boolean) as string[]))],
        [papers],
    );
    const showLevelFilter = papers.length >= FILTER_MIN_PAPERS && levels.length > 2;

    const filtered = papers.filter(
        (p) => (level === "ทั้งหมด" || p.level === level) && (category === "ทั้งหมด" || p.category === category),
    );

    // จัดเป็น "ชั้นวางตามสนามสอบ" แทนตะแกรงแบนยาว — ผู้ปกครองมาหาสนามที่ลูกจะสอบ
    // ไม่ได้มาไล่ดูของทั้งร้าน และหัวชั้นยังทำให้ร้านที่มีของน้อยดูเป็นระเบียบ
    const shelves = useMemo(() => {
        const map = new Map<string, ExamPaper[]>();
        for (const p of filtered) {
            const key = p.category?.trim() || "ชุดข้อสอบอื่น ๆ";
            const bucket = map.get(key);
            if (bucket) bucket.push(p);
            else map.set(key, [p]);
        }
        return Array.from(map.entries()).sort(
            (a, b) => Math.min(...a[1].map((p) => p.order ?? 0)) - Math.min(...b[1].map((p) => p.order ?? 0)),
        );
    }, [filtered]);

    return (
        <div className="max-w-6xl mx-auto px-4 md:px-8 pb-16">
            {/* hero */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> ดาวน์โหลดได้เลย
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                    คลังข้อสอบ PDF พร้อมเฉลย
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-4 max-w-xl mx-auto">
                    ครูฮีมทำเองทุกชุด เฉลยละเอียดทีละขั้นพร้อมเทคนิคและจุดที่เด็กพลาดบ่อย
                    ซื้อครั้งเดียว ปริ้นท์ให้ลูกฝึกได้ไม่จำกัด
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-5 text-[13px] text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5"><BadgeCheck size={15} className="text-teal-500" /> เฉลยละเอียดทุกข้อ</span>
                    <span className="inline-flex items-center gap-1.5"><Printer size={15} className="text-teal-500" /> ปริ้นท์ซ้ำได้ไม่จำกัด</span>
                    <span className="inline-flex items-center gap-1.5"><Download size={15} className="text-teal-500" /> โหลดเก็บได้ตลอดชีพ</span>
                </div>
                <Link href="/my-courses" className="inline-flex items-center gap-1.5 mt-5 text-sm font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                    <Download size={15} /> ข้อสอบที่ฉันซื้อไว้
                </Link>
            </div>

            {/* วันสอบที่ครูฮีมตั้งไว้ที่ /admin/countdown — บอกว่าเหลือเวลาเท่าไร */}
            {countdown && (
                <div className="mb-5">
                    <ExamDateStrip countdown={countdown} />
                </div>
            )}

            {/* ซื้อจากใคร — ด่านแรกที่ผู้ปกครองใช้ตัดสินใจ */}
            <div className="mb-10">
                <KruheemTrustStrip reviewCount={reviewCount} avgRating={avgRating} />
            </div>

            {/* ชิปกรองระดับชั้น — โผล่เฉพาะตอนของเยอะพอ */}
            {showLevelFilter && (
                <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
                    {levels.map((l) => (
                        <button
                            key={l}
                            onClick={() => setFilter("level", l)}
                            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition ${
                                level === l
                                    ? "bg-teal-600 text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                        >
                            {l}
                        </button>
                    ))}
                </div>
            )}

            {/* ลิงก์เก่า/ลิงก์แชร์ที่ระบุ ?category= ยังต้องใช้ได้ — โชว์ปุ่มถอยกลับให้เห็นทั้งร้าน */}
            {category !== "ทั้งหมด" && (
                <div className="flex items-center justify-center gap-2 mb-8 text-sm">
                    <span className="text-slate-500 dark:text-slate-400">กำลังดูเฉพาะ</span>
                    <span className="rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1 font-semibold">{category}</span>
                    <button onClick={() => setFilter("category", "ทั้งหมด")} className="font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                        ดูทั้งร้าน
                    </button>
                </div>
            )}

            {/* ชั้นวาง */}
            {papers.length === 0 ? (
                <div className="text-center py-20">
                    <ShoppingBag className="mx-auto mb-4 text-slate-300 dark:text-slate-600" size={48} />
                    <p className="text-slate-500 dark:text-slate-400">เร็วๆ นี้ครูฮีมจะเปิดขายข้อสอบ PDF ที่นี่</p>
                </div>
            ) : filtered.length === 0 ? (
                <p className="text-center text-slate-500 dark:text-slate-400 py-16">ไม่พบข้อสอบตามที่เลือก ลองเปลี่ยนตัวกรอง</p>
            ) : (
                <div className="space-y-12">
                    {shelves.map(([shelf, items]) => (
                        <section key={shelf}>
                            <div className="flex items-baseline gap-3 mb-4">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">{shelf}</h2>
                                <span className="text-sm text-slate-400 dark:text-slate-500">{items.length} ชุด</span>
                            </div>
                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {items.map((p) => <PaperCard key={p.id} paper={p} />)}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {/* หาสนามที่ต้องการไม่เจอ — เก็บ demand ไว้ตัดสินใจว่าจะผลิตชุดไหนต่อ */}
            {papers.length > 0 && (
                <div className="mt-14 rounded-2xl border border-teal-100 dark:border-teal-900/60 bg-teal-50/70 dark:bg-teal-950/30 p-6 md:p-8 text-center">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">ไม่เจอสนามที่ลูกจะสอบ?</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-lg mx-auto leading-relaxed">
                        บอกครูฮีมได้เลยครับว่าลูกจะสอบเข้าที่ไหน ชั้นไหน ครูจะได้จัดคิวทำชุดนั้นให้ก่อน
                        และแจ้งกลับทันทีที่ชุดเสร็จ
                    </p>
                    <a
                        href={LINE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-2.5 transition"
                    >
                        <MessageCircle size={17} /> บอกครูฮีมทาง LINE
                    </a>
                </div>
            )}

            {/* เสียงผู้เรียนจริง */}
            <PaperReviews reviews={reviews} reviewCount={reviewCount} avgRating={avgRating} />
        </div>
    );
}

// ---------------------------------------------------------------- card

function PaperCard({ paper: p }: { paper: ExamPaper }) {
    const meta = [p.questionCount ? `${p.questionCount} ข้อ` : null, p.pageCount ? `${p.pageCount} หน้า` : null]
        .filter(Boolean)
        .join(" · ");

    const cover = (
        <div className="relative aspect-[4/3] bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
            {p.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={p.coverUrl}
                    alt={p.title}
                    loading="lazy"
                    className={`w-full h-full object-cover object-top transition ${p.comingSoon ? "opacity-60 grayscale" : "group-hover:scale-[1.03]"}`}
                />
            ) : (
                <FileText size={44} className="text-slate-300 dark:text-slate-600" />
            )}
            {p.badge && !p.comingSoon && (
                <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                    <Sparkles size={11} /> {p.badge}
                </span>
            )}
            {p.comingSoon ? (
                <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-2.5 py-1 text-[11px] font-bold text-white">
                    <Clock size={11} /> เร็วๆ นี้
                </span>
            ) : p.previewUrl ? (
                <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 dark:bg-slate-900/95 px-2 py-1 text-[11px] font-bold text-teal-700 dark:text-teal-300 shadow-sm">
                    <Eye size={12} /> ดูตัวอย่างได้
                </span>
            ) : null}
        </div>
    );

    const head = (
        <>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {p.level && <span className="rounded-full bg-teal-50 dark:bg-teal-950 px-2 py-0.5 text-[11px] font-bold text-teal-700 dark:text-teal-300">{p.level}</span>}
                {/* ชุดที่ยังทำไม่เสร็จยังไม่มีเฉลยให้ใคร — ห้ามติดป้ายรับประกันล่วงหน้า */}
                {!p.comingSoon && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                        <BadgeCheck size={12} /> พร้อมเฉลยละเอียด
                    </span>
                )}
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">{p.title}</h3>
            {p.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{p.description}</p>}
        </>
    );

    // ชุดที่ยังทำไม่เสร็จ: การ์ดกดเข้าหน้าขายไม่ได้ (ไม่มีอะไรให้ซื้อ) แต่เห็นบนชั้น
    // และเปิดทางให้ทักไลน์จอง — ครูฮีมจะได้รู้ว่าควรเร่งชุดไหนก่อน
    if (p.comingSoon) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 overflow-hidden flex flex-col">
                {cover}
                <div className="p-4 flex flex-col flex-1">
                    {head}
                    <a
                        href={LINE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto pt-3 inline-flex items-center justify-center gap-1.5 text-[13px] font-bold text-teal-700 dark:text-teal-300 hover:underline"
                    >
                        <MessageCircle size={15} /> สนใจชุดนี้ ทักไลน์จองก่อนได้
                    </a>
                </div>
            </div>
        );
    }

    return (
        <Link
            href={`/exam-papers/${p.id}`}
            className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:shadow-[0_16px_40px_-24px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 transition flex flex-col"
        >
            {cover}
            <div className="p-4 flex flex-col flex-1">
                {head}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-baseline gap-1.5">
                        {p.fullPrice && p.fullPrice > p.price ? (
                            <span className="text-xs text-slate-400 dark:text-slate-500 line-through">฿{Number(p.fullPrice).toLocaleString()}</span>
                        ) : null}
                        <span className="text-lg font-black text-teal-600 dark:text-teal-400">฿{Number(p.price || 0).toLocaleString()}</span>
                    </span>
                    {meta ? <span className="text-xs text-slate-400">{meta}</span> : null}
                </div>
            </div>
        </Link>
    );
}
