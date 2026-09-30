import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
const env = {};
for (const line of readFileSync('.env.local','utf8').split('\n')) { const m=line.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].replace(/^["']|["']$/g,''); }
const app = initializeApp({ apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
const db = getFirestore(app);
const norm = s => String(s).replace(/[0-9๐-๙,\.]+/g,'#').replace(/\s+/g,' ').trim();
const open6 = s => String(s).replace(/[0-9๐-๙,\.]+/g,'#').trim().split(/\s+/).slice(0,4).join(' ');
const tail = s => { const t=String(s).replace(/[0-9๐-๙,\.]+/g,'#').trim().split(/\s+/); return t.slice(-4).join(' '); };
const snap = await getDocs(collection(db,'exams'));
const out=[];
snap.forEach(d=>{ const x=d.data(); const qs=Array.isArray(x.questions)?x.questions:[]; if(!qs.length) return;
  const cat=x.category||'-';
  const cnt=(f)=>{const m=new Map(); qs.forEach(q=>{const k=f(q.question); m.set(k,(m.get(k)||0)+1);}); return m;};
  const sk=cnt(norm), op=cnt(open6), tl=cnt(tail);
  const topOf=m=>[...m.entries()].sort((a,b)=>b[1]-a[1])[0];
  out.push({id:d.id, cat, title:String(x.title).replace(/\n/g,' '), n:qs.length,
    skel:sk.size, open:op.size, tail:tl.size,
    topOpen:topOf(op), topTail:topOf(tl), topSkel:topOf(sk)[1]});
});
mkdirSync('scripts/tmp',{recursive:true});
writeFileSync('scripts/tmp/deep-scan.json', JSON.stringify(out,null,1));
const wp = out.filter(r=>/โจทย์ปัญหา|ชีวิตจริง/.test(r.title) || r.cat==='การแก้โจทย์ปัญหาคณิตศาสตร์');
wp.sort((a,b)=>a.open/a.n - b.open/b.n);
console.log('ชุดโจทย์ปัญหา', wp.length, 'ชุด — ตรวจ 3 มิติ (โครงประโยค / คำเปิดหัวโจทย์ / คำถามท้ายข้อ)\n');
console.log('id'.padEnd(22),'ข้อ'.padStart(4),'โครง'.padStart(5),'คำเปิด'.padStart(6),'ท้าย'.padStart(5),' ชื่อชุด');
for(const r of wp) console.log(r.id.padEnd(22), String(r.n).padStart(4), String(r.skel).padStart(5), String(r.open).padStart(6), String(r.tail).padStart(5),'', r.title.slice(0,44));
console.log('\nคำเปิดที่ซ้ำมากสุดของแต่ละชุด:');
for(const r of wp) console.log(' ', String(r.topOpen[1]).padStart(3),'ข้อ ขึ้นต้นเหมือนกันว่า "'+r.topOpen[0]+'" —', r.title.slice(0,40));
process.exit(0);
