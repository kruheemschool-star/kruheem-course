/**
 * เปลี่ยนชื่อบทเรียนชุดเก็ง 10 ชุดในคอร์ส ป.6 สอบเข้าชั้น ม.1
 *   "เก็งข้อสอบสนามจริง ชุดที่ N"  →  "เก็งข้อสอบ ชุดที่ N"
 * เหตุผล: ชื่อเดิมยาวเกินช่องสารบัญ ถูกตัดเป็น "เก็งข้อสอบสนามจริง ชุ..." จนไม่เห็นเลขชุด
 *
 * แก้เฉพาะ field title ไม่แตะ content / order / id  → ความคืบหน้าของนักเรียนไม่กระทบ
 *
 * รัน: node scripts/rename-p6-mock-set-titles.js          (dry-run)
 *      node scripts/rename-p6-mock-set-titles.js --apply  (เปลี่ยนจริง)
 */
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');
const COURSE_ID = 'lBj1ZUlnBiU8vv3lm94y';
const OLD = (n) => `เก็งข้อสอบสนามจริง ชุดที่ ${n}`;
const NEW = (n) => `เก็งข้อสอบ ชุดที่ ${n}`;

(async () => {
    const col = db.collection('courses').doc(COURSE_ID).collection('lessons');
    console.log(`โหมด: ${APPLY ? '✍️  เปลี่ยนจริง (--apply)' : '🔍 dry-run (ไม่เขียน)'}\n`);
    let done = 0, miss = 0;

    for (let n = 1; n <= 10; n++) {
        const snap = await col.where('title', '==', OLD(n)).get();
        if (snap.empty) {
            const already = await col.where('title', '==', NEW(n)).limit(1).get();
            console.log(already.empty ? `⚠️  ไม่พบ: ${OLD(n)}` : `⏭️  เปลี่ยนไว้แล้ว: ${NEW(n)}`);
            miss++;
            continue;
        }
        for (const d of snap.docs) {
            if (APPLY) {
                await d.ref.update({ title: NEW(n) });
                console.log(`✅ ${OLD(n)}  →  ${NEW(n)}  [${d.id}]`);
                done++;
            } else {
                console.log(`✔️  จะเปลี่ยน: ${OLD(n)}  →  ${NEW(n)}  [${d.id}]`);
            }
        }
    }
    console.log(`\n${APPLY ? `เปลี่ยนแล้ว ${done} รายการ` : 'dry-run ผ่าน — รันซ้ำด้วย --apply เพื่อเปลี่ยนจริง'}${miss ? ` (ข้าม/ไม่พบ ${miss})` : ''}`);
    process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
