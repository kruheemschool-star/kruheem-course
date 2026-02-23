import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function BlogPostNotFound() {
    return (
        <div className="min-h-screen bg-[#FDFBF7] dark:bg-slate-950 transition-colors">
            <Navbar />
            <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
                <div className="text-8xl font-black text-slate-200 dark:text-slate-800 mb-4 select-none">
                    404
                </div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-3">
                    ไม่พบบทความนี้
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
                    บทความที่คุณค้นหาอาจถูกลบ ย้าย หรือไม่เคยมีอยู่
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                        href="/blog"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl transition-colors"
                    >
                        <BookOpen size={18} />
                        ดูบทความทั้งหมด
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors"
                    >
                        <ArrowLeft size={18} />
                        กลับหน้าแรก
                    </Link>
                </div>
            </div>
        </div>
    );
}
