// Re-tag audit for the 3 clean sections. Mirrors scripts/scan-all-exams.mjs
// (client SDK + .env.local). DRY-RUN by default — prints a before→after
// table and makes NO writes. Use this to INSPECT/VERIFY only.
//
// NOTE: `--apply` is intentionally blocked by Firestore security rules
// (exams = admin-only write); a terminal script is unauthenticated. To
// actually perform the migration, click "จัดหมวดทั้งหมด" on
// /admin/exams/audit while logged in as admin (same logic, runs as admin).
// After running that button, this dry-run should report all UNCHANGED.
//
//   node scripts/retag-exams.mjs            # dry-run (safe, read-only)
//   node scripts/retag-exams.mjs --apply    # perform the writes
//
// Writes ONLY exams.{category,level,tags} (updateDoc — other fields untouched)
// and reconciles examCategories to [สอบเข้า ม.1, ป.6, ม.1]. Does not touch
// users/enrollments/auth or any question data.
import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, getDocs, doc,
  updateDoc, deleteDoc, addDoc, serverTimestamp,
} from 'firebase/firestore';

const APPLY = process.argv.includes('--apply');

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

// --- Classification (priority order; matches scripts/propose-exam-retag.mjs) ---
function classify(x) {
  const title = String(x.title || '').replace(/\n/g, ' ');
  const oldCat = (x.category || '').trim();
  const oldLvl = (x.level || '').trim();
  const isEntrance =
    /สอบเข้า\s*ม\.?\s*1/.test(title) ||
    /เข้า\s*ม\.?\s*1/.test(title) ||
    /gifted/i.test(title);

  let section, level;
  if (isEntrance) { section = 'สอบเข้า ม.1'; level = 'ป.6'; }
  else if (oldLvl === 'ม.1' || oldCat === 'ม.ต้น') { section = 'ม.1'; level = 'ม.1'; }
  else { section = 'ป.6'; level = 'ป.6'; }

  // Preserve old sub-type meaning as tags (never drop existing tags).
  const existing = Array.isArray(x.tags) ? x.tags.filter(t => typeof t === 'string') : [];
  const addTags = [];
  if (oldCat === 'เนื้อหารายบท' || title.includes('เนื้อหารายบท')) addTags.push('เนื้อหารายบท');
  if (oldCat === 'แบบฝึกหัด' || title.includes('แบบฝึกหัด')) addTags.push('แบบฝึกหัด');
  const tags = [...existing];
  for (const t of addTags) if (!tags.includes(t)) tags.push(t);

  return { section, level, tags, existingTags: existing };
}

const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// ===== Phase 1: exams =====
const snap = await getDocs(collection(db, 'exams'));
const tally = {};
let writes = 0;
const rows = [];

for (const d of snap.docs) {
  const x = d.data();
  const { section, level, tags, existingTags } = classify(x);
  const curCat = (x.category || '').trim();
  const curLvl = (x.level || '').trim();
  tally[section] = (tally[section] || 0) + 1;

  const needWrite = curCat !== section || curLvl !== level || !eq(existingTags, tags);
  if (needWrite) {
    writes++;
    if (APPLY) {
      await updateDoc(doc(db, 'exams', d.id), { category: section, level, tags });
    }
  }
  const t = String(x.title || '').replace(/\n/g, ' ').slice(0, 32).padEnd(32);
  rows.push(
    `${needWrite ? (APPLY ? '✔ WROTE  ' : '⟶ WRITE  ') : '  UNCHANGED'} [${d.id.slice(0, 8)}] "${t}"\n` +
    `      cat:  ${(curCat || '-').padEnd(14)} ⟶ ${section.padEnd(14)}` +
    `  level: ${(curLvl || '-').padEnd(8)} ⟶ ${level.padEnd(8)}` +
    `  tags: [${existingTags.join(',')}] ⟶ [${tags.join(',')}]`
  );
}

console.log(`\n===== EXAM RE-TAG (${APPLY ? 'APPLY — writing' : 'DRY-RUN — no writes'}) =====`);
console.log(rows.join('\n'));
console.log(`\n--- จำนวนต่อหมวด (หลังจัด) ---`);
Object.entries(tally).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}  ${k}`));
console.log(`exams ทั้งหมด: ${snap.size}   ${APPLY ? 'เขียนไป' : 'จะเขียน'}: ${writes}   คงเดิม: ${snap.size - writes}`);

// ===== Phase 2: reconcile examCategories =====
const DESIRED = [
  { name: 'สอบเข้า ม.1', order: 0 },
  { name: 'ป.6', order: 1 },
  { name: 'ม.1', order: 2 },
];
const desiredNames = new Set(DESIRED.map(d => d.name));
const catSnap = await getDocs(collection(db, 'examCategories'));
const existingCats = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
const catActions = [];

for (const want of DESIRED) {
  const hit = existingCats.find(c => c.name === want.name);
  if (!hit) {
    catActions.push(`ADD    "${want.name}" (order ${want.order})`);
    if (APPLY) await addDoc(collection(db, 'examCategories'), { name: want.name, order: want.order, createdAt: serverTimestamp() });
  } else if (hit.order !== want.order || hit.createdAt == null) {
    catActions.push(`UPDATE "${want.name}" order ${hit.order ?? '-'} ⟶ ${want.order}`);
    if (APPLY) {
      const patch = { order: want.order };
      if (hit.createdAt == null) patch.createdAt = serverTimestamp();
      await updateDoc(doc(db, 'examCategories', hit.id), patch);
    }
  } else {
    catActions.push(`KEEP   "${want.name}" (order ${hit.order})`);
  }
}
for (const c of existingCats) {
  if (!desiredNames.has(c.name)) {
    catActions.push(`DELETE "${c.name}" (stale)`);
    if (APPLY) await deleteDoc(doc(db, 'examCategories', c.id));
  }
}

console.log(`\n===== examCategories reconcile (${APPLY ? 'APPLY' : 'DRY-RUN'}) =====`);
console.log(catActions.map(a => '  ' + a).join('\n'));

console.log(`\n${APPLY ? '✅ เสร็จสิ้น — เขียนข้อมูลแล้ว' : 'ℹ️  DRY-RUN เท่านั้น ยังไม่เขียน — ตรวจตารางแล้วรันซ้ำด้วย --apply'}\n`);
process.exit(0);
