import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
const env = {};
for (const line of readFileSync('.env.local','utf8').split('\n')) { const m=line.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].replace(/^["']|["']$/g,''); }
const app = initializeApp({ apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
const db = getFirestore(app);
const snap = await getDocs(collection(db,'exams'));
snap.forEach(d=>{ const x=d.data(); const qs=Array.isArray(x.questions)?x.questions.length:(typeof x.questions==='string'?'STR':0);
  console.log(d.id, '|', String(qs).padStart(4), '|', x.category||'-', '|', x.title); });
process.exit(0);
