"use client";

import React from "react";

type CardSize = "md" | "lg";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: CardSize;
    hover?: boolean;
}

const SIZE_PADDING: Record<CardSize, string> = {
    md: "rounded-2xl p-6",
    lg: "rounded-3xl p-8",
};

export default function Card({
    size = "md",
    hover = false,
    children,
    className = "",
    ...rest
}: CardProps) {
    return (
        <div
            {...rest}
            className={[
                "bg-white dark:bg-slate-900",
                "border border-slate-100 dark:border-slate-800",
                "shadow-sm",
                hover ? "hover:shadow-md transition-shadow duration-200" : "",
                SIZE_PADDING[size],
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {children}
        </div>
    );
}
