const path=require('path'); const admin=require('firebase-admin');
const sa=require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
const db=admin.firestore();
const CID='lBj1ZUlnBiU8vv3lm94y';
const IDS=['WyGAcayuqpqEGDJIYrNp','UBwv7gFA7dV7HkVwZFuq','3sKHkcPKQRTKUEkHOGZj'];
(async()=>{
  const en=await db.collection('enrollments').where('courseId','==',CID).limit(3).get();
  en.forEach(d=>{const x=d.data();
    console.log(`enrollment [${d.id}] ช่องข้อมูล:`, Object.keys(x).join(', '));});
  // ดู subcollection ของ enrollment ตัวแรก
  const first=en.docs[0];
  const subs=await first.ref.listCollections();
  console.log('subcollections ของ enrollment:', subs.map(c=>c.id).join(', ')||'(ไม่มี)');
  // ตัวอย่างค่า progress
  const p=first.data().progress;
  console.log('ตัวอย่าง progress:', typeof p, JSON.stringify(p).slice(0,300));
  // ค้นทั้ง 317 คนแบบเทียบทุกช่องในเอกสาร (ไม่ใช่แค่ 3 ช่อง)
  const all=await db.collection('enrollments').where('courseId','==',CID).get();
  let hit=0;
  all.forEach(d=>{const s=JSON.stringify(d.data()); if(IDS.some(i=>s.includes(i))) hit++;});
  console.log(`\nสแกนทั้งเอกสาร enrollment ครบ ${all.size} คน — พบอ้างถึง 3 บทนี้: ${hit} คน`);
  process.exit(0);
})().catch(e=>{console.error('❌',e.message);process.exit(1)});
