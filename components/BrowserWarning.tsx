"use client";
import { useState, useSyncExternalStore } from "react";
import { X, Smartphone, Copy, Check, ExternalLink } from "lucide-react";

type Platform = "ios" | "android" | "other";
type Detection = { isInApp: boolean; platform: Platform; appName: string };

const SERVER_SNAPSHOT: Detection = { isInApp: false, platform: "other", appName: "แอปนี้" };
let cachedDetection: Detection | null = null;

/** Detect the in-app browser once on the client; cache so the snapshot ref stays stable. */
function getDetection(): Detection {
    if (cachedDetection) return cachedDetection;
    const ua = navigator.userAgent || navigator.vendor || "";
    // Test aid: ?preview_warning=android | ios | 1 forces the banner to show on any
    // browser, so the look can be verified without opening inside Messenger/LINE.
    const preview = /[?&]preview_warning=(android|ios|1)/.exec(window.location.search)?.[1];
    const realApp =
        /Line/i.test(ua) ? "LINE"
        : /FBAN|FBAV/i.test(ua) ? "Messenger"
        : /FB_IAB/i.test(ua) ? "Facebook"
        : /Instagram/i.test(ua) ? "Instagram"
        : /Twitter/i.test(ua) ? "Twitter (X)"
        : /TikTok/i.test(ua) ? "TikTok"
        : null;
    cachedDetection = {
        isInApp: !!preview || /Line|FBAN|FBAV|FB_IAB|Instagram|Twitter|TikTok/i.test(ua),
        platform: preview === "android" ? "android"
            : preview === "ios" ? "ios"
            : /Android/i.test(ua) ? "android"
            : /iPhone|iPad|iPod/i.test(ua) ? "ios"
            : "other",
        appName: realApp ?? (preview ? "Messenger" : "แอปนี้"),
    };
    return cachedDetection;
}

const subscribe = () => () => {};
const getServerSnapshot = () => SERVER_SNAPSHOT;

/**
 * Shown when the page is opened inside an in-app browser (LINE / Messenger /
 * Facebook / Instagram / etc.) where Google login + some registration steps are
 * unreliable. Gives the user a one-tap escape:
 *  - Android: "เปิดใน Chrome" button → fires an intent:// that hands the URL to Chrome.
 *  - iOS: a "คัดลอกลิงก์" button + clear instructions (Apple blocks auto-opening Safari).
 * Plus a detailed how-to modal. Renders nothing in a normal browser.
 */
