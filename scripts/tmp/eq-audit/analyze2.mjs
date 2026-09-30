import { readFileSync, readdirSync } from 'fs';
const DIR = 'scripts/tmp/eq-audit';
function skel(s){return String(s||'').replace(/-?\d+(\.\d+)?/g,'#').replace(/\s+/g,' ').trim();}
// task-type classifier: what is the student ASKED to do?
function taskType(q){
  const t = q.question || '';
  if (/ข้อใดผิด|ขั้นตอนใด|บรรทัดที่เท่าใด|ทำผิดขั้น|ผิดพลาดที่ขั้น/.test(t)) return 'F-หาที่ผิดในวิธีทำ';
  if (/จำนวนคำตอบ|มีคำตอบกี่|กี่คำตอบ|ไม่มีคำตอบ|มีคำตอบมากมาย|เป็นจริงทุกจำนวน/.test(t)) return 'E-นับ/ตัดสินจำนวนคำตอบ';
  if (/ค่าของ\s*\$?[a-zA-Z]\$?\s*(ที่ทำให้|ใด)|เมื่อใด.*มีคำตอบ|ค่า\s*\$?k\$?|ค่า\s*\$?m\$?|ค่า\s*\$?a\$?\s*ที่ทำให้|สัมประสิทธิ์/.test(t)) return 'D-หาพารามิเตอร์/เงื่อนไข';
  if (/ผลบวกของคำตอบ|ผลคูณของคำตอบ|ผลต่างของคำตอบ|คำตอบที่มากที่สุด|คำตอบที่น้อยที่สุด|รากที่|แล้ว.*เท่ากับ/.test(t)) return 'C-หาค่าต่อยอดจากคำตอบ';
  if (/เขียน.*ในรูป|ข้อใดสมมูล|สมการใดต่อไปนี้|ตรงกับสมการ|แทน.*ด้วย|สอดคล้องกับ|ข้อใดคือสมการ/.test(t)) return 'B-แปลง/จับคู่รูปสมการ';
  if (/ตรวจ|เป็นคำตอบของสมการ|สอดคล้อง|แทนค่า.*แล้ว|รากปลอม|ต้องห้าม/.test(t)) return 'G-ตรวจคำตอบ/รากปลอม';
  if (/กราฟ|จุดตัด|เส้นตรง|ขนาน|ทับกัน/.test(t)) return 'H-กราฟ/เรขา';
  if (/บาท|คน|อายุ|กิโล|เมตร|ลิตร|ชั่วโมง|นาที|วัน|ปี|ตัว|เล่ม|ใบ|ชิ้น|รถ|น้ำ|เงิน|ซื้อ|ขาย|ประชากร|ดอกเบี้ย|สลาย|ครึ่งชีวิต|ความเข้มข้น|ระดับเสียง|แผ่นดินไหว|ทำงาน|ความเร็ว/.test(t)) return 'I-โจทย์ปัญหาบริบทจริง';
  return 'A-แก้สมการตรงๆ หาค่า x';
}
const files = readdirSync(DIR).filter(f=>f.endsWith('.json')).sort();
console.log('════ ประเภทงานที่เด็กถูกสั่งให้ทำ (task type) ════\n');
const TYPES=['A-แก้สมการตรงๆ หาค่า x','B-แปลง/จับคู่รูปสมการ','C-หาค่าต่อยอดจากคำตอบ','D-หาพารามิเตอร์/เงื่อนไข','E-นับ/ตัดสินจำนวนคำตอบ','F-หาที่ผิดในวิธีทำ','G-ตรวจคำตอบ/รากปลอม','H-กราฟ/เรขา','I-โจทย์ปัญหาบริบทจริง'];
const table=[];
for(const f of files){
  const d=JSON.parse(readFileSync(`${DIR}/${f}`,'utf8'));
  const c={}; TYPES.forEach(t=>c[t]=0);
  for(const q of d.questions) c[taskType(q)]++;
  table.push({title:d.title,c});
}
process.stdout.write('ประเภท'.padEnd(30));
for(const r of table) process.stdout.write(r.title.slice(0,10).padStart(12));
console.log();
for(const t of TYPES){
  process.stdout.write(t.padEnd(28));
  for(const r of table) process.stdout.write(String(r.c[t]||0).padStart(12));
  console.log();
}

// consecutive-run analysis: how many identical skeletons appear back-to-back
console.log('\n\n════ โจทย์โครงเดียวกันวางติดกันเป็นบล็อก (ยาวสุด 6 อันดับ) ════');
for(const f of files){
  const d=JSON.parse(readFileSync(`${DIR}/${f}`,'utf8'));
  const s=d.questions.map(q=>skel(q.question));
  const runs=[]; let cur=1;
  for(let i=1;i<=s.length;i++){ if(i<s.length && s[i]===s[i-1]) cur++; else { if(cur>1) runs.push({len:cur,start:i-cur+1,skel:s[i-1]}); cur=1; } }
  runs.sort((a,b)=>b.len-a.len);
  console.log('\n▸', d.title, '— บล็อกซ้ำติดกัน', runs.length, 'บล็อก');
  for(const r of runs.slice(0,6)) console.log('    ข้อ', String(r.start).padStart(3),'-',String(r.start+r.len-1).padEnd(4), r.len+' ข้อติดกัน:', r.skel.slice(0,78));
}
