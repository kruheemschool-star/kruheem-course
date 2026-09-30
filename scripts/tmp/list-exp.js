const path=require('path'),admin=require('firebase-admin');
const sa=require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
(async()=>{
  const snap=await admin.firestore().collection('exams').get();
  const rows=[];
  snap.forEach(d=>{
    const x=d.data();
    const t=String(x.title||'');
    if(/ยกกำลัง|เลขยกกำลัง|exponent/i.test(t)||/ยกกำลัง/.test(String(x.category||''))){
      const qs=Array.isArray(x.questions)?x.questions:[];
      rows.push({id:d.id,title:t.replace(/\s+/g,' ').trim(),cat:x.category,n:qs.length,hidden:!!x.hidden,isFree:!!x.isFree});
    }
  });
  rows.forEach(r=>console.log(`${r.id} | [${r.cat}] ${r.title} | ${r.n} ข้อ | hidden=${r.hidden} free=${r.isFree}`));
  console.log('total sets:',rows.length);
  process.exit(0);
})();
