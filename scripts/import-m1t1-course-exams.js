/**
 * นำเข้าชุดตะลุยโจทย์ของคอร์ส "ม.1 เทอม 1" (fhoc1u2JT8WghFHapzx8)
 * วางเป็นบทเรียน type:'html' (ExamRunner อ่านโจทย์จาก field `content` ที่เป็น JSON string)
 *
 *   node scripts/import-m1t1-course-exams.js              ตรวจอย่างเดียว (dry-run) ทุกชุดที่ผลิตเสร็จ
 *   node scripts/import-m1t1-course-exams.js dec          เจาะเฉพาะชุดที่ระบุ
 *   node scripts/import-m1t1-course-exams.js dec --apply  เขียนจริง (LIVE ทันที ไม่ต้อง deploy)
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const OUT = path.resolve(process.env.HOME, 'Documents/kruheem-exams/m1t1-course-2026-09/output');
const COURSE_ID = 'fhoc1u2JT8WghFHapzx8';

const SETS = {
    dec: {
        title: 'แนวข้อสอบ: ทศนิยม',
        order: 212,
        file: 'webquiz_m1t1_decimal_200q.json',
        subject: 'ทศนิยม',
        count: 200,
        subtopics: ['ค่าประจำหลักของทศนิยม', 'การเปรียบเทียบทศนิยม', 'การบวกลบทศนิยม', 'การคูณทศนิยม',
            'การหารทศนิยม', 'การปัดทศนิยม', 'ทศนิยมกับเศษส่วน', 'ทศนิยมซ้ำ', 'โจทย์ปัญหาทศนิยม'],
    },
};

const LEVELS = ['ง่าย', 'กลาง', 'ยาก', 'ยากมาก'];
const SKILLS = ['คิดเลข', 'เข้าใจ', 'แปลโจทย์'];
const GRADE = 'ม.1';
const APPLY = process.argv.includes('--apply');
const picked = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const targets = (picked.length ? picked : Object.keys(SETS))
    .filter((k) => SETS[k] && fs.existsSync(path.join(OUT, SETS[k].file)));

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

/** ด่านตรวจก่อนขึ้นเว็บ — ตรวจซ้ำจากฝั่ง node ไม่เชื่อไฟล์อย่างเดียว */
function validate(qs, S) {
    const errs = [];
    if (!Array.isArray(qs)) throw new Error(`${S.title}: ไม่ใช่ array`);
    if (qs.length !== S.count) errs.push(`จำนวนข้อ ${qs.length} ไม่ใช่ ${S.count}`);
    const levelCount = {};
    const subCount = {};
    const ciCount = [0, 0, 0, 0];
    qs.forEach((q, i) => {
        const t = `ข้อ ${i + 1}`;
        if (q.id !== i + 1) errs.push(`${t}: id ${q.id} ไม่เรียง 1..${S.count}`);
        if (typeof q.question !== 'string' || !q.question.trim()) errs.push(`${t}: โจทย์ว่าง`);
        if (!Array.isArray(q.options) || q.options.length !== 4) errs.push(`${t}: ตัวเลือกไม่ครบ 4`);
        else if (new Set(q.options.map(String)).size !== 4) errs.push(`${t}: ตัวเลือกซ้ำ`);
        if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) errs.push(`${t}: correctIndex ผิด`);
        else ciCount[q.correctIndex]++;
        if (typeof q.explanation !== 'string' || !q.explanation.trim()) errs.push(`${t}: ไม่มีเฉลย`);
        else if (!q.explanation.startsWith(`**คำตอบ: ข้อ ${q.correctIndex + 1}.**`)) errs.push(`${t}: เฉลยขึ้นต้นไม่ตรงกับ correctIndex`);
        if (!Array.isArray(q.tags) || q.tags.length !== 5) errs.push(`${t}: tags ต้องมี 5 มิติ`);
        else {
            if (q.tags[0] !== S.subject) errs.push(`${t}: สาระไม่ใช่ ${S.subject}`);
            if (!S.subtopics.includes(q.tags[1])) errs.push(`${t}: หัวข้อย่อยแปลกปลอม ${q.tags[1]}`);
            else subCount[q.tags[1]] = (subCount[q.tags[1]] || 0) + 1;
            if (!SKILLS.includes(q.tags[2])) errs.push(`${t}: tag ทักษะผิด`);
            if (!LEVELS.includes(q.tags[3])) errs.push(`${t}: tag ระดับผิด`);
            else levelCount[q.tags[3]] = (levelCount[q.tags[3]] || 0) + 1;
            if (q.tags[4] !== GRADE) errs.push(`${t}: tag ชั้นไม่ใช่ ${GRADE}`);
            q.tags.forEach((x) => { if (/[A-Za-z]/.test(x)) errs.push(`${t}: tag มีอักษรละติน '${x}'`); });
        }
        if (!Array.isArray(q.distractorErrors) || q.distractorErrors.length !== 3) errs.push(`${t}: distractorErrors ไม่ครบ 3`);
        else if (q.distractorErrors.some((d) => d.choice === q.correctIndex)) errs.push(`${t}: distractorErrors ชี้ทับคำตอบถูก`);
        if (!Number.isInteger(q.expectedSeconds) || q.expectedSeconds <= 0) errs.push(`${t}: expectedSeconds ผิด`);
        if (typeof q.subskill !== 'string' || !q.subskill.trim()) errs.push(`${t}: ไม่มี subskill`);
        Object.keys(q).filter((k) => k.startsWith('_')).forEach((k) => errs.push(`${t}: ยังมี field ชั่วคราว ${k}`));
        ['answer', 'solution', 'space'].filter((k) => k in q).forEach((k) => errs.push(`${t}: มี field ต้องห้าม ${k}`));
    });
    if (errs.length) throw new Error(`${S.title} ตรวจไม่ผ่าน:\n  - ${errs.slice(0, 25).join('\n  - ')}`);
    return { levelCount, ciCount, subCount };
}

