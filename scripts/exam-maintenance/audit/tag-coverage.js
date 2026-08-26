/** ระบบวิเคราะห์จุดอ่อนต้องใช้ tag 4 มิติ (สาระ+ทักษะ+ระดับ+ชั้น) — เช็คว่าชุดไหนพร้อม */
const path=require('path'); const admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
const LV=['ง่าย','กลาง','ยาก','ยากมาก'], SK=['คิดเลข','เข้าใจ','แปลโจทย์'];
(async()=>{
  const snap=await admin.firestore().collection('exams').get();
  const ready=[],partial=[],none=[];
  let qReady=0,qNone=0;
  snap.forEach(d=>{const x=d.data(); const qs=x.questions||[]; if(!qs.length) return;
    const lv=qs.filter(q=>(q.tags||[]).some(t=>LV.includes(t))).length;
    const sk=qs.filter(q=>(q.tags||[]).some(t=>SK.includes(t))).length;
    const de=qs.filter(q=>Array.isArray(q.distractorErrors)&&q.distractorErrors.length).length;
    const row={cat:x.category,title:String(x.title).replace(/\n/g,' ').trim(),n:qs.length,lv,sk,de};
    if(lv===qs.length&&sk===qs.length){ready.push(row);qReady+=qs.length;}
    else if(lv>0||sk>0) partial.push(row);
    else {none.push(row);qNone+=qs.length;}
  });
  const line=r=>`   ${String(r.n).padStart(3)} ข้อ | [${r.cat}] ${r.title}${r.de?` · ตัวลวงมีเหตุผล ${r.de}`:''}`;
  console.log(`✅ พร้อมป้อนระบบวิเคราะห์จุดอ่อน (tag ครบ 4 มิติ) — ${ready.length} ชุด / ${qReady.toLocaleString()} ข้อ`);
  ready.forEach(r=>console.log(line(r)));
  if(partial.length){console.log(`\n🟡 มีบางมิติ — ${partial.length} ชุด`); partial.forEach(r=>console.log(`   ${String(r.n).padStart(3)} ข้อ | [${r.cat}] ${r.title} · ระดับ ${r.lv}/${r.n} · ทักษะ ${r.sk}/${r.n}`));}
  console.log(`\n❌ ไม่มี tag ระดับ/ทักษะเลย — ${none.length} ชุด / ${qNone.toLocaleString()} ข้อ`);
  const byCat={}; none.forEach(r=>{(byCat[r.cat]=byCat[r.cat]||[]).push(r);});
  Object.keys(byCat).sort().forEach(c=>console.log(`   ${c}: ${byCat[c].length} ชุด / ${byCat[c].reduce((s,r)=>s+r.n,0).toLocaleString()} ข้อ`));
  process.exit(0);
})();
