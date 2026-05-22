"use client";
import { useEffect, useRef, useState } from "react";
import type { HeroCardStat, HeroChapter, HeroData } from "../types";
import { smoothScrollToId } from "../smoothScroll";

// ============================================================
// Defaults — keep the card looking complete even before the
// admin/Firestore data is fully populated. (Gifted ม.1 syllabus)
// ============================================================
const DEFAULT_CHAPTERS: HeroChapter[] = [
    { title: "จำนวนและการดำเนินการ", desc: "8 คลิป · แบบฝึก 24", free: true },
    { title: "เลขยกกำลังขั้นสูง", desc: "6 คลิป · แบบฝึก 18" },
    { title: "อัตราส่วนและร้อยละแนว Gifted", desc: "9 คลิป · แบบฝึก 30" },
    { title: "สมการเชิงเส้นตัวแปรเดียว", desc: "7 คลิป · แบบฝึก 22" },
    { title: "สมการเชิงเส้นสองตัวแปร", desc: "8 คลิป · แบบฝึก 26" },
    { title: "อสมการเชิงเส้น", desc: "5 คลิป · แบบฝึก 16" },
    { title: "พหุนามและการดำเนินการ", desc: "7 คลิป · แบบฝึก 24" },
    { title: "การแยกตัวประกอบ", desc: "9 คลิป · แบบฝึก 32" },
    { title: "เศษส่วนพีชคณิต", desc: "6 คลิป · แบบฝึก 20" },
    { title: "รากที่สองและรากที่สาม", desc: "5 คลิป · แบบฝึก 18" },
    { title: "ทฤษฎีบทพีทาโกรัส", desc: "7 คลิป · แบบฝึก 24" },
    { title: "รูปสามเหลี่ยมและการพิสูจน์", desc: "8 คลิป · แบบฝึก 28" },
    { title: "รูปสี่เหลี่ยมและสมบัติ", desc: "6 คลิป · แบบฝึก 22" },
    { title: "การแปลงทางเรขาคณิต", desc: "7 คลิป · แบบฝึก 20" },
    { title: "ความคล้ายและอัตราส่วน", desc: "6 คลิป · แบบฝึก 24" },
    { title: "ความเท่ากันทุกประการ", desc: "5 คลิป · แบบฝึก 18" },
    { title: "วงกลมและสมบัติของคอร์ด", desc: "8 คลิป · แบบฝึก 26" },
    { title: "พื้นที่ผิวและปริมาตร", desc: "9 คลิป · แบบฝึก 30" },
    { title: "กราฟและความสัมพันธ์", desc: "6 คลิป · แบบฝึก 20" },
    { title: "ฟังก์ชันเบื้องต้น", desc: "7 คลิป · แบบฝึก 22" },
];

const DEFAULT_EQUATIONS = ["x² + 4x − 5 = 0", "√(a²+b²)", "(x−1)(x+5)"];

const DEFAULT_STATS: HeroCardStat[] = [
    { value: "1,247", label: "นักเรียน" },
    { value: "87%", label: "ผ่าน Gifted" },
    { value: "4.9★" },
];

interface CourseCardProps {
    data: HeroData;
    /** Used for the "ดูทั้งหมด" link. Omit (or leave empty) in admin preview to make links inert. */
    courseId?: string;
    /** Fallback for the big card title when cardMainText is empty. */
    courseTitle?: string;
    /** When false, the play toggle and links don't navigate (admin preview). Default true. */
    interactive?: boolean;
    /** YouTube video ID for the first free lesson (fetched from Firestore). */
    previewVideoId?: string;
}

/**
 * The rich "course card" cover used on the sales-page hero (right column).
 * Pure presentational component — driven entirely by HeroData props so it can
 * be reused in both the live hero and the admin live-preview.
 */
