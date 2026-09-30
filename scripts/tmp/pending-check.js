const path=require('path'); const admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
(async()=>{
  const db=admin.firestore();
  // 1) ตัวนับสถิติคลังข้อสอบ เดินหรือยัง (ต้อง deploy rules ก่อนถึงเดิน)
  const st=await db.collection('stats').get();
  const exDocs=[]; st.forEach(d=>{if(d.id.startsWith('exam_')) exDocs.push({id:d.id,keys:Object.keys(d.data()).length});});
  exDocs.sort((a,b)=>a.id<b.id?1:-1);
  console.log(`── ตัวนับสถิติคลังข้อสอบ (stats/exam_YYYY-MM-DD) ──`);
  console.log(`   มี ${exDocs.length} วัน · ล่าสุด: ${exDocs.slice(0,5).map(d=>d.id.replace('exam_','')).join(', ')||'(ไม่มีเลย)'}`);
  process.exit(0);
})();
