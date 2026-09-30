const path=require('path'),admin=require('firebase-admin');
const sa=require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
const BAD=/\neq(?![a-zA-Z])/;   // ขึ้นบรรทัดใหม่ตามด้วย eq = \neq ที่ถูกกลืน
(async()=>{
  const snap=await admin.firestore().collection('exams').get();
  let totalQ=0,totalSets=0,rows=[];
  snap.forEach(d=>{
    const x=d.data(); let qs=x.questions; if(typeof qs==='string'){try{qs=JSON.parse(qs)}catch{qs=[]}}
    if(!Array.isArray(qs))return;
    const hits=[];
    qs.forEach((q,i)=>{
      const fields=[q.question,q.explanation,...(q.options||[])].filter(v=>typeof v==='string');
      if(fields.some(v=>BAD.test(v))) hits.push(i+1);
    });
    if(hits.length){totalSets++;totalQ+=hits.length;rows.push({t:String(x.title).replace(/\s+/g,' ').trim(),c:x.category,id:d.id,n:hits.length});}
  });
  rows.sort((a,b)=>b.n-a.n);
  console.log(`ชุดที่มีอาการ ${totalSets} ชุด · รวม ${totalQ} ข้อ (จากทั้งหมด ${snap.size} ชุด)`);
  rows.slice(0,40).forEach(r=>console.log(`  ${String(r.n).padStart(3)} ข้อ | [${r.c}] ${r.t}  (${r.id})`));
  if(rows.length>40)console.log(`  ... อีก ${rows.length-40} ชุด`);
  process.exit(0);
})();
