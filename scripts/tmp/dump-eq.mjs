import { readFileSync, writeFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
const env = {};
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const app = initializeApp({ apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
const db = getFirestore(app);
const IDS = {
  'Rxlko53XR25E6NDfvqwq':'01-linear-one-var',
  'kUU02lEfxWzuPC36sFa4':'02-fraction-denominator',
  'KG6XyWONN4xlzJxo0zED':'03-system-two-var',
  'bKYtRGmjmRZb6OwKnJ9c':'04-absolute-value',
  'VIwYJAYR5OLSZwBcRNyS':'05-radical',
  '7bk3wQ2aDQNsPvDGyMzY':'06-exponential',
  'v5RQVcOi2bMT51mPTbNQ':'07-logarithm',
};
for (const [id, name] of Object.entries(IDS)) {
  const s = await getDoc(doc(db, 'exams', id));
  const x = s.data();
  const qs = Array.isArray(x.questions) ? x.questions : JSON.parse(x.questions||'[]');
  writeFileSync(`scripts/tmp/eq-audit/${name}.json`, JSON.stringify({id, title:x.title, description:x.description, count:qs.length, questions:qs}, null, 1));
  console.log(name, qs.length);
}
process.exit(0);
