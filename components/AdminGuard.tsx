"use client";

import { useUserAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user, isAdmin, loading } = useUserAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.replace("/");
            } else if (!isAdmin) {
                toast.error("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
                router.replace("/");
            }
        }
    }, [user, isAdmin, loading, router]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-slate-500">กำลังตรวจสอบสิทธิ์...</div>;
    }

    if (!isAdmin) {
        return null;
    }

    return <>
        <Toaster position="top-center" />
        {children}
    </>;
}
