/** สเปกงานเขียนข้อใหม่: ตำแหน่ง + ci ปัจจุบัน (ต้องคงไว้) + tag + โจทย์เดิมที่ซ้ำ */
const path=require('path'),admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../../../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
(async()=>{
  const s=await admin.firestore().collection('exams').doc(process.argv[2]).get();
  const x=s.data(), qs=x.questions||[];
  const norm=t=>String(t).replace(/[^\w฀-๿]/g,'').replace(/\s+/g,'');
  const map={}; qs.forEach((q,i)=>{const k=norm(q.question);(map[k]=map[k]||[]).push(i);});
  const rep=[];
  Object.values(map).filter(v=>v.length>1).forEach(g=>g.slice(1).forEach(i=>rep.push({i,keep:g[0]})));
  rep.sort((a,b)=>a.i-b.i);
  console.log(`# ${String(x.title).replace(/\s+/g,' ')} — ต้องเขียนใหม่ ${rep.length} ข้อ`);
  console.log('# ข้อ | ci ที่ต้องคง | หัวข้อย่อย | ซ้ำกับข้อ | โจทย์เดิม');
  rep.forEach(r=>{const q=qs[r.i];
    console.log(`${String(r.i+1).padStart(3)} | ci=${q.correctIndex+1} | ${(q.tags||[])[1]||'-'} | ซ้ำ ${r.keep+1} | ${String(q.question).replace(/\s+/g,' ').slice(0,95)}`);});
  process.exit(0);
})();
