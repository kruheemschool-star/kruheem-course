"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, serverTimestamp } from 'firebase/firestore';
import { useUserAuth } from '@/context/AuthContext';
import { MessageCircle, Send, User } from 'lucide-react';

interface Comment {
    id: string;
    summaryId: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
    createdAt: Timestamp;
}

interface CommentSectionProps {
    summaryId: string;
}

export default function CommentSection({ summaryId }: CommentSectionProps) {
    const { user } = useUserAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Listen for comments in real-time
    useEffect(() => {
        if (!summaryId) return;

        const q = query(
            collection(db, 'comments'),
            where('summaryId', '==', summaryId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const commentData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Comment[];
            setComments(commentData);
            setIsLoading(false);
        }, (error) => {
            console.error('Error fetching comments:', error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [summaryId]);

    // Submit new comment
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newComment.trim()) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'comments'), {
                summaryId,
                userId: user.uid,
                userName: user.displayName || user.email?.split('@')[0] || 'ผู้ใช้',
                userAvatar: user.photoURL || '',
                content: newComment.trim(),
                createdAt: serverTimestamp(),
            });
            setNewComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
            alert('ไม่สามารถส่งความคิดเห็นได้ กรุณาลองใหม่');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format timestamp
    const formatTime = (timestamp: Timestamp | null) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            if (hours === 0) {
                const minutes = Math.floor(diff / (1000 * 60));
                return minutes <= 1 ? 'เมื่อสักครู่' : `${minutes} นาทีที่แล้ว`;
            }
            return `${hours} ชั่วโมงที่แล้ว`;
        }
        if (days === 1) return 'เมื่อวาน';
        if (days < 7) return `${days} วันที่แล้ว`;
        return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="mt-12 border-t border-slate-200 dark:border-slate-700 pt-8">
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
                                placeholder="เขียนความคิดเห็น..."
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-500 resize-none"
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !newComment.trim()}
                                    className="flex items-center gap-2 px-5 py-2 bg-slate-800 dark:bg-slate-600 hover:bg-slate-900 dark:hover:bg-slate-500 text-white rounded-xl font-bold text-sm transition disabled:opacity-50"
                                >
                                    <Send size={16} />
                                    {isSubmitting ? 'กำลังส่ง...' : 'ส่งความคิดเห็น'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            ) : (
                <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                    <p className="text-slate-600 dark:text-slate-400 mb-2">กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น</p>
                    <a
                        href="/login"
                        className="inline-block px-5 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-900 transition"
                    >
                        เข้าสู่ระบบ
                    </a>
                </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-8 text-slate-500">กำลังโหลดความคิดเห็น...</div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <MessageCircle size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-slate-500 dark:text-slate-400">ยังไม่มีความคิดเห็น</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500">เป็นคนแรกที่แสดงความคิดเห็น!</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div
                            key={comment.id}
                            className="flex gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700"
                        >
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                {comment.userAvatar ? (
                                    <img src={comment.userAvatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={20} className="text-slate-500 dark:text-slate-400" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{comment.userName}</span>
                                    <span className="text-xs text-slate-400">{formatTime(comment.createdAt)}</span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{comment.content}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