export default function CourseCard({ data, courseId, courseTitle, interactive = true, previewVideoId }: CourseCardProps) {
    const cardMainText = data.cardMainText || courseTitle || "Gifted ม.1";
    const cardTags = data.cardTags ?? ["40 บท", "5 ปี", "HD"];
    const chapters = data.chapters?.length ? data.chapters : DEFAULT_CHAPTERS;
    const stats = data.cardStats?.length ? data.cardStats : DEFAULT_STATS;
    const equations = data.preview?.equations?.length ? data.preview.equations : DEFAULT_EQUATIONS;

    // ---- Resolve video ID (admin override → auto-fetched → none) ----
    const resolvedVideoId = (() => {
        const raw = data.preview?.videoUrl || previewVideoId || "";
        if (!raw) return "";
        const match = raw.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/);
        return match ? match[1] : raw.length === 11 ? raw : "";
    })();
    const hasRealVideo = !!resolvedVideoId;

    // ---- Simulated player (fallback when no real video) ----
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ---- Real video state ----
    const [videoPlaying, setVideoPlaying] = useState(false);

    useEffect(() => {
        if (!hasRealVideo && playing) {
            timerRef.current = setInterval(() => {
                setProgress((p) => {
                    if (p >= 100) {
                        setPlaying(false);
                        return 0;
                    }
                    return p + 0.5;
                });
            }, 80);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [playing, hasRealVideo]);

    const totalSeconds = data.preview?.totalSeconds ?? 822;
    const fmt = (p: number) => {
        const cur = Math.floor((p / 100) * totalSeconds);
        const m = Math.floor(cur / 60);
        const s = cur % 60;
        return `${m}:${String(s).padStart(2, "0")}`;
    };

    const doubledChapters = [...chapters, ...chapters];
    const curriculumHref = interactive ? "#section-curriculum" : undefined;
    const scrollToCurriculum = (e: React.MouseEvent) => {
        e.preventDefault();
        smoothScrollToId("section-curriculum");
    };

    return (
        <div
            className="w-full max-w-[540px] rounded-[28px] bg-white overflow-hidden"
            style={{
                border: "1px solid rgba(20,20,40,.04)",
                boxShadow:
                    "0 30px 60px -20px rgba(180,80,30,.28), 0 8px 20px -8px rgba(20,20,40,.08)",
            }}
        >
            {/* --- Cover header --- */}
            <div
                className="relative overflow-hidden px-[22px] py-3.5 text-white"
                style={{
                    background:
                        data.cardColorFrom || data.cardColorTo
                            ? `linear-gradient(135deg, ${data.cardColorFrom || "#fb923c"} 0%, ${data.cardColorTo || "#ef4444"} 100%)`
                            : "linear-gradient(135deg,#fb923c 0%, #f97316 45%, #ef4444 100%)",
                    color: data.cardTextColor || "#fff",
                }}
            >
                <div
                    className="absolute rounded-full"
                    style={{ right: -30, top: -30, width: 110, height: 110, background: "rgba(255,255,255,.14)" }}
                />
                <div
                    className="absolute rounded-full"
                    style={{ right: 50, bottom: -40, width: 70, height: 70, background: "rgba(255,255,255,.08)" }}
                />
                <div className="relative flex justify-between items-center">
                    <div>
                        <div
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold opacity-90"
                            style={{ letterSpacing: "1.2px" }}
                        >
                            <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: "#86efac", boxShadow: "0 0 0 3px rgba(134,239,172,.25)" }}
                            />
                            {data.cardLiveLabel || "LIVE · UPDATED 2026"}
                        </div>
                        <div className="text-[30px] font-extrabold mt-1 leading-[1.05]" style={{ letterSpacing: "-1px" }}>
                            {cardMainText}
                            {data.cardSubText ? ` ${data.cardSubText}` : ""}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[9.5px] font-bold opacity-80" style={{ letterSpacing: "1.6px" }}>
                            {data.cardVolLabel || "KRUHEEM · VOL.04"}
                        </div>
                        <div className="mt-1.5 inline-flex gap-1.5">
                            {cardTags.map((t) => (
                                <span
                                    key={t}
                                    className="px-2 py-0.5 rounded-md text-[11px] font-bold"
                                    style={{ background: "rgba(0,0,0,.22)", border: "1px solid rgba(255,255,255,.12)" }}
                                >
                                    {t}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Preview video --- */}
            <div className="px-[22px] pt-4">
                <div
                    className="flex justify-between items-center text-[11.5px] font-bold mb-2.5"
                    style={{ letterSpacing: "1px", color: "#9a9aa8" }}
                >
                    <span className="inline-flex items-center gap-1.5" style={{ color: "#15803d" }}>
                        <span className="w-[7px] h-[7px] rounded-full bg-[#22c55e]" />
                        {data.preview?.label || "คลิปตัวอย่างฟรี"}
                    </span>
                    <span>{data.preview?.epLabel || "EP.01 · 13:42"}</span>
                </div>

                {hasRealVideo ? (
                    /* ---- Real YouTube embed ---- */
                    <div
                        className="relative rounded-[13px] overflow-hidden"
                        style={{
                            aspectRatio: "16 / 9",
                            boxShadow: "0 8px 20px -8px rgba(180,80,30,.4)",
                            background: "#000",
                        }}
                    >
                        {!videoPlaying ? (
                            <>
                                {/* YouTube thumbnail */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={`https://img.youtube.com/vi/${resolvedVideoId}/hqdefault.jpg`}
                                    alt="Preview"
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                {/* status chip */}
                                <div
                                    className="absolute left-3 top-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-bold text-white z-10"
                                    style={{ background: "rgba(0,0,0,.55)", border: "1px solid rgba(255,255,255,.2)" }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
                                    {data.preview?.freeChipText || "ดูฟรี · ไม่ต้องสมัคร"}
                                </div>
                                {/* play button overlay */}
                                <div
                                    className="absolute inset-0 grid place-items-center cursor-pointer z-10"
                                    onClick={() => interactive && setVideoPlaying(true)}
                                >
                                    <div
                                        className="w-[62px] h-[62px] rounded-full grid place-items-center text-[22px]"
                                        style={{
                                            background: "rgba(255,255,255,.96)",
                                            color: "#dc2626",
                                            boxShadow: "0 10px 24px -6px rgba(220,40,40,.5)",
                                        }}
                                    >
                                        ▶
                                    </div>
                                </div>
                                {/* bottom info bar */}
                                <div
                                    className="absolute left-0 right-0 bottom-0 px-3.5 pt-3 pb-2.5 text-white z-10"
                                    style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,.6))" }}
                                >
                                    <div className="text-sm font-bold">
                                        {data.preview?.chapterTitle || "บทที่ 01 · จำนวนและการดำเนินการ"}
                                    </div>
                                    <div className="text-[10.5px] opacity-80 mt-0.5">
                                        {data.preview?.totalTime || "13:42"}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <iframe
                                src={`https://www.youtube.com/embed/${resolvedVideoId}?autoplay=1&rel=0&modestbranding=1`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute inset-0 w-full h-full"
                                style={{ border: 0 }}
                            />
                        )}
                    </div>
                ) : (
                    /* ---- Simulated player (no real video available) ---- */
                    <div
                        onClick={() => interactive && setPlaying((p) => !p)}
                        className="relative rounded-[13px] overflow-hidden cursor-pointer"
                        style={{
                            aspectRatio: "16 / 9",
                            background: playing
                                ? "linear-gradient(135deg,#1a1430,#3b1f4d 60%,#7c2d12)"
                                : "linear-gradient(135deg,#fb923c 0%, #f97316 40%, #dc2626 100%)",
                            transition: "background .3s",
                            boxShadow: "0 8px 20px -8px rgba(180,80,30,.4)",
                        }}
                    >
                        {/* decorative equations */}
                        <div
                            className="absolute inset-0 overflow-hidden text-white"
                            style={{ fontFamily: "Georgia, serif", opacity: playing ? 0.25 : 0.16, transition: "opacity .3s" }}
                        >
                            {equations[0] && <div className="absolute" style={{ left: 16, top: 14, fontSize: 26 }}>{equations[0]}</div>}
                            {equations[1] && <div className="absolute" style={{ right: 14, top: 50, fontSize: 20 }}>{equations[1]}</div>}
                            {equations[2] && <div className="absolute" style={{ left: 24, bottom: 44, fontSize: 22 }}>{equations[2]}</div>}
                        </div>
                        {/* status chip */}
                        <div
                            className="absolute left-3 top-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-bold text-white"
                            style={{ background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.2)" }}
                        >
                            <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: playing ? "#ef4444" : "#22c55e" }}
                            />
                            {playing
                                ? data.preview?.playingChipText || "กำลังเล่น"
                                : data.preview?.freeChipText || "ดูฟรี · ไม่ต้องสมัคร"}
                        </div>
                        {/* play button */}
                        <div className="absolute inset-0 grid place-items-center">
                            <div
                                className="w-[62px] h-[62px] rounded-full grid place-items-center text-[22px]"
                                style={{
                                    background: "rgba(255,255,255,.96)",
                                    color: "#dc2626",
                                    boxShadow: "0 10px 24px -6px rgba(220,40,40,.5)",
                                    opacity: playing ? 0 : 1,
                                    transform: playing ? "scale(.85)" : "scale(1)",
                                    transition: "transform .2s, opacity .2s",
                                }}
                            >
                                ▶
                            </div>
                        </div>
                        {/* bottom control bar */}
                        <div
                            className="absolute left-0 right-0 bottom-0 px-3.5 pt-3 pb-2.5 text-white"
                            style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,.55))" }}
                        >
                            <div className="text-sm font-bold">
                                {data.preview?.chapterTitle || "บทที่ 01 · จำนวนและการดำเนินการ"}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10.5px] font-mono">{fmt(progress)}</span>
                                <div className="flex-1 h-[3px] rounded-sm overflow-hidden" style={{ background: "rgba(255,255,255,.25)" }}>
                                    <div
                                        className="h-full rounded-sm"
                                        style={{ width: `${progress}%`, background: "#fb923c", transition: "width .08s linear" }}
                                    />
                                </div>
                                <span className="text-[10.5px] font-mono opacity-80">
                                    {data.preview?.totalTime || "13:42"}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- Chapter list header --- */}
            <div className="px-[22px] pt-3.5">
                <div
                    className="flex justify-between items-center text-[11.5px] font-bold mb-1.5"
                    style={{ letterSpacing: "1px", color: "#9a9aa8" }}
                >
                    <span>{data.chaptersTitle || `สารบัญทั้งหมด · ${chapters.length} บท`}</span>
                    <span className="inline-flex items-center gap-1.5 font-bold" style={{ color: "#dc2626" }}>
                        <span className="w-1.5 h-1.5 rounded-full a3-pulse" style={{ background: "#dc2626" }} />
                        {data.chaptersScrollLabel || "เลื่อนต่อเนื่อง"}
                    </span>
                </div>
            </div>

            {/* --- Auto-scrolling chapter list --- */}
            <div
                className="a3-list relative overflow-hidden mx-3.5"
                style={{
                    height: 200,
                    maskImage:
                        "linear-gradient(180deg, transparent 0%, #000 10%, #000 90%, transparent 100%)",
                    WebkitMaskImage:
                        "linear-gradient(180deg, transparent 0%, #000 10%, #000 90%, transparent 100%)",
                }}
            >
                <div className="a3-scroller absolute left-0 right-0 top-0">
                    {doubledChapters.map((c, i) => {
                        const realIdx = i % chapters.length;
                        const isFree = !!c.free;
                        return (
                            <div
                                key={i}
                                className="flex items-center gap-3 px-2.5 py-2.5"
                                style={{ borderBottom: "1px dashed #f0e7d8" }}
                            >
                                <div
                                    className="w-8 h-8 rounded-lg grid place-items-center font-bold text-xs shrink-0"
                                    style={{
                                        background: isFree
                                            ? "linear-gradient(160deg,#dcfce7,#bbf7d0)"
                                            : "linear-gradient(160deg,#f5f5f0,#ecece5)",
                                        color: isFree ? "#15803d" : "#9a9aa8",
                                    }}
                                >
                                    {String(realIdx + 1).padStart(2, "0")}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div
                                        className="text-[13.5px] font-semibold truncate"
                                        style={{ color: isFree ? "#13132a" : "#5a5a6e" }}
                                    >
                                        {c.title}
                                    </div>
                                    {c.desc && (
                                        <div className="text-[11px] mt-px" style={{ color: "#9a9aa8" }}>
                                            {c.desc}
                                        </div>
                                    )}
                                </div>
                                {isFree ? (
                                    <span
                                        className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                                        style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0", letterSpacing: ".5px" }}
                                    >
                                        ฟรี
                                    </span>
                                ) : (
                                    <span
                                        className="w-[22px] h-[22px] rounded-md grid place-items-center text-[11px]"
                                        style={{ background: "#f5f3ee", color: "#a39888", border: "1px solid #ebe5d6" }}
                                    >
                                        🔒
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- Footer stat strip --- */}
            <div
                className="flex items-center justify-between px-[22px] pt-3 pb-[18px] mt-2"
                style={{ borderTop: "1px solid #f5f0e4" }}
            >
                <div className="flex gap-[18px] text-xs" style={{ color: "#7a7a8a" }}>
                    {stats.map((s, i) => (
                        <span key={i}>
                            <b className="text-sm" style={{ color: "#13132a" }}>
                                {s.value}
                            </b>
                            {s.label ? ` ${s.label}` : ""}
                        </span>
                    ))}
                </div>
                {curriculumHref ? (
                    <a
                        href={curriculumHref}
                        onClick={scrollToCurriculum}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{
                            background: "linear-gradient(180deg,#fef3e0,#fde2c0)",
                            color: "#9a3412",
                            border: "1px solid #fbd7a8",
                        }}
                    >
                        {data.cardViewAllText || "ดูทั้งหมด →"}
                    </a>
                ) : (
                    <span
                        className="px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{
                            background: "linear-gradient(180deg,#fef3e0,#fde2c0)",
                            color: "#9a3412",
                            border: "1px solid #fbd7a8",
                        }}
                    >
                        {data.cardViewAllText || "ดูทั้งหมด →"}
                    </span>
                )}
            </div>

            <style jsx>{`
                @keyframes a3-scroll {
                    0% {
                        transform: translateY(0);
                    }
                    100% {
                        transform: translateY(-50%);
                    }
                }
                .a3-scroller {
                    animation: a3-scroll 60s linear infinite;
                }
                .a3-list:hover .a3-scroller {
                    animation-play-state: paused;
                }
                @keyframes a3-pulse {
                    0%,
                    100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.35;
                    }
                }
                .a3-pulse {
                    animation: a3-pulse 1.4s ease-in-out infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                    .a3-scroller,
                    .a3-pulse {
                        animation: none;
                    }
                }
            `}</style>
        </div>
    );
}
