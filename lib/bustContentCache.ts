// Fire-and-forget บัสต์แคช ISR หลังแอดมินบันทึก — helper กลางของทุกหน้าแอดมิน
//
// postRevalidate(): ก้อนกลาง "getIdToken → POST → เตือนเมื่อพลาด" ที่เดิมถูกก๊อป
// อยู่ 3 หน้า (exams / exams/[id] / exam-papers) — รวมไว้ที่เดียว การแก้พฤติกรรม
// ร่วม (เช่น refresh token, keepalive) จะได้ครบทุกหน้าพร้อมกัน
//
// เรียกแล้วไม่ต้อง await (best-effort): ถึงยิงไม่สำเร็จ ข้อมูลก็แค่รอ TTL
// หมดอายุเอง ไม่มีอะไรพัง — แต่ log คำเตือนไว้เสมอเพื่อให้เห็นใน console

import { auth } from "@/lib/firebase";

export type ContentTarget = "settings" | "summaries" | "posts";

/** POST ไป revalidate endpoint พร้อม token แอดมิน (fire-and-forget, log เมื่อพลาด) */
export function postRevalidate(endpoint: string, body?: Record<string, unknown>): void {
    void (async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                console.warn(`Revalidate skipped (no auth token): ${endpoint}`);
                return;
            }
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                ...(body ? { body: JSON.stringify(body) } : {}),
                // ให้คำขอรอดตอนแอดมินกดบันทึกแล้วเปลี่ยนหน้าทันที
                keepalive: true,
            });
            if (!res.ok) {
                console.warn(`Revalidate failed (${res.status}): ${endpoint} — หน้าเว็บสาธารณะจะอัปเดตเมื่อแคชหมดอายุเอง`);
            }
        } catch (e) {
            console.warn(`Revalidate failed (non-fatal): ${endpoint}`, e);
        }
    })();
}

/**
 * บัสต์แคชเนื้อหาสาธารณะ (settings/summaries/posts) ผ่าน /api/revalidate-content
 * ส่ง slug มาด้วยเมื่อรู้ว่าแก้บทความไหน — route จะบัสต์เฉพาะหน้านั้น
 * แทนการบัสต์บทความทุกหน้าพร้อมกัน
 */
export function bustContentCache(target: ContentTarget | ContentTarget[], opts?: { slug?: string }): void {
    const targets = Array.isArray(target) ? target : [target];
    postRevalidate("/api/revalidate-content", { targets, ...(opts?.slug ? { slug: opts.slug } : {}) });
}
