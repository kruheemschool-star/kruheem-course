const admin = require('firebase-admin'); const path = require('path');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname,'serviceAccountKey.json'))) });
const db = admin.firestore();
(async()=>{
  const ref=db.collection('courses').doc('ZhpY3GMWh3SOua5yAVnu');
  const ls=await ref.collection('lessons').get();
  const lessons=ls.docs.map(d=>d.data()).sort((a,b)=>(a.order??0)-(b.order??0));
  let cur=null; const g=[];
  for (const L of lessons){
    if (L.type==='header'){cur={t:L.title,v:0,free:0,eps:[]};g.push(cur);}
    else if (L.type==='video'){ if(!cur){cur={t:'(none)',v:0,free:0,eps:[]};g.push(cur);} cur.v++; if(L.isFree)cur.free++; if(cur.eps.length<3)cur.eps.push(L.title);}
  }
  g.forEach((x,i)=>console.log(`${i+1}. ${x.t}  [${x.v} คลิป${x.free?', ฟรี '+x.free:''}]\n    e.g. ${x.eps.join(' / ')}`));
  process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
