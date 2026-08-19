// สร้างสารบัญบทเรียน (lessons/_index) ให้ทุกคอร์สในระบบ — รันครั้งเดียวตอนเปิดใช้
// และรันซ้ำได้ปลอดภัย (idempotent: เขียนทับสารบัญเดิมด้วยข้อมูลล่าสุด)
//
//   node scripts/backfill-lessons-index.js          # ทำทุกคอร์ส
//   node scripts/backfill-lessons-index.js <id>     # ทำเฉพาะคอร์สเดียว

const path = require("path");
const admin = require("firebase-admin");
const { rebuildLessonsIndex } = require("./lib/lessons-index");

const sa = require(path.resolve(__dirname, "seed-gifted-m1/serviceAccountKey.json"));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
    const onlyId = process.argv[2];
    const courseIds = onlyId
        ? [onlyId]
        : (await db.collection("courses").get()).docs.map((d) => d.id);

    console.log(`สร้างสารบัญ ${courseIds.length} คอร์ส...`);
    let totalLessons = 0;
    for (const id of courseIds) {
        try {
            const n = await rebuildLessonsIndex(db, id);
            totalLessons += n;
            console.log(`  ✅ ${id} — ${n} บท`);
        } catch (e) {
            console.error(`  ❌ ${id} — ${e.message}`);
        }
    }
    console.log(`เสร็จ: สารบัญครอบ ${totalLessons} บทเรียนรวม`);
    process.exit(0);
})();
