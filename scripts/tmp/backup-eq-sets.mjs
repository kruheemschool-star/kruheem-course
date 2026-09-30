import { readFileSync, writeFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
const env = {};
for (const line of readFileSync('.env.local','utf8').split('\n')) { const m=line.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].replace(/^["']|["']$/g,''); }
const app = initializeApp({ apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
const db = getFirestore(app);
const DIR = process.env.HOME + '/Documents/kruheem-exams/rework-2026-08/EQUATION-CATEGORY-PLAN/BACKUP';
const IDS = {
  'Rxlko53XR25E6NDfvqwq':'01-linear-one-var','kUU02lEfxWzuPC36sFa4':'02-fraction-denominator',
  'KG6XyWONN4xlzJxo0zED':'03-system-two-var','bKYtRGmjmRZb6OwKnJ9c':'04-absolute-value',
  'VIwYJAYR5OLSZwBcRNyS':'05-radical','7bk3wQ2aDQNsPvDGyMzY':'06-exponential','v5RQVcOi2bMT51mPTbNQ':'07-logarithm',
};
const stamp = '2026-08-07';
const utf8=(s)=>Buffer.byteLength(s,'utf8');
function sz(v){if(v==null)return 1;const t=typeof v;if(t==='string')return utf8(v)+1;if(t==='boolean')return 1;if(t==='number')return 8;if(Array.isArray(v))return v.reduce((s,e)=>s+sz(e),0);if(t==='object'){let s=32;for(const[k,val]of Object.entries(v))s+=utf8(k)+1+sz(val);return s;}return 8;}
for (const [id,name] of Object.entries(IDS)) {
  const s = await getDoc(doc(db,'exams',id));
  const x = s.data();
  writeFileSync(`${DIR}/FULLDOC-${name}-${id}-${stamp}.json`, JSON.stringify(x,null,1));
  let t=32; for(const[k,v] of Object.entries(x)) t+=utf8(k)+1+sz(v);
  console.log(name.padEnd(26), String((x.questions||[]).length).padStart(4),'ข้อ  ', String(t).padStart(7),'bytes  ', (100*t/1048576).toFixed(1)+'% ของ 1MiB');
}
console.log('\n💾 สำรองครบ 7 ชุดที่', DIR);
process.exit(0);
