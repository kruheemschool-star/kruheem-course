"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, where, getDocs } from "firebase/firestore";
import { getCachedData } from "@/lib/dataCache";
import { Star, Quote } from "lucide-react";
import type { ReviewsData, SectionContext } from "../types";

interface LiveReview {
    id: string;
    userName: string;
    userPhoto?: string;
    rating: number;
    comment: string;
    courseName?: string;
    courseId?: string;
    isHidden?: boolean;
    createdAt?: { seconds: number } | null;
}

// Gradient palette for fallback avatars (theme-token pairs)
const AVATAR_GRADIENTS = [
    "linear-gradient(135deg, var(--kh-p), var(--kh-p2))",
    "linear-gradient(135deg, var(--kh-s), var(--kh-p2))",
    "linear-gradient(135deg, var(--kh-acc), var(--kh-p))",
    "linear-gradient(135deg, var(--kh-cta1), var(--kh-cta2))",
    "linear-gradient(135deg, var(--kh-p2), var(--kh-s))",
    "linear-gradient(135deg, var(--kh-p), var(--kh-acc))",
    "linear-gradient(135deg, var(--kh-s), var(--kh-acc))",
];
function getAvatarGradient(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

// Avatar with broken-image fallback
function LiveAvatar({ photo, name }: { photo?: string; name: string }) {
    const [error, setError] = useState(false);
    if (!photo || error) {
        return <span className="font-bold text-base" style={{ color: "var(--kh-onD)" }}>{name?.[0]?.toUpperCase() || "?"}</span>;
    }
    if (photo.startsWith("http") || photo.startsWith("/")) {
        return (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={photo} alt={name} className="w-full h-full object-cover" onError={() => setError(true)} loading="lazy" />
        );
    }
    return <span className="text-xl" role="img" aria-label="avatar">{photo}</span>;
}

function LiveReviewCard({ review }: { review: LiveReview }) {
    return (
        <div className="kh-card kh-lift flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px] p-6 relative">
            <Quote className="absolute top-4 right-4" size={28} fill="currentColor" style={{ color: "var(--kh-pT2)" }} />
            <div className="flex items-center gap-3 mb-3">
                <div
                    className="w-11 h-11 rounded-full overflow-hidden border-2 shadow-sm flex items-center justify-center shrink-0"
                    style={{ background: getAvatarGradient(review.userName), borderColor: "var(--kh-card)" }}
                >
                    <LiveAvatar photo={review.userPhoto} name={review.userName} />
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="kh-kanit font-semibold text-sm truncate" style={{ color: "var(--kh-ink)" }}>{review.userName}</h4>
                    <div className="flex gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                                key={i}
                                size={12}
                                style={{ color: i <= review.rating ? "var(--kh-cta1)" : "var(--kh-line)" }}
                                fill={i <= review.rating ? "currentColor" : "none"}
                            />
                        ))}
                    </div>
                </div>
            </div>
            {review.courseName && (
                <span
                    className="kh-chip mb-2 max-w-full"
                    style={{ background: "var(--kh-pT)", color: "var(--kh-pText)", borderColor: "var(--kh-pLine)", fontSize: 12 }}
                >
                    <span className="truncate">📖 {review.courseName}</span>
                </span>
            )}
            <p className="text-sm leading-relaxed line-clamp-5" style={{ color: "var(--kh-body)" }}>
                &ldquo;{review.comment}&rdquo;
            </p>
        </div>
    );
}

