// ตรวจว่าทุกจุดที่แก้ไป อยู่บน Firestore จริงแล้ว (อ่านสดจากของจริง)
const path = require('path');
const admin = require('firebase-admin');
const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const get = (q) => q.answerIndex ?? q.correctIndex ?? q.correctAnswer;

const CHECKS = [
  { c:'lBj1ZUlnBiU8vv3lm94y', l:'35CkVbfKqQO0Lieu6WQO', name:'ป.6 · การหารทศนิยม', tests:[
    { n:87, want:{ qNot:'ตัดตัดชุดละ', qHas:'ตัดชุดละ' }, note:'คำผิด "ตัดตัด"' },
  ]},
  { c:'lBj1ZUlnBiU8vv3lm94y', l:'0HhpEGoDVZHZ8acKBXHM', name:'ป.6 · สมการและการแก้สมการ', tests:[
    { n:72, want:{ ans:2, optHas:'25' }, note:'เหรียญ 10 บาท = 25 เหรียญ' },
  ]},
  { c:'fhoc1u2JT8WghFHapzx8', l:'AwZXP71PyhKw8Z5LhGrC', name:'ม.1 · แนวข้อสอบ: จำนวนเต็ม', tests:[
    { n:158, want:{ ans:1, optHas:'10' }, note:'-120/-12 = 10' },
    { n:110, want:{ ans:3, optHas:'-2' }, note:'โจทย์เคยมีตัวเลือกถูก 3 ข้อ' },
  ]},
  { c:'HiHvqQmFz9s41oxW8lne', l:'lEe6omuzszpDXMSKp390', name:'Gifted · แนวข้อสอบชุดที่ 1', tests:[
    { n:22, want:{ ans:2, optHas:'266' } }, { n:27, want:{ ans:0, optHas:'2' } },
    { n:28, want:{ qHas:'10^2 + 40' } },   { n:31, want:{ ans:1, optHas:'-3' } },
    { n:32, want:{ ans:3, optHas:'0', qNot:'ขอแก้ตัวจากข้อเมื่อกี้' } },
    { n:35, want:{ ans:3, optHas:'3' } },  { n:40, want:{ ans:3, optHas:'80' } },
    { n:44, want:{ qHas:'F_{19} \\times 2' } }, { n:52, want:{ qHas:'6$ ลังพอดี' } },
    { n:54, want:{ ans:1, optHas:'6 ลงตัว' } },
    { n:60, want:{ qHas:'8^2+3\\cdot8+2' } }, { n:63, want:{ qHas:'ถึงหมายเลข $3$' } },
    { n:65, want:{ qHas:'\\frac{2}{15}' } }, { n:73, want:{ ans:0, optHas:'2' } },
  ]},
  { c:'nQIVvwyuJkrwK0pYQJKB', l:'d932smhv7Nbqyk54xAjo', name:'ม.5 · เมทริกซ์', tests:[
    { n:207, want:{ qHas:'\\det(A) = 11', ans:2, optHas:'3' } },
    { n:208, want:{ ans:3, optHas:'32' } },
  ]},
];

const LEAK = /เอ๊ะ|โอ๊ะ|เดี๋ยวนะ|ขออนุญาตปรับ|answerIndex|Answer Index|แก้ไขช้อยส์|ลองทดใหม่|ใน JSON|ขอปรับโจทย์|หมายเหตุระบบ|ขอแก้ตัวจากข้อเมื่อกี้|ขออนุมาน/i;

(async () => {
  let pass = 0, fail = 0;
  for (const g of CHECKS) {
    const snap = await db.collection('courses').doc(g.c).collection('lessons').doc(g.l).get();
    const qs = JSON.parse(snap.data().content);
    console.log(`\n[${g.name}] — ${qs.length} ข้อ`);
    for (const t of g.tests) {
      const q = qs[t.n - 1]; const errs = [];
      if (t.want.ans !== undefined && get(q) !== t.want.ans) errs.push(`คำตอบเป็นข้อ ${get(q)+1} ไม่ใช่ข้อ ${t.want.ans+1}`);
      if (t.want.optHas && !String(q.options[get(q)]).includes(t.want.optHas)) errs.push(`ตัวเลือกที่ชี้คือ "${q.options[get(q)]}" ไม่มี "${t.want.optHas}"`);
      if (t.want.qHas && !q.question.includes(t.want.qHas)) errs.push(`โจทย์ไม่มี "${t.want.qHas}"`);
      if (t.want.qNot && q.question.includes(t.want.qNot)) errs.push(`โจทย์ยังมี "${t.want.qNot}"`);
      if (LEAK.test(q.question + String(q.explanation))) errs.push('ยังมีข้อความ AI หลุด');
      if (errs.length) { fail++; console.log(`  ❌ ข้อ ${t.n}: ${errs.join(' | ')}`); }
      else { pass++; console.log(`  ✅ ข้อ ${t.n} — คำตอบข้อ ${get(q)+1} (${String(q.options[get(q)]).slice(0,28)})${t.note ? '  · '+t.note : ''}`); }
    }
    // ข้อซ้ำในชุด
    const seen = new Map(); let dup = 0;
    qs.forEach((q,i)=>{ const k=String(q.question).replace(/\s+/g,' ').trim(); if(seen.has(k)) dup++; else seen.set(k,i+1); });
    if (dup) console.log(`  ⚠️  ชุดนี้ยังมีข้อซ้ำ ${dup} ข้อ (งานที่ครูฮีมสั่งพักไว้)`);
  }
  console.log(`\n════ ผ่าน ${pass} | ไม่ผ่าน ${fail} ════`);
  process.exit(fail ? 1 : 0);
})();
