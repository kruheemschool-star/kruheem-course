/**
 * นำเข้าชุดข้อสอบ "ตะลุยโจทย์ 19 เลเวล" เข้าคอร์สเก่งสมการ (z41lCWEynOVjHhaoeT9B)
 *
 * วางเป็นบทเรียน type:'html' ต่อท้ายวิดีโอ EP59 แบบเดียวกับคอร์ส Gifted ม.1 และ ป.6 สอบเข้า ม.1
 * (ExamRunner อ่านโจทย์จาก field `content` ที่เป็น JSON string — ไม่ใส่ id รายข้อ ระบบ hash เอง)
 *
 *   node scripts/import-equation-level-exams.js            ตรวจอย่างเดียว (dry-run) ทุกเลเวลที่ผลิตเสร็จ
 *   node scripts/import-equation-level-exams.js 1 2 3      เจาะเฉพาะเลเวลที่ระบุ
 *   node scripts/import-equation-level-exams.js 1 --apply  เขียนจริง (LIVE ทันที ไม่ต้อง deploy)
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const OUT = path.resolve(process.env.HOME, 'Documents/kruheem-exams/equation-course-2026-08/output');
const COURSE_ID = 'z41lCWEynOVjHhaoeT9B';
const HEADER_ORDER = 60.5;

const LEVELS = {
    1: 'สมการที่มีบวกหรือลบเลขตัวเดียว',
    2: 'เทคนิคการย้ายข้างบวก ลบ',
    3: 'ตัวเลขอยู่หน้าตัวแปร',
    4: 'สมการที่มีตัวเลขคูณหารหน้าตัวแปร',
    5: 'สมการที่มีตัวแปรเป็นตัวส่วน',
    6: 'ย้ายข้างไปคูณหรือหาร',
    7: 'ย้ายข้างไปคูณและหารพร้อมกัน',
    8: 'เทคนิคการคูณไขว้',
    9: 'เทคนิคการกลับเศษส่วน',
    10: 'สมการผสมบวก ลบ คูณ หาร',
    11: 'สมการที่มีเศษส่วน',
    12: 'กำจัดตัวส่วนด้วย ค.ร.น.',
    13: 'บวก ลบ สมการที่มีทศนิยม',
    14: 'คูณ หาร สมการที่มีทศนิยม',
    15: 'เปลี่ยนทศนิยมให้เป็นจำนวนเต็ม',
    16: 'ลำดับการคำนวณ',
    17: 'สมการที่มีตัวแปรมากกว่า 1 ตำแหน่ง',
    18: 'สมการที่มีลบหน้าวงเล็บ',
    19: 'สมการจำนวนติดลบ',
};

const LEVEL_TAGS = ['กลาง', 'ยาก', 'ยากมาก'];
const APPLY = process.argv.includes('--apply');
const picked = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const targets = (picked.length ? picked : Object.keys(LEVELS).map(Number))
    .filter((n) => fs.existsSync(path.join(OUT, `lev${String(n).padStart(2, '0')}-100q.json`)));

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const titleOf = (n) => `ตะลุยโจทย์ เลเวล ${n} · ${LEVELS[n]}`;

/** ด่านตรวจก่อนขึ้นเว็บ — ตรวจซ้ำจากฝั่ง node ไม่เชื่อไฟล์อย่างเดียว */
function validate(qs, name) {
    const errs = [];
    if (!Array.isArray(qs)) throw new Error(`${name}: ไม่ใช่ array`);
    if (qs.length !== 100) errs.push(`จำนวนข้อ ${qs.length} ไม่ใช่ 100`);
    const levelCount = {};
    const ciCount = [0, 0, 0, 0];
    qs.forEach((q, i) => {
        const t = `ข้อ ${i + 1}`;
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
            if (q.tags.includes('ง่าย')) errs.push(`${t}: ห้ามมีระดับง่าย`);
        }
        Object.keys(q).filter((k) => k.startsWith('_')).forEach((k) => errs.push(`${t}: ยังมี field ชั่วคราว ${k}`));
    });
    if (errs.length) throw new Error(`${name} ตรวจไม่ผ่าน:\n  - ${errs.slice(0, 25).join('\n  - ')}`);
    return { levelCount, ciCount };
}

(async () => {
    const courseSnap = await db.collection('courses').doc(COURSE_ID).get();
    if (!courseSnap.exists) throw new Error(`ไม่พบคอร์ส ${COURSE_ID}`);
    console.log(`คอร์สปลายทาง: ${courseSnap.data().title} [${COURSE_ID}]`);
    console.log(`โหมด: ${APPLY ? '✍️  เขียนจริง (--apply)' : '🔍 dry-run ตรวจอย่างเดียว'}`);
    console.log(`เลเวลที่ผลิตเสร็จแล้ว: ${targets.length ? targets.join(', ') : '(ยังไม่มี)'}\n`);
    if (!targets.length) return process.exit(0);

    const lessonsCol = db.collection('courses').doc(COURSE_ID).collection('lessons');

    // หัวข้อคั่นก่อนชุดข้อสอบ (สร้างครั้งเดียว)
    const HEADER_TITLE = 'ตะลุยโจทย์ท้ายคอร์ส 19 เลเวล เลเวลละ 100 ข้อ';
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
        const L = String(n).padStart(2, '0');
        const qs = JSON.parse(fs.readFileSync(path.join(OUT, `lev${L}-100q.json`), 'utf8'));
        const title = titleOf(n);
        const stat = validate(qs, title);
        const content = JSON.stringify(qs);
        const sizeKB = Math.round(Buffer.byteLength(content, 'utf8') / 1024);
        if (sizeKB > 900) throw new Error(`${title}: content ${sizeKB}KB ใกล้เพดาน 1MiB ของ Firestore`);

        const dup = await lessonsCol.where('title', '==', title).limit(1).get();
        const payload = {
            title, type: 'html', headerId: '', htmlCode: '', content,
            isFree: false, order: 60 + n, updatedAt: new Date().toISOString(),
        };
        const mark = dup.empty ? '➕ ใหม่' : '♻️  ทับของเดิม';
        console.log(`${mark}  ${title}`);
        console.log(`      ${qs.length} ข้อ · ${sizeKB}KB · ระดับ ${LEVEL_TAGS.map((t) => `${t}=${stat.levelCount[t] || 0}`).join(' ')} · เฉลยกระจาย ${stat.ciCount.join('/')}`);
        if (APPLY) {
            if (dup.empty) { await lessonsCol.add({ ...payload, createdAt: new Date().toISOString() }); created++; }
            else { await lessonsCol.doc(dup.docs[0].id).update(payload); updated++; }
        }
    }

    console.log(`\n${APPLY ? `เสร็จ: สร้างใหม่ ${created} ชุด · อัปเดต ${updated} ชุด (LIVE แล้ว)` : 'dry-run ผ่านทั้งหมด — เติม --apply เพื่อเขียนจริง'}`);
    process.exit(0);
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
