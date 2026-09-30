const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  const ls = await db.collection('courses').doc('fhoc1u2JT8WghFHapzx8').collection('lessons').get();
  const lessons = ls.docs.map(d => ({id:d.id, ...d.data()}));
  lessons.sort((a,b)=>(a.order??0)-(b.order??0));
  const v = lessons.filter(L=>L.type==='video');
  console.log('FIELDS of a video:', JSON.stringify(Object.keys(v[0])));
  console.log('sample video:', JSON.stringify({...v[0], description: undefined}, null, 1).slice(0,800));
  v.forEach(L => console.log(`${String(L.order).padStart(4)} | ch=${L.chapter||L.headerId||'-'} | ${L.title}`));
  process.exit(0);
})().catch(e=>{console.error(e); process.exit(1);});
