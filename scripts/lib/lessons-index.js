// สร้าง/อัปเดต "สารบัญบทเรียน" courses/{id}/lessons/_index จากสคริปต์ Admin SDK
//
// คู่กับ lib/lessonsIndex.ts ฝั่งเว็บ (โครง items ต้องตรงกันเสมอ):
// หน้าเรียน/คอร์สของฉัน/แดชบอร์ดผู้ปกครอง อ่านสารบัญ 1 read แทนสแกนบทเต็มทุกใบ
//
// ⚠️ กติกา: สคริปต์ทุกตัวที่ เพิ่ม/แก้/ลบ บทเรียน (import-*.js, add-checklist-lesson,
// delete-*, rename-*) ต้องเรียก rebuildLessonsIndex(db, courseId) ปิดท้าย
// ไม่งั้นเมนูบทเรียนบนเว็บจะไม่เห็นของใหม่ (เว็บอ่านจากสารบัญเป็นหลัก)
//
//   const { rebuildLessonsIndex } = require("./lib/lessons-index"); // ปรับ path
//   await rebuildLessonsIndex(db, courseId);

const LESSONS_INDEX_ID = "_index";

/** ตรรกะเดียวกับ tryParseQuestions ฝั่งเว็บ (components/learn/utils.ts) */
function parseQuestionCount(content) {
    if (typeof content !== "string" || !content) return 0;
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].question) return parsed.length;
    } catch { /* not questions */ }
    return 0;
}

function buildItems(lessons) {
    const items = lessons
        .filter((l) => l.id !== LESSONS_INDEX_ID)
        .map((l) => {
            const rawContent = typeof l.content === "string" ? l.content : "";
            const qCount = (l.type === "html" || l.type === "practice") ? parseQuestionCount(rawContent) : 0;
            const loose = (rawContent || l.htmlCode || "").trim();
            const item = { id: l.id, title: l.title || "", type: l.type || "video" };
            if (l.order !== undefined) item.order = l.order;
            if (l.headerId) item.headerId = l.headerId;
            if (l.isHidden) item.isHidden = true;
            if (l.isFree) item.isFree = true;
            if (l.duration !== undefined) item.duration = l.duration;
            if (l.videoId) item.videoId = l.videoId;
            if (l.image) item.image = l.image; // ปกบท (header)
            const ms = l.createdAt && l.createdAt.toDate ? l.createdAt.toDate().getTime()
                : (l.createdAt && l.createdAt._seconds ? l.createdAt._seconds * 1000 : undefined);
            if (ms) item.createdAtMs = ms;
            if (qCount > 0) item.questionCount = qCount;
            if (loose.startsWith("[") || loose.startsWith("{")) item.jsonish = true;
            return item;
        });
    items.sort((a, b) => {
        const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return (a.createdAtMs || 0) - (b.createdAtMs || 0);
    });
    return items;
}

/**
 * อ่านบทเรียนทั้งคอร์สแล้วเขียนสารบัญใหม่ทั้งใบ
 * @param db  admin.firestore() instance
 * @param courseId
 * @returns จำนวนบทในสารบัญ
 */
async function rebuildLessonsIndex(db, courseId) {
    const snap = await db.collection("courses").doc(courseId).collection("lessons").get();
    const lessons = snap.docs
        .filter((d) => d.id !== LESSONS_INDEX_ID)
        .map((d) => ({ id: d.id, ...d.data() }));
    const items = buildItems(lessons);
    await db.collection("courses").doc(courseId).collection("lessons").doc(LESSONS_INDEX_ID).set({
        type: "index",
        isHidden: true,
        title: "(สารบัญอัตโนมัติ — ห้ามลบ)",
        items,
        updatedAt: new Date(),
    });
    return items.length;
}

module.exports = { rebuildLessonsIndex, buildItems, LESSONS_INDEX_ID };
