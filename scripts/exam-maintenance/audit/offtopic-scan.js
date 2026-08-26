/** จับ "ของปน" — ข้อที่ tag ไม่เกาะกับหัวข้อหลักของชุด (วิธีเดียวกับที่เจอชุดตรีโกณ ม.3) */
const path=require('path'); const admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
const NOISE=new Set(['คณิตศาสตร์','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3','ม.4','ม.5','ม.6','สอบเข้า ม.1','ง่าย','กลาง','ยาก','ยากมาก','คิดเลข','เข้าใจ','แปลโจทย์']);
(async()=>{
  const snap=await admin.firestore().collection('exams').get();
  const out=[];
  snap.forEach(d=>{
    const x=d.data(); const qs=x.questions||[]; if(qs.length<50) return;
    // tag ที่พบบ่อยที่สุดในชุด = หัวข้อหลัก
    const freq={};
    qs.forEach(q=>(q.tags||[]).forEach(t=>{if(!NOISE.has(t)) freq[t]=(freq[t]||0)+1;}));
    const ranked=Object.entries(freq).sort((a,b)=>b[1]-a[1]);
    const core=new Set(ranked.filter(([,c])=>c>=qs.length*0.25).map(([t])=>t));
    if(!core.size) return;
    const orphan=[];
    qs.forEach((q,i)=>{ const t=(q.tags||[]).filter(z=>!NOISE.has(z));
      if(t.length && !t.some(z=>core.has(z))) orphan.push(i+1); });
    if(orphan.length) out.push({id:d.id,cat:x.category,title:String(x.title).replace(/\n/g,' '),n:qs.length,
      core:[...core].slice(0,3), orphan, pct:(orphan.length/qs.length*100)});
  });
  out.sort((a,b)=>b.pct-a.pct);
  console.log('══ ชุดที่มีข้อ tag ไม่เกาะหัวข้อหลัก ══\n');
  out.forEach(o=>{
    console.log(`${o.pct.toFixed(1)}%  ${o.orphan.length}/${o.n} ข้อ — [${o.cat}] ${o.title}`);
    console.log(`   หัวข้อหลัก: ${o.core.join(' · ')}`);
    console.log(`   ข้อ: ${o.orphan.slice(0,25).join(', ')}${o.orphan.length>25?` … (อีก ${o.orphan.length-25})`:''}`);
    console.log(`   id: ${o.id}\n`);
  });
  if(!out.length) console.log('ไม่พบ');
  process.exit(0);
})();
