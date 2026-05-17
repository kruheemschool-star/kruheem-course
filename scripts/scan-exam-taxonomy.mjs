// READ-ONLY: inspect how exams are classified (category / level / tags).
// One-off local diagnostic — no writes, not part of the app/runtime.
import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const env = {};
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const examSnap = await getDocs(collection(db, 'exams'));
const byCategory = {}, byLevel = {}, comboCount = {};
const rows = [];
examSnap.docs.forEach((d) => {
  const x = d.data();
  if (x.hidden) return;
  const cat = (x.category || '(ไม่มี category)').trim();
  const lvl = (x.level || '(ไม่มี level)').trim();
  byCategory[cat] = (byCategory[cat] || 0) + 1;
  byLevel[lvl] = (byLevel[lvl] || 0) + 1;
  const combo = `${cat}  ||  ${lvl}`;
  comboCount[combo] = (comboCount[combo] || 0) + 1;
  rows.push(`  • "${String(x.title).replace(/\n/g, ' ').slice(0, 38).padEnd(38)}" | cat=${cat.padEnd(14)} | level=${lvl.padEnd(10)} | tags=[${(x.tags || []).join(', ')}]`);
});

let catSnap = [];
try { catSnap = (await getDocs(collection(db, 'examCategories'))).docs.map(d => d.data().name); } catch {}

console.log(`\n===== examCategories collection =====`);
console.log(catSnap.length ? catSnap.map(c => `  • ${c}`).join('\n') : '  (none / unreadable)');
console.log(`\n===== distinct category (on exam docs, visible only) =====`);
Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${String(v).padStart(3)}  ${k}`));
console.log(`\n===== distinct level =====`);
Object.entries(byLevel).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${String(v).padStart(3)}  ${k}`));
console.log(`\n===== category × level combos =====`);
Object.entries(comboCount).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${String(v).padStart(3)}  ${k}`));
console.log(`\n===== every visible exam =====`);
console.log(rows.join('\n'));
process.exit(0);
