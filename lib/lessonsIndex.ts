// สารบัญบทเรียน 1 doc ต่อคอร์ส — courses/{id}/lessons/_index
//
// ทำไมต้องมี (audit 2026-08-19): หน้าเรียน/คอร์สของฉัน/แดชบอร์ดผู้ปกครอง เคยอ่าน
// บทเรียน "ทุกใบเต็ม" แค่เพื่อวาดเมนูรายชื่อบท — คอร์ส ป.6 = 281 reads + 8.8MB
// ต่อการเปิดสด 1 ครั้ง ทั้งที่เมนูใช้แค่ชื่อ/ชนิด/ลำดับ สารบัญนี้ยุบเหลือ 1 read
// (~12-60KB) แล้วค่อยดึงเนื้อหาเต็มของบทเฉพาะตอนผู้เรียนกดเปิด
//
// ทำไมเก็บเป็น doc พิเศษใน subcollection เดิม (ไม่ใช่ subcollection ใหม่):
// firestore.rules คุม courses/*/lessons/* อยู่แล้ว (read: true / write: admin)
// — ไม่ต้องรอ deploy rules ใหม่ (env นี้ deploy เองไม่ได้ ครูฮีมต้องรันเอง)
//
// กติกาที่ผู้แตะ lessons ทุกคนต้องรู้:
//   • ทุกจุดที่ getDocs ทั้ง subcollection ต้องกรอง id === LESSONS_INDEX_ID ทิ้ง
//     (doc นี้ตั้ง type:'index' + isHidden:true ไว้กันหลุดไปโผล่เป็นบทเรียนด้วย)
//   • ทุกจุดที่ "เขียน" บทเรียน (หน้าแอดมิน/สคริปต์ import) ต้อง rebuild สารบัญ
//     — ฝั่งเว็บ: หน้าแอดมินคอร์สเขียนให้อัตโนมัติหลัง refetch (ดู syncLessonsIndex)
//     — ฝั่งสคริปต์: ใช้ scripts/lib/lessons-index.js (rebuildLessonsIndex)
//   • ถ้าสารบัญหาย/ยังไม่ถูกสร้าง ผู้อ่านทุกคน fallback ไปอ่านเต็มแบบเดิม (ช้าแต่ถูกต้อง)

import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { tryParseQuestions } from "@/components/learn/utils";

export const LESSONS_INDEX_ID = "_index";

