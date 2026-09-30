/**
 * แทนที่ข้อสอบหมวด "เก่งสมการ" ด้วยชุดที่เขียนใหม่ทั้งชุด
 *
 * ที่มา: ครูฮีมพบเอง 2026-08-07 ว่าหมวดเก่งสมการใช้โจทย์แบบเดียวกันวนซ้ำ
 *   (ชุดตัวส่วนหนักสุด: 250 ข้อใช้แค่ 31 โครง และวางติดกันเป็นบล็อก 35/25/25 ข้อ)
 *   ทั้งหมวด 1,750 ข้อเป็น "แก้สมการหาค่า x" ถึง 85% ไม่มีโจทย์ปัญหาบริบทจริงเลยใน 6 จาก 7 ชุด
 *
 * ชุดใหม่ยึดมาตรฐาน "8 ท่า" — ตรง / บริบท / ต่อยอด / ตรวจ / กลับ / นับ / จับผิด / แปลง
 * ทุกข้อผ่าน SymPy (แก้สมการเองแล้วเทียบตัวเลือก) + ตรวจความหลากหลายด้วย verify.py
 *
 * รัน: node scripts/replace-equation-exam.js <key>            (dry-run ตรวจอย่างเดียว)
 *      node scripts/replace-equation-exam.js <key> --apply    (เขียนจริง)
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const PLAN = path.resolve(process.env.HOME, 'Documents/kruheem-exams/rework-2026-08/EQUATION-CATEGORY-PLAN');
const SETS = {
    fraction: { id: 'kUU02lEfxWzuPC36sFa4', title: 'สมการที่มีตัวแปรเป็นตัวส่วน', src: 'output/fraction-denominator-250q.json' },
    linear: { id: 'Rxlko53XR25E6NDfvqwq', title: 'สมการเชิงเส้นตัวแปรเดียว', src: 'output/linear-one-var-250q.json' },
    logarithm: { id: 'v5RQVcOi2bMT51mPTbNQ', title: 'สมการลอการิทึม', src: 'output/logarithm-250q.json' },
    exponential: { id: '7bk3wQ2aDQNsPvDGyMzY', title: 'สมการเลขยกกำลัง', src: 'output/exponential-250q.json' },
    radical: { id: 'VIwYJAYR5OLSZwBcRNyS', title: 'สมการราก', src: 'output/radical-250q.json' },
    absolute: { id: 'bKYtRGmjmRZb6OwKnJ9c', title: 'สมการค่าสัมบูรณ์', src: 'output/absolute-value-250q.json' },
    system: { id: 'KG6XyWONN4xlzJxo0zED', title: 'ระบบสมการเชิงเส้นสองตัวแปร', src: 'output/system-two-var-250q.json' },
};

const key = process.argv[2];
const APPLY = process.argv.includes('--apply');
const cfg = SETS[key];
if (!cfg) {
    console.error(`ต้องระบุชุด: ${Object.keys(SETS).join(' | ')}`);
    process.exit(1);
}

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const LEVELS = new Set(['ง่าย', 'กลาง', 'ยาก', 'ยากมาก']);
const SKILLS = new Set(['คิดเลข', 'เข้าใจ', 'แปลโจทย์']);
const GRADES = new Set(['ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6']);

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

function skeleton(s) {
    return String(s).replace(/-?\d[\d,]*(?:\.\d+)?/g, '#').replace(/\s+/g, ' ').trim();
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
        if (typeof q.explanation !== 'string' || !q.explanation.startsWith(`**คำตอบ: ข้อ ${q.correctIndex + 1}.**`)) errs.push(`${at}: เฉลยไม่ขึ้นต้นตรงกับ correctIndex`);
        const tags = q.tags || [];
        if (tags.filter((t) => SKILLS.has(t)).length !== 1) errs.push(`${at}: tag ทักษะไม่ครบ 1 ตัว`);
        if (tags.filter((t) => LEVELS.has(t)).length !== 1) errs.push(`${at}: tag ระดับไม่ครบ 1 ตัว`);
        if (tags.filter((t) => GRADES.has(t)).length !== 1) errs.push(`${at}: tag ชั้นไม่ครบ 1 ตัว`);
        if (!Array.isArray(q.distractorErrors) || q.distractorErrors.length !== 3) errs.push(`${at}: distractorErrors != 3`);
        else q.distractorErrors.forEach((d) => { if (d.choice === q.correctIndex) errs.push(`${at}: distractorErrors ชี้คำตอบถูก`); });
        if (!Number.isInteger(q.expectedSeconds) || q.expectedSeconds <= 0) errs.push(`${at}: expectedSeconds ผิด`);
        if (typeof q.subskill !== 'string' || !q.subskill.trim()) errs.push(`${at}: subskill ว่าง`);
        for (const bad of ['answer', 'solution', 'space']) if (bad in q) errs.push(`${at}: มี field ต้องห้าม ${bad}`);
        for (const k of Object.keys(q)) if (k.startsWith('_')) errs.push(`${at}: ยังมี field ชั่วคราว ${k}`);
    });
    // โครงโจทย์ซ้ำ / วางติดกัน
    const seen = new Map();
    const sk = qs.map((q) => skeleton(q.question));
    sk.forEach((k, i) => {
        if (seen.has(k)) { if (i - seen.get(k) < 3) errs.push(`ข้อ ${i + 1}: โครงโจทย์ซ้ำกับข้อ ${seen.get(k) + 1} และอยู่ใกล้กันเกินไป`); }
        seen.set(k, i);
    });
    const uniq = new Set(sk).size;
    if (uniq < 0.9 * qs.length) errs.push(`โครงโจทย์ไม่ซ้ำ ${uniq}/${qs.length} — ต้อง >= 90%`);
    for (let i = 1; i < sk.length; i++) if (sk[i] === sk[i - 1]) errs.push(`ข้อ ${i}-${i + 1}: โครงเดียวกันวางติดกัน`);
    // correctIndex กระจาย
    const ci = [0, 0, 0, 0];
    qs.forEach((q) => ci[q.correctIndex]++);
    ci.forEach((c, i) => { if (c < 0.18 * qs.length || c > 0.32 * qs.length) errs.push(`correctIndex ${i} มี ${c} ข้อ — ต้องอยู่ราว 18-32%`); });
    return { errs, uniq, ci };
}

(async () => {
    const SRC = path.join(PLAN, cfg.src);
    const questions = JSON.parse(fs.readFileSync(SRC, 'utf8'));
    const { errs, uniq, ci } = validate(questions);
    console.log(`ชุด: ${cfg.title} [${cfg.id}]`);
    console.log(`ไฟล์ต้นทาง: ${SRC}`);
    console.log(`โหมด: ${APPLY ? '✍️  เขียนจริง (--apply)' : '🔍 dry-run (ตรวจอย่างเดียว)'}\n`);
    if (errs.length) {
        console.error(`❌ ตรวจไม่ผ่าน ${errs.length} จุด:`);
        errs.slice(0, 30).forEach((e) => console.error('   -', e));
        process.exit(1);
    }
    console.log(`✅ ตรวจไฟล์ผ่าน: 250 ข้อ · โครงโจทย์ไม่ซ้ำ ${uniq}/250 · correctIndex ${ci.join('/')}`);

    const ref = db.collection('exams').doc(cfg.id);
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`ไม่พบชุดข้อสอบ ${cfg.id}`);
    const cur = snap.data();
    const oldQs = cur.questions || [];
    const oldSkel = new Set(oldQs.map((q) => skeleton(q.question)));
    console.log(`\nของเดิม: "${cur.title}" ${oldQs.length} ข้อ · โครงโจทย์ต่างกันเพียง ${oldSkel.size} แบบ`);
    console.log(`ของใหม่: ${questions.length} ข้อ · โครงโจทย์ต่างกัน ${uniq} แบบ`);

    const next = { ...cur, questions, questionCount: questions.length };
    const size = docSize(next);
    console.log(`ขนาด doc ใหม่: ${size.toLocaleString()} bytes (${((100 * size) / 1048576).toFixed(1)}% ของเพดาน 1MiB)`);
    if (size > 1000000) throw new Error('ขนาดเกินเพดาน Firestore');

    if (!APPLY) {
        console.log('\n(dry-run) ยังไม่เขียนอะไรลงฐานข้อมูล — สั่ง --apply เพื่อเขียนจริง');
        process.exit(0);
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(PLAN, 'BACKUP', `BEFORE-REPLACE-${key}-${stamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(cur, null, 1));
    console.log(`\n💾 สำรองของเดิมไว้ที่ ${backupPath}`);

    await ref.update({
        questions,
        questionCount: questions.length,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const after = (await ref.get()).data();
    console.log(`✅ เขียนสำเร็จ: "${after.title}" มี ${after.questions.length} ข้อ`);
    process.exit(0);
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
