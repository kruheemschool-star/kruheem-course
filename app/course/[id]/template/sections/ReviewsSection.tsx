"use client";
import { useEffect, useState, useRef, useCallback } from "react";
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

// Gradient palette for fallback avatars
const AVATAR_GRADIENTS = [
    "from-violet-400 to-purple-500",
    "from-sky-400 to-blue-500",
    "from-emerald-400 to-teal-500",
    "from-amber-400 to-orange-500",
    "from-rose-400 to-pink-500",
    "from-indigo-400 to-blue-500",
    "from-teal-400 to-cyan-500",
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
        return <span className="text-white font-bold text-base">{name?.[0]?.toUpperCase() || "?"}</span>;
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
        <div className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px] bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 p-6 relative hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <Quote className="absolute top-4 right-4 text-slate-100 dark:text-slate-800" size={28} fill="currentColor" />
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-11 h-11 rounded-full overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm flex items-center justify-center shrink-0 bg-gradient-to-br ${getAvatarGradient(review.userName)}`}>
                    <LiveAvatar photo={review.userPhoto} name={review.userName} />
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate">{review.userName}</h4>
                    <div className="flex gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} size={12} className={i <= review.rating ? "text-amber-400" : "text-slate-200 dark:text-slate-700"} fill={i <= review.rating ? "currentColor" : "none"} />
                        ))}
                    </div>
                </div>
            </div>
            {review.courseName && (
                <div className="mb-2 inline-block text-[11px] font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md truncate max-w-full">
                    📖 {review.courseName}
                </div>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-5">
                &ldquo;{review.comment}&rdquo;
            </p>
        </div>
    );
}

/* ─── Smooth marquee hook ─── */
function useSmoothMarquee(baseSpeed: number) {
    const trackRef = useRef<HTMLDivElement>(null);
    const offsetRef = useRef(0);
    const currentSpeedRef = useRef(baseSpeed);
    const targetSpeedRef = useRef(baseSpeed);
    const rafRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    const animate = useCallback((now: number) => {
        if (!trackRef.current) { rafRef.current = requestAnimationFrame(animate); return; }
        if (!lastTimeRef.current) lastTimeRef.current = now;
        const dt = (now - lastTimeRef.current) / 1000; // seconds
        lastTimeRef.current = now;

        // Smoothly interpolate current speed toward target
        const lerpFactor = 1 - Math.pow(0.03, dt); // ~0.97 per second easing
        currentSpeedRef.current += (targetSpeedRef.current - currentSpeedRef.current) * lerpFactor;

        // Advance offset
        offsetRef.current -= currentSpeedRef.current * dt;

        // Get total scrollable width (half because content is duplicated)
        const totalWidth = trackRef.current.scrollWidth / 2;
        if (totalWidth > 0 && Math.abs(offsetRef.current) >= totalWidth) {
            offsetRef.current += totalWidth;
        }

        trackRef.current.style.transform = `translateX(${offsetRef.current}px)`;
        rafRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        rafRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafRef.current);
    }, [animate]);

    const onMouseEnter = useCallback(() => { targetSpeedRef.current = 0; }, []);
    const onMouseLeave = useCallback(() => { targetSpeedRef.current = baseSpeed; }, [baseSpeed]);

    return { trackRef, onMouseEnter, onMouseLeave };
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

    // Speed in px/s — tuned to roughly match the old CSS animation durations
    const isLive = source === "live";
    const baseSpeed = isLive ? 60 : 40; // live cards scroll faster
    const { trackRef, onMouseEnter, onMouseLeave } = useSmoothMarquee(baseSpeed);

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
        <section className="w-full py-16 overflow-hidden bg-white dark:bg-slate-950">
            <div className="text-center mb-12 px-4">
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white mb-4 tracking-tight">
                    {data.title || "อย่าเชื่อแค่คำพูด..."} <span className="text-indigo-600 dark:text-indigo-400">แต่จงเชื่อ &ldquo;ผลลัพธ์&rdquo;</span>
                </h2>
                {data.subtitle && <p className="text-slate-500 dark:text-slate-400 text-lg">{data.subtitle}</p>}
                <div className="w-24 h-1.5 bg-indigo-600 dark:bg-indigo-400 mx-auto rounded-full opacity-20 mt-4"></div>
            </div>

            <div
                className="relative w-full overflow-hidden"
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <div className="absolute left-0 top-0 bottom-0 w-20 md:w-40 bg-gradient-to-r from-white dark:from-slate-950 to-transparent z-10 pointer-events-none"></div>
                <div className="absolute right-0 top-0 bottom-0 w-20 md:w-40 bg-gradient-to-l from-white dark:from-slate-950 to-transparent z-10 pointer-events-none"></div>

                {source === "live" ? (
                    <div ref={trackRef} className="flex gap-5 py-4 will-change-transform" style={{ width: "max-content" }}>
                        {[...liveReviews, ...liveReviews].map((r, i) => (
                            <LiveReviewCard key={`${r.id}-${i}`} review={r} />
                        ))}
                    </div>
                ) : (
                    <div ref={trackRef} className="flex gap-6 will-change-transform" style={{ width: "max-content" }}>
                        {[...data.images, ...data.images].map((img, i) => (
                            <div
                                key={i}
                                className="flex-shrink-0 w-[240px] sm:w-[280px] md:w-[350px] transition-transform duration-300 hover:scale-105 cursor-pointer"
                                onClick={() => setSelectedImage(img)}
                            >
                                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 overflow-hidden h-full">
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
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-12 right-0 md:-right-12 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white z-50 border border-white/30"
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
