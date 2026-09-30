/**
 * fix-banyat-price-copy.js
 * แทนที่ "ข้อความราคาเดิม" ที่ตกค้างในคำโปรย/FAQ/urgency ของคอร์สไตรยางค์
 * ให้ตรงกับราคาใหม่ 1,500 (เต็ม 2,000) — เฉลี่ยปีละ 300 / วันละ 0.82 (ตลอด 5 ปี)
 *
 *   node fix-banyat-price-copy.js            # dry run
 *   node fix-banyat-price-copy.js --commit   # เขียนจริง (สำรอง salesPage+desc เดิม)
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const COMMIT = process.argv.includes('--commit');
const COURSE_ID = 'xELVM7Nbeua9jm0NjJK7';
const sa = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

// ลำดับสำคัญ — เจาะจงก่อนกว้าง
const RULES = [
  [/วันละ 4\.11 บาท/g, 'วันละ 0.82 บาท'],          // แก้ค่าที่ผมคำนวณผิดรอบแรก
  [/ราคาเต็ม 500 บาท/g, 'ราคาเต็ม 2,000 บาท'],      // desc (full price เก่า)
  [/ปีละ 78 บาท/g, 'ปีละ 300 บาท'],                 // desc
  [/0\.22 บาท/g, '0.82 บาท'],                       // desc (วันละ)
  [/0\.32 บาท/g, '0.82 บาท'],                       // salesPage (วันละ ตลอด 5 ปี)
  [/0\.32/g, '0.82'],                               // เผื่อไม่มี "บาท" ต่อท้าย
  [/590 บาท/g, '1,500 บาท'],
  [/390 บาท/g, '1,500 บาท'],                        // desc (sale price เก่า)
  [/700 บาท/g, '2,000 บาท'],
  [/฿590/g, '฿1,500'],
];

function transform(str) {
  let out = str;
  for (const [re, rep] of RULES) out = out.replace(re, rep);
  return out;
}

// เดินทุก string leaf, คืนจำนวนที่เปลี่ยน + log ก่อน/หลัง
function walk(obj, pathStr, changes) {
  if (obj == null) return obj;
  if (typeof obj === 'string') {
    const next = transform(obj);
    if (next !== obj) changes.push({ path: pathStr, before: obj, after: next });
    return next;
  }
  if (Array.isArray(obj)) return obj.map((v, i) => walk(v, `${pathStr}[${i}]`, changes));
  if (typeof obj === 'object') {
    const o = {};
    for (const k of Object.keys(obj)) o[k] = walk(obj[k], `${pathStr}.${k}`, changes);
    return o;
  }
  return obj;
}

(async () => {
  console.log(COMMIT ? '🟢 COMMIT MODE\n' : '🔍 DRY RUN\n');
  const ref = db.collection('courses').doc(COURSE_ID);
  const snap = await ref.get();
  const course = snap.data();

  const changes = [];
  const newSalesPage = walk(course.salesPage, 'salesPage', changes);
  const newDesc = typeof course.desc === 'string'
    ? (() => { const c = []; const r = walk(course.desc, 'desc', c); changes.push(...c); return r; })()
    : course.desc;

  console.log(`พบข้อความที่ต้องแก้ ${changes.length} จุด:\n`);
  const short = (s) => s.length > 120 ? s.slice(0, 120).replace(/\n/g, '⏎') + '…' : s.replace(/\n/g, '⏎');
  changes.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.path}`);
    console.log(`     - ${short(c.before)}`);
    console.log(`     + ${short(c.after)}\n`);
  });

  if (!COMMIT) { console.log('(dry run — รันซ้ำด้วย --commit)'); process.exit(0); }

  const backup = path.resolve(__dirname, `banyat-copy-backup-${Date.now()}.json`);
  fs.writeFileSync(backup, JSON.stringify({ salesPage: course.salesPage, desc: course.desc }, null, 2));
  console.log(`📦 สำรองเดิม → ${backup}`);

  await ref.update({ salesPage: newSalesPage, desc: newDesc });
  console.log(`\n✅ แก้ข้อความราคาครบ ${changes.length} จุดแล้ว`);
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