(async () => {
    const courseSnap = await db.collection('courses').doc(COURSE_ID).get();
    if (!courseSnap.exists) throw new Error(`ไม่พบคอร์ส ${COURSE_ID}`);
    console.log(`คอร์สปลายทาง: ${courseSnap.data().title} [${COURSE_ID}]`);
    console.log(`โหมด: ${APPLY ? '✍️  เขียนจริง (--apply)' : '🔍 dry-run ตรวจอย่างเดียว'}`);
    console.log(`ชุดที่ผลิตเสร็จแล้ว: ${targets.length ? targets.join(', ') : '(ยังไม่มี)'}\n`);
    if (!targets.length) return process.exit(0);

    const lessonsCol = db.collection('courses').doc(COURSE_ID).collection('lessons');
    let created = 0, updated = 0;

    for (const key of targets) {
        const S = SETS[key];
        const qs = JSON.parse(fs.readFileSync(path.join(OUT, S.file), 'utf8'));
        const stat = validate(qs, S);
        const content = JSON.stringify(qs);
        const sizeKB = Math.round(Buffer.byteLength(content, 'utf8') / 1024);
        if (sizeKB > 900) throw new Error(`${S.title}: content ${sizeKB}KB ใกล้เพดาน 1MiB ของ Firestore`);

        const dup = await lessonsCol.where('title', '==', S.title).limit(1).get();
        const payload = {
            title: S.title, type: 'html', headerId: '', htmlCode: '', content,
            isFree: false, order: S.order, updatedAt: new Date().toISOString(),
        };
        console.log(`${dup.empty ? '➕ ใหม่' : '♻️  ทับของเดิม'}  ${S.title}`);
        console.log(`      ${qs.length} ข้อ · ${sizeKB}KB · เฉลยกระจาย ${stat.ciCount.join('/')}`);
        console.log(`      ระดับ ${LEVELS.map((t) => `${t}=${stat.levelCount[t] || 0}`).join(' ')}`);
        console.log(`      หัวข้อย่อย ${S.subtopics.map((t) => `${t}=${stat.subCount[t] || 0}`).join(' · ')}`);
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
