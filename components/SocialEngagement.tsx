"use client";

import { useState, useEffect } from "react";
import {
    Heart, Share2, Star, Copy, Check,
    Facebook, Twitter
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";

interface SocialEngagementProps {
    summaryId: string;
    summaryTitle: string;
    summarySlug: string;
}

// Generate or get persistent visitor ID
function getVisitorId(): string {
    if (typeof window === 'undefined') return '';

    let visitorId = localStorage.getItem('kruheem_visitor_id');
    if (!visitorId) {
        visitorId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('kruheem_visitor_id', visitorId);
    }
    return visitorId;
}

export default function SocialEngagement({ summaryId, summaryTitle, summarySlug }: SocialEngagementProps) {
    // State
    const [visitorId, setVisitorId] = useState('');
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [averageRating, setAverageRating] = useState(0);
    const [ratingCount, setRatingCount] = useState(0);
    const [copied, setCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Get current URL
    const getShareUrl = () => {
        if (typeof window !== 'undefined') {
            return window.location.href;
        }
        return `https://kruheem.com/summary/${summarySlug}`;
    };

    // Load data on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                // Get or create visitor ID
                const vid = getVisitorId();
                setVisitorId(vid);

                // Load aggregate data from Firebase
                const docRef = doc(db, "summaryReactions", summaryId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setLikeCount(data.likeCount || 0);
                    setRatingCount(data.ratingCount || 0);
                    if (data.ratingCount > 0) {
                        setAverageRating(data.totalRating / data.ratingCount);
                    }

                    // Load this visitor's reaction from Firebase
                    if (vid && data.visitors && data.visitors[vid]) {
                        const visitorData = data.visitors[vid];
                        setLiked(visitorData.liked || false);
                        setUserRating(visitorData.rating || 0);
                    }
                }
            } catch (error) {
                console.error("Error loading engagement data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [summaryId]);

    // Handle Like
    const handleLike = async () => {
        if (!visitorId) return;

        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));

        // Update Firebase
        try {
            const docRef = doc(db, "summaryReactions", summaryId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                await updateDoc(docRef, {
                    likeCount: increment(newLiked ? 1 : -1),
                    [`visitors.${visitorId}.liked`]: newLiked
                });
            } else {
                await setDoc(docRef, {
                    likeCount: newLiked ? 1 : 0,
                    totalRating: 0,
                    ratingCount: 0,
                    visitors: {
                        [visitorId]: { liked: newLiked, rating: 0 }
                    }
                });
            }
        } catch (error) {
            console.error("Error updating like:", error);
            // Revert on error
            setLiked(!newLiked);
            setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
        }
    };

    // Handle Rating
    const handleRating = async (rating: number) => {
        if (!visitorId) return;

        const oldRating = userRating;
        setUserRating(rating);

        // Update Firebase
        try {
            const docRef = doc(db, "summaryReactions", summaryId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const visitorData = data.visitors?.[visitorId];
                const hadRating = visitorData?.rating > 0;

                if (!hadRating) {
                    // New rating
                    await updateDoc(docRef, {
                        totalRating: increment(rating),
                        ratingCount: increment(1),
                        [`visitors.${visitorId}.rating`]: rating
                    });
                    setRatingCount(prev => prev + 1);
                    setAverageRating((data.totalRating + rating) / (data.ratingCount + 1));
                } else {
                    // Update existing rating
                    const oldVisitorRating = visitorData.rating;
                    await updateDoc(docRef, {
                        totalRating: increment(rating - oldVisitorRating),
                        [`visitors.${visitorId}.rating`]: rating
                    });
                    setAverageRating((data.totalRating + rating - oldVisitorRating) / data.ratingCount);
                }
            } else {
                await setDoc(docRef, {
                    likeCount: 0,
                    totalRating: rating,
                    ratingCount: 1,
                    visitors: {
                        [visitorId]: { liked: false, rating }
                    }
                });
                setRatingCount(1);
                setAverageRating(rating);
            }
        } catch (error) {
            console.error("Error updating rating:", error);
            setUserRating(oldRating);
        }
    };

    // Share handlers
    const shareUrl = getShareUrl();
    const shareText = `${summaryTitle} | Kruheem Math School`;

    const handleShareFacebook = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400');
    };

    const handleShareTwitter = () => {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank', 'width=600,height=400');
    };

    const handleShareLine = () => {
        window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400');
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="py-8 animate-pulse">
                <div className="h-12 bg-slate-100 rounded-xl"></div>
            </div>
        );
    }

    return (
        <div className="py-8 border-t border-b border-slate-100 my-8">
            {/* Star Rating */}
            <div className="flex flex-col items-center gap-3 mb-6">
                <p className="text-sm text-slate-500 font-medium">ให้คะแนนบทความนี้</p>
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => handleRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 transition-transform hover:scale-110"
                        >
                            <Star
                                size={28}
                                className={`transition-colors ${star <= (hoverRating || userRating)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300 hover:text-amber-300'
                                    }`}
                            />
                        </button>
                    ))}
                </div>
                {ratingCount > 0 && (
                    <p className="text-xs text-slate-400">
                        คะแนนเฉลี่ย {averageRating.toFixed(1)} จาก {ratingCount} คน
                    </p>
                )}
            </div>

            {/* Like & Share Row */}
            <div className="flex flex-wrap items-center justify-center gap-4">
                {/* Like Button */}
                <button
                    type="button"
                    onClick={handleLike}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all ${liked
                        ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                >
                    <Heart
                        size={18}
                        className={`transition-all ${liked ? 'fill-rose-500 text-rose-500 scale-110' : ''}`}
                    />
                    {likeCount > 0 ? `${likeCount} ถูกใจ` : 'ถูกใจ'}
                </button>

                {/* Divider */}
                <div className="h-6 w-px bg-slate-200"></div>

                {/* Share Section */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 flex items-center gap-1">
                        <Share2 size={16} />
                        แชร์:
                    </span>

                    {/* Facebook */}
                    <button
                        type="button"
                        onClick={handleShareFacebook}
                        className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition"
                        title="แชร์ไป Facebook"
                    >
                        <Facebook size={18} />
                    </button>

                    {/* Twitter/X */}
                    <button
                        type="button"
                        onClick={handleShareTwitter}
                        className="p-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                        title="แชร์ไป X"
                    >
                        <Twitter size={18} />
                    </button>

                    {/* Line */}
                    <button
                        type="button"
                        onClick={handleShareLine}
                        className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition font-bold text-xs"
                        title="แชร์ไป Line"
                    >
                        Line
                    </button>

                    {/* Copy Link */}
                    <button
                        type="button"
                        onClick={handleCopyLink}
                        className={`p-2 rounded-full transition ${copied
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        title="คัดลอกลิงก์"
                    >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
