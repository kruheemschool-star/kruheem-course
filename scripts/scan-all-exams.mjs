// READ-ONLY: scan every exam doc and classify corruption / count-mismatch.
// No writes. Mirrors isValidExamQuestion + the audit-page detection logic.
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

const isValid = (q) => {
  if (!q || typeof q !== 'object') return false;
  const hasQuestion = typeof q.question === 'string' && q.question.trim() !== '';
  const hasOptions = Array.isArray(q.options) && q.options.length > 0;
  const hasMedia = (typeof q.image === 'string' && q.image.trim() !== '')
    || (typeof q.svg === 'string' && q.svg.trim() !== '');
  return hasQuestion || hasOptions || hasMedia;
};

const snap = await getDocs(collection(db, 'exams'));
let total = 0, withBlanks = 0, mismatchOnly = 0, urlBased = 0, clean = 0;
let totalBlankQs = 0;
const blankList = [], mismatchList = [];

snap.docs.forEach((d) => {
  total++;
  const data = d.data();
  const rawQ = data.questions;
  const wasString = typeof rawQ === 'string';
  let qArr = [];
  if (wasString) { try { qArr = JSON.parse(rawQ); } catch { qArr = []; } }
  else if (Array.isArray(rawQ)) qArr = rawQ;
  if (!Array.isArray(qArr)) qArr = [];
  const hasUrl = !!data.questionsUrl && !data.questions;
  if (hasUrl) { urlBased++; return; }
  const totalQ = qArr.length;
  const validQ = qArr.filter(isValid).length;
  const blank = totalQ - validQ;
  const stored = typeof data.questionCount === 'number' ? data.questionCount : null;
  const countMismatch = stored !== null && stored !== validQ;
  if (blank > 0) {
    withBlanks++; totalBlankQs += blank;
    blankList.push(`  • [${d.id}] "${String(data.title).replace(/\n/g, ' ').slice(0, 45)}" — ${totalQ}→${validQ} (ลบ ${blank}), stored=${stored}`);
  } else if (countMismatch) {
    mismatchOnly++;
    mismatchList.push(`  • [${d.id}] "${String(data.title).replace(/\n/g, ' ').slice(0, 45)}" — จริง ${validQ} แต่ stored=${stored}`);
  } else {
    clean++;
  }
});

console.log(`\n===== EXAM COLLECTION SCAN (read-only) =====`);
console.log(`total exams:            ${total}`);
console.log(`clean (no action):      ${clean}`);
console.log(`HAS BLANK QUESTIONS:    ${withBlanks}  (รวม ${totalBlankQs} ข้อว่าง — นี่คือบั๊กจริง)`);
console.log(`count-mismatch only:    ${mismatchOnly}  (ไม่มีข้อว่าง แค่ questionCount ไม่ตรง — เขียนทับแบบ content เท่าเดิม)`);
console.log(`external questionsUrl:  ${urlBased}  (ข้าม ไม่แตะ)`);
if (blankList.length) { console.log(`\n--- exams with blank questions (the real bug) ---`); console.log(blankList.join('\n')); }
if (mismatchList.length) { console.log(`\n--- count-mismatch only (lower priority) ---`); console.log(mismatchList.slice(0, 30).join('\n')); if (mismatchList.length > 30) console.log(`  …และอีก ${mismatchList.length - 30} ชุด`); }
process.exit(0);
