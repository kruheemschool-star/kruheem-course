import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                <div className="text-8xl font-black text-slate-200 dark:text-slate-800 mb-4 select-none">
                    404
                </div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                    ไม่พบหน้าที่คุณค้นหา
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                    หน้านี้อาจถูกย้าย ลบ หรือไม่เคยมีอยู่
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl transition-colors"
                    >
                        <Home size={18} />
                        กลับหน้าแรก
                    </Link>
                    <Link
                        href="/blog"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors"
                    >
                        <Search size={18} />
                        ดูบทความ
                    </Link>
                </div>
            </div>
        </div>
    );
}
