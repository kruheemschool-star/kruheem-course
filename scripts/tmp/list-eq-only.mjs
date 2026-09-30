import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
const env = {};
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const app = initializeApp({ apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
const db = getFirestore(app);
const snap = await getDocs(collection(db, 'exams'));
const rows = [];
snap.forEach(d => { const x=d.data(); if (x.category !== 'เก่งสมการ') return; const qs=Array.isArray(x.questions)?x.questions.length:0; rows.push({id:d.id, title:x.title, qs, order:x.order, desc:(x.description||'').slice(0,120)}); });
rows.sort((a,b)=> (a.order??0)-(b.order??0));
for (const r of rows) console.log(String(r.order).padStart(3), r.id, String(r.qs).padStart(4), r.title);
console.log('TOTAL เก่งสมการ =', rows.length, ' รวมข้อ =', rows.reduce((s,r)=>s+r.qs,0));
process.exit(0);
