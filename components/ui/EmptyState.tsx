"use client";

import React from "react";
import Link from "next/link";

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    cta?: { label: string; href?: string; onClick?: () => void };
    className?: string;
}

export default function EmptyState({
    icon = "📭",
    title,
    description,
    cta,
    className = "",
}: EmptyStateProps) {
    return (
        <div
            className={[
                "rounded-2xl border border-dashed border-slate-200 dark:border-slate-700",
                "bg-slate-50/60 dark:bg-slate-800/40",
                "px-6 py-12 md:py-16 text-center",
                className,
            ].join(" ")}
        >
            <div className="text-5xl mb-4" aria-hidden="true">
                {icon}
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1.5">{title}</h3>
            {description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-md mx-auto leading-relaxed">
                    {description}
                </p>
            )}
            {cta && (cta.href ? (
                <Link
                    href={cta.href}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold text-sm shadow-md shadow-teal-500/20 dark:shadow-teal-900/40 transition-all active:scale-[0.98]"
                >
                    {cta.label} →
                </Link>
            ) : (
                <button
                    type="button"
                    onClick={cta.onClick}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold text-sm shadow-md shadow-teal-500/20 dark:shadow-teal-900/40 transition-all active:scale-[0.98]"
                >
                    {cta.label} →
                </button>
            ))}
        </div>
    );
}
