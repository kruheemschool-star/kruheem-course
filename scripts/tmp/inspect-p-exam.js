const path=require('path'); const admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
(async()=>{
  const db=admin.firestore();
  const s=await db.collection('exams').doc('GsGh00XCbAwOwb0XX70U').get();
  const x=s.data(); const q0=(x.questions||[])[0];
  const meta={...x}; delete meta.questions;
  console.log('── field ของชุด "เส้นขนาน" (ไม่รวม questions) ──');
  console.log(JSON.stringify(meta,null,1));
  console.log('\n── โครงข้อแรก ──');
  console.log(JSON.stringify({...q0, explanation:(q0.explanation||'').slice(0,60)+'…', svg:q0.svg?q0.svg.slice(0,50)+'…':undefined},null,1));
  const all=await db.collection('exams').get(); const used=[];
  all.forEach(d=>{const y=d.data(); if(y.order>=27&&y.order<=32) used.push(`${y.order} · ${y.category} · ${y.title}`);});
  console.log('\n── order 27-32 ที่ใช้อยู่ทั้งคลัง ──'); used.sort().forEach(u=>console.log('  '+u));
  process.exit(0);
})();
