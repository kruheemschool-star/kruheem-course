"use client";

import React from "react";
import { Loader2 } from "lucide-react";

type LoadingSize = "sm" | "md" | "lg";

interface LoadingStateProps {
    message?: string;
    size?: LoadingSize;
    fullScreen?: boolean;
    className?: string;
}

const SPINNER_SIZE: Record<LoadingSize, number> = { sm: 16, md: 24, lg: 40 };
const TEXT_SIZE: Record<LoadingSize, string> = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
};
const PADDING: Record<LoadingSize, string> = {
    sm: "py-6",
    md: "py-12",
    lg: "py-20",
};

export default function LoadingState({
    message = "กำลังโหลด...",
    size = "md",
    fullScreen = false,
    className = "",
}: LoadingStateProps) {
    const inner = (
        <div className={`flex flex-col items-center justify-center gap-3 ${PADDING[size]} ${className}`}>
            <Loader2
                size={SPINNER_SIZE[size]}
                className="animate-spin text-indigo-500 dark:text-indigo-400"
            />
            <p className={`${TEXT_SIZE[size]} font-medium text-slate-500 dark:text-slate-400`}>{message}</p>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
                {inner}
            </div>
        );
    }
    return inner;
}
