const path=require('path'); const admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
const [id,...nums]=process.argv.slice(2);
(async()=>{
  const s=await admin.firestore().collection('exams').doc(id).get();
  const qs=s.data().questions||[];
  console.log(`── "${String(s.data().title).replace(/\n/g,' ')}" ${qs.length} ข้อ ──`);
  nums.map(Number).forEach(n=>{const q=qs[n-1]; if(!q) return;
    console.log(`\n[ข้อ ${n}] ${String(q.question).replace(/\s+/g,' ').slice(0,190)}`);
    console.log(`   tags: ${JSON.stringify(q.tags)}`);});
  process.exit(0);
})();
