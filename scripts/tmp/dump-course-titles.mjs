import { readFileSync, writeFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
const env={}; for(const l of readFileSync('.env.local','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');}
const app=initializeApp({apiKey:env.NEXT_PUBLIC_FIREBASE_API_KEY,authDomain:env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,projectId:env.NEXT_PUBLIC_FIREBASE_PROJECT_ID});
const db=getFirestore(app);
const ids=process.argv.slice(2);
const out={};
for(const id of ids){
  const ls=await getDocs(collection(db,'courses',id,'lessons'));
  const rows=[]; let keys=new Set();
  ls.forEach(l=>{ if(l.id==='_index')return; const d=l.data(); Object.keys(d).forEach(k=>keys.add(k)); rows.push({t:d.title,s:d.section||d.group||d.category||d.chapterTitle||'',o:d.order??0}); });
  rows.sort((a,b)=>a.o-b.o);
  out[id]={keys:[...keys],rows};
  console.log('\n=== '+id+' === keys: '+[...keys].join(','));
  const seen=new Set();
  rows.forEach(r=>{ const k=r.s||'(no section)'; if(!seen.has(k)){seen.add(k);console.log('  [S] '+k);} });
  console.log('  ตัวอย่างชื่อบท 25 แรก:'); rows.slice(0,25).forEach(r=>console.log('    - '+r.t));
}
writeFileSync('scripts/tmp/course-titles.json',JSON.stringify(out,null,1));
process.exit(0);
