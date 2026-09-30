const path=require('path');const admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
(async()=>{const s=await admin.firestore().collection('courses').doc('fhoc1u2JT8WghFHapzx8').collection('lessons').get();
const rows=s.docs.filter(d=>d.id!=='_index').map(d=>({id:d.id,order:d.data().order,title:d.data().title,type:d.data().type}));
rows.sort((a,b)=>a.order-b.order);
rows.filter(r=>r.order>=195).forEach(r=>console.log(r.order,'|',r.type,'|',r.title,'|',r.id));
console.log('รวมบทเรียน',rows.length);})();
