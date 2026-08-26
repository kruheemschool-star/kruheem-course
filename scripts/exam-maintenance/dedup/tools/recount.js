/** แยกให้ชัดว่าอะไรคือ "ซ้ำจริง" (โจทย์+ตัวเลือกเหมือนกันหมด) กับ "โจทย์ขึ้นต้นเหมือนแต่ตัวเลือกต่าง" */
const path=require('path'),admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../../../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
const norm=s=>String(s).replace(/[^\w฀-๿+\-]/g,'').replace(/\s+/g,'');
(async()=>{
  const snap=await admin.firestore().collection('exams').get();
  let trueDup=0, stemOnly=0; const rows=[];
  snap.forEach(d=>{
    const x=d.data(); const qs=x.questions||[]; if(!qs.length) return;
    const byQ={}, byFull={};
    qs.forEach((q,i)=>{
      const kq=norm(q.question);
      const kf=kq+'||'+[...q.options].sort().map(norm).join('|');
      (byQ[kq]=byQ[kq]||[]).push(i); (byFull[kf]=byFull[kf]||[]).push(i);
    });
    const t=Object.values(byFull).reduce((s,g)=>s+g.length-1,0);
    const a=Object.values(byQ).reduce((s,g)=>s+g.length-1,0);
    if(a){ trueDup+=t; stemOnly+=a-t;
      rows.push({cat:x.category,title:String(x.title).replace(/\s+/g,' ').trim(),id:d.id,t,s:a-t,
        pos:Object.values(byFull).filter(g=>g.length>1).flatMap(g=>g.slice(1).map(i=>i+1)).sort((p,q)=>p-q)}); }
  });
  rows.sort((a,b)=>b.t-a.t);
  console.log(`ซ้ำจริง (โจทย์+ตัวเลือกเหมือนกันทุกตัว) รวม ${trueDup} ข้อ`);
  console.log(`โจทย์ขึ้นต้นเหมือนแต่ตัวเลือกต่าง รวม ${stemOnly} ข้อ — คนละข้อกัน ไม่ต้องแก้\n`);
  rows.filter(r=>r.t).forEach(r=>console.log(`${String(r.t).padStart(3)} ข้อ | [${r.cat}] ${r.title}  (${r.id})\n        ข้อ: ${r.pos.join(', ')}`));
  const only=rows.filter(r=>!r.t&&r.s);
  if(only.length) console.log(`\nชุดที่มีแต่โจทย์ขึ้นต้นซ้ำ (ไม่ต้องแก้): ${only.map(r=>r.title+' '+r.s).join(' · ')}`);
  process.exit(0);
})();
