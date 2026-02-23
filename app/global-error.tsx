"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Global Error:", error);
    }, [error]);

    return (
        <html lang="th">
            <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">
                        เกิดข้อผิดพลาดร้ายแรง
                    </h1>
                    <p className="text-slate-500 mb-6">
                        ขออภัย มีบางอย่างผิดพลาดในระดับระบบ กรุณาลองใหม่
                    </p>
                    <button
                        onClick={reset}
                        className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl transition-colors"
                    >
                        ลองใหม่อีกครั้ง
                    </button>
                </div>
            </body>
        </html>
    );
}
