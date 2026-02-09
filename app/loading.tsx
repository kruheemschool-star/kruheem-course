"use client";
import { Sparkles } from "lucide-react";

export default function Loading() {
    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
            {/* Background gradients */}
            <div className="fixed inset-0 z-0 dark:hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-teal-100/30 rounded-full blur-[120px] mix-blend-multiply animate-pulse"></div>
                <div className="absolute top-[10%] right-[-10%] w-[60vw] h-[60vw] bg-cyan-100/30 rounded-full blur-[120px] mix-blend-multiply animate-pulse animation-delay-2000"></div>
            </div>

            {/* Loading content */}
            <div className="relative z-10 flex flex-col items-center gap-6">
                {/* Animated logo/icon */}
                <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-teal-500/30 animate-pulse">
                        <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    {/* Glow effect */}
                    <div className="absolute inset-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 blur-xl opacity-50 animate-pulse"></div>
                </div>

                {/* Loading text */}
                <div className="flex flex-col items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">
                        กำลังโหลด...
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        KruHeem Course
                    </p>
                </div>

                {/* Loading bar */}
                <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full animate-[loading_1.5s_ease-in-out_infinite]"></div>
                </div>
            </div>

            <style jsx>{`
        @keyframes loading {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 70%;
            margin-left: 15%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
      `}</style>
        </div>
    );
}
