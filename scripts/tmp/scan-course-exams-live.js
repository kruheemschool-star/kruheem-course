// สแกนชุดข้อสอบในคอร์สทุกคอร์ส ด้วย "ตัวอ่านเฉลย" ตัวเดียวกับที่เว็บใช้จริง
// (lib/exam-utils.ts — ตัวเดียวกับที่ ExamRunner import ไปใช้แล้ว)
const path = require('path');
const admin = require('firebase-admin');
const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const ext = (e) => {
  if (!e || typeof e !== 'string') return null;
  const c = e.replace(/\\\[[\s\S]*?\\\]/g,'').replace(/\$\$[\s\S]*?\$\$/g,'')
             .replace(/\\\([\s\S]*?\\\)/g,'').replace(/\$[^$]+\$/g,'').replace(/\*\*/g,'');
  for (const p of [/คำตอบ\s*:?\s*ข้อ\s*(\d)/,/คำตอบคือ\s*ข้อ\s*(\d)/,/คำตอบที่ถูกต้อง\s*(?:คือ)?\s*:?\s*ข้อ\s*(\d)/,
                   /เฉลย\s*:?\s*ข้อ\s*(\d)/,/ตอบ\s*ข้อ\s*(\d)/,/ข้อที่ถูกต้อง\s*(?:คือ)?\s*:?\s*(?:ข้อ\s*)?(\d)/,
                   /ดังนั้น\s*ข้อ\s*(\d)/,/ตอบข้อ\s*(\d)/]) {
    const m = c.match(p); if (m) { const n = +m[1]; if (n >= 1 && n <= 4) return n - 1; } }
  const map = {'ก':0,'ข':1,'ค':2,'ง':3};
  for (const p of [/คำตอบ\s*:?\s*ข้อ\s*([กขคง])(?![ก-๙])/,/เฉลย\s*:?\s*ข้อ\s*([กขคง])(?![ก-๙])/,
                   /คำตอบ\s*:?\s*([กขคง])(?![ก-๙])/,/เฉลย\s*:?\s*([กขคง])(?![ก-๙])/]) {
    const m = c.match(p); if (m && map[m[1]] !== undefined) return map[m[1]]; }
  return null;
};

(async () => {
  const courses = await db.collection('courses').get();
  let sets = 0, qtotal = 0; const bad = [];
  for (const co of courses.docs) {
    for (const l of (await co.ref.collection('lessons').get()).docs) {
      if (l.id === '_index') continue;
      const x = l.data();
      if (x.type !== 'html' && x.type !== 'practice') continue;
      let qs = null; try { const p = JSON.parse(x.content || ''); if (Array.isArray(p)) qs = p; } catch {}
      if (!qs || !qs.length) continue;
      sets++; qtotal += qs.length;
      let noExp = 0, conflict = 0; const hits = [];
      qs.forEach((q, i) => {
        const e = q.explanation;
        if (!e || (typeof e === 'string' && !e.trim())) { noExp++; return; }
        const a = ext(e), stored = q.answerIndex ?? q.correctIndex ?? q.correctAnswer;
        if (a !== null && typeof stored === 'number' && a !== stored) { conflict++; hits.push(i + 1); }
      });
      if (noExp || conflict) bad.push({ c: co.data().title, l: x.title, n: qs.length, noExp, conflict, hits });
    }
  }
  console.log(`สแกน ${sets} ชุด / ${qtotal} ข้อ ในทุกคอร์ส (ใช้ตัวอ่านเฉลยตัวจริงที่เว็บใช้)\n`);
  if (!bad.length) console.log('✅ ไม่พบชุดที่เฉลยหาย หรือเฉลยขัดแย้งกับคำตอบที่เก็บไว้');
  bad.forEach(b => console.log(`[${b.c}] ${b.l} (${b.n} ข้อ) → ไม่มีเฉลย ${b.noExp} | ขัดแย้ง ${b.conflict} ${b.hits.slice(0,20).join(',')}`));
  process.exit(0);
})();
