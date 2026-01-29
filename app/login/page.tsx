"use client";
import { useState, Suspense } from "react";
import { useUserAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";

function LoginContent() {
    const { emailSignIn, googleSignIn } = useUserAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/';

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        setLoading(true);
        try {
            await emailSignIn(email, password);
            router.push(returnUrl);
        } catch (err: any) {
            console.error(err);
            if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
                setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
            } else if (err.code === "auth/invalid-email") {
                setError("รูปแบบอีเมลไม่ถูกต้อง");
            } else if (err.code === "auth/too-many-requests") {
                setError("พยายามเข้าสู่ระบบมากเกินไป โปรดลองใหม่ภายหลัง");
            } else {
                setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ: " + err.message);
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
        <div className="min-h-screen flex items-center justify-center bg-[#F5F2EB] p-4 font-sans">
            {/* Background Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-200/30 rounded-full blur-[100px] mix-blend-multiply"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-200/30 rounded-full blur-[100px] mix-blend-multiply"></div>
            </div>

            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white/50 p-8 md:p-12 relative z-10 animate-in fade-in zoom-in duration-500">


                {error && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-600 text-sm animate-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="mb-8 pt-0">
                    <div className="bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-100 rounded-3xl p-6 text-center shadow-sm">
                        <h3 className="text-slate-800 font-black text-xl mb-2">
                            ยังไม่มีบัญชีใช่ไหม? 😲
                        </h3>
                        <p className="text-slate-500 mb-6">
                            ต้อง <span className="text-indigo-600 font-bold">สมัครสมาชิก</span> ก่อนเริ่มเรียนนะครับ
                        </p>
                        <Link
                            href="/register"
                            className="block w-full py-4 bg-white border-2 border-indigo-600 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-2xl font-bold text-lg transition-all duration-300 shadow-sm hover:shadow-indigo-200 hover:-translate-y-1"
                        >
                            สมัครสมาชิกใหม่ที่นี่ 🚀
                        </Link>
                    </div>
                </div>

                <div className="text-center mb-10">
                    <Link href="/" className="inline-block mb-6 hover:scale-105 transition-transform">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
                                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </Link>
                    <h1 className="text-3xl font-black text-slate-800 mb-2">เข้าสู่ระบบ 🔑</h1>
                    <p className="text-slate-500">ยินดีต้อนรับกลับมา! พร้อมเรียนหรือยัง?</p>
                </div>

                {/* Google Sign-In Section */}
                <div className="mb-8">
                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full py-4 bg-white border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 text-slate-700 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-3 group shadow-sm hover:shadow-md hover:-translate-y-1"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        เข้าสู่ระบบด้วย Google
                    </button>
                </div>

                {/* Divider */}
                <div className="relative my-8 text-center">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white/80 backdrop-blur px-4 text-xs text-slate-500 font-medium rounded-full">
                            หรือเข้าสู่ระบบด้วยอีเมล
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
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-sm font-bold text-slate-700">รหัสผ่าน</label>
                            <Link href="/forgot-password" className="text-xs text-indigo-600 hover:underline font-medium">
                                ลืมรหัสผ่าน?
                            </Link>
                        </div>
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                เข้าสู่ระบบ <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>


            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F5F2EB] text-slate-500">กำลังโหลด...</div>}>
            <LoginContent />
        </Suspense>
    );
}
