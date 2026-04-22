"use client";

import React, { useState, useEffect } from "react";
import { useUserAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import { Lock, Loader2, ArrowRight } from "lucide-react";
import { deriveExamLevel } from "@/lib/exam-level";

export default function ExamAccessGuard({ 
    isFree, 
    examLevel,
    children 
}: { 
    isFree: boolean; 
    examLevel?: "primary" | "lower" | "upper";
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

        // ✅ Admin bypass: grant full access for admin to review all exams
        if (user.email === "kruheemschool@gmail.com") {
            setHasAccess(true);
            setAccessStatus('granted');
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
                    if (!data.courseTitle || !data.courseTitle.includes("คลังข้อสอบ")) return;

                    // Level matching (for level-scoped exam-bank courses):
                    // 1) Explicit `allowedExamLevel` on enrollment → must match exam level
                    // 2) Missing `allowedExamLevel` → try deriving from `courseTitle`
                    //    (e.g. "คลังข้อสอบ ม.ต้น" → "lower"). This handles enrollments
                    //    created before payment/page.tsx copied `allowedExamLevel`.
                    // 3) Still can't derive (plain "คลังข้อสอบ" with no level suffix) →
                    //    treat as UNIVERSAL access (legacy / pre-split behavior). This
                    //    preserves backward compatibility for early subscribers.
                    if (examLevel) {
                        let enrollmentLevel: "primary" | "lower" | "upper" | undefined =
                            data.allowedExamLevel || undefined;

                        if (!enrollmentLevel) {
                            enrollmentLevel = deriveExamLevel(data.courseTitle, undefined);
                        }

                        // If we resolved a level, it must match. If we couldn't resolve
                        // any level, fall through and grant access (universal legacy).
                        if (enrollmentLevel && enrollmentLevel !== examLevel) return;
                    }

                    if (data.status === "approved") {
                        // ✅ Check expiry date — only grant access if not expired
                        const expiry = data.expiryDate?.toDate?.() ?? (data.expiryDate ? new Date(data.expiryDate) : null);
                        if (!expiry || expiry > new Date()) {
                            isApproved = true;
                        }
                    }
                    if (data.status === "pending") isPending = true;
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
    }, [user, authLoading, isFree, examLevel]);

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
