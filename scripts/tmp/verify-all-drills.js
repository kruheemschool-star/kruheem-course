const path=require('path');const admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
(async()=>{const db=admin.firestore();
const col=db.collection('courses').doc('fhoc1u2JT8WghFHapzx8').collection('lessons');
const s=await col.get();
const rows=s.docs.filter(d=>d.id!=='_index'&&d.data().type==='html'&&/แนวข้อสอบ/.test(d.data().title||''))
  .map(d=>({id:d.id,order:d.data().order,title:d.data().title,n:(()=>{try{return JSON.parse(d.data().content).length}catch(e){return 'ERR'}})(),
            svg:(()=>{try{return JSON.parse(d.data().content).filter(q=>q.svg).length}catch(e){return 0}})(),
            kb:Math.round(Buffer.byteLength(d.data().content,'utf8')/1024)}));
rows.sort((a,b)=>a.order-b.order);
let tot=0; rows.forEach(r=>{tot+=r.n===
'ERR'?0:r.n; console.log(`order ${r.order} | ${r.title} | ${r.n} ข้อ | svg ${r.svg} | ${r.kb}KB | ${r.id}`)});
console.log('รวมข้อทั้งหมด',tot);
const idx=await col.doc('_index').get();const items=idx.data().items||idx.data().lessons||[];
console.log('index มีทั้งหมด',items.length,'บทเรียน');
items.filter(i=>/แนวข้อสอบ/.test(i.title||'')).forEach(i=>console.log(' idx:',i.title,'|',i.questionCount));})();
