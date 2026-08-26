/** ดึงคลังออกมาเป็นไฟล์เดียว แยกชุดที่มี tag ครบ (ใช้สอน) กับชุดที่ไม่มี (ต้องเติม) */
const fs=require('fs'),path=require('path'),admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../../../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
const LV=['ง่าย','กลาง','ยาก','ยากมาก'],SK=['คิดเลข','เข้าใจ','แปลโจทย์'];
(async()=>{
  const snap=await admin.firestore().collection('exams').get();
  const labeled=[],unlabeled=[];
  snap.forEach(d=>{const x=d.data();const qs=x.questions||[];if(!qs.length)return;
    const lv=qs.filter(q=>(q.tags||[]).some(t=>LV.includes(t))).length;
    const sk=qs.filter(q=>(q.tags||[]).some(t=>SK.includes(t))).length;
    const meta={id:d.id,cat:x.category,title:String(x.title).replace(/\s+/g,' ').trim(),n:qs.length};
    const rows=qs.map((q,i)=>({i,question:q.question,options:q.options,ci:q.correctIndex,
      explanation:q.explanation||'',tags:q.tags||[],svg:!!q.svg,
      lv:(q.tags||[]).find(t=>LV.includes(t))||null, sk:(q.tags||[]).find(t=>SK.includes(t))||null,
      es:q.expectedSeconds||null, sub:q.subskill||null}));
    (lv===qs.length&&sk===qs.length?labeled:unlabeled).push({...meta,rows});});
  fs.writeFileSync(path.join(__dirname,'..','labeled.json'),JSON.stringify(labeled));
  fs.writeFileSync(path.join(__dirname,'..','unlabeled.json'),JSON.stringify(unlabeled));
  const c=a=>a.reduce((s,x)=>s+x.n,0);
  console.log(`labeled ${labeled.length} ชุด / ${c(labeled)} ข้อ · unlabeled ${unlabeled.length} ชุด / ${c(unlabeled)} ข้อ`);
  process.exit(0);
})();
