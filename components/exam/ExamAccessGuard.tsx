"use client";

import React, { useState, useEffect } from "react";
import { useUserAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import { Lock, Loader2, ArrowRight } from "lucide-react";

export default function ExamAccessGuard({ 
    isFree, 
    children 
}: { 
    isFree: boolean; 
    children: React.ReactElement | ((props: { isTrial: boolean }) => React.ReactNode);
}) {
    const { user, loading: authLoading } = useUserAuth();
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [accessStatus, setAccessStatus] = useState<'checking' | 'granted' | 'denied' | 'pending'>('checking');

    useEffect(() => {
        if (isFree) {
            setHasAccess(true);
            setAccessStatus('granted');
            return;
        }

        if (authLoading) return;

        if (!user) {
            setHasAccess(false);
            setAccessStatus('denied');
            return;
        }

        const checkAccess = async () => {
            try {
                // Check if user has an approved enrollment for a course containing "คลังข้อสอบ"
                const q = query(
                    collection(db, "enrollments"),
                    where("userId", "==", user.uid)
                );
                const snapshot = await getDocs(q);
                
                let isApproved = false;
                let isPending = false;

                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.courseTitle && data.courseTitle.includes("คลังข้อสอบ")) {
                        if (data.status === "approved") isApproved = true;
                        if (data.status === "pending") isPending = true;
                    }
                });

                if (isApproved) {
                    setHasAccess(true);
                    setAccessStatus('granted');
                } else if (isPending) {
                    setHasAccess(false);
                    setAccessStatus('pending');
                } else {
                    setHasAccess(false);
                    setAccessStatus('denied');
                }
            } catch (error) {
                console.error("Error checking access:", error);
                setHasAccess(false);
                setAccessStatus('denied');
            }
        };

        checkAccess();
    }, [user, authLoading, isFree]);

    if (accessStatus === 'checking' || authLoading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="animate-spin mb-4 text-emerald-500" size={40} />
                <p className="font-bold">กำลังตรวจสอบสิทธิ์การเข้าถึง...</p>
            </div>
        );
    }

    if (accessStatus === 'pending') {
         return (
             <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
                 <div className="bg-amber-50 text-amber-600 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-sm border border-amber-100">
                     <Loader2 className="animate-spin" size={40} />
                 </div>
                 <h2 className="text-3xl font-black text-slate-800 mb-3">แอดมินกำลังตรวจสอบสลิป ⏳</h2>
                 <p className="text-slate-500 max-w-sm mb-8 font-medium">
                     คุณได้แจ้งโอนเงินสำหรับสมาชิกคลังข้อสอบแล้ว กรุณารอแอดมินตรวจสอบและอนุมัติสักครู่ครับ
                 </p>
                 <Link href="/my-courses" className="px-8 py-4 bg-slate-800 text-white rounded-full font-bold hover:bg-slate-700 transition-colors shadow-lg">
                     เช็คสถานะการสมัคร
                 </Link>
             </div>
         );
    }

    // Instead of completely blocking, we render the children and pass `isTrial`
    // Depending on the child type, we clone or handle it
    const isTrial = !hasAccess;

    if (typeof children === "function") {
        return <>{children({ isTrial })}</>;
    }

    if (React.isValidElement(children)) {
        return <>{React.cloneElement(children as React.ReactElement<any>, { isTrial })}</>;
    }

    return <>{children}</>;
}
