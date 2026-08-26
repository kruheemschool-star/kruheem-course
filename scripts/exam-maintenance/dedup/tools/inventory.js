/** ทำรายการข้อซ้ำทั้งคลัง พร้อมรายละเอียดที่ต้องใช้เขียนข้อใหม่แทน */
const fs=require('fs'),path=require('path'),admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../../../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
const norm=s=>String(s).replace(/[^\w฀-๿]/g,'').replace(/\s+/g,'');
(async()=>{
  const snap=await admin.firestore().collection('exams').get();
  const out=[];
  snap.forEach(d=>{
    const x=d.data(); const qs=x.questions||[]; if(!qs.length) return;
    const map={};
    qs.forEach((q,i)=>{const k=norm(q.question);(map[k]=map[k]||[]).push(i);});
    const groups=Object.values(map).filter(v=>v.length>1);
    if(!groups.length) return;
    out.push({id:d.id,cat:x.category,title:String(x.title).replace(/\s+/g,' ').trim(),n:qs.length,
      groups:groups.map(g=>({keep:g[0],replace:g.slice(1),
        q:String(qs[g[0]].question).replace(/\s+/g,' ').slice(0,150),
        ci:qs[g[0]].correctIndex, tags:qs[g[0]].tags,
        opts:qs[g[0]].options}))});
  });
  out.sort((a,b)=>b.groups.reduce((s,g)=>s+g.replace.length,0)-a.groups.reduce((s,g)=>s+g.replace.length,0));
  const tot=out.reduce((s,o)=>s+o.groups.reduce((t,g)=>t+g.replace.length,0),0);
  fs.writeFileSync(path.join(__dirname,'inventory.json'),JSON.stringify(out,null,1));
  console.log(`ชุดที่มีข้อซ้ำ ${out.length} ชุด · ต้องเขียนข้อใหม่แทน ${tot} ข้อ\n`);
  out.forEach(o=>{
    const n=o.groups.reduce((t,g)=>t+g.replace.length,0);
    console.log(`${String(n).padStart(3)} ข้อ | [${o.cat}] ${o.title}  (${o.id})`);
    console.log(`        ตำแหน่งที่ต้องเขียนใหม่: ${o.groups.flatMap(g=>g.replace.map(i=>i+1)).sort((a,b)=>a-b).join(', ')}`);
  });
  process.exit(0);
})();
