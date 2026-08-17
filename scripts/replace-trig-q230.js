/**
 * replace-trig-q230.js — แทนข้อ 230 ของชุด "อัตราส่วนตรีโกณมิติ" (ม.3)
 *
 * ข้อเดิม (บันไดไถลลง) แก้ด้วยทฤษฎีบทพีทาโกรัสล้วน ไม่ได้ใช้อัตราส่วนตรีโกณมิติเลย
 * จึงเป็นคนละหัวข้อกับชื่อชุด — แทนด้วยโจทย์เสาหักพับที่ต้องใช้ทั้ง tan และ cos
 *
 *   node scripts/replace-trig-q230.js           (dry-run)
 *   node scripts/replace-trig-q230.js --apply   (เขียนจริง หลังสำรองไฟล์)
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const EXAM_ID = 'hNsFOrlnwJ6QfuF5bBZU';
const APPLY = process.argv.includes('--apply');
const TRIG = /sin|cos|tan|ตรีโกณ|มุมก้ม|มุมเงย|องศา|\^\\circ/i;

(async () => {
  const spec = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'data/trig-fix-q230.json'), 'utf8'));
  const ref = db.collection('exams').doc(EXAM_ID);
  const snap = await ref.get();
  const data = snap.data();
  const qs = data.questions || [];

  const idx = spec.targetIndex;
  const old = qs[idx];
  console.log(`ชุด: ${data.title} | ${qs.length} ข้อ`);
  console.log(`ข้อเดิมที่ ${idx + 1}: ${String(old.question).slice(0, 80)}`);

  if (!String(old.question).includes(spec.expectOldContains)) {
    throw new Error(`ข้อ ${idx + 1} ไม่ใช่ข้อที่ตั้งใจแก้ (ไม่พบคำว่า "${spec.expectOldContains}") — หยุดก่อน`);
  }
  console.log('✓ ยืนยันว่าเป็นข้อเป้าหมายถูกต้อง');

  const next = {
    question: spec.question,
    options: spec.options,
    correctIndex: spec.correctIndex,
    explanation: spec.explanation,
    type: spec.type,
    tags: spec.tags,
    suggestedTags: spec.suggestedTags,
  };
  if (next.options.length !== 4 || new Set(next.options).size !== 4) throw new Error('ตัวเลือกไม่ครบ 4 หรือซ้ำ');
  if (!next.explanation.startsWith(`**คำตอบ: ข้อ ${next.correctIndex + 1}.**`)) throw new Error('หัวเฉลยไม่ตรง correctIndex');
  if (!TRIG.test(next.question + next.explanation)) throw new Error('ข้อใหม่ยังไม่มีร่องรอยอัตราส่วนตรีโกณมิติ');
  console.log('✓ ข้อใหม่ผ่านการตรวจ schema และเป็นตรีโกณมิติจริง');

  // ไม่ซ้ำกับข้ออื่นในชุด
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').replace(/\$/g, '').trim();
  const others = qs.filter((_, i) => i !== idx).map((q) => norm(q.question));
  if (others.includes(norm(next.question))) throw new Error('โจทย์ใหม่ซ้ำกับข้ออื่นในชุด');
  console.log('✓ ไม่ซ้ำกับข้ออื่นในชุด');

  const updated = [...qs];
  updated[idx] = next;
  const dist = [0, 0, 0, 0];
  updated.forEach((q) => dist[q.correctIndex]++);
  console.log(`✓ correctIndex หลังแก้: ${dist.join('/')}`);

  const size = Buffer.byteLength(JSON.stringify({ ...data, questions: updated }), 'utf8');
  console.log(`✓ ขนาด doc: ${(size / 1024 / 1024).toFixed(3)} MiB`);
  if (size > 1024 * 1024 * 0.95) throw new Error('ขนาดเกิน 95% ของเพดาน');

  if (!APPLY) {
    console.log(`\n[ข้อใหม่ ${idx + 1}] ${next.question}`);
    console.log('   ', next.options.join(' | '), '→ ตอบ', next.options[next.correctIndex]);
    console.log('\nDRY-RUN — ยังไม่เขียนจริง');
    process.exit(0);
  }

  const backupDir = path.resolve(__dirname, '_backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const file = path.join(backupDir, `exam-${EXAM_ID}-q230-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify({ index: idx, old }, null, 2), 'utf8');
  console.log(`\n💾 สำรองข้อเดิมไว้: ${path.relative(process.cwd(), file)}`);

  await ref.update({ questions: updated, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  console.log(`✅ แทนข้อ ${idx + 1} เรียบร้อย`);
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
