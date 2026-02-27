"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, limit, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Star, User, Quote, Clock, EyeOff, Eye, Trash2, BookOpen } from "lucide-react";
import { useUserAuth } from "@/context/AuthContext";

interface Review {
    id: string;
    userName: string;
    userPhoto?: string;
    rating: number;
    comment: string;
    createdAt: any;
    matchLevel?: string;
    isHidden?: boolean;
    courseName?: string;
    courseId?: string;
}

interface ReviewListProps {
    adminView?: boolean;
    maxItems?: number;
}

// Color palette for avatar backgrounds (no photo fallback)
const avatarColors = [
    "from-violet-400 to-purple-500",
    "from-sky-400 to-blue-500",
    "from-emerald-400 to-teal-500",
    "from-amber-400 to-orange-500",
    "from-rose-400 to-pink-500",
    "from-indigo-400 to-blue-500",
    "from-teal-400 to-cyan-500",
];

function getAvatarColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getTimeAgo(seconds: number): string {
    const now = Date.now() / 1000;
    const diff = now - seconds;
    if (diff < 60) return "เพิ่งรีวิว";
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} วันที่แล้ว`;
    return new Date(seconds * 1000).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default function ReviewList({ adminView, maxItems }: ReviewListProps) {
    const { userProfile } = useUserAuth();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    const isAdmin = adminView || userProfile?.role === 'Admin';

    useEffect(() => {
        const q = query(
            collection(db, "reviews"),
            orderBy("createdAt", "desc"),
            limit(maxItems || 50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reviewData = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as Review[];
            setReviews(reviewData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [maxItems]);

    const toggleHideReview = async (review: Review) => {
        if (!confirm(`ต้องการ${review.isHidden ? "แสดง" : "ซ่อน"}รีวิวนี้ใช่ไหม?`)) return;
        try {
            await updateDoc(doc(db, "reviews", review.id), {
                isHidden: !review.isHidden
            });
        } catch (error) {
            console.error("Error updating review:", error);
            alert("เกิดข้อผิดพลาด");
        }
    };

    const deleteReview = async (id: string) => {
        if (!confirm("ยืนยันการลบรีวิวนี้ถาวร? (กู้คืนไม่ได้)")) return;
        try {
            await deleteDoc(doc(db, "reviews", id));
        } catch (error) {
            console.error("Error deleting review:", error);
            alert("เกิดข้อผิดพลาด");
        }
    };

    const displayedReviews = isAdmin ? reviews : reviews.filter(r => !r.isHidden);

    if (loading) {
        return (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-5 space-y-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="break-inside-avoid bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 animate-pulse">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800" />
                            <div className="space-y-1.5">
                                <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
                                <div className="h-2 w-16 bg-slate-50 dark:bg-slate-800 rounded" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-3 bg-slate-50 dark:bg-slate-800 rounded w-full" />
                            <div className="h-3 bg-slate-50 dark:bg-slate-800 rounded w-3/4" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (displayedReviews.length === 0) {
        return (
            <div className="text-center py-20 bg-white/30 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                <div className="text-5xl mb-4">💬</div>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">ยังไม่มีรีวิว</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">เป็นคนแรกที่แบ่งปันประสบการณ์!</p>
            </div>
        );
    }

    return (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-5 space-y-5">
            {displayedReviews.map((review) => (
                <div
                    key={review.id}
                    className={`break-inside-avoid group relative bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 ${review.isHidden
                        ? 'opacity-60 border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-900/10'
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                >
                    {/* Admin Controls */}
                    {isAdmin && (
                        <div className="absolute top-3 right-3 flex gap-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => toggleHideReview(review)}
                                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${review.isHidden
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 hover:bg-slate-200'
                                    }`}
                                title={review.isHidden ? "แสดงรีวิว" : "ซ่อนรีวิว"}
                            >
                                {review.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                            <button
                                onClick={() => deleteReview(review.id)}
                                className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 hover:bg-rose-200 transition"
                                title="ลบรีวิว"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}

                    {/* Hidden Badge */}
                    {review.isHidden && isAdmin && (
                        <div className="mb-3 text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                            <EyeOff size={10} /> ซ่อนอยู่
                        </div>
                    )}

                    {/* Decorative Quote */}
                    {!isAdmin && (
                        <div className="absolute top-4 right-5 text-slate-100 dark:text-slate-800 opacity-60 group-hover:opacity-100 transition-opacity">
                            <Quote size={32} fill="currentColor" />
                        </div>
                    )}

                    {/* Header: User Info */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-11 h-11 rounded-full overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm flex items-center justify-center shrink-0 ${!review.userPhoto || (!review.userPhoto.startsWith('http') && !review.userPhoto.startsWith('/'))
                            ? `bg-gradient-to-br ${getAvatarColor(review.userName)}`
                            : 'bg-slate-100 dark:bg-slate-800'
                            }`}>
                            {review.userPhoto && (review.userPhoto.startsWith('http') || review.userPhoto.startsWith('/')) ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={review.userPhoto} alt={review.userName} className="w-full h-full object-cover" />
                            ) : review.userPhoto && !review.userPhoto.startsWith('http') ? (
                                <span className="text-xl" role="img" aria-label="avatar">{review.userPhoto}</span>
                            ) : (
                                <span className="text-white font-bold text-sm">{review.userName?.[0]?.toUpperCase() || 'U'}</span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                                {review.userName}
                            </h4>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                <Clock size={10} />
                                {review.createdAt?.seconds ? getTimeAgo(review.createdAt.seconds) : "เพิ่งรีวิว"}
                            </span>
                        </div>
                    </div>

                    {/* Course Badge */}
                    {review.courseName && (
                        <div className="mb-3 inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                            <BookOpen size={11} />
                            <span className="truncate max-w-[200px]">{review.courseName}</span>
                        </div>
                    )}

                    {/* Rating */}
                    <div className="flex gap-0.5 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                size={15}
                                className={star <= review.rating ? "text-amber-400" : "text-slate-200 dark:text-slate-700"}
                                fill={star <= review.rating ? "currentColor" : "none"}
                            />
                        ))}
                    </div>

                    {/* Comment */}
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium">
                        &quot;{review.comment}&quot;
                    </p>
                </div>
            ))}
        </div>
    );
}
