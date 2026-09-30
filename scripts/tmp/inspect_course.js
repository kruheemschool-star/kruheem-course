const path=require('path'); const admin=require('firebase-admin');
const sa=require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
const db=admin.firestore();
(async()=>{
  const snap=await db.collection('courses').get();
  console.log('คอร์สทั้งหมด:');
  snap.forEach(d=>{const t=d.data().title||''; if(/ม\.?1|ม1|ป\.?6/.test(t)) console.log(`  [${d.id}] ${t}`);});
  const CID='lBj1ZUlnBiU8vv3lm94y';
  const c=await db.collection('courses').doc(CID).get();
  if(!c.exists){console.log('ไม่พบคอร์ส',CID);process.exit(0);}
  console.log(`\nคอร์สเป้าหมาย [${CID}] = ${c.data().title}`);
  const ls=await db.collection('courses').doc(CID).collection('lessons').orderBy('order').get();
  console.log(`บทเรียนทั้งหมด ${ls.size} รายการ — เฉพาะที่เป็นชุดข้อสอบ (type html):`);
  let maxOrder=0;
  ls.forEach(d=>{const x=d.data(); maxOrder=Math.max(maxOrder,x.order||0);
    if(x.type==='html'){let n='?';try{n=JSON.parse(x.content||'[]').length}catch(e){}
      console.log(`  order ${String(x.order).padStart(3)} | ${n} ข้อ | ${x.title}`);}});
  console.log('order สูงสุดในคอร์ส =',maxOrder);
  process.exit(0);
})().catch(e=>{console.error('❌',e.message);process.exit(1)});
