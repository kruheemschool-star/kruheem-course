/** ดูข้อซ้ำของชุดหนึ่ง พร้อมข้อข้างเคียง เพื่อเขียนข้อใหม่ให้เข้ากับบริบท */
const path=require('path'),admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../../../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
const id=process.argv[2], mode=process.argv[3]||'dup';
(async()=>{
  const s=await admin.firestore().collection('exams').doc(id).get();
  const x=s.data(), qs=x.questions||[];
  const norm=t=>String(t).replace(/[^\w฀-๿]/g,'').replace(/\s+/g,'');
  const map={}; qs.forEach((q,i)=>{const k=norm(q.question);(map[k]=map[k]||[]).push(i);});
  const groups=Object.values(map).filter(v=>v.length>1);
  console.log(`"${String(x.title).replace(/\s+/g,' ')}" ${qs.length} ข้อ · ซ้ำ ${groups.reduce((s,g)=>s+g.length-1,0)} ข้อ\n`);
  if(mode==='dup'){
    groups.forEach(g=>{
      const q=qs[g[0]];
      console.log(`── ข้อ ${g.map(i=>i+1).join(' = ')}  (เก็บ ${g[0]+1} · เขียนใหม่แทน ${g.slice(1).map(i=>i+1).join(', ')})`);
      console.log(`   ${String(q.question).replace(/\s+/g,' ').slice(0,190)}`);
      console.log(`   ${q.options.map((o,k)=>(k===q.correctIndex?'▶':' ')+(k+1)+') '+String(o).slice(0,40)).join(' | ')}`);
      console.log(`   tags: ${JSON.stringify(q.tags)}`);
      g.slice(1).forEach(i=>{ if(qs[i].correctIndex!==q.correctIndex) console.log(`   ⚠️ ข้อ ${i+1} ci=${qs[i].correctIndex+1} ต่างจากต้นแบบ`); });
    });
  } else {
    const nums=mode.split(',').map(Number);
    nums.forEach(n=>{const q=qs[n-1]; console.log(`[${n}] ${String(q.question).replace(/\s+/g,' ').slice(0,200)}`);
      console.log(`    ${q.options.map((o,k)=>(k===q.correctIndex?'▶':' ')+(k+1)+') '+String(o).slice(0,45)).join(' | ')}`);
      console.log(`    tags: ${JSON.stringify(q.tags)}`);});
  }
  process.exit(0);
})();
