import { readFileSync, writeFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
const env = {};
for (const line of readFileSync('.env.local','utf8').split('\n')) { const m=line.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].replace(/^["']|["']$/g,''); }
const app = initializeApp({ apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
const db = getFirestore(app);
// exam bank course sales page
const c = await getDoc(doc(db,'courses','26UeeaBMMFswM3RH5aI1'));
if (c.exists()) { const d=c.data(); console.log('COURSE:', d.title, '| price', d.price, '/', d.fullPrice);
  writeFileSync('scripts/tmp/exambank-course.json', JSON.stringify(d,null,1)); console.log('saved course json'); }
else {
  const all = await getDocs(collection(db,'courses'));
  all.forEach(x=>console.log(' course:', x.id, x.data().title));
}
process.exit(0);
