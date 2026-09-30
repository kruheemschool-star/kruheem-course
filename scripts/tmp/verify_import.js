const path=require('path'); const admin=require('firebase-admin');
const sa=require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
const db=admin.firestore();
(async()=>{
  const CID='lBj1ZUlnBiU8vv3lm94y';
  const ls=await db.collection('courses').doc(CID).collection('lessons').orderBy('order').get();
  console.log(`บทเรียนในคอร์สทั้งหมด ${ls.size} รายการ (เดิม 273)`);
  console.log('\nชุดตะลุยโจทย์ทั้งหมดที่แสดงในคอร์ส:');
  let tot=0;
  ls.forEach(d=>{const x=d.data();
    if(x.type==='html'){let n=0;try{n=JSON.parse(x.content||'[]').length}catch(e){}
      tot+=n; const mark=/เก็งข้อสอบสนามจริง/.test(x.title)?'  ← ใหม่':'';
      console.log(`  order ${String(x.order).padStart(3)} | ${String(n).padStart(3)} ข้อ | ${x.title}${mark}`);}});
  console.log(`\nรวมข้อในส่วนตะลุยโจทย์ทั้งหมด ${tot} ข้อ`);
  // สุ่มอ่านกลับ 1 ชุด ตรวจว่าอ่านค่าออกครบ
  const one=await db.collection('courses').doc(CID).collection('lessons').where('title','==','เก็งข้อสอบสนามจริง ชุดที่ 8').limit(1).get();
  const q=JSON.parse(one.docs[0].data().content);
  console.log(`\nสุ่มตรวจชุดที่ 8: ${q.length} ข้อ · มีรูป ${q.filter(x=>x.svg).length} · ข้อแรกตอบข้อ ${q[0].correctIndex+1} · ข้อสุดท้ายบท "${q[29].tags[0]}"`);
  console.log('ช่องข้อมูลครบทุกข้อ:', q.every(x=>x.question&&x.options?.length===4&&x.explanation&&x.tags?.length>=4&&x.distractorErrors?.length===3&&x.expectedSeconds&&x.subskill));
  process.exit(0);
})().catch(e=>{console.error('❌',e.message);process.exit(1)});
