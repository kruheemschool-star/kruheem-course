"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    getDoc,
    setDoc,
    getDocs,
    Timestamp,
    serverTimestamp,
} from "firebase/firestore";
import { useUserAuth } from "@/context/AuthContext";
import { Star, MessageCircle, Send, User, Reply, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────
interface BlogComment {
    id: string;
    postId: string;
    parentId?: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
    createdAt: Timestamp;
}

interface RatingData {
    average: number;
    count: number;
    userRating: number | null;
}

// ─── Star Rating Component ──────────────────────────────────────────
function StarRating({
    postId,
    postTitle,
}: {
    postId: string;
    postTitle: string;
}) {
    const { user } = useUserAuth();
    const [rating, setRating] = useState<RatingData>({ average: 0, count: 0, userRating: null });
    const [hoverStar, setHoverStar] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!postId) return;

        // Listen for all ratings on this post
        const q = query(collection(db, "postRatings"), where("postId", "==", postId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ratings = snapshot.docs.map((d) => d.data().rating as number);
            const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

            // Find user's own rating
            let userRating: number | null = null;
            if (user) {
                const userDoc = snapshot.docs.find((d) => d.data().userId === user.uid);
                if (userDoc) userRating = userDoc.data().rating;
            }

            setRating({ average: avg, count: ratings.length, userRating });
        });

        return () => unsubscribe();
    }, [postId, user]);

    const handleRate = async (stars: number) => {
        if (!user || submitting) return;
        setSubmitting(true);
        try {
            const ratingDocId = `${postId}_${user.uid}`;
            await setDoc(doc(db, "postRatings", ratingDocId), {
                postId,
                userId: user.uid,
                userName: user.displayName || user.email?.split("@")[0] || "ผู้ใช้",
                rating: stars,
                updatedAt: serverTimestamp(),
            });
        } catch (err) {
            console.error("Error submitting rating:", err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 rounded-2xl p-6 text-center">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
                บทความนี้เป็นประโยชน์ไหม?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">ให้คะแนนบทความนี้</p>

            {/* Stars */}
            <div className="flex items-center justify-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => {
                    const filled = hoverStar > 0 ? star <= hoverStar : star <= (rating.userRating || 0);
                    return (
                        <button
                            key={star}
                            type="button"
                            onClick={() => handleRate(star)}
                            onMouseEnter={() => setHoverStar(star)}
                            onMouseLeave={() => setHoverStar(0)}
                            disabled={!user || submitting}
                            className={`transition-all duration-200 ${
                                user ? "cursor-pointer hover:scale-125" : "cursor-default"
                            }`}
                            title={user ? `ให้ ${star} ดาว` : "เข้าสู่ระบบเพื่อให้คะแนน"}
                        >
                            <Star
                                size={32}
                                className={`transition-colors ${
                                    filled
                                        ? "text-amber-400 fill-amber-400"
                                        : "text-slate-300 dark:text-slate-600"
                                }`}
                            />
                        </button>
                    );
                })}
            </div>

            {/* Rating Summary */}
            <div className="text-sm text-slate-500 dark:text-slate-400">
                {rating.count > 0 ? (
                    <span>
                        <span className="font-bold text-amber-500">{rating.average.toFixed(1)}</span> / 5
                        <span className="mx-1">•</span>
                        {rating.count} คนให้คะแนน
                    </span>
                ) : (
                    <span>ยังไม่มีคะแนน — เป็นคนแรก!</span>
                )}
            </div>

            {rating.userRating && (
                <p className="text-xs text-teal-600 dark:text-teal-400 mt-2 font-bold">
                    คุณให้ {rating.userRating} ดาว ✓
                </p>
            )}

            {!user && (
                <Link
                    href="/login"
                    className="inline-block mt-3 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 underline"
                >
                    เข้าสู่ระบบเพื่อให้คะแนน
                </Link>
            )}
        </div>
    );
}

