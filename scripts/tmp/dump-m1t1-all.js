const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  const ls = await db.collection('courses').doc('fhoc1u2JT8WghFHapzx8').collection('lessons').get();
  const lessons = ls.docs.map(d => ({id:d.id, ...d.data()}));
  lessons.sort((a,b)=>(a.order??0)-(b.order??0));
  for (const L of lessons) {
    const extra = L.type==='html' ? ` [content ${((L.content||'').length/1024).toFixed(0)}KB]` : '';
    console.log(`${String(L.order).padStart(7)} | ${(L.type||'').padEnd(7)} | ${L.id} | ${L.title}${extra}`);
  }
  process.exit(0);
})().catch(e=>{console.error(e); process.exit(1);});
