/**
 * นำชุดเก็งพรีเทสต์สอบเข้า ม.1 รอบ 2 (10 ชุด ชุดละ 30 ข้อ) เข้า "คลังข้อสอบ"
 * collection `exams` หมวด "สอบเข้า ม.1" ต่อจากซีรีส์ "แนวข้อสอบ เข้า ม. 1 ชุดที่ 1-2"
 * -> สร้างเป็น "แนวข้อสอบ เข้า ม. 1 ชุดที่ 3" ถึง "ชุดที่ 12"
 *
 * ต้นทาง: kruheem-exams/00 · สอบเข้า ม.1/เก็งพรีเทสต์-รอบ2-10ชุด/output/
 *   สังเคราะห์จากข้อสอบพรีเทสต์จริง 500 ข้อ 22 ฉบับ ปี 64-69 (เปลี่ยนตัวเลข/บริบททุกข้อ)
 *   ผ่าน SymPy รายข้อ + แกะทุกบรรทัดสมการในเฉลย + รูปไม่ทับ + กันซ้ำคลังเดิม 17,618 ข้อ
 *
 * กันซ้ำด้วย title: ถ้ามีชุดชื่อเดิมอยู่แล้วจะข้าม ไม่เขียนทับ
 *
 * รัน: node scripts/import-entrance-m1-pretest-r2.js          (dry-run ตรวจอย่างเดียว)
 *      node scripts/import-entrance-m1-pretest-r2.js --apply  (เขียนจริง)
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');

const SRC_DIR = '/Users/kruheem/Documents/workspace/kruheem-exams/00 · สอบเข้า ม.1/เก็งพรีเทสต์-รอบ2-10ชุด/output';
const CATEGORY = 'สอบเข้า ม.1';
const START_ORDER = 13;       // ของเดิมสูงสุด order = 12
const START_NO = 3;           // ต่อจาก "แนวข้อสอบ เข้า ม. 1 ชุดที่ 2"
const EXPECT_COUNT = 30;

// บันไดความยาก 3 ชั้น (ต้องตรงกับที่ plan_sets3.py จัดไว้)
const TIER = (n) => (n <= 4 ? { label: 'ปูพื้นสนามสอบ', vh: 3, h: 17, m: 10, diff: 'Medium' }
    : n <= 7 ? { label: 'สนามจริงมาตรฐาน', vh: 6, h: 14, m: 10, diff: 'Hard' }
        : { label: 'สนามแข่งขันเข้มข้น', vh: 11, h: 15, m: 4, diff: 'Hard' });
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
        if (!Array.isArray(q.tags) || q.tags.length !== 5) errs.push(`${at}: tags ไม่ครบ 5 ช่อง`);
        else if (q.tags[q.tags.length - 1] !== 'สอบเข้า ม.1') errs.push(`${at}: tag ระดับชั้นผิด`);
        if (!Array.isArray(q.distractorErrors) || q.distractorErrors.length !== 3) errs.push(`${at}: distractorErrors != 3`);
        else if (q.distractorErrors.some(d => d.choice === q.correctIndex)) errs.push(`${at}: distractor ชี้คำตอบถูก`);
        if (!Number.isInteger(q.expectedSeconds) || q.expectedSeconds <= 0) errs.push(`${at}: expectedSeconds ผิด`);
        if (!q.subskill) errs.push(`${at}: ไม่มี subskill`);
        if (!Number.isInteger(q.id) || q.id !== i + 1) errs.push(`${at}: id ต้องเป็น ${i + 1}`);
        if ('svg' in q && !String(q.svg).trim().startsWith('<svg')) errs.push(`${at}: svg ผิดรูป`);
        for (const bad of ['answer', 'solution', 'space', '_chapter', '_difficulty', '_traps']) {
            if (bad in q) errs.push(`${at}: มี field ต้องห้าม ${bad}`);
        }
    });
    if (errs.length) throw new Error(`${name} ตรวจไม่ผ่าน:\n  - ` + errs.slice(0, 12).join('\n  - '));
    return qs;
}

(async () => {
    console.log(`ปลายทาง: collection "exams" หมวด "${CATEGORY}"`);
    console.log(`โหมด: ${APPLY ? 'เขียนจริง (--apply)' : 'dry-run (ตรวจอย่างเดียว ไม่เขียน)'}\n`);

    const col = db.collection('exams');
    const existing = await col.where('category', '==', CATEGORY).get();
    const titles = new Set(existing.docs.map(d => d.data().title));
    const maxOrder = Math.max(...existing.docs.map(d => d.data().order ?? -1), -1);
    console.log(`ของเดิมในหมวดนี้ ${existing.size} ชุด · order สูงสุด ${maxOrder}\n`);
    if (maxOrder >= START_ORDER) {
        throw new Error(`order เริ่มต้น ${START_ORDER} ชนของเดิม (สูงสุด ${maxOrder}) — ปรับ START_ORDER ก่อน`);
    }

    let created = 0, skipped = 0, totalQ = 0, totalFig = 0;

    for (let n = 1; n <= 10; n++) {
        const nn = String(n).padStart(2, '0');
        const file = path.join(SRC_DIR, `webquiz_entrance_m1_pretest_r2_set${nn}_30q.json`);
        if (!fs.existsSync(file)) throw new Error(`ไม่พบไฟล์ต้นทาง: ${file}`);

        const no = START_NO + (n - 1);
        const title = `แนวข้อสอบ\nเข้า ม. 1 ชุดที่ ${no}`;
        const qs = validate(JSON.parse(fs.readFileSync(file, 'utf8')), `ชุดที่ ${no}`);

        const t = TIER(n);
        const got = LEVELS.map(l => qs.filter(q => q.tags.includes(l)).length);
        if (got[0] !== t.vh || got[1] !== t.h || got[2] !== t.m) {
            throw new Error(`ชุดที่ ${no}: ระดับไม่ตรงเป้า ได้ [${got}] ต้องการ [${t.vh},${t.h},${t.m}]`);
        }

        const figs = qs.filter(q => q.svg).length;
        const mins = Math.round(qs.reduce((s, q) => s + q.expectedSeconds, 0) / 60);
        const sizeKB = Math.round(Buffer.byteLength(JSON.stringify(qs), 'utf8') / 1024);
        if (sizeKB > 900) throw new Error(`ชุดที่ ${no}: ${sizeKB}KB ใกล้เพดาน 1MiB ของ Firestore`);

        if (titles.has(title)) {
            console.log(`ข้าม (มีอยู่แล้ว): ชุดที่ ${no}`);
            skipped++;
            continue;
        }

        const payload = {
            title,
            category: CATEGORY,
            level: 'ป.6',
            examType: 'entrance',
            difficulty: t.diff,
            description: 'เก็งจากพรีเทสต์สนามจริง 22 ฉบับ ปี 64-69',
            questions: qs,
            questionCount: qs.length,
            timeLimit: Math.max(30, Math.ceil(mins / 5) * 5),
            themeColor: 'Violet',
            coverImage: '',
            tags: [],
            hidden: false,
            isFree: false,
            showAnswerChecking: true,
            order: START_ORDER + (n - 1),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const info = `${qs.length} ข้อ · ${t.label} (ยากมาก ${got[0]} ยาก ${got[1]} กลาง ${got[2]}) · รูป ${figs} · ~${mins} นาที · ${sizeKB}KB`;
        if (APPLY) {
            const ref = await col.add(payload);
            console.log(`สร้างแล้ว: ชุดที่ ${no} [${ref.id}] — ${info}`);
            created++;
        } else {
            console.log(`พร้อมนำเข้า: ชุดที่ ${no} (order ${payload.order}) — ${info}`);
        }
        totalQ += qs.length;
        totalFig += figs;
    }

    console.log(`\nรวม ${totalQ} ข้อ · รูป ${totalFig} รูป`);
    console.log(APPLY ? `สรุป: สร้าง ${created} ชุด / ข้าม ${skipped}`
        : `สรุป: dry-run ผ่านทั้งหมด — รันซ้ำด้วย --apply เพื่อเขียนจริง`);
    process.exit(0);
})().catch(e => { console.error('ผิดพลาด:', e.message); process.exit(1); });