/** รายการย่อ 1 บทในสารบัญ — เฉพาะฟิลด์ที่หน้า "รายการ" ใช้จริง (ไม่มี content) */
export interface LessonIndexItem {
    id: string;
    title: string;
    type: string;
    order?: number;
    headerId?: string;
    isHidden?: boolean;
    isFree?: boolean;
    duration?: number;
    videoId?: string;
    createdAtMs?: number;
    /** จำนวนข้อของชุดตะลุยโจทย์ (parse แบบเข้มด้วย tryParseQuestions) — 0 = ไม่ใช่ชุดข้อสอบ */
    questionCount?: number;
    /** เนื้อหาหน้าตาเป็น JSON แบบหลวม (ใช้โดยตัวนับชุดข้อสอบใน parent-dashboard) */
    jsonish?: boolean;
    /** ปกบท (เฉพาะ header ที่มีรูป) */
    image?: string;
    /** true = รายการย่อจากสารบัญ ยังไม่มีเนื้อหาเต็ม (ใส่ให้ตอนอ่านสารบัญ) */
    _light?: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** เรียงแบบเดียวกับทุกหน้า: order ก่อน แล้วค่อย createdAt */
export function sortLessonItems<T extends { order?: number; createdAtMs?: number; createdAt?: any }>(items: T[]): T[] {
    return items.slice().sort((a, b) => {
        const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        const timeA = a.createdAtMs ?? (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const timeB = b.createdAtMs ?? (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return timeA - timeB;
    });
}

/** สร้างรายการสารบัญจาก lesson docs เต็ม (ใช้ทั้งหน้าแอดมินและตอน fallback) */
export function buildLessonsIndexItems(lessons: any[]): LessonIndexItem[] {
    const items = lessons
        .filter((l) => l.id !== LESSONS_INDEX_ID)
        .map((l) => {
            const rawContent = typeof l.content === "string" ? l.content : "";
            const questions = l.type === "html" || l.type === "practice" ? tryParseQuestions(rawContent) : null;
            const loose = (rawContent || l.htmlCode || "").trim();
            const item: LessonIndexItem = {
                id: l.id,
                title: l.title || "",
                type: l.type || "video",
            };
            // เก็บเฉพาะฟิลด์ที่มีค่า — สารบัญคอร์สใหญ่ (400+ บท) จะได้ไม่บวม
            if (l.order !== undefined) item.order = l.order;
            if (l.headerId) item.headerId = l.headerId;
            if (l.isHidden) item.isHidden = true;
            if (l.isFree) item.isFree = true;
            if (l.duration !== undefined) item.duration = l.duration;
            if (l.videoId) item.videoId = l.videoId;
            // ปกบท (header) โชว์ตอนกดชื่อบทในหน้าเรียน — header ไม่ถูก hydrate จึงต้องพกมา
            if (l.image) (item as any).image = l.image;
            const ms = l.createdAt?.toDate ? l.createdAt.toDate().getTime()
                : (l.createdAt?.seconds ? l.createdAt.seconds * 1000 : undefined);
            if (ms) item.createdAtMs = ms;
            if (questions && questions.length > 0) item.questionCount = questions.length;
            if (loose.startsWith("[") || loose.startsWith("{")) item.jsonish = true;
            return item;
        });
    return sortLessonItems(items);
}

/**
 * อ่านสารบัญของคอร์ส — คืน null เมื่อยังไม่มี (ให้ผู้เรียก fallback อ่านเต็ม)
 * 1 read ต่อการเรียก (ผู้เรียกควรห่อด้วย cache ของหน้าตัวเองอยู่แล้ว)
 */
export async function fetchLessonsIndex(courseId: string): Promise<LessonIndexItem[] | null> {
    try {
        const snap = await getDoc(doc(db, "courses", courseId, "lessons", LESSONS_INDEX_ID));
        if (!snap.exists()) return null;
        const items = snap.data().items;
        if (!Array.isArray(items) || items.length === 0) return null;
        // _light บอกฝั่งใช้ว่ารายการนี้ยังไม่มีเนื้อหาเต็ม (ต้อง hydrate ก่อนเปิด)
        return (items as LessonIndexItem[]).map((i) => ({ ...i, _light: true } as LessonIndexItem));
    } catch {
        return null; // อ่านสารบัญพลาด → ผู้เรียก fallback อ่านเต็ม ไม่มีอะไรพัง
    }
}

/**
 * รายชื่อบทของคอร์ส (เรียงแล้ว): สารบัญก่อน → ไม่มีค่อยอ่านเต็มแบบเดิม
 * เส้น fallback คืน doc เต็ม (มี content) ซึ่งเข้ากันได้กับผู้ใช้ทุกหน้า —
 * โค้ดฝั่งใช้เขียนแบบ "content อาจไม่มี" อยู่แล้ว
 */
export async function fetchLessonsList(courseId: string, opts?: { mustInclude?: string }): Promise<any[]> {
    const index = await fetchLessonsIndex(courseId);
    // auto-heal สารบัญค้าง: ถ้าลิงก์เจาะจงบทที่สารบัญไม่รู้จัก (เช่นสคริปต์เพิ่งเพิ่ม
    // บทแต่ยังไม่ rebuild สารบัญ) ให้ถอยไปอ่านเต็ม — บทใหม่จะโผล่ทันที
    if (index && (!opts?.mustInclude || index.some((l) => l.id === opts.mustInclude))) return index;
    const snap = await getDocs(collection(db, "courses", courseId, "lessons"));
    const full: any[] = snap.docs
        .filter((d) => d.id !== LESSONS_INDEX_ID)
        .map((d) => ({ id: d.id, ...d.data() }));
    return sortLessonItems(full);
}

/**
 * เขียนสารบัญจากรายการ lesson docs เต็มที่มีอยู่ในมือ (หน้าแอดมินคอร์สถืออยู่แล้ว)
 * — เรียกหลังทุก mutation ผ่านจุด refetch จุดเดียว จะได้ไม่มีทางลืม
 */
export async function syncLessonsIndex(courseId: string, fullLessons: any[]): Promise<void> {
    try {
        await setDoc(doc(db, "courses", courseId, "lessons", LESSONS_INDEX_ID), {
            // type/isHidden กัน doc นี้ถูกตีความเป็นบทเรียนโดยโค้ดที่สแกนเต็ม
            type: "index",
            isHidden: true,
            title: "(สารบัญอัตโนมัติ — ห้ามลบ)",
            items: buildLessonsIndexItems(fullLessons),
            updatedAt: new Date(),
        });
    } catch (e) {
        // ไม่ขวางงานหลัก — สารบัญเก่าจะถูกเขียนทับในการบันทึกครั้งถัดไป
        console.warn("syncLessonsIndex failed (non-fatal):", e);
    }
}
