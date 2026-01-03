"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { useUserAuth } from "@/context/AuthContext";
import { Star, Send, Gift, CheckCircle, Copy } from "lucide-react";

interface ReviewFormProps {
    courseId?: string;
    courseName?: string;
    initialCouponCode?: string | null;
    isCouponUsed?: boolean;
}

export default function ReviewForm({ courseId, courseName, initialCouponCode, isCouponUsed }: ReviewFormProps) {
    const { user, userProfile } = useUserAuth();
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");
    const [customName, setCustomName] = useState(userProfile?.displayName || user?.displayName || "ผู้เรียน");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [couponCode, setCouponCode] = useState<string | null>(initialCouponCode || null);
    const [isCopied, setIsCopied] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return alert("กรุณาเข้าสู่ระบบก่อนรีวิว");
        if (rating === 0) return alert("กรุณาให้คะแนนดาว");

        setIsSubmitting(true);

        try {
            // 1. Check if user already reviewed (optional, but good practice to prevent spam, allow 1 coupon per review?)
            // For now, let's allow multiple but maybe limit coupon generation? 
            // User request: "If they review, they get a coupon". Let's assume every review gets a coupon for now or check duplication.
            // Let's keep it simple: Write review -> Get coupon.

            // 2. Add Review
            await addDoc(collection(db, "reviews"), {
                userId: user.uid,
                userName: customName.trim() || userProfile?.displayName || user.displayName || "ผู้เรียน",
                userPhoto: userProfile?.avatar || user.photoURL || "",
                matchLevel: userProfile?.role || "Student", // Just a badge
                rating: rating,
                comment: comment,
                createdAt: serverTimestamp(),
                courseId: courseId || null,
                courseName: courseName || null,
            });

            // 3. Generate Coupon
            const code = `DISCOUNT100-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            await addDoc(collection(db, "coupons"), {
                code: code,
                discountAmount: 100,
                userId: user.uid,
                isUsed: false,
                createdAt: serverTimestamp(),
                source: "review_reward"
            });

            setCouponCode(code);
            setRating(0);
            setComment("");

        } catch (error) {
            console.error("Error submitting review:", error);
            alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (couponCode) {
        if (isCouponUsed) {
            return (
                <div className="bg-slate-100 rounded-3xl p-8 text-center text-slate-500 shadow-xl relative overflow-hidden animate-in zoom-in duration-300 border border-slate-200">
                    <div className="relative z-10 font-sans opacity-80 mix-blend-multiply">
                        <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={40} className="text-slate-400" />
                        </div>

                        <h3 className="text-2xl font-black mb-2 tracking-tight text-slate-700">ใช้สิทธิ์แล้ว</h3>
                        <p className="text-slate-400 mb-6 font-medium text-sm">คูปองนี้ถูกใช้งานไปเรียบร้อยแล้ว</p>

                        <div className="w-full bg-slate-200 text-slate-400 font-mono text-xl font-bold py-4 px-6 rounded-2xl flex flex-col items-center justify-center gap-2 mb-2 select-none">
                            <span className="line-through decoration-2 decoration-slate-300">{couponCode}</span>
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

                    {/* Optional: Add button to go to courses or close */}
                    {/* <button
                        onClick={() => setCouponCode(null)}
                        className="text-sm font-bold opacity-80 hover:opacity-100 underline decoration-white/50 hover:decoration-white"
                    >
                        เขียนรีวิวเพิ่ม
                    </button> */}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 shadow-2xl rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 via-purple-400 to-amber-400"></div>

            <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-slate-800 mb-2">เขียนรีวิวให้เรา</h2>
                <p className="text-slate-500 font-bold mb-3">เพียงบอกความประทับใจ รับเลยทันที!</p>
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
                                className={`transition-all duration-300 transform hover:scale-110 ${(hoverRating || rating) >= star ? "text-amber-400 drop-shadow-md" : "text-slate-200"
                                    }`}
                                onMouseEnter={() => setHoverRating(star)}
                                onClick={() => setRating(star)}
                            >
                                <Star size={48} fill={(hoverRating || rating) >= star ? "currentColor" : "none"} strokeWidth={1.5} />
                            </button>
                        ))}
                    </div>
                    <span className="text-sm font-bold text-slate-400">
                        {rating > 0 ? (rating === 5 ? "ดีเยี่ยมไปเลย! 🤩" : rating >= 4 ? "ดีมาก 😊" : rating >= 3 ? "พอใช้ได้ 🙂" : "ต้องปรับปรุง 😓") : "แตะเพื่อเลือกดาว"}
                    </span>
                </div>

                {/* Custom Name */}
                <div className="relative">
                    <label className="block text-sm font-bold text-slate-700 mb-2 pl-1">ชื่อที่จะแสดงในรีวิว</label>
                    <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="ชื่อเล่น หรือ นามแฝง"
                        className="w-full px-5 py-3 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-transparent transition shadow-sm text-slate-700 font-bold placeholder:text-slate-300"
                    />
                </div>

                {/* Comment */}
                <div className="relative">
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="บอกเล่าความประทับใจของคุณ..."
                        rows={4}
                        className="w-full p-5 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-transparent transition resize-none shadow-sm text-slate-700 font-medium placeholder:text-slate-300"
                        required
                    />
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isSubmitting || rating === 0}
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
