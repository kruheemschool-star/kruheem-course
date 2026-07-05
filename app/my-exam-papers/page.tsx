"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useUserAuth } from "@/context/AuthContext";
import toast, { Toaster } from "react-hot-toast";
import { FileText, Download, Clock, Loader2, ShoppingBag, XCircle } from "lucide-react";

interface PaperEnrollment {
    id: string;
    paperId: string;
    title: string;
    status: "pending" | "approved" | "rejected" | "suspended";
    price: number;
}

export default function MyExamPapersPage() {
    const { user, loading: authLoading } = useUserAuth();
    const [items, setItems] = useState<PaperEnrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Read own enrollments (rules allow), then keep only PDF purchases.
            const snap = await getDocs(query(collection(db, "enrollments"), where("userId", "==", user.uid)));
            const rows: PaperEnrollment[] = snap.docs
                .map((d): Record<string, unknown> => ({ id: d.id, ...d.data() }))
                .filter((d) => d.productType === "examPaper" && d.paperId)
                .map((d) => ({
                    id: d.id as string,
                    paperId: d.paperId as string,
                    title: ((d.courseTitle as string) || "ข้อสอบ PDF").replace(/^ข้อสอบ PDF:\s*/, ""),
                    status: (d.status as PaperEnrollment["status"]) || "pending",
                    price: Number(d.price ?? 0),
                }));
            setItems(rows);
        } catch (e) {
            console.error(e);
            toast.error("โหลดรายการไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

    const download = async (paperId: string) => {
        if (!auth.currentUser) return;
        setDownloadingId(paperId);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch("/api/download-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ paperId }),
            });
            const data = await res.json();
            if (!res.ok || !data.url) {
                toast.error(data.error === "not purchased" ? "ยังไม่ได้รับสิทธิ์ดาวน์โหลด" : "ดาวน์โหลดไม่สำเร็จ");
                return;
            }
            window.location.href = data.url;
        } catch {
            toast.error("ดาวน์โหลดไม่สำเร็จ ลองใหม่อีกครั้ง");
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 bg-dot-pattern font-sans flex flex-col transition-colors">
            <Navbar />
            <Toaster position="top-center" />
            <div className="pt-24 flex-1">
                <div className="max-w-3xl mx-auto px-4 md:px-8 pb-16">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-1">ข้อสอบของฉัน</h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">ไฟล์ PDF ที่คุณซื้อ ดาวน์โหลดซ้ำได้ตลอด</p>

                    {authLoading || (loading && user) ? (
                        <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="animate-spin mr-2" size={20} /> กำลังโหลด...</div>
                    ) : !user ? (
                        <div className="text-center py-16">
                            <p className="text-slate-500 dark:text-slate-400 mb-4">กรุณาเข้าสู่ระบบเพื่อดูข้อสอบที่ซื้อไว้</p>
                            <Link href="/login?redirect=/my-exam-papers" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold px-5 py-2.5">เข้าสู่ระบบ</Link>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-16">
                            <ShoppingBag className="mx-auto mb-4 text-slate-300 dark:text-slate-600" size={44} />
                            <p className="text-slate-500 dark:text-slate-400 mb-4">คุณยังไม่ได้ซื้อข้อสอบ PDF</p>
                            <Link href="/exam-papers" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold px-5 py-2.5">ไปเลือกซื้อข้อสอบ</Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((it) => (
                                <div key={it.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                                    <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950 flex items-center justify-center shrink-0">
                                        <FileText size={20} className="text-teal-600 dark:text-teal-300" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{it.title}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">฿{it.price.toLocaleString()}</div>
                                    </div>
                                    {it.status === "approved" ? (
                                        <button onClick={() => download(it.paperId)} disabled={downloadingId === it.paperId} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold px-4 py-2 text-sm shrink-0">
                                            {downloadingId === it.paperId ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />} ดาวน์โหลด
                                        </button>
                                    ) : it.status === "rejected" ? (
                                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-500 shrink-0"><XCircle size={16} /> ไม่อนุมัติ</span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-500 shrink-0"><Clock size={16} /> รอครูอนุมัติ</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
}
