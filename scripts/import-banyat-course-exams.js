/**
 * นำเข้าชุดข้อสอบ "ตะลุยโจทย์บัญญัติไตรยางค์ 7 ชุด 700 ข้อ" เข้าคอร์สการเทียบบัญญัติไตรยางค์
 * (xELVM7Nbeua9jm0NjJK7) — วางเป็นบทเรียน type:'html' ต่อท้าย EP15 แบบเดียวกับคอร์สเก่งสมการ
 * (ExamRunner อ่านโจทย์จาก field `content` ที่เป็น JSON string)
 *
 *   node scripts/import-banyat-course-exams.js            ตรวจอย่างเดียว (dry-run) ทุกชุดที่ผลิตเสร็จ
 *   node scripts/import-banyat-course-exams.js 1 3        เจาะเฉพาะชุดที่ระบุ
 *   node scripts/import-banyat-course-exams.js 1 --apply  เขียนจริง (LIVE ทันที ไม่ต้อง deploy)
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const OUT = path.resolve(process.env.HOME, 'Documents/kruheem-exams/banyat-course-2026-09/output');
const COURSE_ID = 'xELVM7Nbeua9jm0NjJK7';
const HEADER_ORDER = 18.5;
const HEADER_TITLE = 'ตะลุยโจทย์ท้ายคอร์ส 7 ชุด 700 ข้อ';

const SETS = {
    1: { title: 'ตะลุยโจทย์ บัญญัติไตรยางค์ 1 ชั้น · ชุดที่ 1', order: 19, subtopic: 'บัญญัติไตรยางค์ชั้นเดียว' },
    2: { title: 'ตะลุยโจทย์ บัญญัติไตรยางค์ 1 ชั้น · ชุดที่ 2', order: 20, subtopic: 'บัญญัติไตรยางค์ชั้นเดียว' },
    3: { title: 'ตะลุยโจทย์ บัญญัติไตรยางค์ 2 ชั้น · ชุดที่ 1', order: 21, subtopic: 'บัญญัติไตรยางค์สองชั้น' },
    4: { title: 'ตะลุยโจทย์ บัญญัติไตรยางค์ 2 ชั้น · ชุดที่ 2', order: 22, subtopic: 'บัญญัติไตรยางค์สองชั้น' },
    5: { title: 'ตะลุยโจทย์ บัญญัติไตรยางค์ 3 ชั้น · ชุดที่ 1', order: 23, subtopic: 'บัญญัติไตรยางค์สามชั้น' },
    6: { title: 'ตะลุยโจทย์ บัญญัติไตรยางค์ 3 ชั้น · ชุดที่ 2', order: 24, subtopic: 'บัญญัติไตรยางค์สามชั้น' },
    7: { title: 'ตะลุยโจทย์ บัญญัติไตรยางค์ 3 ชั้น · ชุดที่ 3', order: 25, subtopic: 'บัญญัติไตรยางค์สามชั้น' },
};

const LEVEL_TAGS = ['ง่าย', 'กลาง', 'ยาก'];
const APPLY = process.argv.includes('--apply');
const picked = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const targets = (picked.length ? picked : Object.keys(SETS).map(Number))
    .filter((n) => fs.existsSync(path.join(OUT, `set${n}-100q.json`)));

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

/** ด่านตรวจก่อนขึ้นเว็บ — ตรวจซ้ำจากฝั่ง node ไม่เชื่อไฟล์อย่างเดียว */
function validate(qs, name, subtopic) {
    const errs = [];
    if (!Array.isArray(qs)) throw new Error(`${name}: ไม่ใช่ array`);
    if (qs.length !== 100) errs.push(`จำนวนข้อ ${qs.length} ไม่ใช่ 100`);
    const levelCount = {};
    const ciCount = [0, 0, 0, 0];
    qs.forEach((q, i) => {
        const t = `ข้อ ${i + 1}`;
        if (q.id !== i + 1) errs.push(`${t}: id ${q.id} ไม่เรียง 1..100`);
        if (typeof q.question !== 'string' || !q.question.trim()) errs.push(`${t}: โจทย์ว่าง`);
        if (!Array.isArray(q.options) || q.options.length !== 4) errs.push(`${t}: ตัวเลือกไม่ครบ 4`);
        else if (new Set(q.options.map(String)).size !== 4) errs.push(`${t}: ตัวเลือกซ้ำ`);
        if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) errs.push(`${t}: correctIndex ผิด`);
        else ciCount[q.correctIndex]++;
        if (typeof q.explanation !== 'string' || !q.explanation.trim()) errs.push(`${t}: ไม่มีเฉลย`);
        else if (!q.explanation.startsWith(`**คำตอบ: ข้อ ${q.correctIndex + 1}.**`)) errs.push(`${t}: เฉลยขึ้นต้นไม่ตรงกับ correctIndex`);
        if (!Array.isArray(q.tags) || !q.tags.length) errs.push(`${t}: ไม่มี tags`);
        else {
            const lv = q.tags.filter((x) => LEVEL_TAGS.includes(x));
            if (lv.length !== 1) errs.push(`${t}: tag ระดับความยากต้องมี 1 ตัว`);
            else levelCount[lv[0]] = (levelCount[lv[0]] || 0) + 1;
            if (q.tags.includes('ยากมาก')) errs.push(`${t}: ห้ามมีระดับยากมาก`);
            if (!q.tags.includes('บัญญัติไตรยางค์')) errs.push(`${t}: ไม่มีสาระ บัญญัติไตรยางค์`);
            if (!q.tags.includes(subtopic)) errs.push(`${t}: ไม่มีหัวข้อย่อย ${subtopic}`);
        }
        if (!Array.isArray(q.distractorErrors) || q.distractorErrors.length !== 3) errs.push(`${t}: distractorErrors ไม่ครบ 3`);
        if (!Number.isInteger(q.expectedSeconds) || q.expectedSeconds <= 0) errs.push(`${t}: expectedSeconds ผิด`);
        if (typeof q.subskill !== 'string' || !q.subskill.trim()) errs.push(`${t}: ไม่มี subskill`);
        Object.keys(q).filter((k) => k.startsWith('_')).forEach((k) => errs.push(`${t}: ยังมี field ชั่วคราว ${k}`));
        ['answer', 'solution', 'space'].filter((k) => k in q).forEach((k) => errs.push(`${t}: มี field ต้องห้าม ${k}`));
    });
    if (errs.length) throw new Error(`${name} ตรวจไม่ผ่าน:\n  - ${errs.slice(0, 25).join('\n  - ')}`);
    return { levelCount, ciCount };
}

