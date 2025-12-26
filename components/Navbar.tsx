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
    HelpCircle
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

    useEffect(() => {
        if (!isAdmin) return;

        const q = query(collection(db, "enrollments"), where("status", "==", "pending"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPendingCount(snapshot.size);
        });

        return () => unsubscribe();
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

            <div className="flex items-center gap-2 sm:gap-4">
                <ModeToggle />
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden md:block mx-1"></div>
                <div className="hidden md:flex items-center">
                    <Link href="/how-to-apply" className="font-bold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors flex items-center gap-2 px-3 py-2 rounded-full hover:bg-teal-50 dark:hover:bg-teal-900/20">
                        <HelpCircle size={20} />
                        <span className="hidden lg:inline">วิธีสมัครเรียน</span>
                    </Link>
                </div>
                <button
                    onClick={handlePaymentClick}
                    className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm text-slate-700 dark:text-slate-200 bg-white/40 dark:bg-slate-800/40 border border-white/60 dark:border-slate-700 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:border-white transition-all duration-300 hover:text-amber-700 dark:hover:text-amber-400 active:scale-95 hover:-translate-y-1"
                >
                    <CreditCard size={18} />
                    <span>สั่งซื้อและแจ้งโอน</span>
                </button>

                {user ? (
                    <div className="flex items-center gap-3">
                        {/* User Profile Badge */}
                        <div className="hidden md:flex items-center gap-3 pl-2 pr-4 py-1.5 bg-white/50 border border-white/60 rounded-full backdrop-blur-sm hover:-translate-y-1 transition-transform duration-300">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden">
                                {userProfile?.avatar ? (
                                    userProfile.avatar.startsWith("http") ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl leading-none">{userProfile.avatar}</span>
                                    )
                                ) : user.photoURL ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{user.displayName ? user.displayName[0].toUpperCase() : user.email?.[0].toUpperCase()}</span>
                                )}
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="text-xs font-bold text-slate-800 max-w-[100px] truncate">
                                    {userProfile?.displayName || user.displayName || "นักเรียน"}
                                </span>
                                <span className="text-[10px] font-medium text-slate-500 max-w-[100px] truncate">
                                    {user.email}
                                </span>
                            </div>
                        </div>

                        {isAdmin && (
                            <Link href="/admin" className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-full font-bold text-sm text-slate-600 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 transition-all hover:-translate-y-1 relative" title="ระบบจัดการ (Admin)">
                                <Settings size={18} />
                                <span className="hidden md:inline">Admin</span>
                                {pendingCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>
                        )}

                        <Link href="/my-courses" className="hidden md:flex items-center gap-2 px-8 py-2.5 rounded-full font-bold text-sm text-emerald-800 bg-[#D9E9CF] hover:bg-[#C8DDBB] transition-all duration-300 active:scale-95 shadow-sm hover:-translate-y-1">
                            <BookOpen size={18} />
                            <span>คอร์สของฉัน</span>
                        </Link>

                        <button onClick={logOut} className="w-10 h-10 flex items-center justify-center rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all hover:-translate-y-1" title="ออกจากระบบ">
                            <LogOut size={20} />
                        </button>
                    </div>
                ) : (
                    <button onClick={handleLogin} className="flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm text-white bg-indigo-500 shadow-lg shadow-indigo-200 transition-all duration-300 hover:bg-indigo-600 hover:scale-105 active:scale-95">
                        <LogIn size={18} />
                        <span className="hidden sm:inline">เข้าสู่ระบบ</span>
                        <span className="sm:hidden">Login</span>
                    </button>
                )}
            </div>
        </nav>
    );
}
