"use client";

import { useState, useRef, useEffect } from "react";
import { Printer, FileText, BookOpen, ChevronDown } from "lucide-react";

export default function ExamPrintButton({ examId }: { examId: string }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold text-sm"
                title="Export PDF"
            >
                <Printer size={18} />
                <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <a
                        href={`/exam/${examId}/print?mode=exam`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-sm"
                        onClick={() => setOpen(false)}
                    >
                        <FileText size={18} className="text-indigo-500" />
                        <div>
                            <div className="font-bold text-slate-700">พิมพ์ข้อสอบ</div>
                            <div className="text-xs text-slate-400">ไม่มีเฉลย ทำบนกระดาษ</div>
                        </div>
                    </a>
                    <div className="border-t border-slate-100" />
                    <a
                        href={`/exam/${examId}/print?mode=answer`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-sm"
                        onClick={() => setOpen(false)}
                    >
                        <BookOpen size={18} className="text-emerald-500" />
                        <div>
                            <div className="font-bold text-slate-700">พิมพ์เฉลย</div>
                            <div className="text-xs text-slate-400">พร้อมคำอธิบายละเอียด</div>
                        </div>
                    </a>
                </div>
            )}
        </div>
    );
}
