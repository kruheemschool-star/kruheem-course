// READ-ONLY: why do PAID members get treated as trial on exams?
// Exam access (components/exam/ExamAccessGuard.tsx) grants access ONLY if an
// approved, non-expired enrollment has courseTitle.includes("คลังข้อสอบ").
// This reports how many approved enrollments would FAIL that gate.
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
const KEY = 'คลังข้อสอบ';
const now = Date.now();

const courseSnap = await getDocs(collection(db, 'courses'));
console.log('\n===== courses (does title grant exam access?) =====');
courseSnap.docs.forEach(d => {
  const t = String(d.data().title || '').replace(/\n/g, ' ');
  console.log(`  ${t.includes(KEY) ? '✅ EXAM' : '❌ no  '}  "${t.slice(0,55)}"`);
});

const enr = await getDocs(collection(db, 'enrollments'));
const byTitle = {};
let approved = 0, approvedExamOk = 0, approvedExamFailTitle = 0, approvedExpired = 0;
enr.docs.forEach(d => {
  const x = d.data();
  const title = String(x.courseTitle || '(none)').replace(/\n/g, ' ').trim();
  const status = x.status;
  if (status !== 'approved') return;
  approved++;
  const hasKey = title.includes(KEY);
  let expired = false;
  const exp = x.expiryDate?.toDate?.() ?? (x.expiryDate ? new Date(x.expiryDate) : null);
  if (x.accessType !== 'lifetime' && exp && exp.getTime() < now) expired = true;
  const k = `${hasKey ? 'EXAM' : 'NOEXAM'} | ${title.slice(0,40)}`;
  byTitle[k] = (byTitle[k] || 0) + 1;
  if (!hasKey) approvedExamFailTitle++;
  else if (expired) approvedExpired++;
  else approvedExamOk++;
});

console.log('\n===== approved enrollments grouped (EXAM = title has "คลังข้อสอบ") =====');
Object.entries(byTitle).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));

console.log('\n===== VERDICT =====');
console.log(`approved enrollments total:                 ${approved}`);
console.log(`  ✅ can submit exams (title ok + not exp):  ${approvedExamOk}`);
console.log(`  ⛔ CANNOT submit — title has NO "คลังข้อสอบ": ${approvedExamFailTitle}  <-- paid but no exam access`);
console.log(`  ⌛ CANNOT submit — exam title ok but EXPIRED: ${approvedExpired}`);
process.exit(0);
