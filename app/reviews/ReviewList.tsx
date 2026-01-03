"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, limit, deleteDoc, doc, updateDoc, where } from "firebase/firestore";
import { Star, User, Quote, Clock, EyeOff, Eye, Trash2 } from "lucide-react";
import { useUserAuth } from "@/context/AuthContext"; // Import AuthContext

interface Review {
    id: string;
    userName: string;
    userPhoto?: string;
    rating: number;
    comment: string;
    createdAt: any;
    matchLevel?: string;
    isHidden?: boolean; // New field for hiding
}

interface ReviewListProps {
    adminView?: boolean;
}

export default function ReviewList({ adminView }: ReviewListProps) {
    const { userProfile } = useUserAuth(); // Get user profile to check role
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    const isAdmin = adminView || userProfile?.role === 'Admin';

    useEffect(() => {
        // Fetch ALL reviews ordered by date
        // Logic: Valid reviews are filtered client-side based on role for smoother real-time updates
        const q = query(
            collection(db, "reviews"),
            orderBy("createdAt", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reviewData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Review[];
            setReviews(reviewData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

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
        if (!confirm("ยืนยันการลบรีวิวนี้ถาวร?")) return;
        try {
            await deleteDoc(doc(db, "reviews", id));
        } catch (error) {
            console.error("Error deleting review:", error);
            alert("เกิดข้อผิดพลาด");
        }
    };

    // Filter Logic: Show All if Admin, otherwise show only !isHidden
    const displayedReviews = isAdmin ? reviews : reviews.filter(r => !r.isHidden);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white/40 h-48 rounded-3xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (displayedReviews.length === 0) {
        return (
            <div className="text-center py-20 bg-white/30 rounded-3xl border border-dashed border-slate-300">
                <p className="text-slate-500 font-bold text-lg">ยังไม่มีรีวิว เป็นคนแรกที่รีวิวเลย!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedReviews.map((review) => (
                <div
                    key={review.id}
                    className={`group relative bg-white/70 backdrop-blur-sm border p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${review.isHidden ? 'opacity-60 border-rose-200 bg-rose-50/50' : 'border-white/80'}`}
                >
                    {/* Admin Controls */}
                    {isAdmin && (
                        <div className="absolute top-4 right-4 flex gap-2 z-20">
                            <button
                                onClick={() => toggleHideReview(review)}
                                className={`p-2 rounded-full transition ${review.isHidden ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                                title={review.isHidden ? "แสดงรีวิว" : "ซ่อนรีวิว"}
                            >
                                {review.isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <button
                                onClick={() => deleteReview(review.id)}
                                className="p-2 rounded-full bg-rose-100 text-rose-500 hover:bg-rose-200 transition"
                                title="ลบรีวิว"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}

                    {/* Decorative Quote - Hide if Admin controls obscure it or just adjust z-index/pos */}
                    {!isAdmin && (
                        <div className="absolute top-4 right-6 text-teal-100 opacity-50 group-hover:opacity-100 transition-opacity transform group-hover:scale-110">
                            <Quote size={40} fill="currentColor" />
                        </div>
                    )}

                    {/* Header: User Info */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                            {review.userPhoto && (review.userPhoto.startsWith('http') || review.userPhoto.startsWith('/')) ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={review.userPhoto} alt={review.userName} className="w-full h-full object-cover" />
                            ) : review.userPhoto ? (
                                <span className="text-2xl" role="img" aria-label="avatar">{review.userPhoto}</span>
                            ) : (
                                <User size={20} className="text-slate-400" />
                            )}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm line-clamp-1 flex items-center gap-2">
                                {review.userName}
                                {review.isHidden && <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">ซ่อนอยู่</span>}
                            </h4>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                {review.createdAt?.seconds ? (
                                    new Date(review.createdAt.seconds * 1000).toLocaleDateString('th-TH')
                                ) : (
                                    <span className="flex items-center gap-1"><Clock size={10} /> เพิ่งรีวิว</span>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Rating */}
                    <div className="flex gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                size={16}
                                className={star <= review.rating ? "text-amber-400" : "text-slate-200"}
                                fill={star <= review.rating ? "currentColor" : "none"}
                            />
                        ))}
                    </div>

                    {/* Comment */}
                    <p className="text-slate-600 text-sm leading-relaxed font-medium">
                        &quot;{review.comment}&quot;
                    </p>
                </div>
            ))}
        </div>
    );
}
