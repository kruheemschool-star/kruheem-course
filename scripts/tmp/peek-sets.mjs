import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
const env = {};
for (const line of readFileSync('.env.local','utf8').split('\n')) { const m=line.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].replace(/^["']|["']$/g,''); }
const app = initializeApp({ apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
const db = getFirestore(app);
const ids = process.argv.slice(2);
const norm=s=>s.replace(/[0-9๐-๙,\.]+/g,'#').replace(/\s+/g,' ').trim();
for (const id of ids) {
  const snap = await getDoc(doc(db,'exams',id));
  const d = snap.data(); const qs = d.questions||[];
  const m = new Map(); qs.forEach(q=>{const k=norm(q.question); m.set(k,(m.get(k)||0)+1);});
  const tagSets = new Set(); qs.forEach(q=>tagSets.add(JSON.stringify(q.tags)));
  console.log('\n###', id, '|', d.title, '| level:', JSON.stringify(d.level), '| Q:', qs.length, '| templates:', m.size);
  [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([k,v])=>console.log('   ', String(v).padStart(3),'×',k.slice(0,90)));
  console.log('   tag-sets:', [...tagSets].slice(0,6).join(' | '));
  console.log('   has distractorErrors:', qs.filter(q=>q.distractorErrors).length, '| expectedSeconds:', qs.filter(q=>q.expectedSeconds).length);
}
process.exit(0);
