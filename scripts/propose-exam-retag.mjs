// READ-ONLY: propose a clean re-tag for every exam. NO WRITES.
// Output is a before→after table for human review before any migration.
import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const env = {};
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);

// --- Proposed classification rules (heuristic, for human review) ---
// 3 canonical sections. Old category kept as a tag so nothing is lost.
function classify(x) {
  const title = String(x.title || '').replace(/\n/g, ' ');
  const t = title.toLowerCase();
  const isEntrance =
    /สอบเข้า\s*ม\.?\s*1/.test(title) ||
    /เข้า\s*ม\.?\s*1/.test(title) ||
    /gifted/i.test(title);
  const oldCat = (x.category || '').trim();
  const oldLvl = (x.level || '').trim();

  let section, level;
  if (isEntrance) {
    section = 'สอบเข้า ม.1';
    level = 'ป.6';                       // test-taker is in ป.6
  } else if (oldLvl === 'ม.1' || oldCat === 'ม.ต้น') {
    section = 'ม.1';
    level = 'ม.1';
  } else {
    section = 'ป.6';
    level = 'ป.6';
  }
  // preserve the old sub-type meaning as a tag (เนื้อหารายบท / แบบฝึกหัด)
  const subtypeTag =
    oldCat === 'เนื้อหารายบท' ? 'เนื้อหารายบท' :
    oldCat === 'แบบฝึกหัด' ? 'แบบฝึกหัด' : '';

  const changed = section !== oldCat || level !== oldLvl;
  return { section, level, subtypeTag, oldCat, oldLvl, changed };
}

const snap = await getDocs(collection(db, 'exams'));
const rows = [];
const sectionCount = {};
let changedN = 0;
snap.docs.forEach((d) => {
  const x = d.data();
  const hidden = !!x.hidden;
  const c = classify(x);
  sectionCount[c.section] = (sectionCount[c.section] || 0) + 1;
  if (c.changed) changedN++;
  const title = String(x.title || '').replace(/\n/g, ' ').slice(0, 34).padEnd(34);
  const mark = c.changed ? '⟶ CHANGE' : '   keep ';
  rows.push(
    `${mark} [${d.id.slice(0,8)}] "${title}" ${hidden ? '(ซ่อน)' : '      '}` +
    `\n          เดิม: cat=${(c.oldCat||'-').padEnd(14)} level=${(c.oldLvl||'-').padEnd(8)}` +
    `\n          ใหม่: section=${c.section.padEnd(14)} level=${c.level.padEnd(8)} tag=[${c.subtypeTag}]`
  );
});

console.log(`\n===== PROPOSED RE-TAG (READ-ONLY — ไม่มีการเขียนข้อมูล) =====`);
console.log(`exams ทั้งหมด: ${snap.size}   จะเปลี่ยน: ${changedN}   คงเดิม: ${snap.size - changedN}`);
console.log(`\n--- จำนวนต่อหมวด (หลังจัดระเบียบ) ---`);
Object.entries(sectionCount).forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}  ${k}`));
console.log(`\n--- รายตัว (เดิม ⟶ ใหม่) ---`);
console.log(rows.join('\n'));
console.log(`\nหมายเหตุ: นี่เป็นแค่ข้อเสนอจาก "ชื่อชุด" — ถ้าชุดไหนควรอยู่หมวดอื่น บอกได้ ปรับก่อนเขียนจริง`);
process.exit(0);
