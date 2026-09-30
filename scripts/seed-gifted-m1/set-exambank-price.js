/**
 * set-exambank-price.js
 * ----------------------------------------------------------
 * ปรับราคาคอร์ส "คลังข้อสอบ" (courses/26UeeaBMMFswM3RH5aI1)
 * ให้ครบทุกจุด: ฟิลด์ราคาระดับบนสุด + ราคาที่ฝังใน salesPage + copy
 *
 *   ราคาสุทธิ (net)      : 790  → 990
 *   ราคาปกติ (regular)   : 990  → 1,500   (top-level fullPrice: 0 → 1500)
 *
 *   node set-exambank-price.js            # dry run — โชว์ก่อน/หลัง ไม่เขียน
 *   node set-exambank-price.js --commit   # เขียนจริง (สำรอง salesPage เดิมก่อน)
 * ----------------------------------------------------------
 * ใช้การแทนที่แบบเจาะจง (guarded): ถ้าค่าเดิมไม่ตรงตามที่คาด จะหยุดทันที
 * ป้องกันไปโดนตัวเลข value-stack (2990/990/2500/6480) และ anchor "1,500–3,000"
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const COMMIT = process.argv.includes('--commit');
const COURSE_ID = '26UeeaBMMFswM3RH5aI1';

const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

let changes = 0;
let errors = 0;

// แทนที่ค่า field หนึ่งแบบเจาะจง โดยเช็คว่าตรงกับที่คาด (expect) ก่อน
function setField(obj, key, expect, next, tag) {
  if (obj == null || !(key in obj)) {
    console.log(`  ⚠️  [${tag}] ไม่พบ field "${key}" — ข้าม`);
    errors++;
    return;
  }
  const cur = obj[key];
  if (cur === next) {
    console.log(`  ✓  [${tag}] ${key} เป็นค่าใหม่อยู่แล้ว (${JSON.stringify(next)})`);
    return;
  }
  if (cur !== expect) {
    console.log(`  ❌ [${tag}] ${key} ค่าเดิมไม่ตรง!\n       คาด : ${JSON.stringify(expect)}\n       เจอ : ${JSON.stringify(cur)}`);
    errors++;
    return;
  }
  console.log(`  •  [${tag}] ${key} : ${JSON.stringify(cur)}  →  ${JSON.stringify(next)}`);
  obj[key] = next;
  changes++;
}

(async () => {
  console.log(COMMIT ? '🟢 COMMIT MODE — จะเขียนจริง\n' : '🔍 DRY RUN — ไม่เขียน\n');

  const ref = db.collection('courses').doc(COURSE_ID);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`Course ${COURSE_ID} not found`);
  const c = snap.data();
  console.log(`คอร์ส: ${c.title}  [${COURSE_ID}]\n`);

  const update = {};

  // === ฟิลด์ราคาระดับบนสุด ===
  console.log('=== ราคาระดับบนสุด ===');
  if (c.price === 990) { console.log('  ✓  price เป็น 990 อยู่แล้ว'); }
  else if (c.price === 790) { console.log('  •  price : 790  →  990'); update.price = 990; changes++; }
  else { console.log(`  ❌ price ค่าเดิมไม่ตรง (เจอ ${c.price})`); errors++; }

  if (c.fullPrice === 1500) { console.log('  ✓  fullPrice เป็น 1500 อยู่แล้ว'); }
  else if (c.fullPrice === 0 || c.fullPrice === 990 || c.fullPrice == null) {
    console.log(`  •  fullPrice : ${c.fullPrice}  →  1500`); update.fullPrice = 1500; changes++;
  } else { console.log(`  ❌ fullPrice ค่าเดิมไม่ตรง (เจอ ${c.fullPrice})`); errors++; }

  // === salesPage ===
  const sp = c.salesPage;
  const newSp = JSON.parse(JSON.stringify(sp));
  const byType = (t) => newSp.sections.filter((s) => s.type === t);

  console.log('\n=== salesPage ===');

  // hero
  for (const s of byType('hero')) {
    const d = s.data;
    setField(d, 'ctaPriceText', '฿790', '฿990', 'hero');
    setField(d, 'regularPriceText', 'ราคาปกติ 990', 'ราคาปกติ 1,500', 'hero');
    setField(d, 'pricePerDayText', 'เฉลี่ยวันละ 0.43 บาทเท่านั้น', 'เฉลี่ยวันละ 0.54 บาทเท่านั้น', 'hero');
    if (Array.isArray(d.trustChips)) {
      for (const chip of d.trustChips) {
        if (chip && chip.boldText === '0.43' && /วันละ/.test(chip.text || '')) {
          setField(chip, 'boldText', '0.43', '0.54', 'hero.trustChip');
        }
      }
    }
  }

  // countdown
  for (const s of byType('countdown')) {
    const d = s.data;
    setField(d, 'title', '⏰ ราคาเปิดตัว 790 บาท — เหลือเวลาอีก', '⏰ ราคาเปิดตัว 990 บาท — เหลือเวลาอีก', 'countdown');
    setField(d, 'subtitle',
      'หลังหมดเวลา ราคาจะกลับเป็น 990 บาท (ใช้ได้ 5 ปีเหมือนเดิม)',
      'หลังหมดเวลา ราคาจะกลับเป็น 1,500 บาท (ใช้ได้ 5 ปีเหมือนเดิม)', 'countdown');
  }

  // priceStack — เฉพาะ finalPrice (ไม่แตะ value-stack items/regularPrice)
  for (const s of byType('priceStack')) {
    const d = s.data;
    if (d.finalPrice === 990) console.log('  ✓  [priceStack] finalPrice เป็น 990 อยู่แล้ว');
    else if (d.finalPrice === 790) { console.log('  •  [priceStack] finalPrice : 790  →  990'); d.finalPrice = 990; changes++; }
    else { console.log(`  ❌ [priceStack] finalPrice ไม่ตรง (เจอ ${d.finalPrice})`); errors++; }
  }

  // comparison (มี columns/features) — แก้เฉพาะคอลัมน์ราคาคอร์สเรา
  for (const s of newSp.sections) {
    const d = s.data || {};
    if (!Array.isArray(d.columns)) continue;
    for (const col of d.columns) {
      if (!Array.isArray(col.features)) continue;
      for (const f of col.features) {
        if (f && f.text === '790 บาท ครั้งเดียว ใช้ได้ 5 ปี') {
          setField(f, 'text', '790 บาท ครั้งเดียว ใช้ได้ 5 ปี', '990 บาท ครั้งเดียว ใช้ได้ 5 ปี', `${s.type}.feature`);
        }
      }
    }
  }

  // FAQ — แทนข้อความ 790 → 990 และปรับ "เดือนละ 13" → "เดือนละ 17"
  for (const s of newSp.sections) {
    const d = s.data || {};
    if (!Array.isArray(d.faqs)) continue;
    for (const fq of d.faqs) {
      for (const key of ['q', 'a']) {
        if (typeof fq[key] !== 'string') continue;
        let v = fq[key];
        if (!/790|เดือนละ 13/.test(v)) continue;
        const before = v;
        v = v.replace(/790/g, '990').replace(/ตกเดือนละ 13 บาท/g, 'ตกเดือนละ 17 บาท');
        if (v !== before) {
          console.log(`  •  [faq.${key}] แก้ 790→990${/เดือนละ/.test(before) ? ' + เดือนละ 13→17' : ''}`);
          fq[key] = v; changes++;
        }
      }
    }
  }

  // finalCTA priceText
  for (const s of newSp.sections) {
    const d = s.data || {};
    if (d.priceText === '฿790') { console.log(`  •  [${s.type}.priceText] ฿790  →  ฿990`); d.priceText = '฿990'; changes++; }
    else if (d.priceText === '฿990') { console.log(`  ✓  [${s.type}.priceText] ฿990 อยู่แล้ว`); }
  }

  // boosters.stickyCTA.priceText
  if (newSp.boosters?.stickyCTA) {
    setField(newSp.boosters.stickyCTA, 'priceText', '฿790', '฿990', 'boosters.stickyCTA');
  }

  update.salesPage = newSp;

  console.log(`\n=== สรุป: ${changes} จุดที่จะแก้, ${errors} คำเตือน/ผิดพลาด ===`);

  if (errors > 0) {
    console.log('⚠️  มีคำเตือน/ค่าไม่ตรง — ตรวจสอบก่อน');
  }

  if (!COMMIT) {
    console.log('\n(dry run — รันซ้ำด้วย --commit เพื่อเขียนจริง)');
    process.exit(0);
  }

  // สำรอง salesPage เดิม
  const backupPath = path.resolve(__dirname, `salespage-exambank-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(sp, null, 2));
  console.log(`📦 สำรอง salesPage เดิม → ${backupPath}`);

  await ref.update(update);
  console.log(`✅ เขียนราคาใหม่แล้ว — price=990, fullPrice=1500 ครบทุกจุด`);
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
