"use client";
import { useState } from "react";
import { useUserAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Mail, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
    const { resetPassword } = useUserAuth();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await resetPassword(email);
            setSuccess(true);
        } catch (err: any) {
            if (err.code === "auth/user-not-found") {
                setError("ไม่พบอีเมลนี้ในระบบ");
            } else if (err.code === "auth/invalid-email") {
                setError("รูปแบบอีเมลไม่ถูกต้อง");
            } else {
                setError("เกิดข้อผิดพลาด: " + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-cream p-4 font-sans">
            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white/50 p-8 md:p-12 relative z-10 animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-10">
                    <Link href="/login" className="inline-block mb-6 hover:scale-105 transition-transform">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center shadow-sm mx-auto text-slate-400 hover:bg-slate-200 transition">
                            ⬅️
                        </div>
                    </Link>
                    <h1 className="text-3xl font-black text-slate-800 mb-2">ลืมรหัสผ่าน? 🔑</h1>
                    <p className="text-slate-500">กรอกอีเมลเพื่อรับลิงก์ตั้งรหัสผ่านใหม่</p>
                </div>

                {success ? (
                    <div className="text-center animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">ส่งลิงก์เรียบร้อย!</h3>
                        <p className="text-slate-500 mb-8">
                            กรุณาตรวจสอบอีเมลของคุณ (รวมถึงในโฟลเดอร์ Junk/Spam) เพื่อตั้งรหัสผ่านใหม่
                        </p>
                        <Link href="/login" className="block w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all">
                            กลับไปหน้าเข้าสู่ระบบ
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-600 text-sm animate-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">อีเมลที่ลงทะเบียนไว้</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                    placeholder="example@email.com"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    ส่งลิงก์รีเซ็ตรหัสผ่าน <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
