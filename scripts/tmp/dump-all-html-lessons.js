const fs = require('fs'); const path = require('path');
const admin = require('firebase-admin');
const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const COURSE_ID = 'lBj1ZUlnBiU8vv3lm94y';
const OUT = process.argv[2];
(async () => {
  const snap = await db.collection('courses').doc(COURSE_ID).collection('lessons').get();
  fs.mkdirSync(OUT, {recursive:true});
  const idx = [];
  snap.forEach(d => {
    if (d.id === '_index') return;
    const x = d.data();
    if (x.type !== 'html') return;
    const c = x.content || '';
    let qs = null;
    try { const p = JSON.parse(c); if (Array.isArray(p)) qs = p; } catch {}
    if (!qs) { idx.push({id:d.id, title:x.title, n:0, note:'not a question array'}); return; }
    fs.writeFileSync(path.join(OUT, d.id + '.json'), JSON.stringify(qs));
    idx.push({id:d.id, title:x.title, order:x.order, n:qs.length});
  });
  fs.writeFileSync(path.join(OUT,'_index.json'), JSON.stringify(idx,null,2));
  idx.sort((a,b)=>(a.order||0)-(b.order||0)).forEach(r=>console.log(`${r.id}  ${String(r.n).padStart(4)} ข้อ  ${r.title}${r.note?'  ['+r.note+']':''}`));
  process.exit(0);
})();
