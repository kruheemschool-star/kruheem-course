/**
 * replace-trig-offtopic.js — แทนข้อ 31-45 ของชุด "อัตราส่วนตรีโกณมิติ" (ม.3)
 * ที่เนื้อหาปนมาเป็น "ความน่าจะเป็น" ด้วยข้อสอบอัตราส่วนตรีโกณมิติชุดใหม่ 15 ข้อ
 *
 *   node scripts/replace-trig-offtopic.js           (dry-run + ตรวจทุกด่าน)
 *   node scripts/replace-trig-offtopic.js --apply   (เขียนจริง หลังสำรองไฟล์แล้ว)
 *
 * ที่มา: ผู้ปกครองแจ้งว่าข้อ 31-45 ไม่ใช่เรื่องตรีโกณมิติ — สแกนทั้งชุดแล้วพบว่า
 * 15 ข้อนี้ติด tag "ความน่าจะเป็น" ชัดเจน ส่วนอีก 235 ข้อเป็นตรีโกณมิติถูกต้อง
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const EXAM_ID = 'hNsFOrlnwJ6QfuF5bBZU';
const START = 30; // index 0-based ของข้อ 31
const COUNT = 15;
const APPLY = process.argv.includes('--apply');

const TAGS_CORE = ['อัตราส่วนตรีโกณมิติ', 'อัตราส่วนตรีโกณมิติ (sin, cos, tan)', 'อัตราส่วน', 'ตรีโกณมิติ', 'sin', 'cos', 'tan', 'จำนวนและการดำเนินการ', 'ม.3'];
const TAGS_APPLIED = ['อัตราส่วนตรีโกณมิติ', 'การนำไปใช้แก้โจทย์ปัญหา', 'อัตราส่วน', 'ตรีโกณมิติ', 'จำนวนและการดำเนินการ', 'ม.3'];

// ข้อที่เป็นโจทย์สถานการณ์จริง (นับจาก 1 ในไฟล์ใหม่) → ใช้ tag กลุ่ม "การนำไปใช้"
const APPLIED = new Set([5, 12, 15]);
const SUGGESTED = {
  core: ['มุม', 'อัตราส่วน', 'เศษส่วน', 'สามเหลี่ยม', 'พีทาโกรัส', 'ราก'],
  applied: ['มุม', 'อัตราส่วน', 'สามเหลี่ยม', 'โจทย์ปัญหา', 'การวัด', 'ราก'],
};

(async () => {
  const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../scripts/data/trig-replacement-15.json'), 'utf8'));
  if (raw.length !== COUNT) throw new Error(`ไฟล์ข้อสอบใหม่มี ${raw.length} ข้อ (ต้องมี ${COUNT})`);

  const ref = db.collection('exams').doc(EXAM_ID);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('ไม่พบชุดข้อสอบ');
  const data = snap.data();
  const qs = data.questions || [];
  console.log(`ชุด: ${data.title} | ${qs.length} ข้อ`);

  // --- ด่าน 1: ยืนยันว่าข้อที่จะถอดเป็น "ความน่าจะเป็น" จริง ---
  const victims = qs.slice(START, START + COUNT);
  const notProb = victims.filter((q) => !(q.tags || []).includes('ความน่าจะเป็น'));
  if (notProb.length) {
    throw new Error(`ข้อ ${START + 1}-${START + COUNT} มี ${notProb.length} ข้อที่ไม่ได้ติด tag ความน่าจะเป็น — หยุดก่อน อย่าเพิ่งเขียนทับ`);
  }
  console.log(`✓ ยืนยันข้อ ${START + 1}-${START + COUNT} ติด tag "ความน่าจะเป็น" ครบทั้ง ${COUNT} ข้อ`);

  // --- ด่าน 2: โจทย์ใหม่ต้องไม่ซ้ำกับ 235 ข้อที่เก็บไว้ ---
  const kept = qs.filter((_, i) => i < START || i >= START + COUNT);
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').replace(/\$/g, '').trim();
  const keptSet = new Set(kept.map((q) => norm(q.question)));
  const keptSkel = new Set(kept.map((q) => norm(q.question).replace(/\d+(\.\d+)?/g, '#')));
  const dupExact = raw.filter((q) => keptSet.has(norm(q.question)));
  const dupSkel = raw.filter((q) => keptSkel.has(norm(q.question).replace(/\d+(\.\d+)?/g, '#')));
  if (dupExact.length) throw new Error(`โจทย์ใหม่ซ้ำคำต่อคำกับของเดิม ${dupExact.length} ข้อ`);
  console.log(`✓ ไม่ซ้ำคำต่อคำกับ 235 ข้อเดิม | โครงประโยคซ้ำ: ${dupSkel.length} ข้อ`);
  dupSkel.forEach((q) => console.log(`   ⚠️ โครงคล้ายของเดิม: ${q.question.slice(0, 70)}`));

  // --- ด่าน 3: ประกอบข้อใหม่ให้ schema ตรงกับชุดเดิมเป๊ะ ---
  const built = raw.map((q, i) => {
    const applied = APPLIED.has(i + 1);
    return {
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      type: 'choice',
      tags: applied ? [...TAGS_APPLIED] : [...TAGS_CORE],
      suggestedTags: applied ? [...SUGGESTED.applied] : [...SUGGESTED.core],
    };
  });

  built.forEach((q, i) => {
    const n = i + 1;
    if (!q.question || !q.explanation) throw new Error(`ข้อใหม่ที่ ${n}: ขาดโจทย์หรือเฉลย`);
    if (!Array.isArray(q.options) || q.options.length !== 4) throw new Error(`ข้อใหม่ที่ ${n}: ตัวเลือกไม่ครบ 4`);
    if (new Set(q.options).size !== 4) throw new Error(`ข้อใหม่ที่ ${n}: ตัวเลือกซ้ำ`);
    if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) throw new Error(`ข้อใหม่ที่ ${n}: correctIndex ผิด`);
    if (!q.explanation.startsWith(`**คำตอบ: ข้อ ${q.correctIndex + 1}.**`)) throw new Error(`ข้อใหม่ที่ ${n}: หัวเฉลยไม่ตรง correctIndex`);
  });
  console.log('✓ schema ครบถ้วนทั้ง 15 ข้อ (question/options4/correctIndex/explanation/type/tags)');

  // --- ด่าน 4: สมดุลคำตอบหลังแทนที่ ---
  const next = [...qs];
  next.splice(START, COUNT, ...built);
  const dist = [0, 0, 0, 0];
  next.forEach((q) => dist[q.correctIndex]++);
  const before = [0, 0, 0, 0];
  qs.forEach((q) => before[q.correctIndex]++);
  console.log(`✓ correctIndex ก่อนแก้: ${before.join('/')} → หลังแก้: ${dist.join('/')} (อุดมคติ 62/62/62/62)`);

  // --- ด่าน 5: ขนาด doc ต้องไม่ชนเพดาน 1 MiB ---
  const size = Buffer.byteLength(JSON.stringify({ ...data, questions: next }), 'utf8');
  console.log(`✓ ขนาด doc หลังแก้: ${(size / 1024 / 1024).toFixed(3)} MiB (เพดาน 1 MiB)`);
  if (size > 1024 * 1024 * 0.95) throw new Error('ขนาดเกิน 95% ของเพดาน — อย่าเขียน');

  if (!APPLY) {
    console.log('\n=== ตัวอย่างข้อใหม่ที่จะแทน ===');
    built.slice(0, 3).forEach((q, i) => {
      console.log(`\n[ข้อ ${START + 1 + i}] ${q.question}`);
      console.log('   ', q.options.join(' | '), '→ ตอบ', q.options[q.correctIndex]);
    });
    console.log('\nDRY-RUN — ยังไม่เขียนจริง (เติม --apply เพื่อเขียน)');
    process.exit(0);
  }

  // --- สำรองก่อนเขียนเสมอ ---
  const backupDir = path.resolve(__dirname, '_backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `exam-${EXAM_ID}-before-trigfix-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n💾 สำรองชุดเดิมไว้แล้ว: ${path.relative(process.cwd(), backupFile)}`);

  await ref.update({ questions: next, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  console.log(`✅ เขียนแล้ว — แทนข้อ ${START + 1}-${START + COUNT} ด้วยข้อสอบอัตราส่วนตรีโกณมิติ 15 ข้อใหม่`);
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
