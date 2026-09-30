import { readFileSync, writeFileSync } from 'fs';
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
const allKeys = new Set();
snap.forEach(d => {
  const x = d.data();
  Object.keys(x).forEach(k => allKeys.add(k));
  let qs = x.questions;
  if (typeof qs === 'string') { try { qs = JSON.parse(qs); } catch { qs = []; } }
  const n = Array.isArray(qs) ? qs.length : 0;
  // tag distribution
  const tagCount = {};
  let tagged = 0;
  if (Array.isArray(qs)) for (const q of qs) {
    if (Array.isArray(q.tags) && q.tags.length) { tagged++; for (const t of q.tags) tagCount[t] = (tagCount[t]||0)+1; }
  }
  rows.push({
    id: d.id, title: x.title, category: x.category, grade: x.grade, subject: x.subject,
    n, tagged, isFree: x.isFree, hidden: x.hidden, order: x.order,
    desc: x.description, duration: x.duration ?? x.timeLimit,
    createdAt: x.createdAt?.toDate?.()?.toISOString?.() || x.createdAt || null,
    topTags: Object.entries(tagCount).sort((a,b)=>b[1]-a[1]).slice(0,12),
  });
});
writeFileSync('scripts/tmp/exam-catalog.json', JSON.stringify(rows, null, 1));
console.log('FIELDS:', [...allKeys].join(', '));
console.log('TOTAL EXAMS:', rows.length, ' TOTAL Q:', rows.reduce((s,r)=>s+r.n,0));
process.exit(0);
