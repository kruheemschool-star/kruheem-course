const fs=require('fs'), path=require('path');
const admin = require('firebase-admin');
const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const OUT = process.argv[2];
(async () => {
  fs.mkdirSync(OUT, {recursive:true});
  const idx=[];
  for (const co of (await db.collection('courses').get()).docs) {
    for (const l of (await co.ref.collection('lessons').get()).docs) {
      if (l.id==='_index') continue;
      const x=l.data();
      if (x.type!=='html' && x.type!=='practice') continue;
      let qs=null; try{const p=JSON.parse(x.content||''); if(Array.isArray(p)&&p.length&&p[0].question) qs=p;}catch{}
      if(!qs) continue;
      const f = `${co.id}__${l.id}.json`;
      fs.writeFileSync(path.join(OUT,f), JSON.stringify(qs));
      idx.push({file:f, course:co.data().title, lesson:x.title, courseId:co.id, lessonId:l.id, n:qs.length});
    }
  }
  fs.writeFileSync(path.join(OUT,'_index.json'), JSON.stringify(idx,null,2));
  console.log('ดึงมา', idx.length, 'ชุด รวม', idx.reduce((s,r)=>s+r.n,0), 'ข้อ');
  process.exit(0);
})();
