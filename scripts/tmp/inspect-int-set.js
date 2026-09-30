const path=require('path'); const fs=require('fs');
const admin = require('firebase-admin');
const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  const d = await db.collection('courses').doc('fhoc1u2JT8WghFHapzx8').collection('lessons').doc('AwZXP71PyhKw8Z5LhGrC').get();
  const qs = JSON.parse(d.data().content);
  fs.writeFileSync(process.argv[2], JSON.stringify(qs,null,2));
  const heads={};
  qs.forEach(q=>{ const h=(q.explanation||'').split('\n')[0].slice(0,40); heads[h]=(heads[h]||0)+1; });
  Object.entries(heads).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([k,v])=>console.log(v,'|',JSON.stringify(k)));
  process.exit(0);
})();
