"use client";

import { useEffect, useState } from 'react';
import { useUserAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// ผู้เรียน "ตัวจริง" ของคอร์สหนึ่งๆ (enrollment approved + ไม่หมดอายุ / หรือแอดมิน)
// ใช้ตัดสินสิทธิ์ที่เข้มกว่าแค่ "ดูบทฟรีได้" — เช่น ปุ่มพิมพ์/กรอกข้อสอบของบทเรียน
// (กันคนดูบทฟรี/พรีวิว โหลดข้อสอบทั้งชุดเป็นไฟล์) — เกณฑ์เดียวกับหน้า learn:
// query enrollments โดย userId + courseId + status approved แล้วเช็ค expiry.
export function useCourseEnrollment(courseId: string | undefined): { isEnrolled: boolean; checking: boolean } {
    const { user, loading } = useUserAuth();
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        if (loading) return;
        if (!user || !courseId) { setIsEnrolled(false); setChecking(false); return; }
        // แอดมินเข้าถึงได้ทุกคอร์สเสมอ (ไว้ตรวจงาน)
        if (user.email === 'kruheemschool@gmail.com') { setIsEnrolled(true); setChecking(false); return; }
        let cancelled = false;
        (async () => {
            try {
                const snap = await getDocs(query(
                    collection(db, 'enrollments'),
                    where('userId', '==', user.uid),
                    where('courseId', '==', courseId),
                    where('status', '==', 'approved'),
                ));
                let ok = false;
                snap.forEach((d) => {
                    const data = d.data();
                    if (data.accessType !== 'lifetime' && data.expiryDate) {
                        const expiry = data.expiryDate?.toDate?.() ?? new Date(data.expiryDate);
                        if (expiry < new Date()) return; // หมดอายุ — ข้าม
                    }
                    ok = true;
                });
                if (!cancelled) setIsEnrolled(ok);
            } catch {
                if (!cancelled) setIsEnrolled(false); // เช็คไม่ได้ = ไม่ให้สิทธิ์ (ปลอดภัยไว้ก่อน)
            } finally {
                if (!cancelled) setChecking(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user, loading, courseId]);

    return { isEnrolled, checking };
}
