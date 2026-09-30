/**
 * แทนที่ข้อสอบชุด "โจทย์ปัญหาคูณ หาร ระคน" (exams/41Ruf9BULIxtWEFWXZNR)
 * ด้วยชุดใหม่ 250 ข้อที่เขียนใหม่ทั้งหมด (ของเดิมมีโจทย์แค่ 4 แบบวนซ้ำ 65/65/60/60)
 *
 * — ไฟล์ต้นทาง: ~/Documents/kruheem-exams/rework-2026-08/muldiv-41Ruf/output/*.json
 *   (ทุกข้อผ่าน SymPy + ตรวจรูปแบบด้วย verify.py แล้ว)
 * — สำรองของเดิมลงไฟล์ก่อนเขียนทุกครั้ง
 * — แก้ชื่อชุด "ละคน" → "ระคน" ตามที่ครูฮีมสั่ง
 *
 * รัน: node scripts/replace-mixed-ops-exam.js          (dry-run ตรวจอย่างเดียว)
 *      node scripts/replace-mixed-ops-exam.js --apply  (เขียนจริง)
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');
const EXAM_ID = '41Ruf9BULIxtWEFWXZNR';
const NEW_TITLE = 'โจทย์ปัญหาคูณ หาร ระคน';
const WORK = path.resolve(process.env.HOME, 'Documents/kruheem-exams/rework-2026-08/muldiv-41Ruf');
const SRC = path.join(WORK, 'output/webquiz_muldiv_wordproblems_250q.json');

const ERROR_CODES = new Set([
    'ลืมเครื่องหมาย', 'ลำดับการดำเนินการผิด', 'คูณ-หารไม่ครบ', 'บวกตัวส่วน', 'สลับสูตร', 'ใช้บทกลับผิด',
    'ตอบค่ากลางทาง', 'นับคลาดหนึ่ง', 'สับสนนิยาม', 'ลืมแปลงหน่วย', 'ย้ายข้างไม่เปลี่ยนเครื่องหมาย',
    'อ่านโจทย์ผิด', 'ปัดเศษผิด', 'เดา', 'ใช้ข้อมูลไม่ครบ', 'สลับตัวตั้งตัวลบ', 'ลืมขั้นสุดท้าย', 'ยืมทดผิดหลัก', 'สลับตัวตั้งตัวหาร', 'ลืมเศษที่เหลือ',
]);
const LEVELS = new Set(['ง่าย', 'กลาง', 'ยาก', 'ยากมาก']);
const SKILLS = new Set(['คิดเลข', 'เข้าใจ', 'แปลโจทย์']);

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
    if (!Array.isArray(qs) || qs.length !== 250) errs.push(`จำนวนข้อ ${qs.length} != 250`);
    const ids = new Set();
    qs.forEach((q, i) => {
        const at = `ข้อ ${i + 1}`;
        if (q.id !== i + 1) errs.push(`${at}: id = ${q.id} ไม่เรียง 1..250`);
        if (ids.has(q.id)) errs.push(`${at}: id ซ้ำ`);
        ids.add(q.id);
        if (typeof q.question !== 'string' || !q.question.trim()) errs.push(`${at}: question ว่าง`);
        if (!Array.isArray(q.options) || q.options.length !== 4) errs.push(`${at}: options != 4`);
        else if (new Set(q.options).size !== 4) errs.push(`${at}: ตัวเลือกซ้ำ`);
        if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) errs.push(`${at}: correctIndex ผิด`);
        if (typeof q.explanation !== 'string' || !q.explanation.startsWith(`**คำตอบ: ข้อ ${q.correctIndex + 1}.**`)) errs.push(`${at}: เฉลยไม่ขึ้นต้นด้วยคำตอบที่ตรงกับ correctIndex`);
        const tags = q.tags || [];
        if ([...tags].filter((t) => SKILLS.has(t)).length !== 1) errs.push(`${at}: tag ทักษะไม่ครบ 1 ตัว`);
        if ([...tags].filter((t) => LEVELS.has(t)).length !== 1) errs.push(`${at}: tag ระดับไม่ครบ 1 ตัว`);
        if (!Array.isArray(q.distractorErrors) || q.distractorErrors.length !== 3) errs.push(`${at}: distractorErrors != 3`);
        else q.distractorErrors.forEach((d) => {
            if (d.choice === q.correctIndex) errs.push(`${at}: distractorErrors ชี้ไปที่คำตอบถูก`);
            if (!ERROR_CODES.has(d.code)) errs.push(`${at}: รหัสความพลาดไม่อยู่ในคลัง (${d.code})`);
        });
        if (!Number.isInteger(q.expectedSeconds) || q.expectedSeconds <= 0) errs.push(`${at}: expectedSeconds ผิด`);
        if (typeof q.subskill !== 'string' || !q.subskill.trim()) errs.push(`${at}: subskill ว่าง`);
        for (const bad of ['answer', 'solution', 'space']) if (bad in q) errs.push(`${at}: มี field ต้องห้าม ${bad}`);
    });
    // โครงโจทย์ซ้ำ (ตัวเลข → #)
    const skel = new Map();
    qs.forEach((q) => {
        const k = q.question.replace(/[0-9,.]+/g, '#').replace(/\s+/g, ' ').trim();
        if (skel.has(k)) errs.push(`ข้อ ${q.id}: โครงโจทย์ซ้ำกับข้อ ${skel.get(k)}`);
        else skel.set(k, q.id);
    });
    return errs;
}

(async () => {
    const questions = JSON.parse(fs.readFileSync(SRC, 'utf8'));
    const errs = validate(questions);
    console.log(`ไฟล์ต้นทาง: ${SRC}`);
    console.log(`โหมด: ${APPLY ? '✍️  เขียนจริง (--apply)' : '🔍 dry-run (ตรวจอย่างเดียว)'}\n`);
    if (errs.length) {
        console.error(`❌ ตรวจไม่ผ่าน ${errs.length} จุด:`);
        errs.slice(0, 30).forEach((e) => console.error('   -', e));
        process.exit(1);
    }
    console.log('✅ ตรวจไฟล์ผ่าน: 250 ข้อ, id 1-250 ไม่ซ้ำ, tags/distractorErrors/expectedSeconds ครบ, โครงโจทย์ไม่ซ้ำ');

    const ref = db.collection('exams').doc(EXAM_ID);
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`ไม่พบชุดข้อสอบ ${EXAM_ID}`);
    const cur = snap.data();
    console.log(`\nชุดปลายทาง: "${cur.title}" [${EXAM_ID}]`);
    console.log(`  ของเดิม: ${(cur.questions || []).length} ข้อ`);
    const skelOld = new Set((cur.questions || []).map((q) => String(q.question).replace(/[0-9,.]+/g, '#').replace(/\s+/g, ' ').trim()));
    console.log(`  ของเดิมมีโครงโจทย์ต่างกันเพียง ${skelOld.size} แบบ → ของใหม่ 250 แบบ`);

    const next = { ...cur, title: NEW_TITLE, questions, questionCount: questions.length };
    const size = docSize(next);
    console.log(`  ขนาด doc ใหม่: ${size.toLocaleString()} bytes (${((100 * size) / 1048576).toFixed(1)}% ของเพดาน 1MiB)`);
    if (size > 1000000) throw new Error('ขนาดเกินเพดาน Firestore — ต้องแบ่งชุด');

    if (!APPLY) {
        console.log('\n(dry-run) ยังไม่เขียนอะไรลงฐานข้อมูล — สั่ง --apply เพื่อเขียนจริง');
        process.exit(0);
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(WORK, `BACKUP-before-replace-${stamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(cur, null, 1));
    console.log(`\n💾 สำรองของเดิมไว้ที่ ${backupPath}`);

    await ref.update({
        title: NEW_TITLE,
        questions,
        questionCount: questions.length,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const after = (await ref.get()).data();
    console.log(`✅ เขียนสำเร็จ: "${after.title}" มี ${after.questions.length} ข้อ`);
    process.exit(0);
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
