"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log error to console (could send to error tracking service)
        console.error("Application Error:", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 text-center">
                {/* Error Icon */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>

                {/* Error Message */}
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                    เกิดข้อผิดพลาด
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                    ขออภัย มีบางอย่างผิดพลาด กรุณาลองใหม่อีกครั้ง
                </p>

                {/* Error Details (Development only) */}
                {process.env.NODE_ENV === "development" && (
                    <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-xl text-left">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono break-all">
                            {error.message}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={reset}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                        ลองใหม่
                    </button>
                    <Link
                        href="/"
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors"
                    >
                        <Home className="w-5 h-5" />
                        หน้าแรก
                    </Link>
                </div>
            </div>
        </div>
    );
}
