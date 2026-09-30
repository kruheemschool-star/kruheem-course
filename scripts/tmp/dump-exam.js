const path=require('path'),fs=require('fs'),admin=require('firebase-admin');
const sa=require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
(async()=>{
  const id=process.argv[2], out=process.argv[3];
  const snap=await admin.firestore().collection('exams').doc(id).get();
  if(!snap.exists){console.log('NOT FOUND');process.exit(1);}
  const x=snap.data();
  let qs=x.questions; if(typeof qs==='string'){try{qs=JSON.parse(qs)}catch{qs=[]}}
  fs.writeFileSync(out,JSON.stringify({id,title:x.title,category:x.category,count:qs.length,questions:qs},null,2));
  console.log('saved',out,'title:',x.title,'n:',qs.length);
  console.log('fields:',Object.keys(x).join(', '));
  process.exit(0);
})();
