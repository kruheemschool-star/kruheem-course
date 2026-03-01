"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { Star, MessageCircle } from "lucide-react";
import Link from "next/link";

interface Review {
    id: string;
    userName: string;
    userPhoto: string;
    rating: number;
    comment: string;
    courseName?: string;
    createdAt: any;
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export default function HomeReviewCarousel() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | null>(null);
    const scrollSpeed = useRef(0.5);
    const isPaused = useRef(false);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
                const snap = await getDocs(q);
                const allReviews = snap.docs
                    .map(d => ({ id: d.id, ...d.data() } as Review))
                    .filter(r => !((r as any).isHidden));
                setReviews(shuffleArray(allReviews));
            } catch (err) {
                console.error("Error fetching reviews:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReviews();
    }, []);

    // Auto-scroll animation
    const animate = useCallback(() => {
        const el = scrollRef.current;
        if (!el || isPaused.current) {
            animationRef.current = requestAnimationFrame(animate);
            return;
        }

        el.scrollTop += scrollSpeed.current;

        // Reset scroll when halfway (seamless loop)
        if (el.scrollTop >= el.scrollHeight / 2) {
            el.scrollTop = 0;
        }

        animationRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        if (reviews.length === 0) return;
        animationRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [reviews, animate]);

    const isTouchInteraction = useRef(false);

    const handleTouchStart = () => {
        isTouchInteraction.current = true;
        isPaused.current = true;
    };

    const handleTouchEnd = () => {
        isPaused.current = false;
        setTimeout(() => { isTouchInteraction.current = false; }, 500);
    };

    const handleMouseEnter = () => {
        if (!isTouchInteraction.current) isPaused.current = true;
    };

    const handleMouseLeave = () => {
        if (!isTouchInteraction.current) isPaused.current = false;
    };

    // Render avatar
    const renderAvatar = (review: Review) => {
        const photo = review.userPhoto;
        if (photo && (photo.startsWith("http") || photo.startsWith("/"))) {
            return (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={photo} alt="" className="w-full h-full object-cover" />
            );
        }
        if (photo && photo.length <= 2) {
            return <span className="text-lg">{photo}</span>;
        }
        // Fallback: first letter
        const initial = review.userName?.charAt(0)?.toUpperCase() || "?";
        return <span className="text-sm font-bold text-white">{initial}</span>;
    };

    // Render stars
    const renderStars = (rating: number) => (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <Star
                    key={i}
                    size={12}
                    className={i <= rating ? "text-amber-400" : "text-slate-200"}
                    fill={i <= rating ? "currentColor" : "none"}
                />
            ))}
        </div>
    );

    if (loading) {
        return (
            <div className="w-full h-full rounded-[2rem] bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-800 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                    <span className="text-sm text-slate-400 font-medium">กำลังโหลดรีวิว...</span>
                </div>
            </div>
        );
    }

    if (reviews.length === 0) return null;

    // Double the reviews for seamless infinite scroll
    const loopedReviews = [...reviews, ...reviews];

    return (
        <div className="w-full h-full flex flex-col rounded-[2rem] bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/50 dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                        <MessageCircle size={16} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">รีวิวจากนักเรียน</h3>
                        <p className="text-xs text-slate-400">{reviews.length} รีวิว</p>
                    </div>
                </div>
            </div>

            {/* Scrolling Reviews */}
            <div
                ref={scrollRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                className="flex-1 overflow-hidden relative"
                style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)" }}
            >
                <div className="p-3 space-y-3">
                    {loopedReviews.map((review, idx) => (
                        <div
                            key={`${review.id}-${idx}`}
                            className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-teal-200 dark:hover:border-teal-800 transition-all duration-300 cursor-default group"
                        >
                            {/* User Info */}
                            <div className="flex items-center gap-2.5 mb-2.5">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm ring-2 ring-white dark:ring-slate-800">
                                    {renderAvatar(review)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{review.userName}</p>
                                    {renderStars(review.rating)}
                                </div>
                            </div>

                            {/* Course Badge */}
                            {review.courseName && (
                                <div className="mb-2">
                                    <span className="inline-block px-2.5 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-xs font-bold rounded-md border border-teal-100 dark:border-teal-800 truncate max-w-full">
                                        📖 {review.courseName}
                                    </span>
                                </div>
                            )}

                            {/* Comment */}
                            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                                &ldquo;{review.comment}&rdquo;
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <Link
                    href="/reviews"
                    className="block w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-bold shadow-sm hover:shadow-md hover:from-teal-600 hover:to-emerald-600 transition-all"
                >
                    ⭐ อ่านรีวิวทั้งหมด
                </Link>
            </div>
        </div>
    );
}
