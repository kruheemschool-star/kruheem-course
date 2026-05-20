"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { useUserAuth } from "@/context/AuthContext";
import { Star, Send, Gift, CheckCircle, Copy, AlertCircle } from "lucide-react";

interface ReviewFormProps {
    courseId?: string;
    courseName?: string;
    initialCouponCode?: string | null;
    isCouponUsed?: boolean;
    onReviewSubmitted?: () => void;
}

const MIN_COMMENT_LENGTH = 20;
const MAX_COMMENT_LENGTH = 2000;

// Cryptographically random A-Z0-9 string for coupon codes.
// Falls back to Math.random only if the runtime has no crypto (very rare).
function generateSecureCode(len: number): string {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
        const bytes = new Uint8Array(len);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (b) => charset[b % charset.length]).join("");
    }
    return Array.from({ length: len }, () => charset[Math.floor(Math.random() * charset.length)]).join("");
}

export default function ReviewForm({ courseId, courseName, initialCouponCode, isCouponUsed, onReviewSubmitted }: ReviewFormProps) {
    const { user, userProfile } = useUserAuth();
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");
    const [customName, setCustomName] = useState(userProfile?.displayName || user?.displayName || "ผู้เรียน");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [couponCode, setCouponCode] = useState<string | null>(initialCouponCode || null);
    const [isCopied, setIsCopied] = useState(false);
    const [alreadyReviewed, setAlreadyReviewed] = useState(false);
    const [checkingReview, setCheckingReview] = useState(true);

    // Check if user already reviewed this course
    useEffect(() => {
        const checkExistingReview = async () => {
            if (!user || !courseId) {
                setCheckingReview(false);
                return;
            }
            try {
                const q = query(
                    collection(db, "reviews"),
                    where("userId", "==", user.uid),
                    where("courseId", "==", courseId)
                );
                const snap = await getDocs(q);
                if (!snap.empty) {
                    setAlreadyReviewed(true);
                    // Check if there's a coupon for this review
                    const couponQ = query(
                        collection(db, "coupons"),
                        where("userId", "==", user.uid),
                        where("courseId", "==", courseId),
                        where("source", "==", "review_reward")
                    );
                    const couponSnap = await getDocs(couponQ);
                    if (!couponSnap.empty) {
                        const couponData = couponSnap.docs[0].data();
                        setCouponCode(couponData.code);
                    }
                }
            } catch (err) {
                console.error("Error checking existing review:", err);
            } finally {
                setCheckingReview(false);
            }
        };
        checkExistingReview();
    }, [user, courseId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return alert("กรุณาเข้าสู่ระบบก่อนรีวิว");
        if (rating === 0) return alert("กรุณาให้คะแนนดาว");
        if (comment.trim().length < MIN_COMMENT_LENGTH) {
            return alert(`กรุณาเขียนรีวิวอย่างน้อย ${MIN_COMMENT_LENGTH} ตัวอักษร เพื่อรับคูปองส่วนลด`);
        }
        if (comment.trim().length > MAX_COMMENT_LENGTH) {
            return alert(`รีวิวยาวเกินไป (สูงสุด ${MAX_COMMENT_LENGTH.toLocaleString()} ตัวอักษร)`);
        }

        setIsSubmitting(true);

        try {
            // 1. Double-check duplicate review (prevent race condition)
            if (courseId) {
                const dupQ = query(
                    collection(db, "reviews"),
                    where("userId", "==", user.uid),
                    where("courseId", "==", courseId)
                );
                const dupSnap = await getDocs(dupQ);
                if (!dupSnap.empty) {
                    setAlreadyReviewed(true);
                    alert("คุณรีวิวคอร์สนี้ไปแล้ว");
                    setIsSubmitting(false);
                    return;
                }
            }

            // 2. Generate Coupon Code (cryptographically random, not Math.random)
            // Must satisfy firestore.rules pattern ^REVIEW-[A-Z0-9]{6}$
            const code = `REVIEW-${generateSecureCode(6)}`;

            // 3. Add Review
            await addDoc(collection(db, "reviews"), {
                userId: user.uid,
                userName: customName.trim() || userProfile?.displayName || user.displayName || "ผู้เรียน",
                userPhoto: userProfile?.avatar || user.photoURL || "",
                matchLevel: userProfile?.role || "Student",
                rating: rating,
                comment: comment.trim(),
                createdAt: serverTimestamp(),
                courseId: courseId || null,
                courseName: courseName || null,
                couponCode: code,
            });

            // 4. Create Coupon (bound to userId)
            await addDoc(collection(db, "coupons"), {
                code: code,
                discountAmount: 100,
                userId: user.uid,
                courseId: courseId || null,
                isUsed: false,
                usedAt: null,
                usedForCourseId: null,
                createdAt: serverTimestamp(),
                source: "review_reward"
            });

            setCouponCode(code);
            setAlreadyReviewed(true);
            setRating(0);
            setComment("");
            onReviewSubmitted?.();

        } catch (error) {
            console.error("Error submitting review:", error);
            alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (checkingReview) {
        return (
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 shadow-2xl rounded-[2.5rem] p-8 text-center">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-xl w-48 mx-auto" />
                    <div className="h-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg w-64 mx-auto" />
                </div>
            </div>
        );
    }

    // Already reviewed — show coupon or thank you
    if (alreadyReviewed && couponCode) {
        if (isCouponUsed) {
            return (
                <div className="bg-slate-100 dark:bg-slate-800/60 rounded-3xl p-8 text-center text-slate-500 dark:text-slate-400 shadow-xl relative overflow-hidden animate-in zoom-in duration-300 border border-slate-200 dark:border-slate-700">
                    <div className="relative z-10 font-sans opacity-80">
                        <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={40} className="text-slate-400 dark:text-slate-500" />
                        </div>
                        <h3 className="text-2xl font-black mb-2 tracking-tight text-slate-700 dark:text-slate-200">ใช้สิทธิ์แล้ว</h3>
                        <p className="text-slate-400 dark:text-slate-500 mb-6 font-medium text-sm">คูปองนี้ถูกใช้งานไปเรียบร้อยแล้ว</p>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 font-mono text-xl font-bold py-4 px-6 rounded-2xl flex flex-col items-center justify-center gap-2 mb-2 select-none">
                            <span className="line-through decoration-2 decoration-slate-400 dark:decoration-slate-500">{couponCode}</span>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-center text-white shadow-xl relative overflow-hidden animate-in zoom-in duration-300">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10 font-sans">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Gift size={40} className="text-white animate-bounce" />
                    </div>

                    <h3 className="text-3xl font-black mb-2 tracking-tight">ขอบคุณสำหรับรีวิว!</h3>
                    <p className="text-emerald-100 mb-6 font-medium">นี่คือคูปองส่วนลด 100 บาท สำหรับคอร์สถัดไปของคุณ</p>

                    <button
                        onClick={() => {
                            if (couponCode) {
                                navigator.clipboard.writeText(couponCode);
                                setIsCopied(true);
                                setTimeout(() => setIsCopied(false), 2000);
                            }
                        }}
                        className="group relative w-full bg-white text-emerald-600 font-mono text-xl font-bold py-5 px-6 rounded-2xl border-2 border-dashed border-white/50 hover:border-white transition-all shadow-lg hover:translate-y-[-2px] active:translate-y-0 flex flex-col items-center justify-center gap-2 mb-6"
                    >
                        <span className="select-all">{couponCode}</span>
                        <div className={`flex items-center gap-1.5 text-xs font-sans font-bold px-3 py-1 rounded-full transition-all duration-300 ${isCopied ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-600 opacity-60 group-hover:opacity-100'}`}>
                            {isCopied ? (
                                <>
                                    <CheckCircle size={12} /> คัดลอกแล้ว
                                </>
                            ) : (
                                <>
                                    <Copy size={12} /> แตะเพื่อคัดลอก
                                </>
                            )}
                        </div>
                    </button>

                    <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 text-sm text-emerald-100 font-medium">
                        <p>💡 ไม่ต้องกลัวหาย! ดูโค้ดย้อนหลังได้ที่หน้า <strong className="text-white">&quot;คอร์สเรียนของฉัน&quot;</strong> เสมอ</p>
                    </div>
                </div>
            </div>
        );
    }

    // Already reviewed but no coupon found (edge case)
    if (alreadyReviewed) {
        return (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-8 text-center">
                <CheckCircle size={40} className="text-emerald-500 dark:text-emerald-400 mx-auto mb-3" />
                <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-300 mb-1">คุณรีวิวคอร์สนี้แล้ว</h3>
                <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">ขอบคุณสำหรับความคิดเห็นของคุณ</p>
            </div>
        );
    }

    const charCount = comment.trim().length;
    const isCommentValid = charCount >= MIN_COMMENT_LENGTH;

    return (
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 shadow-2xl rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 via-purple-400 to-amber-400"></div>

            <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">เขียนรีวิวให้เรา</h2>
                <p className="text-slate-500 dark:text-slate-400 font-bold mb-3">เพียงบอกความประทับใจ รับเลยทันที!</p>
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-orange-200 rounded-2xl px-6 py-3 shadow-md transform hover:scale-105 transition-transform duration-300">
                    <span className="text-3xl">🎫</span>
                    <span className="text-2xl font-black text-orange-600 tracking-tight">ส่วนลด 100 บาท</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Star Rating */}
                <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                className={`transition-all duration-300 transform hover:scale-110 ${(hoverRating || rating) >= star ? "text-amber-400 drop-shadow-md" : "text-slate-200 dark:text-slate-700"
                                    }`}
                                onMouseEnter={() => setHoverRating(star)}
                                onClick={() => setRating(star)}
                            >
                                <Star size={48} fill={(hoverRating || rating) >= star ? "currentColor" : "none"} strokeWidth={1.5} />
                            </button>
                        ))}
                    </div>
                    <span className="text-sm font-bold text-slate-400 dark:text-slate-500">
                        {rating > 0 ? (rating === 5 ? "ดีเยี่ยมไปเลย! 🤩" : rating >= 4 ? "ดีมาก 😊" : rating >= 3 ? "พอใช้ได้ 🙂" : "ต้องปรับปรุง 😓") : "แตะเพื่อเลือกดาว"}
                    </span>
                </div>

                {/* Custom Name */}
                <div className="relative">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 pl-1">ชื่อที่จะแสดงในรีวิว</label>
                    <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="ชื่อเล่น หรือ นามแฝง"
                        className="w-full px-5 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-transparent transition shadow-sm text-slate-700 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    />
                </div>

                {/* Comment */}
                <div className="relative">
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="บอกเล่าความประทับใจของคุณ... (อย่างน้อย 20 ตัวอักษร)"
                        rows={4}
                        className={`w-full p-5 bg-white dark:bg-slate-950 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-transparent transition resize-none shadow-sm text-slate-700 dark:text-white font-medium placeholder:text-slate-300 dark:placeholder:text-slate-600 ${charCount > 0 && !isCommentValid ? 'border-amber-300 dark:border-amber-700' : 'border-slate-100 dark:border-slate-800'}`}
                        required
                    />
                    <div className="flex items-center justify-between mt-1.5 px-1">
                        {charCount > 0 && !isCommentValid ? (
                            <span className="text-xs font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1">
                                <AlertCircle size={12} />
                                เขียนอีก {MIN_COMMENT_LENGTH - charCount} ตัวอักษร
                            </span>
                        ) : charCount > 0 ? (
                            <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle size={12} />
                                ยอดเยี่ยม!
                            </span>
                        ) : <span />}
                        <span className={`text-xs font-bold ${isCommentValid ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`}>
                            {charCount}/{MIN_COMMENT_LENGTH}
                        </span>
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isSubmitting || rating === 0 || !isCommentValid}
                    className="w-full py-4 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <span className="animate-pulse">กำลังส่ง...</span>
                    ) : (
                        <>
                            <Send size={20} />
                            ส่งรีวิว & รับคูปอง
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
