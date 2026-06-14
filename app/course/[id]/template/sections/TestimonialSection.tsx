"use client";
import { useEffect, useState, type CSSProperties } from "react";
import type { TestimonialData } from "../types";

// ── real review shape (from /api/home-reviews) ──
interface RealReview {
    id: string;
    userName: string;
    userPhoto: string;
    rating: number;
    comment: string;
    courseName?: string;
}

function Stars({ n }: { n: number }) {
    return (
        <span className="leading-none text-[13px] tracking-tight" aria-label={`${n} ดาว`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} style={{ color: i <= n ? "#f59e0b" : "var(--kh-line)" }}>★</span>
            ))}
        </span>
    );
}

function Avatar({ r }: { r: RealReview }) {
    const [err, setErr] = useState(false);
    const p = r.userPhoto;
    const initial = r.userName?.charAt(0)?.toUpperCase() || "?";
    const isImg = !!p && !err && (p.startsWith("http") || p.startsWith("/"));
    const isEmoji = !!p && !err && !isImg && p.length <= 2;
    return (
        <div
            className="w-11 h-11 rounded-full grid place-items-center overflow-hidden shrink-0 ring-2"
            style={{
                background: "linear-gradient(135deg, var(--kh-p), var(--kh-p2))",
                color: "var(--kh-onD)",
                ["--tw-ring-color" as string]: "var(--kh-card)",
            }}
        >
            {isImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p} alt="" className="w-full h-full object-cover" onError={() => setErr(true)} loading="lazy" />
            ) : isEmoji ? (
                <span className="text-xl leading-none">{p}</span>
            ) : (
                <span className="kh-kanit font-bold text-base">{initial}</span>
            )}
        </div>
    );
}

function ReviewCard({ r }: { r: RealReview }) {
    return (
        <div className="kh-card shrink-0 w-[290px] sm:w-[330px] p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
                <Avatar r={r} />
                <div className="min-w-0">
                    <p className="kh-kanit font-semibold truncate" style={{ color: "var(--kh-ink)" }}>{r.userName || "นักเรียน"}</p>
                    <Stars n={r.rating} />
                </div>
            </div>
            {r.courseName && (
                <span
                    className="self-start mb-2.5 inline-block px-2.5 py-1 rounded-md text-[11px] font-bold truncate max-w-full"
                    style={{ background: "var(--kh-pT)", color: "var(--kh-pText)" }}
                >
                    📖 {r.courseName}
                </span>
            )}
            <p
                className="text-[14px] leading-relaxed overflow-hidden"
                style={{ color: "var(--kh-body)", display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical" }}
            >
                &ldquo;{r.comment}&rdquo;
            </p>
        </div>
    );
}

export default function TestimonialSection({ data }: { data: TestimonialData }) {
    const useReal = !!data.useRealReviews;
    const [reviews, setReviews] = useState<RealReview[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!useReal) return;
        let alive = true;
        (async () => {
            try {
                const res = await fetch("/api/home-reviews");
                const d = await res.json();
                const list: RealReview[] = (d.reviews || []).filter((r: RealReview) => (r.comment || "").trim().length > 0);
                if (alive) setReviews(list);
            } catch { /* ignore — falls back below */ }
            finally { if (alive) setLoaded(true); }
        })();
        return () => { alive = false; };
    }, [useReal]);

    // ── Real reviews: slow left-scrolling marquee ──
    if (useReal && (!loaded || reviews.length > 0)) {
        // duration scales with count → consistent slow pace regardless of how many
        const dur = Math.max(45, reviews.length * 5);
        const looped = [...reviews, ...reviews];
        const fade = "linear-gradient(to right, transparent, #000 5%, #000 95%, transparent)";
        return (
            <section className="kh-sec">
                <div className="kh-sec-head">
                    <span className="kh-eyebrow">⭐ รีวิวจริงจากผู้เรียน</span>
                    <h2 className="kh-h2 mt-4">{data.title || "เสียงจริงจากนักเรียน 💬"}</h2>
                    <p className="kh-sub mt-3">{data.subtitle || "รีวิวจริงจากนักเรียนของครูฮีม — ดึงสด ๆ จากระบบรีวิวในเว็บ"}</p>
                </div>

                {reviews.length === 0 ? (
                    <p className="text-center text-sm" style={{ color: "var(--kh-mut)" }}>กำลังโหลดรีวิว…</p>
                ) : (
                    <div className="overflow-hidden" style={{ WebkitMaskImage: fade, maskImage: fade }}>
                        <div
                            className="kh-marquee flex gap-5 py-2 will-change-transform"
                            style={{ width: "max-content", "--kh-marquee-dur": `${dur}s` } as CSSProperties}
                        >
                            {looped.map((r, i) => (
                                <ReviewCard key={`${r.id}-${i}`} r={r} />
                            ))}
                        </div>
                    </div>
                )}
            </section>
        );
    }

    // ── Fallback: hand-written stories (original behavior) ──
    if (!data.stories || data.stories.length === 0) return null;

    return (
        <section className="kh-sec">
            <div className="kh-sec-head">
                <h2 className="kh-h2">{data.title || "เรื่องจริงจากนักเรียน 💪"}</h2>
                {data.subtitle && <p className="kh-sub mt-3">{data.subtitle}</p>}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {data.stories.map((story, i) => (
                    <div key={i} className="kh-card kh-lift p-6 flex flex-col">
                        <div className="flex items-center gap-4 mb-4">
                            {story.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={story.imageUrl}
                                    alt={story.name}
                                    className="w-14 h-14 rounded-full object-cover border-2 shrink-0"
                                    style={{ borderColor: "var(--kh-pLine)" }}
                                    loading="lazy"
                                />
                            ) : (
                                <div
                                    className="kh-kanit w-14 h-14 rounded-full border-2 flex items-center justify-center font-bold text-xl shrink-0"
                                    style={{
                                        background: "linear-gradient(135deg, var(--kh-p), var(--kh-p2))",
                                        color: "var(--kh-onD)",
                                        borderColor: "var(--kh-pLine)",
                                    }}
                                >
                                    {story.name.charAt(0)}
                                </div>
                            )}
                            <div className="min-w-0">
                                <h3 className="kh-kanit font-semibold" style={{ color: "var(--kh-ink)" }}>{story.name}</h3>
                                {story.role && <p className="text-sm" style={{ color: "var(--kh-mut)" }}>{story.role}</p>}
                            </div>
                        </div>

                        {(story.beforeScore || story.afterScore) && (
                            <div className="flex items-center justify-center flex-wrap gap-2.5 mb-4">
                                {story.beforeScore && (
                                    <span className="kh-chip" style={{ background: "var(--kh-urgBg)", color: "var(--kh-urgText)", borderColor: "transparent" }}>
                                        ก่อน<span className="kh-num font-bold text-[15px]">{story.beforeScore}</span>
                                    </span>
                                )}
                                <span aria-hidden="true" className="text-lg" style={{ color: "var(--kh-mut)" }}>→</span>
                                {story.afterScore && (
                                    <span className="kh-chip" style={{ background: "var(--kh-goodBg)", color: "var(--kh-goodText)", borderColor: "transparent" }}>
                                        หลัง<span className="kh-num font-bold text-[15px]">{story.afterScore}</span>
                                    </span>
                                )}
                            </div>
                        )}

                        <div className="relative mt-1">
                            <span aria-hidden="true" className="kh-kanit absolute -top-2 -left-1 text-5xl leading-none select-none" style={{ color: "var(--kh-pLine)" }}>“</span>
                            <p className="relative pl-7 leading-relaxed" style={{ color: "var(--kh-body)" }}>{story.quote}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
