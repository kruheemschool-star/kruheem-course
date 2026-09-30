const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
(async () => {
  const snap = await db.collection('exams').select('title','level','category','questionCount','isFree','hidden','difficulty').get();
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const live = all.filter(e => !e.hidden);
  const sum = live.reduce((a, e) => a + (e.questionCount || 0), 0);
  const free = live.filter(e => e.isFree);
  console.log(`ชุดทั้งหมด(ไม่ซ่อน): ${live.length}  |  ข้อรวม: ${sum}  |  ชุดฟรี: ${free.length}`);
  const byCat = {};
  for (const e of live) {
    const k = e.category || '(ไม่มีหมวด)';
    byCat[k] = byCat[k] || { sets: 0, q: 0 };
    byCat[k].sets++; byCat[k].q += e.questionCount || 0;
  }
  console.log('\n=== แยกตามหมวด ===');
  Object.entries(byCat).sort((a,b)=>b[1].q-a[1].q).forEach(([k,v]) => console.log(`  ${k}: ${v.sets} ชุด / ${v.q} ข้อ`));
  const byLevel = {};
  for (const e of live) { const k = e.level || '-'; byLevel[k] = (byLevel[k]||0) + (e.questionCount||0); }
  console.log('\n=== แยกตามระดับชั้น ===');
  Object.entries(byLevel).sort().forEach(([k,v]) => console.log(`  ${k}: ${v} ข้อ`));
  console.log('\n=== ชุดฟรี ===');
  free.forEach(e => console.log(`  ${e.title} (${e.questionCount} ข้อ)`));
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
