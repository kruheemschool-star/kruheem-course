const path=require('path'); const admin=require('firebase-admin');
const sa=require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
const db=admin.firestore();
(async()=>{
  const CID='lBj1ZUlnBiU8vv3lm94y';
  const ls=await db.collection('courses').doc(CID).collection('lessons').orderBy('order').get();
  console.log(`บทเรียนในคอร์สทั้งหมด ${ls.size} รายการ`);
  let tot=0,sets=0;
  console.log('\nส่วนตะลุยโจทย์ตอนนี้:');
  ls.forEach(d=>{const x=d.data();
    if(x.type==='html'){let n=0;try{n=JSON.parse(x.content||'[]').length}catch(e){}
      tot+=n; sets++; console.log(`  ${String(x.order).padStart(3)} | ${String(n).padStart(3)} ข้อ | ${x.title}`);}});
  console.log(`\nรวม ${sets} ชุด · ${tot} ข้อ`);
  for(const t of ['แนวข้อสอบ ชุดที่ 1','แนวข้อสอบ ชุดที่ 2','แนวข้อสอบ ชุดที่ 3']){
    const s=await db.collection('courses').doc(CID).collection('lessons').where('title','==',t).get();
    console.log(`ตรวจว่าลบแล้วจริง — "${t}": ${s.empty?'ไม่พบแล้ว ✓':'ยังอยู่ ✗'}`);
  }
  process.exit(0);
})().catch(e=>{console.error('❌',e.message);process.exit(1)});
