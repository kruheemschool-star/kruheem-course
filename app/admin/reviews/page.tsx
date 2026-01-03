"use client";

import AdminGuard from "@/components/AdminGuard";
import ReviewList from "@/app/reviews/ReviewList";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminReviewsPage() {
    return (
        <AdminGuard>
            <div className="min-h-screen bg-[#F0F7F4] font-sans pb-20">
                {/* Header */}
                <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-white/20 px-6 py-4 shadow-sm">
                    <div className="max-w-7xl mx-auto flex items-center gap-4">
                        <Link href="/admin" className="p-2 rounded-full hover:bg-slate-100 transition text-slate-500">
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                ⭐ จัดการรีวิว
                            </h1>
                            <p className="text-xs text-slate-500">ซ่อน หรือ ลบ รีวิวที่ไม่เหมาะสม</p>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto p-6 md:p-10">
                    <div className="mb-8 p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
                        <h2 className="text-lg font-bold text-slate-700 mb-2">คำแนะนำ</h2>
                        <ul className="list-disc list-inside text-sm text-slate-500 space-y-1">
                            <li>กดที่ปุ่ม <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-xs font-bold text-slate-600">👁️ ซ่อน</span> เพื่อซ่อนรีวิวไม่ให้ผู้ใช้อื่นเห็น (แต่ยังเก็บไว้ในระบบ)</li>
                            <li>กดที่ปุ่ม <span className="inline-flex items-center gap-1 bg-rose-100 px-2 py-0.5 rounded text-xs font-bold text-rose-600">🗑️ ลบ</span> เพื่อลบรีวิวถาวร (กู้คืนไม่ได้)</li>
                            <li>รีวิวที่ถูกซ่อน จะมีป้ายกำกับ "ซ่อนอยู่" แสดงให้แอดมินเห็น</li>
                        </ul>
                    </div>

                    <ReviewList adminView={true} />
                </main>
            </div>
        </AdminGuard>
    );
}
