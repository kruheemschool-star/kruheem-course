"use client";
import Link from "next/link";
import { Facebook, Mail, Instagram, Sparkles } from "lucide-react";

export default function Footer() {
    return (
        <footer className="relative mt-20 bg-white/40 backdrop-blur-2xl border-t border-white/40 overflow-hidden font-sans">
            {/* Pastel Background Blobs - iOS 18 Glass Style */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[150%] bg-amber-100/40 blur-[100px] rounded-full mix-blend-multiply opacity-60"></div>
                <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[150%] bg-orange-100/40 blur-[100px] rounded-full mix-blend-multiply opacity-60"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-16">
                <div className="grid md:grid-cols-4 gap-12">

                    {/* Brand Section */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="relative group cursor-default">
                                {/* Main Logo with Heartbeat Animation */}
                                <div className="w-14 h-14 group-hover:scale-110 transition-transform duration-500 relative z-10 animate-heartbeat">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="/footer-logo.png" alt="KruHeem Icon" className="w-full h-full object-contain drop-shadow-md rounded-2xl" />
                                </div>
                            </div>
                            <style jsx>{`
                                @keyframes heartbeat {
                                    0% { transform: scale(1); }
                                    14% { transform: scale(1.1); }
                                    28% { transform: scale(1); }
                                    42% { transform: scale(1.1); }
                                    70% { transform: scale(1); }
                                }
                                .animate-heartbeat {
                                    animation: heartbeat 2s infinite;
                                }
                            `}</style>
                            <div>
                                <h3 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-600 tracking-tight">
                                    KruHeem School
                                </h3>
                                <p className="text-xs text-slate-500 font-bold tracking-wider uppercase">Mathematics Online School</p>
                            </div>
                        </div>
                        <p className="text-slate-600 leading-relaxed max-w-md font-medium">
                            เปลี่ยนความกังวลเรื่องการเรียนของลูก <br />
                            ให้เป็นความมั่นใจเต็ม 100%
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-bold text-slate-800 mb-6 text-lg">เมนูลัด</h4>
                        <ul className="space-y-4">
                            <li>
                                <Link href="/" className="text-slate-500 hover:text-amber-600 transition-all flex items-center gap-2 group font-medium">
                                    <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-amber-500 transition-colors"></span>
                                    หน้าแรก
                                </Link>
                            </li>
                            <li>
                                <Link href="/#courses" className="text-slate-500 hover:text-amber-600 transition-all flex items-center gap-2 group font-medium">
                                    <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-amber-500 transition-colors"></span>
                                    คอร์สเรียนทั้งหมด
                                </Link>
                            </li>
                            <li>
                                <Link href="/payment" className="text-slate-500 hover:text-amber-600 transition-all flex items-center gap-2 group font-medium">
                                    <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-amber-500 transition-colors"></span>
                                    แจ้งชำระเงิน
                                </Link>
                            </li>
                            <li>
                                <Link href="/my-courses" className="text-slate-500 hover:text-amber-600 transition-all flex items-center gap-2 group font-medium">
                                    <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-amber-500 transition-colors"></span>
                                    คอร์สของฉัน
                                </Link>
                            </li>
                            <li>
                                <Link href="/faq" className="text-slate-500 hover:text-amber-600 transition-all flex items-center gap-2 group font-medium">
                                    <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-amber-500 transition-colors"></span>
                                    คำถามที่พบบ่อย
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-bold text-slate-800 mb-6 text-lg">ติดต่อเรา</h4>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <li>
                                <a href="https://www.facebook.com/kruheem.math/" target="_blank" rel="noreferrer" className="flex items-center gap-4 text-slate-500 hover:text-blue-600 transition-all group p-2 hover:bg-white/40 rounded-xl -ml-2">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Facebook size={18} strokeWidth={2.5} />
                                    </div>
                                    <span className="font-medium">Facebook</span>
                                </a>
                            </li>
                            <li>
                                <a href="https://line.me/ti/p/~kruheemschool" target="_blank" rel="noreferrer" className="flex items-center gap-4 text-slate-500 hover:text-green-600 transition-all group p-2 hover:bg-white/40 rounded-xl -ml-2">
                                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                                        </svg>
                                    </div>
                                    <span className="font-medium">LINE</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" target="_blank" rel="noreferrer" className="flex items-center gap-4 text-slate-500 hover:text-pink-600 transition-all group p-2 hover:bg-white/40 rounded-xl -ml-2">
                                    <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Instagram size={18} strokeWidth={2.5} />
                                    </div>
                                    <span className="font-medium">Instagram</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" target="_blank" rel="noreferrer" className="flex items-center gap-4 text-slate-500 hover:text-slate-900 transition-all group p-2 hover:bg-white/40 rounded-xl -ml-2">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                        </svg>
                                    </div>
                                    <span className="font-medium">TikTok</span>
                                </a>
                            </li>
                            <li>
                                <a href="mailto:kruheemschool@gmail.com" className="flex items-center gap-4 text-slate-500 hover:text-red-500 transition-all group p-2 hover:bg-white/40 rounded-xl -ml-2">
                                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Mail size={18} strokeWidth={2.5} />
                                    </div>
                                    <span className="font-medium">Email</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-16 pt-8 border-t border-white/40 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-slate-400 text-sm font-medium">
                        &copy; {new Date().getFullYear()} KruHeem School. All rights reserved.
                    </p>
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-white/40 flex items-center justify-center text-slate-400 hover:bg-white/60 hover:text-slate-600 transition cursor-pointer">
                            <span className="text-xs font-bold">TH</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
