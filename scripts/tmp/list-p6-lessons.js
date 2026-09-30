const path = require('path');
const admin = require('firebase-admin');
const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const COURSE_ID = 'lBj1ZUlnBiU8vv3lm94y';
(async () => {
  const snap = await db.collection('courses').doc(COURSE_ID).collection('lessons').get();
  const rows = [];
  snap.forEach(d => {
    if (d.id === '_index') return;
    const x = d.data();
    rows.push({ id: d.id, order: x.order, title: x.title, type: x.type, len: (typeof x.content === 'string' ? x.content.length : 0) });
  });
  rows.sort((a,b)=> (a.order||0)-(b.order||0));
  rows.forEach(r => console.log(`${String(r.order).padStart(4)} | ${r.id} | ${r.type} | ${r.len} | ${r.title}`));
  console.log('TOTAL', rows.length);
  process.exit(0);
})();
