// แคชผลอ่านของหน้าแอดมินใน sessionStorage
//
// ทำไมต้องมี (audit 2026-08-19): หน้าแอดมินหลายหน้าอ่าน collection ทั้งชุดใหม่
// ทุกการเปิด — แดชบอร์ดสแกนใบลงทะเบียน approved ~1,435 ใบ, ทะเบียนสมาชิก
// ~2,900 ใบ — ทั้งที่แอดมินคนเดียวเปิดเข้าออกวันละหลายรอบและข้อมูลแทบไม่เปลี่ยน
// เก็บผลไว้ใน sessionStorage (ตายพร้อมแท็บ ไม่ค้างข้ามวัน) + TTL แล้วให้ปุ่ม
// "รีเฟรช" เป็นทางบังคับอ่านสดเสมอ → เปิดซ้ำ = 0 read และหน้าเปิดไวขึ้น
//
// ข้อควรระวังของผู้ใช้ helper นี้: JSON เก็บ Firestore Timestamp ไม่ได้ —
// แปลงเป็นตัวเลข ms ก่อนเก็บ แล้วห่อกลับเป็น { toDate() } ตอนอ่าน (ดู
// hooks/useAdminStats.ts เป็นตัวอย่าง)

const PREFIX = "kh-admin-cache:";

// คีย์แคชแดชบอร์ด — export ไว้ให้หน้าที่แก้ข้อมูลลงทะเบียน (อนุมัติสลิป/ลงทะเบียนให้)
// สั่งล้างได้ทันที ไม่งั้นแดชบอร์ดจะโชว์รายได้เก่าไปจนแคชหมดอายุ
export const ADMIN_STATS_CACHE_KEY = "admin-stats-v1";

// ---- ตัวช่วยแปลง Firestore Timestamp ↔ ตัวเลข ms สำหรับเก็บลง JSON ----
// msToTs คืนอ็อบเจกต์หน้าตาเหมือน Timestamp ครบทั้ง toDate / toMillis / seconds
// (โค้ดฝั่งใช้บางจุดอ่าน .seconds ตรงๆ เช่น useAdminLearningStats — ถ้าให้แค่
// toDate อย่างเดียว การเรียงลำดับจะพังเงียบๆ เฉพาะตอนโหลดจากแคช)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tsToMs = (t: any): number | undefined => (t?.toDate ? t.toDate().getTime() : undefined);
export const msToTs = (ms?: number) =>
    typeof ms === "number"
        ? {
              toDate: () => new Date(ms),
              toMillis: () => ms,
              seconds: Math.floor(ms / 1000),
              nanoseconds: (ms % 1000) * 1e6,
          }
        : undefined;

interface Entry<T> {
    at: number;
    data: T;
}

export function readAdminCache<T>(key: string, maxAgeMs: number): T | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = sessionStorage.getItem(PREFIX + key);
        if (!raw) return null;
        const entry = JSON.parse(raw) as Entry<T>;
        if (!entry || typeof entry.at !== "number") return null;
        if (Date.now() - entry.at > maxAgeMs) return null;
        return entry.data;
    } catch {
        return null;
    }
}

export function writeAdminCache<T>(key: string, data: T): void {
    if (typeof window === "undefined") return;
    try {
        sessionStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data } satisfies Entry<T>));
    } catch {
        // sessionStorage เต็ม/ถูกปิด — ข้ามไปเงียบๆ (แคชเป็นแค่ตัวช่วย ไม่ใช่ของจำเป็น)
    }
}

export function clearAdminCache(key: string): void {
    if (typeof window === "undefined") return;
    try {
        sessionStorage.removeItem(PREFIX + key);
    } catch { /* ignore */ }
}
