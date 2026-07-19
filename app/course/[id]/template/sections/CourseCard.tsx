"use client";
import { useEffect, useRef, useState } from "react";
import type { HeroCardStat, HeroChapter, HeroData } from "../types";
import { smoothScrollToId } from "../smoothScroll";
import { resolveStudentToken } from "../liveStats";

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

// Student value defaults to the live-count token so every card auto-fills it.
const DEFAULT_STATS: HeroCardStat[] = [
    { value: "{students}", label: "นักเรียน" },
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
    /** Live total registrations across all courses — fills the {students} token in stats. */
    totalStudents?: number;
    /** Live chapter list from real data (e.g. every exam set in the คลังข้อสอบ).
     *  When non-empty, overrides data.chapters / the built-in default list. */
    liveChapters?: HeroChapter[];
}

/**
 * The rich "course card" cover used on the sales-page hero (right column).
 * Pure presentational component — driven entirely by HeroData props so it can
 * be reused in both the live hero and the admin live-preview.
 */
export default function CourseCard({ data, courseId, courseTitle, interactive = true, previewVideoId, totalStudents, liveChapters }: CourseCardProps) {
    const cardMainText = data.cardMainText || courseTitle || "Gifted ม.1";
    const cardTags = data.cardTags ?? ["40 บท", "5 ปี", "HD"];
    // Live data (e.g. real exam sets) wins over the admin-set list, which wins
    // over the built-in placeholder syllabus.
    const usingLiveChapters = !!liveChapters?.length;
    const chapters = usingLiveChapters
        ? liveChapters!
        : data.chapters?.length
            ? data.chapters
            : DEFAULT_CHAPTERS;
    // Resolve the live {students} count; drop any stat left empty (e.g. count unavailable).
    const stats = (data.cardStats?.length ? data.cardStats : DEFAULT_STATS)
        .map((s) => ({ ...s, value: resolveStudentToken(s.value, totalStudents) }))
        .filter((s) => s.value.trim().length > 0);
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
            className="kh-card w-full max-w-[540px] overflow-hidden"
            style={{ borderRadius: 26, boxShadow: "var(--kh-shadow)" }}
        >
            {/* --- Cover header --- */}
            <div
                className="relative overflow-hidden px-[22px] py-3.5"
                style={{
                    background: "linear-gradient(135deg, var(--kh-p) 0%, var(--kh-p2) 100%)",
                    color: "var(--kh-onD)",
                }}
            >
                <div
                    className="absolute rounded-full"
                    style={{ right: -30, top: -30, width: 110, height: 110, background: "var(--kh-onDline)" }}
                />
                <div
                    className="absolute rounded-full"
                    style={{ right: 50, bottom: -40, width: 70, height: 70, background: "var(--kh-onDline)", opacity: 0.5 }}
                />
                <div className="relative flex justify-between items-center gap-3">
                    <div className="min-w-0">
                        <div
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold"
                            style={{ letterSpacing: "1.2px", color: "var(--kh-onDmut)" }}
                        >
                            <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: "var(--kh-good)", boxShadow: "0 0 0 3px var(--kh-onDline)" }}
                            />
                            {data.cardLiveLabel || "LIVE · UPDATED 2026"}
                        </div>
                        <div
                            className="kh-kanit text-[26px] sm:text-[30px] font-extrabold mt-1 leading-[1.1] flex items-center flex-wrap gap-x-2.5 gap-y-1"
                            style={{ letterSpacing: "-0.5px" }}
                        >
                            <span className="min-w-0">{cardMainText}</span>
                            {data.cardSubText && (
                                <span
                                    className="kh-kanit text-[12px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm"
                                    style={{ background: "var(--kh-onDline)", border: "1px solid var(--kh-onDline)" }}
                                >
                                    {data.cardSubText}
                                </span>
                            )}
                        </div>
                        {data.cardBadgeText && (
                            <span
                                className="kh-kanit inline-flex mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                                style={{ background: "var(--kh-acc)", color: "var(--kh-onD)" }}
                            >
                                {data.cardBadgeText}
                            </span>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <div
                            className="text-[9.5px] font-bold"
                            style={{ letterSpacing: "1.6px", color: "var(--kh-onDmut)" }}
                        >
                            {data.cardVolLabel || "KRUHEEM · VOL.04"}
                        </div>
                        <div className="mt-1.5 inline-flex gap-1.5">
                            {cardTags.map((t) => (
                                <span
                                    key={t}
                                    className="kh-chip"
                                    style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px" }}
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
                    style={{ letterSpacing: "1px", color: "var(--kh-mut)" }}
                >
                    <span className="inline-flex items-center gap-1.5" style={{ color: "var(--kh-goodText)" }}>
                        <span className="w-[7px] h-[7px] rounded-full" style={{ background: "var(--kh-good)" }} />
                        {data.preview?.label || "คลิปตัวอย่างฟรี"}
                    </span>
                    <span>{data.preview?.epLabel || "EP.01 · 13:42"}</span>
                </div>

                {hasRealVideo ? (
                    /* ---- Real YouTube embed ---- */
                    <div
                        className="relative overflow-hidden"
                        style={{
                            aspectRatio: "16 / 9",
                            borderRadius: 14,
                            boxShadow: "var(--kh-shadow-sm)",
                            background: "var(--kh-d1)",
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
                                    className="kh-chip absolute left-3 top-3 z-10"
                                    style={{
                                        background: "var(--kh-goodBg)",
                                        color: "var(--kh-goodText)",
                                        borderColor: "var(--kh-goodBg)",
                                        fontSize: 11,
                                        padding: "4px 10px",
                                    }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--kh-good)" }} />
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
                                            background: "var(--kh-card)",
                                            color: "var(--kh-p)",
                                            boxShadow: "var(--kh-shadow)",
                                        }}
                                    >
                                        ▶
                                    </div>
                                </div>
                                {/* bottom info bar */}
                                <div
                                    className="absolute left-0 right-0 bottom-0 px-3.5 pt-3 pb-2.5 z-10"
                                    style={{
                                        background: "linear-gradient(180deg, transparent, rgba(0,0,0,.6))",
                                        color: "var(--kh-onD)",
                                    }}
                                >
                                    <div className="text-sm font-bold">
                                        {data.preview?.chapterTitle || "บทที่ 01 · จำนวนและการดำเนินการ"}
                                    </div>
                                    <div className="text-[10.5px] mt-0.5" style={{ color: "var(--kh-onDmut)" }}>
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
                        className="relative overflow-hidden cursor-pointer"
                        style={{
                            aspectRatio: "16 / 9",
                            borderRadius: 14,
                            background: playing
                                ? "linear-gradient(135deg, var(--kh-d1), var(--kh-d2) 60%, var(--kh-d3))"
                                : "linear-gradient(135deg, var(--kh-p) 0%, var(--kh-p2) 100%)",
                            transition: "background .3s",
                            boxShadow: "var(--kh-shadow-sm)",
                        }}
                    >
                        {/* decorative equations */}
                        <div
                            className="absolute inset-0 overflow-hidden"
                            style={{
                                fontFamily: "Georgia, serif",
                                color: playing ? "var(--kh-onDmut)" : "var(--kh-pLine)",
                                opacity: playing ? 0.35 : 0.8,
                                transition: "opacity .3s, color .3s",
                            }}
                        >
                            {equations[0] && <div className="absolute" style={{ left: 16, top: 14, fontSize: 26 }}>{equations[0]}</div>}
                            {equations[1] && <div className="absolute" style={{ right: 14, top: 50, fontSize: 20 }}>{equations[1]}</div>}
                            {equations[2] && <div className="absolute" style={{ left: 24, bottom: 44, fontSize: 22 }}>{equations[2]}</div>}
                        </div>
                        {/* status chip */}
                        <div
                            className="kh-chip absolute left-3 top-3"
                            style={{
                                background: "var(--kh-goodBg)",
                                color: "var(--kh-goodText)",
                                borderColor: "var(--kh-goodBg)",
                                fontSize: 11,
                                padding: "4px 10px",
                            }}
                        >
                            <span
                                className={`w-1.5 h-1.5 rounded-full${playing ? " a3-pulse" : ""}`}
                                style={{ background: "var(--kh-good)" }}
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
                                    background: "var(--kh-card)",
                                    color: "var(--kh-p)",
                                    boxShadow: "var(--kh-shadow)",
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
                            className="absolute left-0 right-0 bottom-0 px-3.5 pt-3 pb-2.5"
                            style={{
                                background: "linear-gradient(180deg, transparent, rgba(0,0,0,.55))",
                                color: "var(--kh-onD)",
                            }}
                        >
                            <div className="text-sm font-bold">
                                {data.preview?.chapterTitle || "บทที่ 01 · จำนวนและการดำเนินการ"}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="kh-num text-[10.5px]">{fmt(progress)}</span>
                                <div
                                    className="flex-1 h-[3px] rounded-sm overflow-hidden"
                                    style={{ background: "var(--kh-onDline)" }}
                                >
                                    <div
                                        className="h-full rounded-sm"
                                        style={{ width: `${progress}%`, background: "var(--kh-cta1)", transition: "width .08s linear" }}
                                    />
                                </div>
                                <span className="kh-num text-[10.5px]" style={{ color: "var(--kh-onDmut)" }}>
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
                    style={{ letterSpacing: "1px", color: "var(--kh-mut)" }}
                >
                    <span>{data.chaptersTitle || (usingLiveChapters ? `สารบัญข้อสอบ · ${chapters.length} ชุด` : `สารบัญทั้งหมด · ${chapters.length} บท`)}</span>
                    <span className="inline-flex items-center gap-1.5 font-bold" style={{ color: "var(--kh-urgText)" }}>
                        <span className="w-1.5 h-1.5 rounded-full a3-pulse" style={{ background: "var(--kh-urg)" }} />
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
                                style={{ borderBottom: "1px dashed var(--kh-line)" }}
                            >
                                <div
                                    className="kh-num w-8 h-8 rounded-lg grid place-items-center font-bold text-xs shrink-0"
                                    style={
                                        isFree
                                            ? { background: "var(--kh-goodBg)", color: "var(--kh-goodText)" }
                                            : { background: "var(--kh-tint)", color: "var(--kh-mut)" }
                                    }
                                >
                                    {String(realIdx + 1).padStart(2, "0")}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div
                                        className="text-[13.5px] font-semibold truncate"
                                        style={{ color: isFree ? "var(--kh-ink)" : "var(--kh-body)" }}
                                    >
                                        {c.title}
                                    </div>
                                    {c.desc && (
                                        <div className="text-[11px] mt-px" style={{ color: "var(--kh-mut)" }}>
                                            {c.desc}
                                        </div>
                                    )}
                                </div>
                                {isFree ? (
                                    <span
                                        className="kh-kanit px-2 py-0.5 rounded-md text-[10px] font-bold"
                                        style={{ background: "var(--kh-goodBg)", color: "var(--kh-goodText)", letterSpacing: ".5px" }}
                                    >
                                        ฟรี
                                    </span>
                                ) : (
                                    <span
                                        className="w-[22px] h-[22px] rounded-md grid place-items-center text-[11px]"
                                        style={{ background: "var(--kh-tint)", color: "var(--kh-mut)", border: "1px solid var(--kh-line)" }}
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
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3 px-[22px] pt-3.5 pb-[18px] mt-2"
                style={{ background: "var(--kh-tint)", borderTop: "1px solid var(--kh-line)" }}
            >
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--kh-mut)" }}>
                    {stats.map((s, i) => (
                        <span key={i}>
                            <b className="kh-num text-sm" style={{ color: "var(--kh-pText)" }}>
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
                        className="kh-kanit text-xs font-bold underline underline-offset-4"
                        style={{ color: "var(--kh-pText)", textDecorationColor: "var(--kh-pLine)" }}
                    >
                        {data.cardViewAllText || "ดูทั้งหมด →"}
                    </a>
                ) : (
                    <span
                        className="kh-kanit text-xs font-bold underline underline-offset-4"
                        style={{ color: "var(--kh-pText)", textDecorationColor: "var(--kh-pLine)" }}
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
                /* Self-contained fallback for the shared .kh-* classes so the card
                   also renders correctly in the admin live-preview, which mounts
                   outside KhThemeChrome. Values mirror KhThemeChrome exactly. */
                .kh-card {
                    background: var(--kh-card);
                    border: 1px solid var(--kh-line);
                }
                .kh-chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 13.5px;
                    font-weight: 600;
                    background: var(--kh-card);
                    border: 1px solid var(--kh-line);
                    color: var(--kh-body);
                    padding: 7px 13px;
                    border-radius: 999px;
                }
                .kh-kanit,
                .kh-num {
                    font-family: var(--font-kanit), var(--font-mitr), sans-serif;
                }
            `}</style>
        </div>
    );
}
