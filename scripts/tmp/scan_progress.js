const path=require('path'); const admin=require('firebase-admin');
const sa=require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
const db=admin.firestore();
const CID='lBj1ZUlnBiU8vv3lm94y';
const T={'WyGAcayuqpqEGDJIYrNp':'ชุดที่ 1','UBwv7gFA7dV7HkVwZFuq':'ชุดที่ 2','3sKHkcPKQRTKUEkHOGZj':'ชุดที่ 3'};
(async()=>{
  const en=await db.collection('enrollments').where('courseId','==',CID).get();
  const uids=[...new Set(en.docs.map(d=>d.data().userId).filter(Boolean))];
  console.log(`ผู้เรียนไม่ซ้ำ ${uids.length} คน — กำลังอ่าน users/<uid>/progress/${CID}`);
  const refs=uids.map(u=>db.doc(`users/${u}/progress/${CID}`));
  const hits={}; let withProgress=0, touched=0;
  for(let i=0;i<refs.length;i+=300){
    const docs=await db.getAll(...refs.slice(i,i+300));
    docs.forEach(d=>{
      if(!d.exists) return;
      withProgress++;
      const s=JSON.stringify(d.data());
      let hit=false;
      Object.keys(T).forEach(id=>{ if(s.includes(id)){hits[id]=(hits[id]||0)+1; hit=true;} });
      if(hit) touched++;
    });
  }
  console.log(`มีเอกสารความคืบหน้า ${withProgress} คน`);
  console.log(`แตะ 3 บทที่จะลบ: ${touched} คน`);
  Object.entries(T).forEach(([id,name])=>console.log(`   ${name} [${id}] : ${hits[id]||0} คน`));
  process.exit(0);
})().catch(e=>{console.error('❌',e.message);process.exit(1)});