(async () => {
    const courseSnap = await db.collection('courses').doc(COURSE_ID).get();
    if (!courseSnap.exists) throw new Error(`ไม่พบคอร์ส ${COURSE_ID}`);
    console.log(`คอร์สปลายทาง: ${courseSnap.data().title} [${COURSE_ID}]`);
    console.log(`โหมด: ${APPLY ? '✍️  เขียนจริง (--apply)' : '🔍 dry-run ตรวจอย่างเดียว'}`);
    console.log(`ชุดที่ผลิตเสร็จแล้ว: ${targets.length ? targets.join(', ') : '(ยังไม่มี)'}\n`);
    if (!targets.length) return process.exit(0);

    const lessonsCol = db.collection('courses').doc(COURSE_ID).collection('lessons');

    // หัวข้อคั่นก่อนชุดข้อสอบ (สร้างครั้งเดียว)
    const hdrDup = await lessonsCol.where('title', '==', HEADER_TITLE).limit(1).get();
    if (hdrDup.empty) {
        console.log(`${APPLY ? '➕ สร้าง' : '   (dry-run) จะสร้าง'} หัวข้อคั่น "${HEADER_TITLE}" order ${HEADER_ORDER}`);
        if (APPLY) {
            await lessonsCol.add({
                title: HEADER_TITLE, type: 'header', headerId: '', htmlCode: '', content: '',
                isFree: false, order: HEADER_ORDER, createdAt: new Date().toISOString(),
            });
        }
    } else {
        console.log(`   หัวข้อคั่นมีอยู่แล้ว [${hdrDup.docs[0].id}]`);
    }

    let created = 0, updated = 0;
    for (const n of targets) {
        const S = SETS[n];
        const qs = JSON.parse(fs.readFileSync(path.join(OUT, `set${n}-100q.json`), 'utf8'));
        const stat = validate(qs, S.title, S.subtopic);
        const content = JSON.stringify(qs);
        const sizeKB = Math.round(Buffer.byteLength(content, 'utf8') / 1024);
        if (sizeKB > 900) throw new Error(`${S.title}: content ${sizeKB}KB ใกล้เพดาน 1MiB ของ Firestore`);

        const dup = await lessonsCol.where('title', '==', S.title).limit(1).get();
        const payload = {
            title: S.title, type: 'html', headerId: '', htmlCode: '', content,
            isFree: false, order: S.order, updatedAt: new Date().toISOString(),
        };
        const mark = dup.empty ? '➕ ใหม่' : '♻️  ทับของเดิม';
        console.log(`${mark}  ${S.title}`);
        console.log(`      ${qs.length} ข้อ · ${sizeKB}KB · ระดับ ${LEVEL_TAGS.map((t) => `${t}=${stat.levelCount[t] || 0}`).join(' ')} · เฉลยกระจาย ${stat.ciCount.join('/')}`);
        if (APPLY) {
            if (dup.empty) { await lessonsCol.add({ ...payload, createdAt: new Date().toISOString() }); created++; }
            else { await lessonsCol.doc(dup.docs[0].id).update(payload); updated++; }
        }
    }

    if (APPLY) {
        // เว็บอ่านเมนูบทเรียนจากสารบัญ lessons/_index — ต้อง rebuild ไม่งั้นบทใหม่ล่องหน
        const { rebuildLessonsIndex } = require('./lib/lessons-index');
        const nIdx = await rebuildLessonsIndex(db, COURSE_ID);
        console.log(`\n🔄 rebuild lessons/_index แล้ว (${nIdx} บทเรียน)`);
    }

    console.log(`\n${APPLY ? `เสร็จ: สร้างใหม่ ${created} ชุด · อัปเดต ${updated} ชุด (LIVE แล้ว)` : 'dry-run ผ่านทั้งหมด — เติม --apply เพื่อเขียนจริง'}`);
    process.exit(0);
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
