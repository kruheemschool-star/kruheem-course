"use client";
import { useState, Suspense } from "react";
import { useUserAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, AlertCircle, ArrowRight, Play, ArrowLeft } from "lucide-react";

function RegisterContent() {
    const { emailSignUp, googleSignIn } = useUserAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/';

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("รหัสผ่านไม่ตรงกัน");
            return;
        }

        if (password.length < 6) {
            setError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
            return;
        }

        setLoading(true);
        try {
            await emailSignUp(email, password);
            router.push(returnUrl); // Redirect to returnUrl or home
        } catch (err: any) {
            console.error(err);
            if (err.code === "auth/email-already-in-use") {
                setError("อีเมลนี้ถูกใช้งานแล้ว");
            } else if (err.code === "auth/invalid-email") {
                setError("รูปแบบอีเมลไม่ถูกต้อง");
            } else if (err.code === "auth/weak-password") {
                setError("รหัสผ่านง่ายเกินไป");
            } else {
                setError("เกิดข้อผิดพลาดในการสมัครสมาชิก: " + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            await googleSignIn();
            router.push(returnUrl);
        } catch (err: any) {
            setError("Google Sign In Failed: " + err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-cream p-4 font-sans">
            {/* Background Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-200/30 rounded-full blur-[100px] mix-blend-multiply"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-200/30 rounded-full blur-[100px] mix-blend-multiply"></div>
            </div>

            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white/50 p-8 md:p-12 relative z-10 animate-in fade-in zoom-in duration-500">
                <div className="mb-4">
                    <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors group">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        กลับเข้าสู่ระบบ
                    </Link>
                </div>
                <div className="text-center mb-10">
                    <Link href="/" className="inline-block mb-6 hover:scale-105 transition-transform">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mx-auto">
                            <Play className="w-8 h-8 text-white" fill="currentColor" />
                        </div>
                    </Link>
                    <h1 className="text-3xl font-black text-slate-800 mb-2">สร้างบัญชีใหม่ 🚀</h1>
                    <p className="text-slate-500">เริ่มต้นการเรียนรู้กับ KruHeem</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-600 text-sm animate-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Google Sign-Up Section (Top Priority) */}
                <div className="mb-8">
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 mb-4 text-center animate-in fade-in slide-in-from-top-4">
                        <p className="text-indigo-900 text-sm font-bold">
                            ✨ วิธีการสมัครที่สะดวกที่สุด
                        </p>
                        <p className="text-indigo-600 text-xs mt-1">
                            คือการสมัครผ่านทาง Google (ถ้ามี Gmail)
                        </p>
                    </div>

                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full py-4 bg-white border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 text-slate-700 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-3 group shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-[0.98]"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Sign up with Google" className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        สมัครด้วย Google
                    </button>
                </div>

                {/* Divider */}
                <div className="relative my-8 text-center">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white/80 backdrop-blur px-4 text-xs text-slate-500 font-medium rounded-full">
                            ถ้าไม่มี Gmail สามารถสมัครได้จากข้างล่าง
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">อีเมล</label>
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

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">รหัสผ่าน</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">ยืนยันรหัสผ่าน</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                placeholder="••••••••"
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
                                สมัครสมาชิก <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-8 text-center text-slate-500 text-sm">
                    มีบัญชีอยู่แล้ว?{" "}
                    <Link href="/login" className="text-indigo-600 font-bold hover:underline">
                        เข้าสู่ระบบ
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-cream text-slate-500">กำลังโหลด...</div>}>
            <RegisterContent />
        </Suspense>
    );
}
