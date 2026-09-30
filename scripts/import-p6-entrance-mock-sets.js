/**
 * นำชุดเก็งข้อสอบสนามจริง 10 ชุด (ชุดละ 30 ข้อ) เข้าเป็นบทเรียนตะลุยโจทย์
 * ในคอร์ส "คอร์ส ป.6 สอบเข้าชั้น ม.1"
 *
 * ต้นทาง: kruheem-exams/00 · สอบเข้า ม.1/เก็งรวมทุกบท-10ชุด/output/webquiz_..._setNN_30q.json
 *   — สังเคราะห์จากข้อสอบพรีเทสต์จริง 220 ข้อ 10 ฉบับ ปี 68–69 (เปลี่ยนตัวเลข/บริบททั้งหมด)
 *   — ผ่านด่านตรวจ SymPy รายข้อ + แกะทุกบรรทัดสมการในเฉลย + รูปไม่ทับ + กันซ้ำคลังเดิม
 *
 * shape เดียวกับบทเรียนตะลุยโจทย์ที่ใช้อยู่ (type 'html', questions เป็น JSON string ใน content)
 * ไม่ใส่ field id รายข้อ — getQuestionKey ของเว็บ hash จากตัวโจทย์เอง กันคีย์ชนข้ามชุด
 * กันซ้ำด้วย title: ถ้ามีบทเรียนชื่อเดิมอยู่แล้วจะข้าม ไม่เขียนทับ
 *
 * รัน: node scripts/import-p6-entrance-mock-sets.js          (dry-run ตรวจอย่างเดียว)
 *      node scripts/import-p6-entrance-mock-sets.js --apply  (เขียนจริง)
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');

const COURSE_ID = 'lBj1ZUlnBiU8vv3lm94y';   // คอร์ส ป.6 สอบเข้าชั้น ม.1
const SRC_DIR = '/Users/kruheem/Documents/workspace/kruheem-exams/00 · สอบเข้า ม.1/เก็งรวมทุกบท-10ชุด/output';
const START_ORDER = 281;                     // ต่อท้ายบทเรียนสุดท้าย (order สูงสุดเดิม = 280)
const EXPECT_COUNT = 30;

// บันไดความยาก 3 ชั้น อิงความยากจริงรายสนาม
const TIER = (n) => (n <= 4 ? { label: 'ปูพื้นสนามสอบ', vh: 5, h: 16, m: 9 }
    : n <= 7 ? { label: 'สนามจริงมาตรฐาน', vh: 8, h: 16, m: 6 }
        : { label: 'สนามแข่งขันเข้มข้น', vh: 12, h: 15, m: 3 });

const LEVELS = ['ยากมาก', 'ยาก', 'กลาง'];

function validate(qs, name) {
    const errs = [];
    if (!Array.isArray(qs)) throw new Error(`${name}: ไม่ใช่ array`);
    if (qs.length !== EXPECT_COUNT) errs.push(`จำนวนข้อ ${qs.length} != ${EXPECT_COUNT}`);
    const seen = new Set();
    qs.forEach((q, i) => {
        const at = `ข้อ ${i + 1}`;
        if (typeof q.question !== 'string' || !q.question.trim()) errs.push(`${at}: question ว่าง`);
        if (seen.has(q.question)) errs.push(`${at}: โจทย์ซ้ำในชุด`);
        seen.add(q.question);
        if (!Array.isArray(q.options) || q.options.length !== 4) errs.push(`${at}: options != 4`);
        else if (new Set(q.options).size !== 4) errs.push(`${at}: ตัวเลือกซ้ำกัน`);
        if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) errs.push(`${at}: correctIndex ผิด`);
        if (typeof q.explanation !== 'string' || !q.explanation.trim()) errs.push(`${at}: ไม่มีเฉลย`);
        else {
            const m = q.explanation.match(/^\*\*คำตอบ:\s*ข้อ\s*(\d)/);
            if (!m) errs.push(`${at}: เฉลยไม่ขึ้นต้น **คำตอบ: ข้อ X.**`);
            else if (Number(m[1]) !== q.correctIndex + 1) errs.push(`${at}: เฉลยชี้ข้อ ${m[1]} แต่ correctIndex=${q.correctIndex}`);
        }
        if (!Array.isArray(q.tags) || q.tags.length < 4) errs.push(`${at}: tags ไม่ครบ`);
        if (!Array.isArray(q.distractorErrors) || q.distractorErrors.length !== 3) errs.push(`${at}: distractorErrors != 3`);
        if (!Number.isInteger(q.expectedSeconds) || q.expectedSeconds <= 0) errs.push(`${at}: expectedSeconds ผิด`);
        if (!q.subskill) errs.push(`${at}: ไม่มี subskill`);
        if ('svg' in q && !String(q.svg).trim().startsWith('<svg')) errs.push(`${at}: svg ผิดรูป`);
        for (const bad of ['answer', 'solution', 'space']) if (bad in q) errs.push(`${at}: มี field ต้องห้าม ${bad}`);
    });
    if (errs.length) throw new Error(`${name} ตรวจไม่ผ่าน:\n  - ` + errs.slice(0, 12).join('\n  - '));
    return qs;
}

(async () => {
    const courseSnap = await db.collection('courses').doc(COURSE_ID).get();
    if (!courseSnap.exists) throw new Error(`ไม่พบคอร์ส ${COURSE_ID}`);
    console.log(`คอร์สปลายทาง: ${courseSnap.data().title} [${COURSE_ID}]`);
    console.log(`โหมด: ${APPLY ? '✍️  เขียนจริง (--apply)' : '🔍 dry-run (ตรวจอย่างเดียว ไม่เขียน)'}\n`);

    const lessonsCol = db.collection('courses').doc(COURSE_ID).collection('lessons');
    let created = 0, skipped = 0, totalQ = 0;

    for (let n = 1; n <= 10; n++) {
        const nn = String(n).padStart(2, '0');
        const file = path.join(SRC_DIR, `webquiz_entrance_m1_mock_set${nn}_30q.json`);
        if (!fs.existsSync(file)) throw new Error(`ไม่พบไฟล์ต้นทาง: ${file}`);
        const title = `เก็งข้อสอบ ชุดที่ ${n}`;
        const qs = validate(JSON.parse(fs.readFileSync(file, 'utf8')), title);

        // ยืนยันว่าบันไดความยากตรงกับที่ออกแบบไว้
        const t = TIER(n);
        const got = LEVELS.map(l => qs.filter(q => q.tags.includes(l)).length);
        if (got[0] !== t.vh || got[1] !== t.h || got[2] !== t.m)
            throw new Error(`${title}: ระดับไม่ตรงเป้า ได้ ${got} ต้องการ [${t.vh},${t.h},${t.m}]`);

        const content = JSON.stringify(qs);
        const sizeKB = Math.round(Buffer.byteLength(content, 'utf8') / 1024);
        if (sizeKB > 900) throw new Error(`${title}: content ${sizeKB}KB ใกล้เพดาน 1MiB ของ Firestore`);

        const dup = await lessonsCol.where('title', '==', title).limit(1).get();
        if (!dup.empty) {
            console.log(`⏭️  ข้าม (มีอยู่แล้ว): ${title} [id=${dup.docs[0].id}]`);
            skipped++;
            continue;
        }

        const figs = qs.filter(q => q.svg).length;
        const mins = Math.round(qs.reduce((s, q) => s + q.expectedSeconds, 0) / 60);
        const payload = {
            title,
            type: 'html',
            headerId: '',
            htmlCode: '',
            isFree: false,
            order: START_ORDER + (n - 1),
            content,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const info = `${qs.length} ข้อ · ${t.label} (ยากมาก ${got[0]} ยาก ${got[1]} กลาง ${got[2]}) · รูป ${figs} · ~${mins} นาที · ${sizeKB}KB`;
        if (APPLY) {
            const ref = await lessonsCol.add(payload);
            console.log(`✅ สร้างแล้ว: ${title} [id=${ref.id}] — ${info}`);
            created++;
        } else {
            console.log(`✔️  พร้อมนำเข้า: ${title} (order ${payload.order}) — ${info}`);
        }
        totalQ += qs.length;
    }

    console.log(`\nรวม ${totalQ} ข้อ`);
    console.log(APPLY ? `สรุป: สร้าง ${created} บทเรียน / ข้าม ${skipped}`
        : `สรุป: dry-run ผ่านทั้งหมด — รันซ้ำด้วย --apply เพื่อเขียนจริง`);
    process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
