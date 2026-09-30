import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
const env={}; for(const l of readFileSync('.env.local','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');}
const app=initializeApp({apiKey:env.NEXT_PUBLIC_FIREBASE_API_KEY,authDomain:env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,projectId:env.NEXT_PUBLIC_FIREBASE_PROJECT_ID});
const db=getFirestore(app);
const courses=await getDocs(collection(db,'courses'));
const list=[]; courses.forEach(c=>list.push({id:c.id,title:c.data().title}));
list.sort((a,b)=>a.title.localeCompare(b.title,'th'));
for(const c of list){
  const ls=await getDocs(collection(db,'courses',c.id,'lessons'));
  const chapters=new Set(); let n=0;
  ls.forEach(l=>{ if(l.id==='_index')return; const d=l.data(); n++; if(d.chapter) chapters.add(d.chapter); });
  console.log('\n### '+c.title+'  ('+n+' บทเรียน)');
  [...chapters].forEach(ch=>console.log('   - '+ch));
}
process.exit(0);
