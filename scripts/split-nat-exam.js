#!/usr/bin/env node
/**
 * แบ่งชุด "การแก้โจทย์ปัญหาจำนวนนับ" (exams/3Oq5FgtVI7h6HjNieMnt) เป็น 2 ชุด ชุดละ 125 ข้อ
 * พร้อมเติมข้อมูลวิเคราะห์ครบทุกข้อ (tag 5 มิติ + distractorErrors + expectedSeconds + subskill)
 *
 * เหตุผลที่ต้องแบ่ง: ชุดเดิมมี 220 ข้อ (ขาดไป 30 ข้อ) และ doc อยู่ที่ 93.5% ของเพดาน 1MiB
 * ถ้าเติมข้อมูลวิเคราะห์เข้าไปทั้งชุดจะทะลุเพดาน แบ่งแล้วได้ชุดละราว 58%
 *
 * แบ่งแบบสลับข้อ (คี่/คู่) เพื่อให้ทั้งสองชุดมีหัวข้อย่อยครบ 13 หัวข้อ
 * และยังคงลำดับการไล่เนื้อหาเดิมของครูฮีมไว้ในแต่ละชุด
 *
 * รันเปล่า = dry-run · รัน --apply = เขียนจริง
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const SRC_DOC = '3Oq5FgtVI7h6HjNieMnt';
const CHUNK_DIR = '/Users/kruheem/Documents/kruheem-exams/rework-2026-08/nat-3Oq5F/work/chunks';
const OUT_DIR = '/Users/kruheem/Documents/kruheem-exams/rework-2026-08/nat-3Oq5F/output';
const APPLY = process.argv.includes('--apply');

const CODES = new Set([
  'ลืมเครื่องหมาย', 'ลำดับการดำเนินการผิด', 'คูณ-หารไม่ครบ', 'สลับสูตร', 'ใช้บทกลับผิด',
  'ตอบค่ากลางทาง', 'นับคลาดหนึ่ง', 'สับสนนิยาม', 'ลืมแปลงหน่วย', 'อ่านโจทย์ผิด',
  'ปัดเศษผิด', 'ใช้ข้อมูลไม่ครบ', 'สลับตัวตั้งตัวลบ', 'ลืมขั้นสุดท้าย', 'ยืมทดผิดหลัก',
  'สลับตัวตั้งตัวหาร', 'ลืมเศษที่เหลือ', 'ลืมคิดขั้นที่สอง', 'คิดร้อยละจากฐานผิด',
]);
const SKILLS = new Set(['คิดเลข', 'เข้าใจ', 'แปลโจทย์']);
const LEVELS = new Set(['ง่าย', 'กลาง', 'ยาก', 'ยากมาก']);
const GRADES = new Set(['ป.5', 'ป.6', 'ม.1']);

function loadAll() {
  const files = fs.readdirSync(CHUNK_DIR).filter(f => f.endsWith('.json')).sort();
  let all = [];
  for (const f of files) all = all.concat(JSON.parse(fs.readFileSync(path.join(CHUNK_DIR, f), 'utf8')));
  all.sort((a, b) => a.id - b.id);
  return all;
}

function validate(list) {
  const errs = [];
  if (list.length !== 250) errs.push(`จำนวนข้อ ${list.length} ไม่ใช่ 250`);
  list.forEach((q, i) => {
    const t = `[${q.id}]`;
    if (q.id !== i + 1) errs.push(`${t} id ไม่เรียงต่อเนื่อง`);
    if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) errs.push(`${t} โครงสร้างข้อไม่ครบ`);
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) errs.push(`${t} correctIndex ไม่ถูกต้อง`);
    if (!q.explanation || q.explanation.length < 200) errs.push(`${t} เฉลยสั้นผิดปกติ`);
    if (!Array.isArray(q.tags) || q.tags.length !== 5) errs.push(`${t} tags ต้องมี 5 ตัว`);
    else {
      if (!SKILLS.has(q.tags[2])) errs.push(`${t} ทักษะไม่ถูกต้อง: ${q.tags[2]}`);
      if (!LEVELS.has(q.tags[3])) errs.push(`${t} ระดับไม่ถูกต้อง: ${q.tags[3]}`);
      if (!GRADES.has(q.tags[4])) errs.push(`${t} ระดับชั้นไม่ถูกต้อง: ${q.tags[4]}`);
    }
    if (!Array.isArray(q.distractorErrors) || q.distractorErrors.length !== 3) errs.push(`${t} distractorErrors ต้องมี 3 ตัว`);
    else {
      const want = [0, 1, 2, 3].filter(x => x !== q.correctIndex).join(',');
      const have = q.distractorErrors.map(d => d.choice).sort((a, b) => a - b).join(',');
      if (want !== have) errs.push(`${t} distractorErrors ชี้ผิด index`);
      for (const d of q.distractorErrors) if (!CODES.has(d.code)) errs.push(`${t} รหัสไม่อยู่ในรายการ: ${d.code}`);
    }
    if (!Number.isInteger(q.expectedSeconds) || q.expectedSeconds <= 0) errs.push(`${t} expectedSeconds ไม่ถูกต้อง`);
    if (!q.subskill) errs.push(`${t} ไม่มี subskill`);
  });
  return errs;
}

// ตัด field ที่ใช้เฉพาะตอนทำงาน แล้วไล่ id ใหม่ให้เป็น 1..n ของชุดนั้น
function forWeb(list) {
  return list.map((q, i) => {
    const o = { question: q.question, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation, tags: q.tags, distractorErrors: q.distractorErrors, expectedSeconds: q.expectedSeconds, subskill: q.subskill };
    if (q.svg) o.svg = q.svg;
    return o;
  });
}

(async () => {
  const all = loadAll();
  const errs = validate(all);
  if (errs.length) {
    console.log(`❌ ตรวจไม่ผ่าน ${errs.length} จุด:`);
    errs.slice(0, 20).forEach(e => console.log('   ', e));
    process.exit(1);
  }
  console.log(`✅ ตรวจไฟล์ผ่าน: 250 ข้อ, tags 5 มิติ + distractorErrors + expectedSeconds + subskill ครบทุกข้อ\n`);

  const setA = forWeb(all.filter(q => q.id % 2 === 1));
  const setB = forWeb(all.filter(q => q.id % 2 === 0));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'nat_set1_125q.json'), JSON.stringify(setA, null, 1));
  fs.writeFileSync(path.join(OUT_DIR, 'nat_set2_125q.json'), JSON.stringify(setB, null, 1));

  const sa = require('./seed-gifted-m1/serviceAccountKey.json');
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
  const db = admin.firestore();
  const snap = await db.collection('exams').doc(SRC_DOC).get();
  const meta = snap.data();

  const sizeA = Buffer.byteLength(JSON.stringify({ ...meta, questions: setA }), 'utf8');
  const sizeB = Buffer.byteLength(JSON.stringify({ ...meta, questions: setB }), 'utf8');
  const pct = n => (n / 1048576 * 100).toFixed(1) + '%';
  console.log(`ชุดเดิม "${meta.title}" มี ${(meta.questions || []).length} ข้อ`);
  console.log(`  → ชุดที่ 1: ${setA.length} ข้อ, ${sizeA.toLocaleString()} bytes (${pct(sizeA)} ของ 1MiB) — เขียนทับ doc เดิม`);
  console.log(`  → ชุดที่ 2: ${setB.length} ข้อ, ${sizeB.toLocaleString()} bytes (${pct(sizeB)} ของ 1MiB) — สร้าง doc ใหม่\n`);

  if (!APPLY) {
    console.log('(dry-run) ยังไม่เขียนอะไรลงฐานข้อมูล — สั่ง --apply เพื่อเขียนจริง');
    process.exit(0);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const bak = path.join('/Users/kruheem/Documents/kruheem-exams/rework-2026-08/nat-3Oq5F', `BACKUP-before-split-${stamp}.json`);
  fs.writeFileSync(bak, JSON.stringify(meta, null, 1));
  console.log(`💾 สำรองของเดิมไว้ที่ ${bak}`);

  await db.collection('exams').doc(SRC_DOC).update({
    title: 'การแก้โจทย์ปัญหาจำนวนนับ ชุดที่ 1',
    questions: setA,
    questionCount: setA.length,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`✅ เขียนชุดที่ 1 ทับ doc เดิม (${SRC_DOC}) — ${setA.length} ข้อ`);

  const newDoc = db.collection('exams').doc();
  const { questions, createdAt, updatedAt, ...rest } = meta;
  await newDoc.set({
    ...rest,
    title: 'การแก้โจทย์ปัญหาจำนวนนับ ชุดที่ 2',
    order: 14.5,
    questions: setB,
    questionCount: setB.length,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`✅ สร้างชุดที่ 2 เป็น doc ใหม่ (${newDoc.id}) — ${setB.length} ข้อ`);
  process.exit(0);
})();