export default function BrowserWarning() {
    const { isInApp, platform, appName } = useSyncExternalStore(subscribe, getDetection, getServerSnapshot);
    const [showModal, setShowModal] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [copied, setCopied] = useState(false);

    // Android only: hand the current URL to Chrome via an intent URL.
    // If Chrome isn't installed, Android falls back to the normal https URL.
    const openInChrome = () => {
        const bare = window.location.href.replace(/^https?:\/\//, "");
        window.location.href =
            `intent://${bare}#Intent;scheme=https;package=com.android.chrome;` +
            `S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`;
    };

    const copyLink = async () => {
        const link = window.location.href;
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
        } catch {
            // Fallback for webviews without the Clipboard API
            const ta = document.createElement("textarea");
            ta.value = link;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            try { document.execCommand("copy"); setCopied(true); } catch { /* ignore */ }
            document.body.removeChild(ta);
        }
    };

    if (!isInApp || dismissed) return null;

    const browserName = platform === "ios" ? "Safari" : "Chrome";

    return (
        <>
            {/* Action banner */}
            <div className="mb-6 p-5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg animate-in slide-in-from-top-2 relative">
                <button
                    onClick={() => setDismissed(true)}
                    aria-label="ปิด"
                    className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-11 h-11 bg-white/25 rounded-full flex items-center justify-center">
                        <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 pr-5">
                        <h3 className="text-white font-bold text-lg leading-snug mb-1">
                            เปิดในเบราว์เซอร์เพื่อสมัครให้สำเร็จ 📲
                        </h3>
                        <p className="text-white/90 text-sm mb-4">
                            ตอนนี้เปิดจาก <strong>{appName}</strong> อยู่ — เพื่อให้สมัครและเข้าสู่ระบบได้ครบถ้วน
                            กรุณาเปิดหน้านี้ใน <strong>{browserName}</strong>
                        </p>

                        {platform === "android" && (
                            <button
                                onClick={openInChrome}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-orange-600 rounded-xl font-bold text-base shadow-md hover:bg-orange-50 transition mb-2"
                            >
                                <ExternalLink className="w-5 h-5" /> เปิดใน Chrome เลย
                            </button>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={copyLink}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/15 border border-white/40 text-white rounded-xl font-bold text-sm hover:bg-white/25 transition"
                            >
                                {copied
                                    ? <><Check className="w-4 h-4" /> คัดลอกลิงก์แล้ว!</>
                                    : <><Copy className="w-4 h-4" /> คัดลอกลิงก์</>}
                            </button>
                            <button
                                onClick={() => setShowModal(true)}
                                className="inline-flex items-center justify-center px-4 py-2.5 text-white font-bold text-sm underline underline-offset-2 hover:text-white/80 transition-colors"
                            >
                                ดูวิธีแบบละเอียด
                            </button>
                        </div>

                        {platform === "ios" && !copied && (
                            <p className="text-white/90 text-xs mt-3 leading-relaxed">
                                💡 คัดลอกลิงก์แล้วเปิด <strong>Safari</strong> → วางในช่องค้นหา<br />
                                หรือกดปุ่ม <strong>•••</strong> มุมขวาบน → <strong>&ldquo;เปิดในเบราว์เซอร์&rdquo;</strong>
                            </p>
                        )}
                        {copied && (
                            <p className="text-white text-xs mt-3 font-medium leading-relaxed">
                                ✅ คัดลอกแล้ว! เปิดแอป <strong>{browserName}</strong> แล้ววางลิงก์ในช่องค้นหาได้เลย
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Detailed how-to modal */}
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
                                        <span>กดปุ่ม <strong>•••</strong> หรือ <strong>⋯</strong> ที่มุมขวาบนของแอป {appName}</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                                        <span>เลือก <strong className="text-blue-600 dark:text-blue-400">&ldquo;เปิดในเบราว์เซอร์&rdquo;</strong> หรือ <strong className="text-blue-600 dark:text-blue-400">&ldquo;Open in Safari&rdquo;</strong></span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                                        <span>หน้าเว็บจะเปิดใน Safari และสมัครได้แล้ว! ✅</span>
                                    </li>
                                </ol>
                                <div className="mt-4 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                        💡 <strong>หรือ:</strong> กดปุ่ม &ldquo;คัดลอกลิงก์&rdquo; ด้านบน → เปิด Safari → วางลิงก์ในช่องค้นหา
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
                                        <span>กดปุ่ม <strong className="text-green-600 dark:text-green-400">&ldquo;เปิดใน Chrome เลย&rdquo;</strong> สีขาวด้านบน (กดครั้งเดียวเด้งเลย)</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                                        <span>ถ้าปุ่มไม่ทำงาน ให้กดปุ่ม <strong>⋮</strong> มุมขวาบน → <strong className="text-green-600 dark:text-green-400">&ldquo;เปิดในเบราว์เซอร์&rdquo;</strong></span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                                        <span>หน้าเว็บจะเปิดใน Chrome และสมัครได้แล้ว! ✅</span>
                                    </li>
                                </ol>
                            </div>

                            {/* Why? */}
                            <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-200 dark:border-amber-800">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                                    <span className="text-xl">🤔</span>
                                    ทำไมต้องเปิดด้วย Safari/Chrome?
                                </h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                    การเปิดจากในแอป เช่น LINE, Messenger, Facebook บางครั้งทำให้การสมัครและแนบสลิปไม่สมบูรณ์
                                    การเปิดด้วย<strong>เบราว์เซอร์มาตรฐาน</strong> (Safari, Chrome) จะทำให้ทุกขั้นตอนทำงานได้ครบถ้วนและปลอดภัย
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
