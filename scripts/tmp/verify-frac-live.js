const path=require('path');const admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
(async()=>{const db=admin.firestore();
const col=db.collection('courses').doc('fhoc1u2JT8WghFHapzx8').collection('lessons');
const s=await col.where('title','==','แนวข้อสอบ: เศษส่วน').get();
for(const d of s.docs){const x=d.data();const qs=JSON.parse(x.content);
console.log('lesson',d.id,'order',x.order,'type',x.type,'ข้อ',qs.length,'id1..N',qs[0].id,qs[qs.length-1].id);
console.log('ข้อแรก:',qs[0].question.slice(0,60));}
const idx=await col.doc('_index').get();const items=idx.data().items||idx.data().lessons||[];
const hit=items.filter(i=>String(i.title||'').startsWith('แนวข้อสอบ'));
hit.forEach(h=>console.log('index:',h.title,'| questionCount',h.questionCount,'| order',h.order));})();
