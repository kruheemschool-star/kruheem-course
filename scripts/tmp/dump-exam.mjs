import { readFileSync, writeFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
const env = {};
for (const line of readFileSync('.env.local','utf8').split('\n')) { const m=line.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].replace(/^["']|["']$/g,''); }
const app = initializeApp({ apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
const db = getFirestore(app);
const id = process.argv[2];
const snap = await getDoc(doc(db,'exams',id));
if(!snap.exists()){ console.log('NOT FOUND'); process.exit(1);}
const data = snap.data();
writeFileSync(`scripts/tmp/exam-${id}.json`, JSON.stringify(data,null,2));
console.log('title:', data.title, '| category:', data.category, '| Q:', data.questions?.length);
console.log('fields:', Object.keys(data).join(', '));
process.exit(0);
