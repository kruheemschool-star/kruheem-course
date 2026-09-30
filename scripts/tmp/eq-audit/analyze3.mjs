import { readFileSync, readdirSync } from 'fs';
const DIR='scripts/tmp/eq-audit';
const files=readdirSync(DIR).filter(f=>f.endsWith('.json')).sort();
function opener(s){const t=String(s||'').replace(/\$[^$]*\$/g,'…').replace(/\s+/g,' ').trim();return t.slice(0,44);}
for(const f of files){
  const d=JSON.parse(readFileSync(`${DIR}/${f}`,'utf8'));
  const m=new Map();
  for(const q of d.questions){const o=opener(q.question);m.set(o,(m.get(o)||0)+1);}
  console.log('\n▸',d.title,'— รูปประโยคคำถาม',m.size,'แบบ / 250 ข้อ');
  [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([k,v])=>console.log('   ',String(v).padStart(4),k));
}
