"use client";

import React from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    fullWidth?: boolean;
    className?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
    primary:
        "bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-md shadow-teal-500/20 dark:shadow-teal-900/40",
    secondary:
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm",
    ghost:
        "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
    danger:
        "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20 dark:shadow-rose-900/40",
};

const SIZES: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-5 py-2.5 text-base rounded-xl",
    lg: "px-8 py-4 text-lg rounded-2xl",
};

export default function Button({
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    disabled,
    leftIcon,
    rightIcon,
    children,
    className = "",
    ...rest
}: ButtonProps) {
    const isDisabled = disabled || loading;
    return (
        <button
            {...rest}
            disabled={isDisabled}
            className={[
                "inline-flex items-center justify-center gap-2 font-bold transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:ring-offset-0",
                "active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100",
                VARIANTS[variant],
                SIZES[size],
                fullWidth ? "w-full" : "",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {loading ? (
                <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{children}</span>
                </>
            ) : (
                <>
                    {leftIcon}
                    {children}
                    {rightIcon}
                </>
            )}
        </button>
    );
}