// ─── Comment Item (recursive for replies) ───────────────────────────
function CommentItem({
    comment,
    allComments,
    postId,
    depth = 0,
}: {
    comment: BlogComment;
    allComments: BlogComment[];
    postId: string;
    depth?: number;
}) {
    const { user } = useUserAuth();
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replyContent, setReplyContent] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showReplies, setShowReplies] = useState(true);

    const replies = allComments.filter((c) => c.parentId === comment.id);

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !replyContent.trim()) return;
        setSubmitting(true);
        try {
            await addDoc(collection(db, "postComments"), {
                postId,
                parentId: comment.id,
                userId: user.uid,
                userName: user.displayName || user.email?.split("@")[0] || "ผู้ใช้",
                userAvatar: user.photoURL || "",
                content: replyContent.trim(),
                createdAt: serverTimestamp(),
            });
            setReplyContent("");
            setShowReplyForm(false);
        } catch (err) {
            console.error("Error adding reply:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (timestamp: Timestamp | null) => {
        if (!timestamp) return "";
        const date = timestamp.toDate();
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "เมื่อสักครู่";
        if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
        if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
        if (days < 7) return `${days} วันที่แล้ว`;
        return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
    };

    return (
        <div className={depth > 0 ? "ml-8 mt-3" : ""}>
            <div className="flex gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                    {comment.userAvatar ? (
                        <img src={comment.userAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <User size={18} className="text-slate-500 dark:text-slate-400" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                            {comment.userName}
                        </span>
                        <span className="text-xs text-slate-400">{formatTime(comment.createdAt)}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-sm whitespace-pre-wrap">
                        {comment.content}
                    </p>

                    {/* Reply button */}
                    <div className="flex items-center gap-3 mt-2">
                        {user && depth < 2 && (
                            <button
                                type="button"
                                onClick={() => setShowReplyForm(!showReplyForm)}
                                className="text-xs font-bold text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-1 transition-colors"
                            >
                                <Reply size={14} />
                                ตอบกลับ
                            </button>
                        )}
                        {replies.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowReplies(!showReplies)}
                                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 transition-colors"
                            >
                                {showReplies ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                {replies.length} ตอบกลับ
                            </button>
                        )}
                    </div>

                    {/* Reply form */}
                    {showReplyForm && (
                        <form onSubmit={handleReply} className="mt-3 flex gap-2">
                            <input
                                type="text"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="เขียนตอบกลับ..."
                                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-300 dark:focus:ring-teal-600"
                            />
                            <button
                                type="submit"
                                disabled={submitting || !replyContent.trim()}
                                className="px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-bold transition disabled:opacity-50 flex items-center gap-1"
                            >
                                <Send size={14} />
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* Nested replies */}
            {showReplies && replies.length > 0 && (
                <div className="space-y-2">
                    {replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            allComments={allComments}
                            postId={postId}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Blog Comment Section ───────────────────────────────────────────
function BlogComments({ postId }: { postId: string }) {
    const { user } = useUserAuth();
    const [comments, setComments] = useState<BlogComment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!postId) return;

        const q = query(
            collection(db, "postComments"),
            where("postId", "==", postId),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as BlogComment[];
                setComments(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching comments:", err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [postId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newComment.trim()) return;
        setSubmitting(true);
        try {
            await addDoc(collection(db, "postComments"), {
                postId,
                userId: user.uid,
                userName: user.displayName || user.email?.split("@")[0] || "ผู้ใช้",
                userAvatar: user.photoURL || "",
                content: newComment.trim(),
                createdAt: serverTimestamp(),
            });
            setNewComment("");
        } catch (err) {
            console.error("Error adding comment:", err);
            alert("ไม่สามารถส่งความคิดเห็นได้ กรุณาลองใหม่");
        } finally {
            setSubmitting(false);
        }
    };

    const topLevelComments = comments.filter((c) => !c.parentId);

    return (
        <div>
            <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">
                <MessageCircle size={24} />
                ความคิดเห็น ({comments.length})
            </h3>

            {/* Comment Form */}
            {user ? (
                <form onSubmit={handleSubmit} className="mb-8">
                    <div className="flex gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <User size={20} className="text-slate-500 dark:text-slate-400" />
                            )}
                        </div>
                        <div className="flex-1">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="เขียนความคิดเห็นเกี่ยวกับบทความนี้..."
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-300 dark:focus:ring-teal-500 resize-none text-sm"
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    type="submit"
                                    disabled={submitting || !newComment.trim()}
                                    className="flex items-center gap-2 px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-sm transition disabled:opacity-50"
                                >
                                    <Send size={16} />
                                    {submitting ? "กำลังส่ง..." : "ส่งความคิดเห็น"}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            ) : (
                <div className="mb-8 p-5 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                    <p className="text-slate-600 dark:text-slate-400 mb-3">เข้าสู่ระบบเพื่อแสดงความคิดเห็น</p>
                    <Link
                        href="/login"
                        className="inline-block px-5 py-2 bg-teal-500 text-white rounded-xl font-bold text-sm hover:bg-teal-600 transition"
                    >
                        เข้าสู่ระบบ
                    </Link>
                </div>
            )}

            {/* Comments List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-8 text-slate-500">กำลังโหลดความคิดเห็น...</div>
                ) : topLevelComments.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <MessageCircle size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-slate-500 dark:text-slate-400">ยังไม่มีความคิดเห็น</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500">เป็นคนแรกที่แสดงความคิดเห็น!</p>
                    </div>
                ) : (
                    topLevelComments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            allComments={comments}
                            postId={postId}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

// ─── Main Export ─────────────────────────────────────────────────────
export default function BlogEngagement({
    postId,
    postTitle,
}: {
    postId: string;
    postTitle: string;
}) {
    return (
        <div className="max-w-3xl mx-auto mt-16 space-y-10">
            {/* Star Rating */}
            <StarRating postId={postId} postTitle={postTitle} />

            {/* Divider */}
            <div className="border-t border-slate-200 dark:border-slate-700" />

            {/* Comments */}
            <BlogComments postId={postId} />
        </div>
    );
}
