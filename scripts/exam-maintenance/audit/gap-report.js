const path=require('path'); const admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
(async()=>{
  const snap=await admin.firestore().collection('exams').get();
  const rows=[];
  snap.forEach(d=>{const x=d.data(); rows.push({id:d.id,cat:x.category||'(ไม่มีหมวด)',title:x.title,order:x.order??0,
    n:(x.questions||[]).length, tagged:(x.questions||[]).filter(q=>Array.isArray(q.tags)&&q.tags.some(t=>['ง่าย','กลาง','ยาก','ยากมาก'].includes(t))).length,
    cover:!!x.coverImage, free:!!x.isFree, hidden:!!x.hidden});});
  const by={};
  rows.forEach(r=>{(by[r.cat]=by[r.cat]||[]).push(r);});
  let total=0,totalQ=0;
  console.log('══ คลังข้อสอบตอนนี้ ══');
  Object.keys(by).sort().forEach(c=>{
    const g=by[c].sort((a,b)=>a.order-b.order);
    const q=g.reduce((s,r)=>s+r.n,0); total+=g.length; totalQ+=q;
    console.log(`\n${c} — ${g.length} ชุด / ${q.toLocaleString()} ข้อ`);
    g.forEach(r=>console.log(`   ${String(r.n).padStart(3)} ข้อ | ${r.title}${r.free?' [ฟรี]':''}${r.hidden?' [ซ่อน]':''}${r.cover?'':' ⚠️ไม่มีปก'}${r.n&&r.tagged<r.n?` ⚠️tag ระดับไม่ครบ ${r.tagged}/${r.n}`:''}`));
  });
  console.log(`\nรวม ${total} ชุด / ${totalQ.toLocaleString()} ข้อ`);
  process.exit(0);
})();
