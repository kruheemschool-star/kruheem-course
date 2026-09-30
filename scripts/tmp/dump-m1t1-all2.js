const path=require('path');const admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
(async()=>{const s=await admin.firestore().collection('courses').doc('fhoc1u2JT8WghFHapzx8').collection('lessons').get();
const rows=s.docs.filter(d=>d.id!=='_index').map(d=>({o:d.data().order,t:d.data().title,ty:d.data().type}));
rows.sort((a,b)=>a.o-b.o); rows.forEach(r=>console.log(r.o,'|',r.ty,'|',r.t));})();
