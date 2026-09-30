const path=require('path'); const admin=require('firebase-admin');
const sa=require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
const db=admin.firestore();
const CID='lBj1ZUlnBiU8vv3lm94y';
const TITLES=['แนวข้อสอบ ชุดที่ 1','แนวข้อสอบ ชุดที่ 2','แนวข้อสอบ ชุดที่ 3'];
(async()=>{
  const col=db.collection('courses').doc(CID).collection('lessons');
  const ids=[];
  for(const t of TITLES){
    const s=await col.where('title','==',t).get();
    if(s.empty){console.log(`ไม่พบ: ${t}`); continue;}
    s.forEach(d=>{const x=d.data(); let n=0;try{n=JSON.parse(x.content||'[]').length}catch(e){}
      ids.push({id:d.id,title:x.title,n,order:x.order,type:x.type,
                kb:Math.round(Buffer.byteLength(x.content||'',
'utf8')/1024)});});
  }
  console.log('เป้าหมายที่จะลบ:');
  ids.forEach(x=>console.log(`  [${x.id}] ${x.title} | ${x.n} ข้อ | order ${x.order} | type ${x.type} | ${x.kb}KB`));
  console.log('รวม',ids.reduce((s,x)=>s+x.n,0),'ข้อ');
  // มีนักเรียนทำค้างไว้ไหม — ดู enrollments ที่อ้าง lessonId เหล่านี้
  const idset=new Set(ids.map(x=>x.id));
  const en=await db.collection('enrollments').where('courseId','==',CID).get();
  console.log(`\nนักเรียนที่ลงทะเบียนคอร์สนี้: ${en.size} คน`);
  let touched=0, hits={};
  en.forEach(d=>{
    const x=d.data();
    const blob=JSON.stringify({p:x.progress||null,c:x.completedLessons||null,l:x.lastLessonId||null});
    let hit=false;
    idset.forEach(id=>{ if(blob.includes(id)){hit=true; hits[id]=(hits[id]||0)+1;} });
    if(hit) touched++;
  });
  console.log(`มีร่องรอยการเรียน 3 บทนี้ใน enrollment: ${touched} คน`);
  Object.entries(hits).forEach(([id,c])=>console.log(`   ${id}: ${c} คน`));
  process.exit(0);
})().catch(e=>{console.error('❌',e.message);process.exit(1)});
