"use client";

import { useEffect, useState } from 'react';
import { useUserAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// สมาชิกคลังข้อสอบ "ตัวจริง" (จ่ายแล้ว approve แล้ว ไม่หมดอายุ / หรือแอดมิน) —
// ใช้ตัดสินสิทธิ์ที่เข้มกว่าแค่ "ดูได้": เช่น ปุ่มดาวน์โหลด/พิมพ์ PDF.
// ชุดฟรีเปิดให้ใครก็เข้ามาทำได้ (isFree → ExamAccessGuard ปล่อยผ่าน) แต่การ
// ดาวน์โหลดทั้งชุดเป็นไฟล์ต้องเป็นสมาชิกเท่านั้น — กันคนโหลดชุดฟรีไปก๊อป/ขายต่อ.
// เกณฑ์การเช็ค enrollment ตรงกับ ExamAccessGuard ทุกประการ.
export function useExamBankMembership(): { isMember: boolean; checking: boolean } {
    const { user, loading } = useUserAuth();
    const [isMember, setIsMember] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        if (loading) return;
        if (!user) { setIsMember(false); setChecking(false); return; }
        // แอดมินเห็น/พิมพ์ได้ทุกชุดเสมอ (ไว้ตรวจงาน)
        if (user.email === 'kruheemschool@gmail.com') { setIsMember(true); setChecking(false); return; }
        let cancelled = false;
        (async () => {
            try {
                const snap = await getDocs(query(collection(db, 'enrollments'), where('userId', '==', user.uid)));
                let ok = false;
                snap.forEach((d) => {
                    const data = d.data();
                    if (!data.courseTitle || !data.courseTitle.includes('คลังข้อสอบ')) return;
                    if (data.status !== 'approved') return;
                    const expiry = data.expiryDate?.toDate?.() ?? (data.expiryDate ? new Date(data.expiryDate) : null);
                    if (!expiry || expiry > new Date()) ok = true;
                });
                if (!cancelled) setIsMember(ok);
            } catch {
                if (!cancelled) setIsMember(false); // เช็คไม่ได้ = ไม่ให้สิทธิ์ (ปลอดภัยไว้ก่อน)
            } finally {
                if (!cancelled) setChecking(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user, loading]);

    return { isMember, checking };
}
