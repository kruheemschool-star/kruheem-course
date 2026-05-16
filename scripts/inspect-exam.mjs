// Diagnostic: fetch an exam doc via the public client SDK and report
// field types per question, to find which question crashes the renderer.
import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Load .env.local
const env = {};
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const id = process.argv[2] || 'vR0aj1VoLq4yfud4V1FM';
const snap = await getDoc(doc(db, 'exams', id));
if (!snap.exists()) { console.log('NOT FOUND', id); process.exit(0); }

const data = snap.data();
console.log('TITLE:', data.title);
let questions = data.questions;
if (typeof questions === 'string') { try { questions = JSON.parse(questions); } catch { questions = []; } }
if (!Array.isArray(questions)) { console.log('questions not array, type=', typeof questions); process.exit(0); }
console.log('TOTAL QUESTIONS:', questions.length);
console.log('---');

questions.forEach((q, i) => {
  const issues = [];
  if (typeof q.question !== 'string') issues.push(`question is ${q.question === null ? 'null' : Array.isArray(q.question) ? 'array' : typeof q.question}`);
  if (!Array.isArray(q.options)) issues.push(`options is ${typeof q.options}`);
  else q.options.forEach((o, oi) => { if (typeof o !== 'string') issues.push(`option[${oi}] is ${o === null ? 'null' : typeof o}`); });
  if (q.svg !== undefined && typeof q.svg !== 'string') issues.push(`svg is ${typeof q.svg}`);
  if (q.explanation !== undefined && q.explanation !== null && typeof q.explanation !== 'string' && typeof q.explanation !== 'object') issues.push(`explanation is ${typeof q.explanation}`);
  const tag = issues.length ? '  <<< PROBLEM' : '';
  console.log(`Q${i + 1} (idx ${i}): question=${typeof q.question} options=${Array.isArray(q.options) ? q.options.length : typeof q.options} svg=${q.svg !== undefined ? (typeof q.svg) : '-'} expl=${q.explanation === undefined ? '-' : (q.explanation === null ? 'null' : typeof q.explanation)}${issues.length ? ' | ' + issues.join('; ') : ''}${tag}`);
});

// Dump full detail of any problematic question
console.log('\n=== DETAIL OF PROBLEM QUESTIONS ===');
questions.forEach((q, i) => {
  const bad = typeof q.question !== 'string'
    || !Array.isArray(q.options)
    || q.options.some(o => typeof o !== 'string')
    || (q.svg !== undefined && typeof q.svg !== 'string');
  if (bad) {
    console.log(`\n--- Q${i + 1} (idx ${i}) ---`);
    console.log(JSON.stringify(q, null, 2).slice(0, 3000));
  }
});
process.exit(0);
