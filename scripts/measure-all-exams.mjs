import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
const env = {};
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const app = initializeApp({ apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
const db = getFirestore(app);
const utf8 = (s) => Buffer.byteLength(s, 'utf8');
function sz(v){ if(v==null) return 1; const t=typeof v; if(t==='string')return utf8(v)+1; if(t==='boolean')return 1; if(t==='number')return 8; if(Array.isArray(v))return v.reduce((s,e)=>s+sz(e),0); if(t==='object'){let s=32;for(const[k,val]of Object.entries(v))s+=utf8(k)+1+sz(val);return s;} return 8;}
const LIMIT = 1048576;
const snap = await getDocs(collection(db, 'exams'));
const rows = [];
snap.forEach(d => { const x=d.data(); let t=32; for(const[k,v]of Object.entries(x))t+=utf8(k)+1+sz(v); const qs=Array.isArray(x.questions)?x.questions.length:0; rows.push([t,qs,d.id,x.title]); });
rows.sort((a,b)=>b[0]-a[0]);
console.log('bytes'.padStart(9), '%limit'.padStart(7), ' Q'.padStart(4), ' title');
let danger=0, warn=0;
for(const[t,qs,id,title]of rows){ const pct=100*t/LIMIT; const flag = pct>=90?'🔴':pct>=75?'🟠':pct>=50?'🟡':'  '; if(pct>=90)danger++; else if(pct>=75)warn++; console.log(String(t).padStart(9), (pct.toFixed(1)+'%').padStart(7), String(qs).padStart(4), flag, title); }
console.log('\n🔴 >=90% (about to fail):', danger, '   🟠 75-90% (at risk):', warn, '   total exams:', rows.length);
process.exit(0);
