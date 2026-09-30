const admin=require('firebase-admin'),path=require('path');
const sa=require(path.resolve(__dirname,'../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
const db=admin.firestore();
(async()=>{
  const ls=await db.collection('courses').doc('z41lCWEynOVjHhaoeT9B').collection('lessons').orderBy('order').get();
  let tot=0,n=0;
  ls.forEach(s=>{const l=s.data();
    if(l.order>=60){
      const c=l.content||'';
      let q=0; try{q=JSON.parse(c).length}catch(e){}
      tot+=q; if(q)n++;
      console.log(`${String(l.order).padEnd(5)} ${l.type.padEnd(7)} ${l.title.padEnd(52)} ${q?q+' ข้อ':''}`);
    }});
  console.log(`\nรวม ${n} ชุด · ${tot} ข้อ · บทเรียนทั้งคอร์ส ${ls.size}`);
  process.exit(0);
})();
