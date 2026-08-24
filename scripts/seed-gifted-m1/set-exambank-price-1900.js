/**
 * set-exambank-price-1900.js
 * ----------------------------------------------------------
 * คอร์ส "คลังข้อสอบ" (courses/26UeeaBMMFswM3RH5aI1)
 *   ราคาเต็ม (fullPrice)  : 1500 → 1900
 *   ราคาลด (price)        : 990  (คงเดิม)
 *
 *   node set-exambank-price-1900.js            # dry run
 *   node set-exambank-price-1900.js --commit   # เขียนจริง (สำรอง salesPage ก่อน)
 * ----------------------------------------------------------
 * แทนที่แบบเจาะจง: ถ้าค่าเดิมไม่ตรงตามที่คาด จะเตือนและไม่แก้จุดนั้น
 * ไม่แตะ anchor คู่แข่ง "1,500–3,000 บาท / ภาคเรียน" (คอลัมน์โรงเรียนกวดวิชา)
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const COMMIT = process.argv.includes('--commit');
const COURSE_ID = '26UeeaBMMFswM3RH5aI1';

const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

let changes = 0, errors = 0;

function setField(obj, key, expect, next, tag) {
  if (obj == null || !(key in obj)) {
    console.log(`  ⚠️  [${tag}] ไม่พบ field "${key}" — ข้าม`); errors++; return;
  }
  const cur = obj[key];
  if (cur === next) { console.log(`  ✓  [${tag}] ${key} เป็นค่าใหม่อยู่แล้ว`); return; }
  if (cur !== expect) {
    console.log(`  ❌ [${tag}] ${key} ค่าเดิมไม่ตรง!\n       คาด : ${JSON.stringify(expect)}\n       เจอ : ${JSON.stringify(cur)}`);
    errors++; return;
  }
  console.log(`  •  [${tag}] ${key}\n       ${JSON.stringify(cur)}\n       →  ${JSON.stringify(next)}`);
  obj[key] = next; changes++;
}

(async () => {
  console.log(COMMIT ? '🟢 COMMIT MODE — เขียนจริง\n' : '🔍 DRY RUN — ยังไม่เขียน\n');

  const ref = db.collection('courses').doc(COURSE_ID);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`ไม่พบคอร์ส ${COURSE_ID}`);
  const c = snap.data();
  console.log(`คอร์ส: ${c.title}  [${COURSE_ID}]\n`);

  const update = {};

  // === 1) ฟิลด์ราคาระดับบนสุด ===
  console.log('=== 1) ราคาระดับบนสุด (การ์ดหน้าแรก / หัวหน้าคอร์ส / หน้าชำระเงิน) ===');
  if (c.price === 990) console.log('  ✓  price = 990 (ราคาลด) ถูกต้องอยู่แล้ว');
  else { console.log(`  ❌ price ไม่ใช่ 990 (เจอ ${c.price})`); errors++; }

  if (c.fullPrice === 1900) console.log('  ✓  fullPrice = 1900 อยู่แล้ว');
  else if (c.fullPrice === 1500) { console.log('  •  fullPrice : 1500  →  1900'); update.fullPrice = 1900; changes++; }
  else { console.log(`  ❌ fullPrice ค่าเดิมไม่ตรง (เจอ ${c.fullPrice})`); errors++; }

  // === salesPage ===
  const sp = c.salesPage;
  const newSp = JSON.parse(JSON.stringify(sp));
  const byType = (t) => newSp.sections.filter((s) => s.type === t);

  console.log('\n=== 2) hero (แถบราคาบนสุดหน้าขาย) ===');
  for (const s of byType('hero')) {
    setField(s.data, 'regularPriceText', 'ราคาปกติ 1,500', 'ราคาปกติ 1,900', 'hero');
  }

  console.log('\n=== 3) countdown (แถบนับถอยหลัง) ===');
  for (const s of byType('countdown')) {
    setField(s.data, 'subtitle',
      'หลังหมดเวลา ราคาจะกลับเป็น 1,500 บาท (ใช้ได้ 5 ปีเหมือนเดิม)',
      'หลังหมดเวลา ราคาจะกลับเป็น 1,900 บาท (ใช้ได้ 5 ปีเหมือนเดิม)', 'countdown');
  }

  console.log('\n=== 4) priceStack (ตาราง "คุ้มทุกบาท ทุกสตางค์") ===');
  for (const s of byType('priceStack')) {
    const d = s.data;
    if (d.finalPrice === 990) console.log('  ✓  finalPrice = 990 ถูกต้องอยู่แล้ว');
    else { console.log(`  ❌ finalPrice ไม่ใช่ 990 (เจอ ${d.finalPrice})`); errors++; }
    // regularPrice เรนเดอร์เป็นบรรทัด "ราคาปกติ" + ใช้คิด % ประหยัด
    if (d.regularPrice === 1900) console.log('  ✓  regularPrice = 1900 อยู่แล้ว');
    else if (d.regularPrice === 6480) {
      console.log('  •  regularPrice (บรรทัด "ราคาปกติ") : 6480  →  1900');
      console.log('       → ป้ายประหยัดจะเปลี่ยนเป็น "ประหยัด 910 ฿ (48%)"');
      console.log('       → บรรทัด "มูลค่ารวม 6,480 ฿" ยังอยู่เหมือนเดิม');
      d.regularPrice = 1900; changes++;
    } else { console.log(`  ❌ regularPrice ค่าเดิมไม่ตรง (เจอ ${d.regularPrice})`); errors++; }
  }

  // === ตรวจย้ำว่าไม่มี 1,500 ตกค้างที่หมายถึงราคาของเรา ===
  console.log('\n=== 5) ตรวจ 1,500 ที่ตกค้าง (ควรเหลือแค่ anchor คู่แข่ง) ===');
  const leftovers = [];
  (function walk(o, p) {
    if (o == null) return;
    if (typeof o === 'string') { if (/1[,]?500/.test(o)) leftovers.push([p, o.slice(0, 120)]); return; }
    if (typeof o === 'number') { if (o === 1500) leftovers.push([p, o]); return; }
    if (Array.isArray(o)) return o.forEach((v, i) => walk(v, `${p}[${i}]`));
    if (typeof o === 'object') for (const k of Object.keys(o)) walk(o[k], p ? `${p}.${k}` : k);
  })({ price: update.price ?? c.price, fullPrice: update.fullPrice ?? c.fullPrice, salesPage: newSp }, '');
  if (!leftovers.length) console.log('  ✓  ไม่มี 1,500 เหลือแล้ว');
  for (const [p, v] of leftovers) console.log(`  ℹ️  ${p} : ${JSON.stringify(v)}`);

  update.salesPage = newSp;
  console.log(`\n=== สรุป: แก้ ${changes} จุด, เตือน/ผิดพลาด ${errors} จุด ===`);

  if (!COMMIT) { console.log('\n(dry run — รันซ้ำด้วย --commit เพื่อเขียนจริง)'); process.exit(0); }
  if (errors > 0) { console.log('⛔ มีจุดที่ค่าเดิมไม่ตรง — หยุดไว้ก่อน ไม่เขียน'); process.exit(1); }

  const backupPath = path.resolve(__dirname, `salespage-exambank-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ price: c.price, fullPrice: c.fullPrice, salesPage: sp }, null, 2));
  console.log(`📦 สำรองของเดิม → ${backupPath}`);

  await ref.update(update);
  console.log('✅ เขียนแล้ว — ราคาเต็ม 1,900 / ราคาลด 990 ครบทุกจุดใน Firestore');
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
