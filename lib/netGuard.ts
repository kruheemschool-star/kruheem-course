/**
 * ตัวกัน "งานค้างเงียบ ๆ" ของ Firestore
 *
 * ทำไมต้องมี — Firebase Web SDK คุยกับเซิร์ฟเวอร์ผ่านช่องสัญญาณ (WebChannel)
 * ที่เปิดค้างไว้ตลอด พอแท็บถูกพักไว้นาน ๆ (คอมหลับ / สลับไปแอปอื่นบนมือถือ /
 * Wi-Fi เปลี่ยนเสา) ช่องนี้ "ตายเงียบ" — ตัว SDK ยังคิดว่าต่ออยู่ ทำให้
 * `setDoc / updateDoc / getDocs` คืนค่า Promise ที่ไม่ resolve และไม่ reject
 * ค้างแบบนั้นไปเรื่อย ๆ
 *
 * ผลที่ผู้ใช้เห็น: ปุ่มที่เขียนแบบ `setSaving(true) → await ... → setSaving(false)`
 * จะติด disabled ถาวร = "กดปุ่มไม่ได้ ค้างอยู่แบบนั้น"
 *
 * ไฟล์นี้ให้เครื่องมือสองอย่าง
 *   1) withTimeout()        — บังคับให้ทุกงานมีเพดานเวลา จะได้ไม่ค้างตลอดกาล
 *   2) reviveConnection()   — สั่ง Firestore ทิ้งช่องเก่าแล้วเปิดช่องใหม่ +
 *                             ต่ออายุ token ของ Firebase Auth
 */

import { disableNetwork, enableNetwork } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

/** เพดานเวลามาตรฐานของงานที่คุยกับเซิร์ฟเวอร์ (มิลลิวินาที) */
export const NET_TIMEOUT_MS = 20_000;

/** ข้อความมาตรฐานเวลางานไม่คืบ — ไม่โกหกว่า "ล้มเหลว" เพราะ Firestore อาจบันทึกให้ทีหลัง */
export const NET_TIMEOUT_MESSAGE =
    "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ (เน็ตอาจหลุดตอนพักหน้าจอ) — ระบบกำลังเชื่อมต่อใหม่ กรุณากดอีกครั้ง";

export class NetTimeoutError extends Error {
    readonly isNetTimeout = true;
    constructor(label?: string) {
        super(label ? `หมดเวลารอ: ${label}` : "หมดเวลารอการตอบกลับจากเซิร์ฟเวอร์");
        this.name = "NetTimeoutError";
    }
}

export function isNetTimeout(error: unknown): boolean {
    return !!error && typeof error === "object" && (error as NetTimeoutError).isNetTimeout === true;
}

/**
 * ครอบ Promise ด้วยเพดานเวลา — ถ้าเลยกำหนดจะ reject ด้วย NetTimeoutError
 * แล้วสั่งกู้การเชื่อมต่อให้อัตโนมัติ (การเขียนที่ค้างอยู่ในคิวจะถูกส่งซ้ำเอง
 * ทันทีที่ช่องใหม่ติด — ข้อมูลไม่หาย)
 */
export function withTimeout<T>(promise: Promise<T>, ms: number = NET_TIMEOUT_MS, label?: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const guard = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            // กู้การเชื่อมต่อทันทีที่จับได้ว่าค้าง เพื่อให้การกดครั้งถัดไปผ่าน
            void reviveConnection("timeout");
            reject(new NetTimeoutError(label));
        }, ms);
    });
    return Promise.race([promise, guard]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/* ------------------------------------------------------------------ */
/* กู้การเชื่อมต่อ                                                      */
/* ------------------------------------------------------------------ */

let reviving: Promise<void> | null = null;
let lastReviveAt = 0;

/** เว้นระยะขั้นต่ำระหว่างการกู้แต่ละครั้ง — กันการยิงรัวจนเปลืองโควตาอ่าน */
const REVIVE_COOLDOWN_MS = 60_000;

/**
 * ทิ้งช่องสัญญาณเดิมแล้วเปิดใหม่ + ต่ออายุ ID token
 *
 * ค่าใช้จ่าย: listener ที่เปิดค้างอยู่จะ resume ด้วย resume token เดิม
 * ส่วนใหญ่จึงไม่อ่านซ้ำทั้งชุด — และเรียกได้ไม่ถี่กว่า 1 นาที/ครั้ง
 */
export async function reviveConnection(reason: string = "wake"): Promise<void> {
    if (typeof window === "undefined") return;
    if (reviving) return reviving;

    const now = Date.now();
    if (now - lastReviveAt < REVIVE_COOLDOWN_MS) return;
    lastReviveAt = now;

    reviving = (async () => {
        try {
            // disableNetwork เป็นงานฝั่ง client ล้วน แต่กันเหนียวด้วยเพดานเวลาสั้น ๆ
            await Promise.race([
                disableNetwork(db),
                new Promise((resolve) => setTimeout(resolve, 3_000)),
            ]);
            await enableNetwork(db);
        } catch (error) {
            console.warn(`[netGuard] reconnect failed (${reason})`, error);
        }

        // token ของ Firebase Auth มีอายุ 1 ชม. — เครื่องหลับข้ามคืนแล้วตื่นมา
        // token เดิมหมดอายุ ทำให้ทั้ง Firestore rules และ API ฝั่งเราปฏิเสธเงียบ ๆ
        try {
            await auth.currentUser?.getIdToken(true);
        } catch (error) {
            console.warn(`[netGuard] token refresh failed (${reason})`, error);
        }
    })();

    try {
        await reviving;
    } finally {
        reviving = null;
    }
}
