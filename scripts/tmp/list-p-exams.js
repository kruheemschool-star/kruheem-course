const path=require('path'); const admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
(async()=>{
  const snap=await admin.firestore().collection('exams').get();
  const rows=[];
  snap.forEach(d=>{const x=d.data(); rows.push({id:d.id,cat:x.category||'',title:x.title,order:x.order,n:(x.questions||[]).length,free:!!x.isFree,hidden:!!x.hidden,theme:x.themeColor,secs:x.recommendedSecondsPerQuestion,tl:x.timeLimit,diff:x.difficulty,level:x.level});});
  const cats={}; rows.forEach(r=>{cats[r.cat]=(cats[r.cat]||0)+1;});
  console.log('หมวดทั้งหมด:', JSON.stringify(cats,null,0));
  console.log('\n── ชุดในหมวดประถม ──');
  rows.filter(r=>/ป\.|ประถม/.test(r.cat)).sort((a,b)=>(a.order||0)-(b.order||0))
    .forEach(r=>console.log(`  order ${String(r.order).padStart(3)} | ${r.n.toString().padStart(3)} ข้อ | ${r.cat} | ${r.title}${r.free?' [ฟรี]':''}${r.hidden?' [ซ่อน]':''}`));
  const p=rows.filter(r=>/ป\.|ประถม/.test(r.cat)).sort((a,b)=>(b.order||0)-(a.order||0))[0];
  console.log('\nตัวอย่าง field ของชุดประถม order สูงสุด:', JSON.stringify(p,null,1));
  console.log('\norder สูงสุดทั้งคลัง:', Math.max(...rows.map(r=>r.order||0)));
  process.exit(0);
})();
