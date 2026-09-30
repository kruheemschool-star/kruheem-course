const path=require('path'); const admin=require('firebase-admin');
const sa=require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
const db=admin.firestore();
(async()=>{
  const CID='lBj1ZUlnBiU8vv3lm94y';
  const ls=await db.collection('courses').doc(CID).collection('lessons').orderBy('order').get();
  console.log('ส่วนตะลุยโจทย์ทั้งหมด:');
  let sets=0,tot=0;
  ls.forEach(d=>{const x=d.data();
    if(x.type==='html'){let n=0;try{n=JSON.parse(x.content||'[]').length}catch(e){}
      sets++;tot+=n;
      console.log(`  ${String(n).padStart(3)} ข้อ | ${x.title}  (${[...x.title].length} ตัวอักษร)`);}});
  console.log(`\nรวม ${sets} ชุด ${tot} ข้อ`);
  const old=await db.collection('courses').doc(CID).collection('lessons').where('title','>=','เก็งข้อสอบสนามจริง').where('title','<','เก็งข้อสอบสนามจริงz').get();
  console.log('เหลือชื่อเก่าค้างอยู่:',old.size,'รายการ');
  process.exit(0);
})().catch(e=>{console.error('❌',e.message);process.exit(1)});
