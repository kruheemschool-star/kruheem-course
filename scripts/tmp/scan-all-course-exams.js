const fs=require('fs'), path=require('path');
const admin = require('firebase-admin');
const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const extractRunner = (e) => { // stale copy inside components/learn/ExamRunner.tsx
  if (!e || typeof e!=='string') return null;
  const c = e.replace(/\\\[[\s\S]*?\\\]/g,'').replace(/\$\$[\s\S]*?\$\$/g,'').replace(/\\\([\s\S]*?\\\)/g,'').replace(/\$[^$]+\$/g,'').replace(/\*\*/g,'');
  for (const p of [/คำตอบ\s*:?\s*ข้อ\s*(\d)/,/คำตอบคือ\s*ข้อ\s*(\d)/,/คำตอบที่ถูกต้อง\s*(?:คือ)?\s*:?\s*ข้อ\s*(\d)/,/เฉลย\s*:?\s*ข้อ\s*(\d)/,/ตอบ\s*ข้อ\s*(\d)/,/ดังนั้น\s*ข้อ\s*(\d)/,/ตอบข้อ\s*(\d)/]) {
    const m=c.match(p); if(m){const n=+m[1]; if(n>=1&&n<=4) return n-1;} }
  const map={'ก':0,'ข':1,'ค':2,'ง':3};
  for (const p of [/คำตอบ\s*:?\s*ข้อ\s*([กคง])/,/เฉลย\s*:?\s*ข้อ\s*([กคง])/,/คำตอบ\s*:?\s*([กขคง])(?!้)/,/เฉลย\s*:?\s*([กขคง])(?!้)/]) {
    const m=c.match(p); if(m&&map[m[1]]!==undefined) return map[m[1]]; }
  return null;
};
const extractLib = (e) => { // fixed copy in lib/exam-utils.ts
  if (!e || typeof e!=='string') return null;
  const c = e.replace(/\\\[[\s\S]*?\\\]/g,'').replace(/\$\$[\s\S]*?\$\$/g,'').replace(/\\\([\s\S]*?\\\)/g,'').replace(/\$[^$]+\$/g,'').replace(/\*\*/g,'');
  for (const p of [/คำตอบ\s*:?\s*ข้อ\s*(\d)/,/คำตอบคือ\s*ข้อ\s*(\d)/,/คำตอบที่ถูกต้อง\s*(?:คือ)?\s*:?\s*ข้อ\s*(\d)/,/เฉลย\s*:?\s*ข้อ\s*(\d)/,/ตอบ\s*ข้อ\s*(\d)/,/ข้อที่ถูกต้อง\s*(?:คือ)?\s*:?\s*(?:ข้อ\s*)?(\d)/,/ดังนั้น\s*ข้อ\s*(\d)/,/ตอบข้อ\s*(\d)/]) {
    const m=c.match(p); if(m){const n=+m[1]; if(n>=1&&n<=4) return n-1;} }
  const map={'ก':0,'ข':1,'ค':2,'ง':3};
  for (const p of [/คำตอบ\s*:?\s*ข้อ\s*([กขคง])(?![ก-๙])/,/เฉลย\s*:?\s*ข้อ\s*([กขคง])(?![ก-๙])/,/คำตอบ\s*:?\s*([กขคง])(?![ก-๙])/,/เฉลย\s*:?\s*([กขคง])(?![ก-๙])/]) {
    const m=c.match(p); if(m&&map[m[1]]!==undefined) return map[m[1]]; }
  return null;
};

(async () => {
  const courses = await db.collection('courses').get();
  const bad = [];
  let sets=0, qtotal=0;
  for (const c of courses.docs) {
    const ls = await c.ref.collection('lessons').get();
    for (const l of ls.docs) {
      if (l.id === '_index') continue;
      const x = l.data();
      if (x.type !== 'html' && x.type !== 'practice') continue;
      let qs=null; try { const p = JSON.parse(x.content||''); if (Array.isArray(p)) qs=p; } catch {}
      if (!qs || !qs.length) continue;
      sets++; qtotal += qs.length;
      let diff=0, unread=0, conflict=0, noExp=0;
      qs.forEach((q,i)=>{
        const e=q.explanation;
        if (!e || (typeof e==='string' && !e.trim())) { noExp++; return; }
        const a=extractRunner(e), b=extractLib(e);
        const stored = q.answerIndex ?? q.correctIndex ?? q.correctAnswer;
        if (a!==b) diff++;
        if (a===null) unread++;
        else if (typeof stored==='number' && a!==stored) conflict++;
      });
      if (diff||unread||conflict||noExp) bad.push({course:c.data().title, lesson:x.title, courseId:c.id, lessonId:l.id, n:qs.length, noExp, unread, conflict, diff});
    }
  }
  console.log(`สแกน ${sets} ชุด / ${qtotal} ข้อ ในทุกคอร์ส\n`);
  if (!bad.length) console.log('ไม่พบชุดที่มีปัญหาเรื่องเฉลย');
  bad.forEach(b=>console.log(`[${b.course}] ${b.lesson} (${b.n} ข้อ) → ไม่มีเฉลย ${b.noExp} | อ่านไม่ออก ${b.unread} | ขัดแย้ง ${b.conflict} | ตัวอ่านคอร์สเพี้ยน ${b.diff}   ${b.courseId}/${b.lessonId}`));
  process.exit(0);
})();
