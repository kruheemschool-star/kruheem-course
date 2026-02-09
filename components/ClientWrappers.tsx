"use client";

import dynamic from "next/dynamic";

export const DynamicVisitorTracker = dynamic(
    () => import("@/components/VisitorTracker"),
    { ssr: false }
);

export const DynamicChatWidget = dynamic(
    () => import("@/components/ChatWidget"),
    { ssr: false }
);
