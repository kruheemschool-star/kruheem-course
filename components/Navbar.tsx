"use client";

import Link from "next/link";
import { useUserAuth } from "@/context/AuthContext";
import {
    LogIn,
    LogOut,
    CreditCard,
    Settings,
    BookOpen,
    Calculator,
    Sparkles,
    Plus,
    Minus,
    X,
    Divide,
    HelpCircle,
    Target,
    Menu,
    UserPlus,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ModeToggle } from "@/components/ModeToggle";

export default function Navbar() {
    const { user, userProfile, isAdmin, logOut, googleSignIn } = useUserAuth();
    const router = useRouter();
    const [pendingCount, setPendingCount] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!isAdmin) return;

        const q = query(collection(db, "enrollments"), where("status", "==", "pending"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPendingCount(snapshot.size);
        });

        return () => {
            unsubscribe();
        };
    }, [isAdmin]);

    const handleLogin = () => {
        router.push("/login");
    };

    const handlePaymentClick = () => {
        if (user) {
            router.push("/payment");
        } else {
            handleLogin();
        }
    };

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/60 dark:bg-slate-950/80 backdrop-blur-xl border-b border-white/40 dark:border-slate-800 py-4 px-6 md:px-12 flex justify-between items-center transition-all">
                <Link href="/" className="flex items-center gap-3 group">
                    {/* Logo: Math Teacher Concept */}
                    <div className="relative w-12 h-12 group-hover:scale-110 transition-transform duration-300 animate-heartbeat">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="KruHeem Logo" className="w-full h-full object-contain drop-shadow-md rounded-xl" />
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

                    <div className="flex flex-col">
                        <span className="text-slate-800 dark:text-slate-100 font-black text-lg leading-none tracking-tight group-hover:text-amber-600 transition-colors">KruHeem</span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-bold tracking-wider">MATH SCHOOL</span>
                    </div>
                </Link>

                <div className="flex items-center gap-1 xl:gap-2">
                    {/* Hamburger Menu Button - Mobile Only */}
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="เปิดเมนู"
                    >
                        <Menu size={24} />
                    </button>

                    <ModeToggle />
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden lg:block mx-1"></div>
                    <div className="hidden lg:flex items-center gap-1">
                        <Link href="/reviews" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-teal-50 dark:hover:bg-teal-900/20">
                            <Sparkles size={16} />
                            <span>รีวิว</span>
                        </Link>

                        <Link href="/exam" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-amber-50 dark:hover:bg-amber-900/20">
                            <BookOpen size={16} />
                            <span>คลังข้อสอบ</span>
                        </Link>

                        <Link href="/summary" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-teal-50 dark:hover:bg-teal-900/20">
                            <BookOpen size={16} />
                            <span>สรุปเนื้อหา</span>
                        </Link>

                        <Link href="/how-to-apply" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-teal-50 dark:hover:bg-teal-900/20">
                            <HelpCircle size={16} />
                            <span>วิธีสมัคร</span>
                        </Link>

                        <Link href="/login" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                            <UserPlus size={16} />
                            <span>สมัครสมาชิก</span>
                        </Link>
                    </div>

                    <button
                        onClick={handlePaymentClick}
                        className="hidden lg:flex items-center gap-1.5 px-4 py-1.5 rounded-full font-semibold text-sm text-slate-700 dark:text-slate-200 bg-white/40 dark:bg-slate-800/40 border border-white/60 dark:border-slate-700 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:border-white transition-all duration-300 hover:text-amber-700 dark:hover:text-amber-400 active:scale-95 hover:-translate-y-0.5"
                    >
                        <CreditCard size={16} />
                        <span>แจ้งโอน</span>
                    </button>

                    {user ? (
                        <div className="flex items-center gap-2">
                            {/* User Profile Badge */}
                            <div className="hidden xl:flex items-center gap-2 pl-1 pr-3 py-1 bg-white/50 border border-white/60 rounded-full backdrop-blur-sm hover:-translate-y-0.5 transition-transform duration-300">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs shadow-sm overflow-hidden">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs shadow-sm overflow-hidden">
                                        {userProfile?.avatar || user.photoURL ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={userProfile?.avatar || user.photoURL || ''}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span>{user.displayName ? user.displayName[0].toUpperCase() : user.email?.[0].toUpperCase()}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col leading-none">
                                    <span className="text-xs font-bold text-slate-800 max-w-[80px] truncate mb-0.5">
                                        {userProfile?.displayName || user.displayName || "นักเรียน"}
                                    </span>
                                    <span className="text-[10px] font-medium text-slate-500 max-w-[80px] truncate">
                                        {user.email}
                                    </span>
                                </div>
                            </div>

                            {isAdmin && (
                                <Link href="/admin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs text-slate-600 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 transition-all hover:-translate-y-0.5 relative" title="ระบบจัดการ (Admin)">
                                    <Settings size={16} />
                                    <span className="hidden xl:inline">Admin</span>
                                    {pendingCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                                            {pendingCount}
                                        </span>
                                    )}
                                </Link>
                            )}

                            <Link href="/my-courses" className="hidden lg:flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-xs text-emerald-800 bg-[#D9E9CF] hover:bg-[#C8DDBB] transition-all duration-300 active:scale-95 shadow-sm hover:-translate-y-0.5">
                                <BookOpen size={16} />
                                <span>คอร์สของฉัน</span>
                            </Link>

                            <button onClick={logOut} className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all hover:-translate-y-0.5" title="ออกจากระบบ">
                                <LogOut size={16} />
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleLogin} className="flex items-center gap-1.5 px-5 py-2 rounded-full font-bold text-xs text-white bg-indigo-500 shadow-md shadow-indigo-200 transition-all duration-300 hover:bg-indigo-600 hover:scale-105 active:scale-95">
                            <LogIn size={16} />
                            <span className="hidden sm:inline">เข้าสู่ระบบ</span>
                            <span className="sm:hidden">Login</span>
                        </button>
                    )}
                </div>
            </nav>

            {/* Mobile Navigation Drawer */}
            <div
                className={`fixed inset-0 z-[60] lg:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            >
                {/* Overlay */}
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={() => setMobileMenuOpen(false)}
                />

                {/* Drawer Panel */}
                <div
                    className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                        <span className="text-lg font-bold text-slate-800 dark:text-slate-100">เมนู</span>
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label="ปิดเมนู"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Menu Items */}
                    <nav className="p-4 flex flex-col gap-1">
                        <Link
                            href="/reviews"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-medium"
                        >
                            <Sparkles size={20} />
                            <span>รีวิว</span>
                        </Link>

                        <Link
                            href="/exam"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 transition-colors font-medium"
                        >
                            <BookOpen size={20} />
                            <span>คลังข้อสอบ</span>
                        </Link>

                        <Link
                            href="/summary"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-medium"
                        >
                            <BookOpen size={20} />
                            <span>สรุปเนื้อหา</span>
                        </Link>

                        <Link
                            href="/how-to-apply"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-medium"
                        >
                            <HelpCircle size={20} />
                            <span>วิธีสมัคร</span>
                        </Link>

                        <Link
                            href="/login"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
                        >
                            <UserPlus size={20} />
                            <span>สมัครสมาชิก</span>
                        </Link>

                        <div className="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>

                        <button
                            onClick={() => {
                                handlePaymentClick();
                                setMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 transition-colors font-medium text-left"
                        >
                            <CreditCard size={20} />
                            <span>แจ้งโอน</span>
                        </button>

                        {user && (
                            <Link
                                href="/my-courses"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors font-medium"
                            >
                                <BookOpen size={20} />
                                <span>คอร์สของฉัน</span>
                            </Link>
                        )}

                        {isAdmin && (
                            <Link
                                href="/admin"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-medium"
                            >
                                <Settings size={20} />
                                <span>Admin Panel</span>
                                {pendingCount > 0 && (
                                    <span className="ml-auto px-2 py-0.5 bg-rose-500 text-white text-xs font-bold rounded-full animate-pulse shadow-sm shadow-rose-200">
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>
                        )}
                    </nav>

                    {/* User Section at Bottom */}
                    {user && (
                        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden">
                                    {userProfile?.avatar || user.photoURL ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                            src={userProfile?.avatar || user.photoURL || ''}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span>{user.displayName ? user.displayName[0].toUpperCase() : user.email?.[0].toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                                        {userProfile?.displayName || user.displayName || "นักเรียน"}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        {user.email}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    logOut();
                                    setMobileMenuOpen(false);
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors font-medium"
                            >
                                <LogOut size={18} />
                                <span>ออกจากระบบ</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
