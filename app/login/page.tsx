"use client";
import { useState, Suspense } from "react";
import { useUserAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, AlertCircle, ArrowRight, ChevronDown, Play } from "lucide-react";

function LoginContent() {
    const { emailSignIn, googleSignIn } = useUserAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/';

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);

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
        <div className="min-h-screen flex items-center justify-center bg-cream dark:bg-slate-950 p-4 font-sans transition-colors">
            {/* Background Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-200/30 dark:bg-purple-900/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-normal"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-200/30 dark:bg-indigo-900/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-normal"></div>
            </div>

            <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white/50 dark:border-slate-700 p-8 md:p-12 relative z-10 animate-in fade-in zoom-in duration-500">

                {error && (
                    <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-start gap-3 text-rose-600 dark:text-rose-400 text-sm animate-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="mb-8 pt-0">
                    <div className={`bg-white dark:bg-slate-800 border-2 ${isSignUpOpen ? 'border-indigo-400 dark:border-indigo-500 ring-4 ring-indigo-50/50 dark:ring-indigo-900/30' : 'border-slate-100 dark:border-slate-700'} rounded-3xl overflow-hidden shadow-sm transition-all duration-500`}>
                        <button
                            onClick={() => setIsSignUpOpen(!isSignUpOpen)}
                            className="w-full p-5 text-center flex flex-col items-center justify-center cursor-pointer outline-none hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group active:scale-[0.98]"
                        >
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <span className="bg-indigo-100/50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 p-2 rounded-full group-hover:scale-110 transition-transform duration-300">
                                    <ChevronDown
                                        className={`w-5 h-5 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isSignUpOpen ? 'rotate-180' : ''}`}
                                    />
                                </span>
                                <h3 className="text-slate-800 dark:text-slate-100 font-bold text-lg">
                                    ยังไม่มีบัญชีใช่ไหม? <span className="text-xl">😲</span>
                                </h3>
                            </div>
                            <p className={`text-slate-500 dark:text-slate-400 text-sm transition-all duration-500 ${isSignUpOpen ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
                                กดเพื่อ <span className="text-indigo-600 dark:text-indigo-400 font-bold underline decoration-indigo-200 dark:decoration-indigo-700 underline-offset-2">สมัครสมาชิก</span> ก่อนเริ่มเรียนนะครับ
                            </p>
                        </button>

                        <div
                            className={`grid transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isSignUpOpen ? 'grid-rows-[1fr] opacity-100 pb-6' : 'grid-rows-[0fr] opacity-0'
                                }`}
                        >
                            <div className="overflow-hidden px-6">
                                <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-4 animate-in fade-in slide-in-from-top-2 duration-500">
                                    การสมัครสมาชิกจะช่วยให้คุณเข้าถึงบทเรียนและติดตามความคืบหน้าได้ครับ
                                </p>
                                <Link
                                    href="/register"
                                    className="relative block w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-lg text-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 hover:shadow-indigo-300 dark:hover:shadow-indigo-800/50 transform hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 group overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        สมัครสมาชิกใหม่ที่นี่ <span className="text-2xl group-hover:animate-bounce">🚀</span>
                                    </span>
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-xl"></div>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center mb-10">
                    <Link href="/" className="inline-block mb-6 hover:scale-105 transition-transform">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 mx-auto">
                            <Play className="w-8 h-8 text-white" fill="currentColor" />
                        </div>
                    </Link>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-2">เข้าสู่ระบบ 🔑</h1>
                    <p className="text-slate-500 dark:text-slate-400">ยินดีต้อนรับกลับมา! พร้อมเรียนหรือยัง?</p>
                </div>

                {/* Google Sign-In Section */}
                <div className="mb-8">
                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-3 group shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-[0.98]"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Sign in with Google" className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        เข้าสู่ระบบด้วย Google
                    </button>
                </div>

                {/* Divider */}
                <div className="relative my-8 text-center">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white/80 dark:bg-slate-900/90 backdrop-blur px-4 text-xs text-slate-500 dark:text-slate-400 font-medium rounded-full">
                            หรือเข้าสู่ระบบด้วยอีเมล
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">อีเมล</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                placeholder="example@email.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">รหัสผ่าน</label>
                            <Link href="/forgot-password" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                                ลืมรหัสผ่าน?
                            </Link>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 hover:shadow-indigo-300 transform hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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

                <p className="mt-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                    ยังไม่มีบัญชี?{" "}
                    <Link href="/register" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                        สมัครสมาชิก
                    </Link>
                </p>

            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-cream text-slate-500">กำลังโหลด...</div>}>
            <LoginContent />
        </Suspense>
    );
}
