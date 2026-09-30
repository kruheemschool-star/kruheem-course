const path=require('path'); const admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
(async()=>{
  const db=admin.firestore();
  // ชุดที่เพิ่งอัปไปรอบก่อน (ม.4 เอกซ์โพ) ใช้เทียบ schema ข้อ
  const s=await db.collection('exams').doc('qJe7moeg7guVZyUG5dMO').get();
  const q=(s.data().questions||[])[0];
  console.log('── field ของข้อในชุดใหม่ล่าสุด ──');
  console.log(Object.keys(q).join(', '));
  console.log(JSON.stringify({...q, explanation:'…', question:String(q.question).slice(0,40)+'…'},null,1));
  // ปกชุดประถมทั้งหมด
  const all=await db.collection('exams').where('category','==','ป.4-ป.6').get();
  console.log('\n── ปกของชุดประถม ──');
  all.forEach(d=>{const x=d.data(); console.log(`  ${String(x.order).padStart(5)} ${x.title} → ${x.coverImage?x.coverImage.slice(0,105)+'…':'(ไม่มีปก)'}`);});
  process.exit(0);
})();
