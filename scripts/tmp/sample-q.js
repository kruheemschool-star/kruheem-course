const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  const ls = await db.collection('courses').doc('HiHvqQmFz9s41oxW8lne').collection('lessons').where('title','==','สมการตัวแปรเดียว').limit(1).get();
  const d = ls.docs[0].data();
  console.log('LESSON FIELDS:', JSON.stringify({...d, content:'<omitted>'}, null, 1));
  const qs = JSON.parse(d.content);
  console.log('N=', qs.length);
  console.log(JSON.stringify(qs[0], null, 1));
  console.log('---');
  console.log(JSON.stringify(qs[55], null, 1));
  const sizes = Buffer.byteLength(d.content,'utf8');
  console.log('contentKB=', Math.round(sizes/1024));
  // distribution of levels
  const c = {}; qs.forEach(q => { const lv = (q.tags||[]).find(t=>['ง่าย','กลาง','ยาก','ยากมาก'].includes(t)); c[lv]=(c[lv]||0)+1; });
  console.log('LEVELS:', c);
})();
