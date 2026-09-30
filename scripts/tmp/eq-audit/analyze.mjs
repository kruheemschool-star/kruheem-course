import { readFileSync, readdirSync } from 'fs';
const DIR = 'scripts/tmp/eq-audit';

// ---------- skeletonize: strip all numbers -> #, normalize whitespace ----------
function skel(s) {
  return String(s || '')
    .replace(/\$[^$]*\$/g, m => m.replace(/-?\d+(\.\d+)?/g, '#'))  // numbers inside math
    .replace(/-?\d+(\.\d+)?/g, '#')                                  // numbers in text
    .replace(/\s+/g, ' ')
    .trim();
}
// stem = first 40 chars of Thai text before any math
function opener(s) {
  const t = String(s||'').replace(/\$[^$]*\$/g,'§').replace(/\s+/g,' ').trim();
  return t.split(' ').slice(0,4).join(' ');
}
// is it a word problem (has real-world context) or bare "solve this"?
const WORDY = /(คน|บาท|กิโล|เมตร|ชั่วโมง|นาที|วัน|ปี|อายุ|ซื้อ|ขาย|เงิน|ลิตร|ตัว|เล่ม|ใบ|ชิ้น|ห้อง|รถ|น้ำ|พื้นที่|ความยาว|กว้าง|ยาว|เร็ว|ระยะทาง|ทำงาน|ประชากร|ดอกเบี้ย|ลงทุน|สาร|เชื้อ|สลาย|ครึ่งชีวิต|ความเข้มข้น|ระดับเสียง|แผ่นดินไหว)/;
const BARE  = /(จงหาค่า|จงแก้สมการ|ค่าของ|ผลบวกของคำตอบ|เซตคำตอบ|ข้อใดเป็นคำตอบ|คำตอบของสมการ)/;

const files = readdirSync(DIR).filter(f => f.endsWith('.json')).sort();
const ALL = [];
for (const f of files) {
  const d = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8'));
  const qs = d.questions;
  const skels = new Map(), openers = new Map(), subtopics = new Map(), expSkels = new Map();
  let wordy = 0, bare = 0, hasSvg = 0;
  const ciDist = [0,0,0,0];
  const diffs = new Map();
  for (const q of qs) {
    const k = skel(q.question);
    skels.set(k, (skels.get(k)||0)+1);
    const o = opener(q.question);
    openers.set(o, (openers.get(o)||0)+1);
    const st = (q.tags||[])[1] || '(no-subtopic)';
    subtopics.set(st, (subtopics.get(st)||0)+1);
    const df = (q.tags||[])[3] || '?';
    diffs.set(df, (diffs.get(df)||0)+1);
    // explanation skeleton: first 90 chars after the "คำตอบ: ข้อ x." line, numbers stripped
    const e = skel(String(q.explanation||'').replace(/\*\*คำตอบ[^\n]*\n+/,'')).slice(0,110);
    expSkels.set(e, (expSkels.get(e)||0)+1);
    if (WORDY.test(q.question)) wordy++; else bare++;
    if (q.svg) hasSvg++;
    if (typeof q.correctIndex === 'number') ciDist[q.correctIndex]++;
  }
  const topSkel = [...skels.entries()].sort((a,b)=>b[1]-a[1]);
  const topOpen = [...openers.entries()].sort((a,b)=>b[1]-a[1]);
  const topExp  = [...expSkels.entries()].sort((a,b)=>b[1]-a[1]);
  ALL.push({file:f, title:d.title, n:qs.length,
    uniqSkel: skels.size, uniqOpen: openers.size, uniqExp: expSkels.size,
    wordy, bare, hasSvg, ciDist,
    subtopics: [...subtopics.entries()].sort((a,b)=>b[1]-a[1]),
    diffs: [...diffs.entries()],
    topSkel: topSkel.slice(0,8), topOpen: topOpen.slice(0,5), topExp: topExp.slice(0,4)});
}

const pct = (a,b)=> (100*a/b).toFixed(0)+'%';
console.log('════════ ภาพรวมหมวด "เก่งสมการ" ════════\n');
console.log('ชุด'.padEnd(34), 'ข้อ  โครงไม่ซ้ำ  คำเปิด  สำนวนเฉลย  โจทย์ปัญหา  รูป');
for (const a of ALL) {
  console.log(a.title.padEnd(32), String(a.n).padStart(4),
    (a.uniqSkel+' ('+pct(a.uniqSkel,a.n)+')').padStart(12),
    String(a.uniqOpen).padStart(6),
    (a.uniqExp+' ('+pct(a.uniqExp,a.n)+')').padStart(12),
    (a.wordy+' ('+pct(a.wordy,a.n)+')').padStart(11),
    String(a.hasSvg).padStart(5));
}
console.log('\n\n════════ รายชุด ════════');
for (const a of ALL) {
  console.log('\n\n──────────', a.title, '(', a.file, ') ──────────');
  console.log('ระดับ:', a.diffs.map(([k,v])=>k+'='+v).join('  '), '| correctIndex:', a.ciDist.join('/'));
  console.log('\nหัวข้อย่อย (tags[1]):');
  for (const [k,v] of a.subtopics) console.log('   ', String(v).padStart(4), k);
  console.log('\n🔁 โครงโจทย์ที่ซ้ำมากสุด (เปลี่ยนแค่ตัวเลข):');
  for (const [k,v] of a.topSkel) { if (v<2) break; console.log('   ', String(v).padStart(3), 'ข้อ →', k.slice(0,100)); }
  console.log('\n🔁 สำนวนเฉลยที่ซ้ำมากสุด:');
  for (const [k,v] of a.topExp) { if (v<2) break; console.log('   ', String(v).padStart(3), 'ข้อ →', k.slice(0,95)); }
}
