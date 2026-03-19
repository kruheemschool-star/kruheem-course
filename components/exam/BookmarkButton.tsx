"use client";

import { Heart } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";

interface BookmarkButtonProps {
    examId: string;
    variant?: "header" | "card";
}

export default function BookmarkButton({ examId, variant = "header" }: BookmarkButtonProps) {
    const { isBookmarked, toggleBookmark, isLoggedIn } = useBookmarks();

    if (!isLoggedIn) return null;

    const bookmarked = isBookmarked(examId);

    if (variant === "header") {
        return (
            <button
                onClick={() => toggleBookmark(examId)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                    bookmarked
                        ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        : 'text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                }`}
                title={bookmarked ? 'ยกเลิกบันทึก' : 'บันทึกข้อสอบนี้'}
            >
                <Heart size={18} className={bookmarked ? 'fill-current' : ''} />
                <span className="hidden md:inline">{bookmarked ? 'บันทึกแล้ว' : 'บันทึก'}</span>
            </button>
        );
    }

    return null;
}
