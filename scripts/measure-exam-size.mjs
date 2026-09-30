// Read-only diagnostic: measure the true Firestore document size of an exam
// and compare against Firestore's hard 1 MiB (1,048,576 byte) per-doc limit.
// Uses the official Firestore size formula so the number matches what the
// server actually enforces.
import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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

const utf8 = (s) => Buffer.byteLength(s, 'utf8');

// Firestore document-size rules:
// string: bytes+1 | bool/null: 1 | int/double: 8 | timestamp: 8
// array: sum(values) | map: sum(keyStr+1 + value) + 32 (per map, incl. doc root)
function sizeOfValue(v) {
  if (v === null || v === undefined) return 1;
  const t = typeof v;
  if (t === 'string') return utf8(v) + 1;
  if (t === 'boolean') return 1;
  if (t === 'number') return 8;
  if (Array.isArray(v)) return v.reduce((s, e) => s + sizeOfValue(e), 0);
  if (t === 'object') {
    let s = 32;
    for (const [k, val] of Object.entries(v)) s += utf8(k) + 1 + sizeOfValue(val);
    return s;
  }
  return 8;
}

const id = process.argv[2] || '3Oq5FgtVl7h6HjNieMnt';
const snap = await getDoc(doc(db, 'exams', id));
if (!snap.exists()) { console.log('NOT FOUND', id); process.exit(0); }
const data = snap.data();

const LIMIT = 1048576;
// Document size ~= 32 (root map) + name overhead (~ small) + fields
let total = 32;
const perField = {};
for (const [k, v] of Object.entries(data)) {
  const fs = utf8(k) + 1 + sizeOfValue(v);
  perField[k] = fs;
  total += fs;
}

console.log('TITLE:', data.title);
const qs = Array.isArray(data.questions) ? data.questions : [];
console.log('QUESTIONS:', qs.length);
console.log('');
console.log('=== FIELD SIZES (bytes) ===');
for (const [k, s] of Object.entries(perField).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(28)} ${s.toLocaleString().padStart(12)}  (${(100 * s / total).toFixed(1)}%)`);
}
console.log('');
console.log('DOCUMENT TOTAL :', total.toLocaleString(), 'bytes');
console.log('FIRESTORE LIMIT:', LIMIT.toLocaleString(), 'bytes (1 MiB)');
console.log('USAGE          :', (100 * total / LIMIT).toFixed(1) + '%  of the hard limit');
console.log('HEADROOM LEFT  :', (LIMIT - total).toLocaleString(), 'bytes');
console.log('');

// Per-question breakdown: how big is the average question, and which are huge
if (qs.length) {
  const sizes = qs.map(sizeOfValue);
  const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
  const withSvg = qs.filter(q => typeof q.svg === 'string' && q.svg.length > 0);
  const svgBytes = withSvg.reduce((s, q) => s + utf8(q.svg), 0);
  console.log('=== QUESTION STATS ===');
  console.log('  avg question size :', Math.round(avg).toLocaleString(), 'bytes');
  console.log('  questions w/ SVG  :', withSvg.length, '/', qs.length);
  console.log('  total SVG payload :', svgBytes.toLocaleString(), 'bytes (', (100 * svgBytes / total).toFixed(1), '% of doc )');
  const ranked = sizes.map((s, i) => [i + 1, s]).sort((a, b) => b[1] - a[1]).slice(0, 8);
  console.log('  biggest questions :', ranked.map(([i, s]) => `Q${i}=${(s / 1024).toFixed(1)}KB`).join('  '));
}
process.exit(0);
