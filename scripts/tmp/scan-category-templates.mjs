import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
const env = {};
for (const line of readFileSync('.env.local','utf8').split('\n')) { const m=line.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].replace(/^["']|["']$/g,''); }
const app = initializeApp({ apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
const db = getFirestore(app);
const norm = s => String(s).replace(/[0-9๐-๙,\.]+/g,'#').replace(/\s+/g,' ').trim();
const snap = await getDocs(collection(db,'exams'));
const rows=[];
snap.forEach(d=>{ const x=d.data(); const qs=Array.isArray(x.questions)?x.questions:[]; if(!qs.length) return;
  const m=new Map(); qs.forEach(q=>{const k=norm(q.question); m.set(k,(m.get(k)||0)+1);});
  const counts=[...m.values()].sort((a,b)=>b-a);
  const top=counts[0]||0;
  rows.push({id:d.id, cat:x.category||'-', title:String(x.title).replace(/\n/g,' '), n:qs.length, uniq:m.size, top, ratio: m.size/qs.length});
});
rows.sort((a,b)=>a.ratio-b.ratio);
console.log('ความหลากหลาย = จำนวนโครงโจทย์ต่างกัน / จำนวนข้อ (ยิ่งต่ำยิ่งซ้ำ)\n');
console.log('%หลากหลาย'.padStart(10), 'ข้อ'.padStart(5), 'โครง'.padStart(5), 'บล็อกใหญ่สุด'.padStart(7), ' หมวด | ชื่อชุด');
for(const r of rows){ const pct=(100*r.ratio).toFixed(0)+'%'; const flag = r.ratio<0.3?'🔴':r.ratio<0.6?'🟠':r.ratio<0.85?'🟡':'  ';
  console.log(pct.padStart(10), String(r.n).padStart(5), String(r.uniq).padStart(5), String(r.top).padStart(7), flag, r.cat,'|', r.title.slice(0,52)); }
process.exit(0);
