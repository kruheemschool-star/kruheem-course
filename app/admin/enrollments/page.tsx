"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where } from "firebase/firestore";
import Link from "next/link";


export default function AdminEnrollmentsPage() {
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // 2. ดึงข้อมูลใบแจ้งโอน (เฉพาะที่สถานะ pending)
    const fetchData = async () => {
        try {
            const q = query(
                collection(db, "enrollments"),
                where("status", "==", "pending"), // เอาแค่ที่รอตรวจ
                orderBy("createdAt", "desc")
            );
            const snapshot = await getDocs(q);

            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // จัดรูปแบบวันที่
                formattedDate: doc.data().createdAt?.toDate
                    ? doc.data().createdAt.toDate().toLocaleString('th-TH', {
                        day: 'numeric', month: 'short', year: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                    })
                    : '-'
            }));

            setEnrollments(data);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ฟังก์ชันอนุมัติ
    const handleApprove = async (id: string) => {
        if (!confirm("ยืนยันการอนุมัติ? ผู้เรียนจะเข้าเรียนได้ทันที")) return;
        try {
            await updateDoc(doc(db, "enrollments", id), {
                status: "approved"
            });
            alert("✅ อนุมัติเรียบร้อย!");
            fetchData(); // รีโหลดข้อมูล
        } catch (error) {
            console.error("Error:", error);
            alert("เกิดข้อผิดพลาด");
        }
    };

    // ฟังก์ชันปฏิเสธ/ลบ
    const handleDelete = async (id: string) => {
        if (!confirm("ยืนยันการลบรายการนี้? (กรณีสลิปปลอมหรือข้อมูลผิด)")) return;
        try {
            await deleteDoc(doc(db, "enrollments", id));
            fetchData();
        } catch (error) {
            console.error("Error:", error);
        }
    };

    return (

        <div className="min-h-screen bg-[#F8F9FD] font-sans text-slate-800 p-8">
            <div className="max-w-5xl mx-auto">

                <Link href="/admin" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 font-bold transition">
                    ← กลับหน้า Dashboard
                </Link>

                <div className="flex items-center gap-3 mb-8">
                    <span className="text-3xl">💰</span>
                    <h1 className="text-3xl font-black text-slate-800">ตรวจสอบการชำระเงิน <span className="text-base bg-orange-100 text-orange-600 px-3 py-1 rounded-full ml-2 align-middle">{enrollments.length} รายการ</span></h1>
                </div>

                {loading ? (
                    <div className="p-10 text-center text-slate-400">กำลังโหลดรายการ...</div>
                ) : (
                    <div className="space-y-6">
                        {enrollments.map((item) => (
                            <div key={item.id} className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-100 flex flex-col md:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4">

                                {/* 1. ส่วนแสดงสลิป (ซ้าย) */}
                                <div className="w-full md:w-1/3 bg-slate-100 rounded-3xl overflow-hidden border-4 border-white shadow-sm relative group cursor-pointer">
                                    <a href={item.slipUrl} target="_blank" rel="noreferrer">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={item.slipUrl} alt="Slip" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-bold">🔍 คลิกเพื่อดูรูปใหญ่</div>
                                    </a>
                                </div>

                                {/* 2. ข้อมูลการสมัคร (ขวา) */}
                                <div className="flex-1 flex flex-col justify-center">
                                    <div>
                                        <h2 className="text-2xl font-black text-indigo-900 mb-1">{item.courseTitle}</h2>
                                        <div className="text-3xl font-black text-slate-800 mb-4">฿{item.price?.toLocaleString()}</div>
                                        <span className="inline-block bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-xs font-bold mb-6">⏳ รอตรวจสอบสลิป</span>
                                    </div>

                                    {/* ข้อมูลผู้เรียน Grid */}
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-6">
                                        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase">ชื่อผู้เรียน</p>
                                                {/* ✅ ดึง userName จาก Enrollment โดยตรง */}
                                                <p className="font-bold text-slate-800 text-lg">{item.userName || "ไม่ระบุชื่อ"}</p>
                                                <p className="text-xs text-slate-400">{item.userEmail}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase">เบอร์โทรศัพท์</p>
                                                {/* ✅ ดึง userTel */}
                                                <p className="font-bold text-slate-800 text-lg">{item.userTel || "-"}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase">LINE ID</p>
                                                {/* ✅ ดึง lineId */}
                                                <div className="flex items-center gap-1 font-bold text-green-600">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 4.5V4.5z" /></svg>
                                                    {item.lineId || "-"}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase">วันที่แจ้งโอน</p>
                                                <p className="font-bold text-slate-700">{item.formattedDate}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ปุ่มจัดการ */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="flex-1 py-3 rounded-xl border-2 border-rose-100 text-rose-500 font-bold hover:bg-rose-50 transition flex items-center justify-center gap-2"
                                        >
                                            ✕ ปฏิเสธ / ลบ
                                        </button>
                                        <button
                                            onClick={() => handleApprove(item.id)}
                                            className="flex-[2] py-3 rounded-xl bg-[#00C853] hover:bg-[#00b54b] text-white font-bold shadow-lg shadow-green-200 transition flex items-center justify-center gap-2 transform hover:-translate-y-1"
                                        >
                                            ✅ อนุมัติให้เข้าเรียน
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {enrollments.length === 0 && (
                            <div className="text-center py-20 text-slate-400 italic bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                                ไม่มีรายการแจ้งโอนใหม่
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

    );
}