"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import ReviewList from "./ReviewList";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ArrowLeft, Star, MessageCircle, Award } from "lucide-react";

export default function ReviewsPage() {
    const [stats, setStats] = useState({ avg: 0, total: 0, distribution: [0, 0, 0, 0, 0] });

    // Fetch review stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const snap = await getDocs(query(collection(db, "reviews"), orderBy("createdAt", "desc")));
                const reviews = snap.docs.map(d => d.data());
                const visibleReviews = reviews.filter(r => !r.isHidden);
                const total = visibleReviews.length;
                if (total === 0) return;

                const sum = visibleReviews.reduce((s, r) => s + (r.rating || 0), 0);
                const avg = sum / total;
                const dist = [0, 0, 0, 0, 0];
                visibleReviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
                setStats({ avg, total, distribution: dist });
            } catch (err) {
                console.error("Error fetching stats:", err);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans transition-colors">
            <Navbar />

            <main className="pt-24 pb-24 px-4 sm:px-6 relative overflow-hidden">
                {/* Background Elements */}
                <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-amber-50/60 via-teal-50/40 to-transparent dark:from-amber-900/5 dark:via-teal-900/5 dark:to-transparent pointer-events-none"></div>
                <div className="absolute top-[-100px] right-[-100px] w-[600px] h-[600px] bg-amber-200/15 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-[0] left-[-200px] w-[800px] h-[800px] bg-teal-200/15 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="max-w-6xl mx-auto relative z-10">

                    {/* Back Button */}
                    <div className="mb-6">
                        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors group">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            กลับหน้าแรก
                        </Link>
                    </div>

                    {/* Hero Header */}
                    <div className="text-center mb-12 space-y-5">
                        <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full px-4 py-1.5 text-sm font-bold text-amber-600 dark:text-amber-400">
                            <Star size={14} fill="currentColor" />
                            เสียงจากผู้เรียนจริง
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                            ความประทับใจจาก<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500">นักเรียนของครูฮีม</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                            ทุกรีวิวคือแรงบันดาลใจ ที่ทำให้เราพัฒนาบทเรียนให้ดียิ่งขึ้น
                        </p>
                    </div>

                    {/* Stats Cards */}
                    {stats.total > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-3xl mx-auto">
                            {/* Average Rating */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                                <div className="text-4xl font-black text-amber-500 mb-1">{stats.avg.toFixed(1)}</div>
                                <div className="flex justify-center gap-0.5 mb-2">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} size={14} className={s <= Math.round(stats.avg) ? "text-amber-400" : "text-slate-200 dark:text-slate-700"} fill={s <= Math.round(stats.avg) ? "currentColor" : "none"} />
                                    ))}
                                </div>
                                <p className="text-xs font-bold text-slate-400">คะแนนเฉลี่ย</p>
                            </div>

                            {/* Total Reviews */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                                <div className="text-4xl font-black text-teal-500 mb-1 flex items-center justify-center gap-2">
                                    <MessageCircle size={28} />
                                    {stats.total}
                                </div>
                                <p className="text-xs font-bold text-slate-400 mt-2">รีวิวทั้งหมด</p>
                            </div>

                            {/* Satisfaction */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                                <div className="text-4xl font-black text-emerald-500 mb-1 flex items-center justify-center gap-2">
                                    <Award size={28} />
                                    {stats.total > 0 ? Math.round(((stats.distribution[3] + stats.distribution[4]) / stats.total) * 100) : 0}%
                                </div>
                                <p className="text-xs font-bold text-slate-400 mt-2">ความพึงพอใจ (4-5 ดาว)</p>
                            </div>
                        </div>
                    )}

                    {/* Rating Distribution */}
                    {stats.total > 0 && (
                        <div className="max-w-md mx-auto mb-16 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                            {[5, 4, 3, 2, 1].map(star => {
                                const count = stats.distribution[star - 1];
                                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                                return (
                                    <div key={star} className="flex items-center gap-3 mb-2 last:mb-0">
                                        <span className="text-xs font-bold text-slate-500 w-4 text-right">{star}</span>
                                        <Star size={12} className="text-amber-400" fill="currentColor" />
                                        <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-xs font-bold text-slate-400 w-8">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Review List */}
                    <div className="mb-16">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span>💬</span> รีวิวล่าสุด
                            </h3>
                        </div>
                        <ReviewList />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