export default function ReviewsSection({ data, ctx }: { data: ReviewsData; ctx?: SectionContext }) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [liveReviews, setLiveReviews] = useState<LiveReview[]>([]);
    const [loadingLive, setLoadingLive] = useState(false);

    const source = data.source || "images";
    const liveLimit = data.liveLimit || 30;
    const liveMinRating = data.liveMinRating ?? 4;
    const liveScope = data.liveScope || "all";
    const scopedCourseId = liveScope === "course" ? ctx?.courseId : null;

    // Marquee duration scales with item count to keep speed steady
    // (live cards drift a touch faster, matching the old px/s tuning).
    const isLive = source === "live";
    const marqueeDur = isLive
        ? Math.max(22, liveReviews.length * 6)
        : Math.max(22, (data.images?.length || 0) * 8);

    useEffect(() => {
        if (source !== "live") return;
        let cancelled = false;
        const cacheKey = `reviews_live_${liveScope}_${scopedCourseId || "all"}_${liveLimit}_${liveMinRating}`;
        setLoadingLive(true);
        getCachedData<LiveReview[]>(cacheKey, async () => {
            const constraints: any[] = [orderBy("createdAt", "desc"), limit(liveLimit * 2)];
            if (scopedCourseId) constraints.unshift(where("courseId", "==", scopedCourseId));
            const q = query(collection(db, "reviews"), ...constraints);
            const snap = await getDocs(q);
            return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as LiveReview[];
        })
            .then((all) => {
                if (cancelled) return;
                const filtered = all
                    .filter((r) => !r.isHidden && (r.rating || 0) >= liveMinRating && (r.comment || "").trim())
                    .slice(0, liveLimit);
                setLiveReviews(filtered);
            })
            .catch((err) => console.error("[ReviewsSection] fetch live reviews failed:", err))
            .finally(() => { if (!cancelled) setLoadingLive(false); });
        return () => { cancelled = true; };
    }, [source, liveScope, scopedCourseId, liveLimit, liveMinRating]);

    // Gate rendering based on source
    if (source === "images" && (!data.images || data.images.length === 0)) return null;
    if (source === "live" && !loadingLive && liveReviews.length === 0) return null;

    return (
        <section className="w-full overflow-hidden" style={{ padding: "clamp(52px, 7vw, 92px) 0" }}>
            <div className="kh-sec-head px-5">
                <h2 className="kh-h2">
                    {data.title || "อย่าเชื่อแค่คำพูด..."}{" "}
                    <span style={{ color: "var(--kh-pText)" }}>แต่จงเชื่อ &ldquo;ผลลัพธ์&rdquo;</span>
                </h2>
                {data.subtitle && <p className="kh-sub mt-3">{data.subtitle}</p>}
            </div>

            <div className="relative w-full overflow-hidden">
                <div
                    className="absolute left-0 top-0 bottom-0 w-16 md:w-40 z-10 pointer-events-none"
                    style={{ background: "linear-gradient(to right, var(--kh-paper), transparent)" }}
                />
                <div
                    className="absolute right-0 top-0 bottom-0 w-16 md:w-40 z-10 pointer-events-none"
                    style={{ background: "linear-gradient(to left, var(--kh-paper), transparent)" }}
                />

                {source === "live" ? (
                    <div
                        className="kh-marquee flex gap-5 py-4 will-change-transform"
                        style={{ width: "max-content", "--kh-marquee-dur": `${marqueeDur}s` } as CSSProperties}
                    >
                        {[...liveReviews, ...liveReviews].map((r, i) => (
                            <LiveReviewCard key={`${r.id}-${i}`} review={r} />
                        ))}
                    </div>
                ) : (
                    <div
                        className="kh-marquee flex gap-6 py-4 will-change-transform"
                        style={{ width: "max-content", "--kh-marquee-dur": `${marqueeDur}s` } as CSSProperties}
                    >
                        {[...data.images, ...data.images].map((img, i) => (
                            <div
                                key={i}
                                className="flex-shrink-0 w-[240px] sm:w-[280px] md:w-[350px] cursor-pointer"
                                onClick={() => setSelectedImage(img)}
                            >
                                <div className="kh-card kh-lift overflow-hidden h-full">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={img}
                                        alt={`Review ${i + 1}`}
                                        className="w-full h-auto object-contain"
                                        loading="lazy"
                                        onError={(e) => {
                                            e.currentTarget.src = `https://placehold.co/400x300/indigo/white?text=Review+${(i % data.images.length) + 1}`;
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-xl p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="absolute inset-0 opacity-90" style={{ background: "var(--kh-d1)" }} aria-hidden="true" />
                    <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-12 right-0 md:-right-12 w-10 h-10 rounded-full flex items-center justify-center z-50 border transition-all hover:brightness-150"
                            style={{ background: "var(--kh-onDline)", borderColor: "var(--kh-onDline)", color: "var(--kh-onD)" }}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={selectedImage}
                            alt="Review fullscreen"
                            className="max-w-full max-h-[85vh] object-contain rounded-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </section>
    );
}
