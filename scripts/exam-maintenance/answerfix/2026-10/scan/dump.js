/**
 * ขั้นที่ 1 ของการตรวจ "เฉลยกับวิธีทำไม่ตรงกัน" — ดึงข้อสอบทั้งคลัง + ทุกคอร์สมาเก็บในเครื่อง
 * รัน: node scripts/exam-maintenance/answerfix/2026-10/scan/dump.js <โฟลเดอร์ปลายทาง>
 * แล้วต่อด้วย scan.js และ equiv.js (ส่ง path ของ all.json เป็นอาร์กิวเมนต์)
 */
const fs=require('fs'), path=require('path');
const admin=require('firebase-admin');
admin.initializeApp({credential:admin.credential.cert(require(require('path').resolve(__dirname, '../../../../seed-gifted-m1/serviceAccountKey.json')))});
const db=admin.firestore(); const OUT=process.argv[2];
(async()=>{
  const all=[];
  for (const d of (await db.collection('exams').get()).docs){
    const x=d.data(); let qs=x.questions; if(typeof qs==='string'){try{qs=JSON.parse(qs)}catch{qs=null}}
    if(!Array.isArray(qs)||!qs.length) continue;
    all.push({src:'exam',id:d.id,title:x.title,hidden:!!x.hidden,n:qs.length,qs});
  }
  for (const co of (await db.collection('courses').get()).docs){
    for (const l of (await co.ref.collection('lessons').get()).docs){
      if(l.id==='_index') continue; const x=l.data();
      let qs=null; try{const p=JSON.parse(x.content||''); if(Array.isArray(p)&&p.length&&p[0]&&p[0].question!==undefined) qs=p;}catch{}
      if(!qs) continue;
      all.push({src:'course',id:co.id+'/'+l.id,course:co.data().title,title:x.title,type:x.type,n:qs.length,qs});
    }
  }
  fs.writeFileSync(path.join(OUT,'all.json'),JSON.stringify(all));
  const e=all.filter(a=>a.src==='exam'), c=all.filter(a=>a.src==='course');
  console.log('exam sets',e.length,e.reduce((s,a)=>s+a.n,0),'| course sets',c.length,c.reduce((s,a)=>s+a.n,0));
  process.exit(0);
})();
