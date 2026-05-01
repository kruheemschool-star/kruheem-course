"use client";
import { useEffect, useState } from "react";
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
        <div className="flex-shrink-0 w-[320px] md:w-[360px] bg-white rounded-2xl shadow-md border border-slate-100 p-6 relative hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <Quote className="absolute top-4 right-4 text-slate-100" size={28} fill="currentColor" />
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-sm flex items-center justify-center shrink-0 bg-gradient-to-br ${getAvatarGradient(review.userName)}`}>
                    <LiveAvatar photo={review.userPhoto} name={review.userName} />
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-800 text-sm truncate">{review.userName}</h4>
                    <div className="flex gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} size={12} className={i <= review.rating ? "text-amber-400" : "text-slate-200"} fill={i <= review.rating ? "currentColor" : "none"} />
                        ))}
                    </div>
                </div>
            </div>
            {review.courseName && (
                <div className="mb-2 inline-block text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md truncate max-w-full">
                    📖 {review.courseName}
                </div>
            )}
            <p className="text-sm text-slate-600 leading-relaxed line-clamp-5">
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
        <section className="w-full py-16 overflow-hidden bg-white">
            <div className="text-center mb-12 px-4">
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">
                    {data.title || "อย่าเชื่อแค่คำพูด..."} <span className="text-indigo-600">แต่จงเชื่อ &ldquo;ผลลัพธ์&rdquo;</span>
                </h2>
                {data.subtitle && <p className="text-slate-500 text-lg">{data.subtitle}</p>}
                <div className="w-24 h-1.5 bg-indigo-600 mx-auto rounded-full opacity-20 mt-4"></div>
            </div>

            <div className="relative w-full overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-20 md:w-40 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
                <div className="absolute right-0 top-0 bottom-0 w-20 md:w-40 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

                {source === "live" ? (
                    <div className="flex gap-5 py-4 animate-marquee-live hover:[animation-play-state:paused]">
                        {[...liveReviews, ...liveReviews].map((r, i) => (
                            <LiveReviewCard key={`${r.id}-${i}`} review={r} />
                        ))}
                    </div>
                ) : (
                    <div className="flex gap-6 animate-marquee hover:[animation-play-state:paused]">
                        {[...data.images, ...data.images].map((img, i) => (
                            <div
                                key={i}
                                className="flex-shrink-0 w-[280px] md:w-[350px] transition-transform duration-300 hover:scale-105 cursor-pointer"
                                onClick={() => setSelectedImage(img)}
                            >
                                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden h-full">
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

            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 120s linear infinite;
                    width: max-content;
                }
                .animate-marquee-live {
                    animation: marquee 80s linear infinite;
                    width: max-content;
                }
                @media (max-width: 768px) {
                    .animate-marquee-live {
                        animation-duration: 60s;
                    }
                }
            `}</style>
        </section>
    );
}
