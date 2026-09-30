const path=require('path'); const admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
const S=['ง่าย','กลาง','ยาก','ยากมาก'];
(async()=>{
  const db=admin.firestore();
  const ids={'จำนวนเต็ม (ม.1)':null,'เศษส่วน (ป.6)':null,'แผนภูมิและกราฟ':null};
  const snap=await db.collection('exams').get();
  const pick=[];
  snap.forEach(d=>{const x=d.data();
    if(['จำนวนเต็ม','เศษส่วน','แผนภูมิและกราฟ','อสมการเชิงเส้นตัวแปรเดียว','โจทย์ปัญหาการบวก','เซต'].includes(x.title)) pick.push({id:d.id,t:x.title,cat:x.category,qs:x.questions||[]});
  });
  pick.forEach(p=>{
    const q=p.qs[0]||{};
    const withLv=p.qs.filter(z=>Array.isArray(z.tags)&&z.tags.some(t=>S.includes(t))).length;
    const withDiff=p.qs.filter(z=>z.difficulty||z.level).length;
    console.log(`\n── ${p.t} (${p.cat}) · ${p.qs.length} ข้อ`);
    console.log(`   ข้อมีระดับใน tags: ${withLv}/${p.qs.length} · มี field difficulty/level รายข้อ: ${withDiff}`);
    console.log(`   field ของข้อแรก: ${Object.keys(q).join(', ')}`);
    console.log(`   tags ข้อแรก: ${JSON.stringify(q.tags)}`);
  });
  process.exit(0);
})();
