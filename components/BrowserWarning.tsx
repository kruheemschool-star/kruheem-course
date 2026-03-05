"use client";
import { useState, useEffect } from "react";
import { AlertTriangle, X, ExternalLink, Smartphone } from "lucide-react";

export default function BrowserWarning() {
    const [isInAppBrowser, setIsInAppBrowser] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        
        const isLineApp = /Line/i.test(userAgent);
        const isMessenger = /FBAN|FBAV/i.test(userAgent);
        const isFacebook = /FB_IAB|FBAN/i.test(userAgent);
        const isInstagram = /Instagram/i.test(userAgent);
        const isTwitter = /Twitter/i.test(userAgent);
        const isTikTok = /TikTok/i.test(userAgent);
        
        const inApp = isLineApp || isMessenger || isFacebook || isInstagram || isTwitter || isTikTok;
        setIsInAppBrowser(inApp);
    }, []);

    const handleDismiss = () => {
        setDismissed(true);
    };

    const getBrowserName = () => {
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        if (/Line/i.test(userAgent)) return "LINE";
        if (/FBAN|FBAV/i.test(userAgent)) return "Messenger";
        if (/FB_IAB|FBAN/i.test(userAgent)) return "Facebook";
        if (/Instagram/i.test(userAgent)) return "Instagram";
        if (/Twitter/i.test(userAgent)) return "Twitter";
        if (/TikTok/i.test(userAgent)) return "TikTok";
        return "แอปนี้";
    };

    if (!isInAppBrowser || dismissed) return null;

    return (
        <>
            {/* Warning Banner */}
            <div className="mb-6 p-4 bg-gradient-to-r from-rose-500 to-red-600 border-2 border-red-700 rounded-2xl shadow-lg animate-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                        <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-bold text-lg mb-1">
                            ⚠️ ไม่สามารถลงทะเบียนได้จาก {getBrowserName()}
                        </h3>
                        <p className="text-white/90 text-sm mb-3">
                            เพื่อความปลอดภัย กรุณาเปิดลิงก์นี้ใน <span className="font-bold underline">Safari</span> หรือ <span className="font-bold underline">Chrome</span> แทน
                        </p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 transition-colors shadow-md"
                        >
                            <Smartphone className="w-4 h-4" />
                            ดูวิธีเปิดด้วย Safari/Chrome
                        </button>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in slide-in-from-bottom-4">
                        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                                📱 วิธีเปิดด้วย Safari/Chrome
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* iOS Safari */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
                                        <span className="text-2xl">🍎</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">iPhone (iOS)</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">เปิดด้วย Safari</p>
                                    </div>
                                </div>
                                <ol className="space-y-3 text-slate-700 dark:text-slate-300">
                                    <li className="flex gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                                        <span><strong>กดค้าง</strong>ที่ลิงก์ในแอป {getBrowserName()}</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                                        <span>เลือก <strong className="text-blue-600 dark:text-blue-400">"เปิดใน Safari"</strong> หรือ <strong className="text-blue-600 dark:text-blue-400">"Open in Safari"</strong></span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                                        <span>หน้าเว็บจะเปิดใน Safari และสามารถลงทะเบียนได้แล้ว! ✅</span>
                                    </li>
                                </ol>
                                <div className="mt-4 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                        💡 <strong>ทางเลือก:</strong> คัดลอกลิงก์ → เปิด Safari → วางลิงก์ในช่องค้นหา
                                    </p>
                                </div>
                            </div>

                            {/* Android Chrome */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl border border-green-100 dark:border-green-800">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center">
                                        <span className="text-2xl">🤖</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Android</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">เปิดด้วย Chrome</p>
                                    </div>
                                </div>
                                <ol className="space-y-3 text-slate-700 dark:text-slate-300">
                                    <li className="flex gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                                        <span><strong>กดค้าง</strong>ที่ลิงก์ในแอป {getBrowserName()}</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                                        <span>เลือก <strong className="text-green-600 dark:text-green-400">"เปิดใน Chrome"</strong> หรือ <strong className="text-green-600 dark:text-green-400">"Open in Chrome"</strong></span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                                        <span>หน้าเว็บจะเปิดใน Chrome และสามารถลงทะเบียนได้แล้ว! ✅</span>
                                    </li>
                                </ol>
                                <div className="mt-4 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                        💡 <strong>ทางเลือก:</strong> กดปุ่ม ⋮ (มุมบนขวา) → "เปิดในเบราว์เซอร์ภายนอก"
                                    </p>
                                </div>
                            </div>

                            {/* Why? */}
                            <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-200 dark:border-amber-800">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                                    <span className="text-xl">🤔</span>
                                    ทำไมต้องเปิดด้วย Safari/Chrome?
                                </h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                    เพื่อความปลอดภัยของบัญชีคุณ ระบบ Google Sign-In และการลงทะเบียนจะทำงานได้เฉพาะใน<strong>เบราว์เซอร์มาตรฐาน</strong>เท่านั้น (Safari, Chrome, Firefox) 
                                    และไม่รองรับการเปิดจากภายในแอปอื่นๆ เช่น LINE, Messenger, Facebook
                                </p>
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-bold shadow-lg transition-all"
                            >
                                เข้าใจแล้ว
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
