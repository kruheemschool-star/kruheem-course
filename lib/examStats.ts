// ตัวนับสถิติคลังข้อสอบรายชุดรายวัน — เขียนลง stats/exam_YYYY-MM-DD (เวลาไทย)
// โดยแต่ละชุดข้อสอบเป็น map ของตัวเอง: { [examId]: { v: n, s_member: n, ... } }
//
// หลักการเดียวกับ VisitorTracker (stats/page_views): fire-and-forget เพิ่มตัวเลข
// ผ่าน increment() — พังเงียบๆ ได้เสมอ ห้ามกระทบเส้นทางทำข้อสอบของนักเรียนเด็ดขาด
// และไม่นับเซสชันแอดมิน (ธง isAdminSession ใน localStorage ชุดเดียวกับ tracker เดิม)
//
// เอกสารเป็นรายวัน → ขนาดคงที่ ไม่มีวันโตชนเพดาน 1MiB เหมือน doc สะสมรวม
// การอนุญาตเขียนคุมโดย firestore.rules: statId ต้อง match exam_\d{4}-\d{2}-\d{2}
import { db } from "@/lib/firebase";
import { doc, setDoc, increment } from "firebase/firestore";

// คีย์ตัวนับต่อชุด (ต่อวัน):
//  v          เปิดดูหน้าชุด /exam/[id]
//  vp         เปิดหน้าพิมพ์เอกสาร /exam/[id]/print
//  s_member   กดเริ่มทำ (สมาชิกคลังเต็ม)   s_trial ทดลองทำ(ล็อกอินยังไม่ซื้อ)   s_guest ไม่ล็อกอิน
//  c_member   ส่งข้อสอบรอบเต็ม แยกกลุ่มเดียวกับ s_*
//  c_subset   ส่งรอบย่อย (ควิซย่อย/ทำเฉพาะข้อผิด) — แยกไว้ไม่ให้ปนบันไดหลัก
//  buy_banner ปุ่มสมัครจากป้ายชวนหลังทำเสร็จ (โหมดทดลอง)
//  buy_paywall ปุ่มสมัครจากการ์ดล็อกข้อ 6 ขึ้นไป
//  buy_diag   ปุ่มสมัครจากหน้าผลชุดสแกนจุดอ่อน
//  src_*      แหล่งที่มาของคนเปิดดู (facebook/line/google/… นับพร้อม v)
export type ExamStatPatch = Record<string, number>;

export type ExamUserType = "member" | "trial" | "guest";

/** กลุ่มผู้ใช้สำหรับตัวนับ: ไม่ล็อกอิน = guest, ล็อกอินแต่ยังไม่ซื้อ (โหมดทดลอง) = trial */
export function examUserType(hasUser: boolean, isTrial: boolean): ExamUserType {
    if (!hasUser) return "guest";
    return isTrial ? "trial" : "member";
}

/** วันที่แบบ YYYY-MM-DD ตามเวลาประเทศไทย (ให้ตรงกับ stats/daily_visits เดิม) */
export function bangkokDateKey(d: Date = new Date()): string {
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

// เส้นทางใต้ /exam/ ที่ไม่ใช่หน้าชุดข้อสอบ — ห้ามตีความเป็น examId
const RESERVED_EXAM_SEGMENTS = new Set(["dashboard", "practice", "saved-questions"]);

/**
 * แยก examId จาก pathname ของหน้าในคลังข้อสอบ
 *  /exam/abc123        → { examId: "abc123", isPrint: false }
 *  /exam/abc123/print  → { examId: "abc123", isPrint: true }
 *  /exam, /exam/dashboard, /exam/practice, /exam/saved-questions → null
 */
export function parseExamPathname(pathname: string | null): { examId: string; isPrint: boolean } | null {
    if (!pathname || !pathname.startsWith("/exam/")) return null;
    const segments = pathname.split("/").filter(Boolean); // ["exam", id, ...rest]
    if (segments.length < 2) return null;
    const examId = segments[1];
    if (!examId || RESERVED_EXAM_SEGMENTS.has(examId)) return null;
    return { examId, isPrint: segments[2] === "print" };
}

/** true = เซสชันนี้เป็นแอดมิน (เคยล็อกอินแอดมินในเบราว์เซอร์นี้) — ไม่นับสถิติ */
function isAdminSession(): boolean {
    if (typeof window === "undefined") return false;
    try {
        return localStorage.getItem("isAdminSession") === "true";
    } catch {
        return false;
    }
}

/**
 * เพิ่มตัวนับของชุด examId ในเอกสารสถิติของวันนี้ — fire-and-forget
 * ใช้ได้กับทุกคนรวมคนไม่ล็อกอิน (rules เปิดเฉพาะ doc ชื่อ exam_YYYY-MM-DD)
 */
export function bumpExamStat(examId: string | undefined | null, patch: ExamStatPatch): void {
    try {
        if (!examId || typeof window === "undefined") return;
        if (isAdminSession()) return;
        const fields: Record<string, ReturnType<typeof increment>> = {};
        for (const [key, amount] of Object.entries(patch)) {
            if (typeof amount === "number" && amount > 0) fields[key] = increment(amount);
        }
        if (Object.keys(fields).length === 0) return;
        setDoc(doc(db, "stats", `exam_${bangkokDateKey()}`), { [examId]: fields }, { merge: true }).catch((err) => {
            // ก่อน deploy rules เวอร์ชันใหม่ การเขียนจะถูกปฏิเสธ — เงียบไว้ ไม่กวนผู้ใช้
            // (dev เท่านั้นที่เห็น log เพื่อไล่ปัญหา; โปรดักชันเงียบสนิท)
            if (process.env.NODE_ENV === "development") {
                console.warn(`[examStats] bump ${examId} ${Object.keys(patch).join(",")} failed:`, err?.code || err);
            }
        });
    } catch {
        // ห้ามให้ตัวนับทำหน้าข้อสอบพังไม่ว่ากรณีใด
    }
}
