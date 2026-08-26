/**
 * นำเข้าชุด "แผนภูมิและกราฟ" ป.6 จำนวน 100 ข้อ เข้าคลังข้อสอบ
 *
 * ที่มาของโจทย์: ดัดแปลงจากคลังข้อสอบสมาคมผู้บริหารโรงเรียนประถมศึกษาฯ
 * (2528-2562) โดยเปลี่ยนบริบท ตัวเลข และมุมถามใหม่ทั้งหมด แล้วสร้างตัวเลือก
 * ลวงจาก error pattern จริงของเด็ก ป.6
 *
 * ตรวจก่อนอัปทุกข้อ: คำตอบผูกกับค่าที่คำนวณได้ · ค่าทุกตัวตกเส้นกริด ·
 * ตัวเลือกไม่ซ้ำ · เฉลยขึ้นต้นตรงกับ correctIndex · รูป SVG ไม่ล้นกรอบ
 *
 * รัน: node scripts/import-p6-charts-graphs.js          (dry-run)
 *      node scripts/import-p6-charts-graphs.js --apply  (เขียนจริง)
 *
 * หลังเขียนจริง ต้องรัน: node scripts/bust-caches.js exams
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');
const SRC = path.resolve(process.env.HOME,
    'Documents/workspace/kruheem-exams/p6-charts-graphs/work/final-100q.json');
const BACKUP_DIR = path.resolve(__dirname, 'tmp');

const LIMIT = 1048576;   // เพดาน Firestore ต่อ 1 doc
const SAFE = 1000000;

const DOC = {
    title: 'แผนภูมิและกราฟ',
    description: 'รายละเอียดเบื้องต้น...',
    category: 'ป.4-ป.6',
    level: 'ป.6',
    order: 27.5,             // ต่อท้าย "เส้นขนาน" (27) — order 28 เป็นของบล็อก ม.1 แล้ว
    timeLimit: 30,
    difficulty: 'Medium',
    themeColor: 'Amber',
    tags: ['เนื้อหารายบท'],
    showAnswerChecking: true,
    isFree: false,
};

const utf8 = (s) => Buffer.byteLength(s, 'utf8');
function docSize(obj) {
    const sz = (v) => {
        if (v == null) return 1;
        const t = typeof v;
        if (t === 'string') return utf8(v) + 1;
        if (t === 'boolean') return 1;
        if (t === 'number') return 8;
        if (Array.isArray(v)) return v.reduce((s, e) => s + sz(e), 0);
        if (t === 'object') { let s = 32; for (const [k, val] of Object.entries(v)) s += utf8(k) + 1 + sz(val); return s; }
        return 8;
    };
    let total = 32;
    for (const [k, v] of Object.entries(obj)) total += utf8(k) + 1 + sz(v);
    return total;
}

function validate(qs) {
    const errs = [];
    const skel = new Map();
    const ci = [0, 0, 0, 0];
    const lv = {};
    qs.forEach((q, i) => {
        const at = `ข้อ ${i + 1}`;
        if (typeof q.question !== 'string' || !q.question.trim()) errs.push(`${at}: โจทย์ว่าง`);
        if (!Array.isArray(q.options) || q.options.length !== 4) errs.push(`${at}: ตัวเลือกไม่ครบ 4`);
        else if (new Set(q.options).size !== 4) errs.push(`${at}: ตัวเลือกซ้ำกัน`);
        if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) errs.push(`${at}: correctIndex ผิด`);
        else ci[q.correctIndex]++;
        if (typeof q.explanation !== 'string' || !q.explanation.trim()) errs.push(`${at}: เฉลยว่าง`);
        else if (!q.explanation.startsWith(`**คำตอบ: ข้อ ${q.correctIndex + 1}.**`)) errs.push(`${at}: เฉลยขึ้นต้นไม่ตรงกับ correctIndex`);
        else if (q.explanation.length < 700) errs.push(`${at}: เฉลยสั้นผิดปกติ ${q.explanation.length} ตัวอักษร`);
        if (!Array.isArray(q.tags) || !q.tags.length) errs.push(`${at}: ไม่มี tag`);
        else {
            const l = q.tags.find((t) => ['ง่าย', 'กลาง', 'ยาก', 'ยากมาก'].includes(t));
            if (!l) errs.push(`${at}: ไม่มี tag ระดับความยาก`); else lv[l] = (lv[l] || 0) + 1;
        }
        if ('svg' in q && (typeof q.svg !== 'string' || !q.svg.trim().startsWith('<svg') || !q.svg.trim().endsWith('</svg>')))
            errs.push(`${at}: svg เสีย — เว็บจะไม่แสดงรูป`);
        // ตัวลวงต้องไม่ชี้ไปที่คำตอบถูก
        (q.distractorErrors || []).forEach((d) => {
            if (d.choice === q.correctIndex) errs.push(`${at}: distractorErrors ชี้ไปที่คำตอบถูก`);
        });
        for (const bad of ['answer', 'solution']) if (bad in q) errs.push(`${at}: มี field ต้องห้าม ${bad}`);
        const k = String(q.question).replace(/[0-9,.]+/g, '#').replace(/\s+/g, ' ').trim();
        if (skel.has(k)) errs.push(`${at}: โจทย์ซ้ำโครงกับข้อ ${skel.get(k)}`); else skel.set(k, i + 1);
    });
    return { errs, ci, lv, distinct: skel.size };
}

(async () => {
    console.log(`โหมด: ${APPLY ? '✍️  เขียนจริง (--apply)' : '🔍 dry-run — ตรวจอย่างเดียว ไม่เขียนอะไร'}\n`);
    if (!fs.existsSync(SRC)) { console.error(`❌ ไม่พบไฟล์ต้นทาง: ${SRC}`); process.exit(1); }

    const qs = JSON.parse(fs.readFileSync(SRC, 'utf8'));
    const { errs, ci, lv, distinct } = validate(qs);

    console.log(`── ${DOC.title} (${DOC.category} / ${DOC.level}) ──`);
    console.log(`   จำนวนข้อ: ${qs.length}`);
    console.log(`   ความยาก: ${['ง่าย', 'กลาง', 'ยาก', 'ยากมาก'].map((k) => `${k} ${lv[k] || 0}`).join(' · ')}`);
    console.log(`   การกระจายคำตอบ ก/ข/ค/ง: ${ci.join(' / ')}`);
    console.log(`   มีรูป SVG: ${qs.filter((q) => q.svg).length} ข้อ · มีตาราง: ${qs.filter((q) => q.question.includes('|---')).length} ข้อ`);
    console.log(`   โครงโจทย์ต่างกัน: ${distinct} แบบ`);
    console.log(`   เฉลยเฉลี่ย: ${Math.round(qs.reduce((s, q) => s + q.explanation.length, 0) / qs.length)} ตัวอักษร`);

    if (errs.length) {
        console.error(`\n   ❌ ตรวจไม่ผ่าน ${errs.length} จุด:`);
        errs.slice(0, 20).forEach((e) => console.error('      -', e));
        process.exit(1);
    }
    console.log('   ✅ ตรวจโครงสร้างผ่านทุกข้อ');

    // กันสร้างซ้ำ
    const dup = await db.collection('exams').where('title', '==', DOC.title).get();
    if (!dup.empty) {
        console.error(`\n❌ มีชุดชื่อ "${DOC.title}" อยู่แล้ว ${dup.size} ชุด — หยุดก่อน กันสร้างซ้ำ`);
        dup.forEach((d) => console.error(`   [${d.id}] ${d.data().category} order ${d.data().order} · ${(d.data().questions || []).length} ข้อ`));
        process.exit(1);
    }

    const next = {
        ...DOC,
        questions: qs,
        questionCount: qs.length,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const size = docSize({ ...next, createdAt: new Date(), updatedAt: new Date() });
    console.log(`\n   ขนาด doc ที่จะเขียน: ${size.toLocaleString()} ไบต์ (${(size / LIMIT * 100).toFixed(1)}% ของเพดาน 1 MiB)`);
    if (size > SAFE) { console.error('   ❌ ใหญ่เกินไป ต้องแบ่งชุด'); process.exit(1); }

    if (!APPLY) {
        console.log('\n(dry-run) สั่ง --apply เพื่อเขียนจริง');
        process.exit(0);
    }

    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const ref = await db.collection('exams').add(next);
    const bak = path.join(BACKUP_DIR, `p6-charts-graphs-${ref.id}.json`);
    fs.writeFileSync(bak, JSON.stringify({ id: ref.id, ...DOC, questions: qs }, null, 1), 'utf8');

    console.log(`\n✅ สร้างชุดใหม่แล้ว [${ref.id}] "${DOC.title}" ${qs.length} ข้อ`);
    console.log(`   สำรองไว้ที่ ${path.relative(process.cwd(), bak)}`);
    console.log('\n⚠️  ขั้นต่อไป: node scripts/bust-caches.js exams');
    console.log('⚠️  ชุดนี้ยังไม่มีภาพปก — ครูฮีมเลือกปกได้ที่ /admin (แก้ไขชุดข้อสอบ)');
    process.exit(0);
})();
