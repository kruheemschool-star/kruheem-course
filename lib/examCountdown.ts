import { getDocument } from "@/lib/firestoreRest";
import { PUBLIC_SETTINGS_DOC, PUBLIC_SETTINGS_REVALIDATE, PUBLIC_SETTINGS_TAGS } from "@/lib/publicSettings";

export type ExamCountdown = {
    examName: string;   // ตัดคำว่า "นับถอยหลัง" นำหน้าออกแล้ว
    targetMs: number;   // epoch ของวันสอบ
    daysLeft: number;   // นับจากตอนเรนเดอร์ฝั่งเซิร์ฟเวอร์ (ฝั่ง client คำนวณใหม่หลัง mount)
};

// ครูฮีมกรอกวันสอบเป็น datetime-local ("2026-11-08T10:29") ซึ่งหมายถึงเวลาไทย
// เซิร์ฟเวอร์ Vercel รันเป็น UTC — ถ้าปล่อยให้ new Date() เดาเอง เซิร์ฟเวอร์กับ
// เครื่องผู้ใช้จะได้คนละค่า (ต่างกัน 7 ชม. = พลาดได้ 1 วัน) จึงตรึงโซนเวลาไว้
const BANGKOK = "+07:00";
const parseThai = (s: string): number => {
    const hasZone = /(Z|[+-]\d{2}:\d{2})$/.test(s);
    const withSeconds = /T\d{2}:\d{2}$/.test(s) ? `${s}:00` : s;
    return new Date(hasZone ? s : `${withSeconds}${BANGKOK}`).getTime();
};

export const daysUntil = (targetMs: number, now = Date.now()) =>
    Math.max(0, Math.ceil((targetMs - now) / 86_400_000));

/**
 * วันสอบที่ครูฮีมตั้งไว้ที่ /admin/countdown (การ์ดหน้าแรก)
 *
 * ร้านข้อสอบ PDF ใช้ค่าเดียวกันนี้โดยเจตนา — ครูตั้งวันสอบที่เดียวจบ ไม่ต้องมา
 * ตั้งซ้ำอีกหน้า และวันสอบบนเว็บจะไม่มีวันขัดกันเอง ปิดการ์ดหน้าแรกเมื่อไหร่
 * แถบบนหน้าร้านก็หายตามไปด้วย
 *
 * คืน null เมื่อ: ปิดอยู่ / ไม่ได้กรอกวัน / วันสอบผ่านไปแล้ว
 */
export async function getExamCountdown(): Promise<ExamCountdown | null> {
    try {
        const doc = await getDocument(PUBLIC_SETTINGS_DOC, {
            revalidate: PUBLIC_SETTINGS_REVALIDATE,
            tags: PUBLIC_SETTINGS_TAGS,
        });
        const c = doc?.countdown as Record<string, unknown> | undefined;
        if (!c || c.enabled === false) return null;

        const raw = String(c.targetDate || "").trim();
        if (!raw) return null;
        const targetMs = parseThai(raw);
        if (!Number.isFinite(targetMs) || targetMs <= Date.now()) return null;

        // ชื่อที่ครูกรอกมักขึ้นต้นว่า "นับถอยหลัง..." ซึ่งอ่านดีบนการ์ดหน้าแรก
        // แต่พอเอามาต่อท้าย "เหลืออีก N วัน ก่อน..." จะกลายเป็นคำซ้ำซ้อน
        const examName = String(c.examName || "วันสอบ").replace(/^\s*นับถอยหลัง\s*/, "").trim() || "วันสอบ";

        return { examName, targetMs, daysLeft: daysUntil(targetMs) };
    } catch {
        // แถบนี้เป็นของประกอบ อ่านไม่ได้ก็แค่ไม่ต้องโชว์ ห้ามทำให้หน้าร้านล่ม
        return null;
    }
}
