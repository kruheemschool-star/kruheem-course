"use client";
/**
 * ตัวนับเหตุการณ์ "วิดีโอในห้องเรียนโหลดไม่ขึ้น" + การกดปุ่มกู้ชีพของผู้เรียน
 *
 * เขียนแบบ fire-and-forget ลง stats/page_views (เอกสารเดิมที่ security rules
 * เปิดให้เขียนอยู่แล้ว — ไม่ต้อง deploy rules ใหม่ตัวนับก็เดินทันที)
 *
 * field ทุกตัวขึ้นต้นด้วย video_ เสมอ: แดชบอร์ดแอดมินอ่าน page_views โดยกรอง
 * เฉพาะ key ที่ขึ้นต้นด้วย "/" ดังนั้น field พวกนี้ไม่ไปปนกับสถิติเปิดหน้าเว็บ
 * (ดูย้อนหลังผ่านสคริปต์ admin SDK หรือ Firestore console)
 */
import { db } from "@/lib/firebase";
import { doc, setDoc, increment } from "firebase/firestore";

export type VideoStatKind =
    | "stuck"          // ครบเวลาเฝ้าระวังแล้ว iframe ยังไม่ถูกสร้าง = จอดำแน่นอน
    | "slow"           // iframe มาแล้ว แต่ player ไม่รายงานตัวว่าพร้อม (ช้า/สื่อสารเพี้ยน)
    | "error"          // YouTube รายงาน error ตรงๆ (วิดีโอถูกลบ/ปิดฝัง/สคริปต์ล้ม)
    | "recovered"      // ขึ้นทางออกไปแล้ว แต่วิดีโอฟื้นกลับมาพร้อมเองทีหลัง
    | "rescue_youtube" // ผู้เรียนกด "เปิดดูใน YouTube"
    | "rescue_reload"  // ผู้เรียนกด "โหลดหน้านี้ใหม่"
    | "rescue_browser";// ผู้เรียนกด "เปิดใน Chrome/Safari" (หนีเบราว์เซอร์ในแอป)

// เหตุการณ์เดียวกันของวิดีโอเดียวกันนับครั้งเดียวต่อการเปิดหน้า กันตัวเลขบวม
const sent = new Set<string>();

/** วันที่ YYYY-MM-DD ตามเวลาประเทศไทย (รูปแบบเดียวกับ VisitorTracker) */
function todayTH(): string {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    return d.toISOString().split("T")[0];
}

export function bumpVideoStat(kind: VideoStatKind, videoId: string, skip?: boolean) {
    if (skip) return; // แอดมินทดสอบเอง — ไม่ให้ปนตัวเลขผู้เรียนจริง
    if (typeof window === "undefined") return;
    const key = `${kind}:${videoId}`;
    if (sent.has(key)) return;
    sent.add(key);
    setDoc(doc(db, "stats", "page_views"), {
        [`video_${kind}_total`]: increment(1),
        [`video_${kind}_${todayTH()}`]: increment(1),
    }, { merge: true }).catch(() => { /* สถิติพลาดได้ ห้ามรบกวนผู้เรียน */ });
}
