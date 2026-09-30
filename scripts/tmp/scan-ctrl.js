const path=require('path'),admin=require('firebase-admin');
const sa=require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
// อักขระควบคุมที่ JSON กลืน backslash ได้: \n \t \r \b \f \v
const PAT=[['\\n','\n'],['\\t','\t'],['\\r','\r'],['\\b','\b'],['\\f','\f'],['\\v','\u000b']];
(async()=>{
  const snap=await admin.firestore().collection('exams').get();
  const tally={};
  const samples={};
  snap.forEach(d=>{
    const x=d.data(); let qs=x.questions; if(typeof qs==='string'){try{qs=JSON.parse(qs)}catch{qs=[]}}
    if(!Array.isArray(qs))return;
    qs.forEach((q,i)=>{
      const fields=[['question',q.question],['explanation',q.explanation],...(q.options||[]).map((o,j)=>['opt'+j,o])];
      fields.forEach(([f,v])=>{
        if(typeof v!=='string')return;
        for(const [lab,ch] of PAT){
          const re=new RegExp(ch.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([a-zA-Z]{1,8})','g');
          let m;
          while((m=re.exec(v))){
            const key=lab+'+'+m[1];
            tally[key]=(tally[key]||0)+1;
            if(!samples[key]) samples[key]={set:String(x.title).replace(/\s+/g,' ').trim(),q:i+1,f,ctx:v.slice(Math.max(0,m.index-45),m.index+25).replace(/\n/g,'⏎').replace(/\t/g,'⇥')};
          }
        }
      });
    });
  });
  Object.entries(tally).sort((a,b)=>b[1]-a[1]).slice(0,25).forEach(([k,n])=>{
    const s=samples[k];
    console.log(`${String(n).padStart(5)} × "${k}"  เช่น [${s.set}] ข้อ ${s.q} (${s.f}): ...${s.ctx}...`);
  });
  process.exit(0);
})();
