"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useUserAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Mail, Lock, AlertCircle, ArrowRight, Play, ArrowLeft } from "lucide-react";
import BrowserWarning from "@/components/BrowserWarning";

function RegisterContent() {
    const { emailSignUp } = useUserAuth();
    const searchParams = useSearchParams();
    // Where to go after signing up. Came from a "buy course" click? keep that exact
    // /payment target; otherwise still nudge to /payment (the แจ้งโอน hand-off).
    const rawReturn = searchParams.get('returnUrl') || '/';
    // Only allow same-site relative paths — block open-redirect (//evil.com, https://…).
    const returnUrl = rawReturn.startsWith('/') && !rawReturn.startsWith('//') ? rawReturn : '/';
    const fromBuy = returnUrl.startsWith('/payment');
    const payDest = fromBuy ? returnUrl : '/payment';
    const loginHref = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState<null | { email: string; password: string }>(null);

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
            setDone({ email, password }); // show the success summary + แจ้งโอน hand-off
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

    // ✅ Success — summarise the new login, then hand off straight to the แจ้งโอน flow
    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-cream p-4 font-sans">
                {/* Background Blobs */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-200/30 rounded-full blur-[100px] mix-blend-multiply"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-200/30 rounded-full blur-[100px] mix-blend-multiply"></div>
                </div>

                <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white/50 p-8 md:p-12 relative z-10 animate-in fade-in zoom-in duration-500 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-5xl mb-5">🎉</div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">สมัครสมาชิกสำเร็จ!</h1>
                    <p className="text-slate-500 mb-6 leading-relaxed">ยินดีต้อนรับสู่ KruHeem 🎊<br />เก็บข้อมูลเข้าสู่ระบบไว้นะครับ</p>

                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-left space-y-4 mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                <Mail size={18} className="text-indigo-500" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs text-slate-400 font-bold">อีเมล</div>
                                <div className="font-bold text-slate-700 break-all">{done.email}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                <Lock size={18} className="text-indigo-500" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs text-slate-400 font-bold">รหัสผ่าน</div>
                                <div className="font-bold text-slate-700 break-all">{done.password}</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 mb-6 text-left">
                        <span className="text-base leading-none mt-0.5">📌</span>
                        <p className="text-xs text-amber-700 leading-relaxed">
                            ขั้นต่อไป: <strong>แจ้งโอนเงินค่าคอร์ส</strong> เพื่อให้ครูเปิดสิทธิ์เข้าเรียนให้นะครับ
                        </p>
                    </div>

                    <Link
                        href={payDest}
                        className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300"
                    >
                        ไปแจ้งโอนเงิน <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link href="/my-courses" className="inline-block mt-4 text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors">
                        ไว้ทีหลัง — เข้าหน้าเรียนของฉัน
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-cream p-4 font-sans">
            {/* Background Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-200/30 rounded-full blur-[100px] mix-blend-multiply"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-200/30 rounded-full blur-[100px] mix-blend-multiply"></div>
            </div>

            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white/50 p-8 md:p-12 relative z-10 animate-in fade-in zoom-in duration-500">
                <div className="mb-4">
                    <Link href={loginHref} className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors group">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        กลับเข้าสู่ระบบ
                    </Link>
                </div>
                {fromBuy && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center animate-in fade-in slide-in-from-top-2">
                        <p className="font-bold text-amber-800">🛒 ก่อนซื้อคอร์ส ต้องมีบัญชีก่อนนะครับ</p>
                        <p className="text-sm text-amber-700/80 mt-1">สมัครเสร็จ เราจะพากลับไปหน้าชำระเงินให้ทันที</p>
                    </div>
                )}
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

                <BrowserWarning />

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">อีเมล</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="email"
                                required
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                autoComplete="email"
                                inputMode="email"
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
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                autoComplete="new-password"
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
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                autoComplete="new-password"
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
