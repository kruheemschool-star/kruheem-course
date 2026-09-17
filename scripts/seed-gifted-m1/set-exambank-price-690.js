/**
 * set-exambank-price-690.js
 * ----------------------------------------------------------
 * คอร์ส "คลังข้อสอบ" (courses/26UeeaBMMFswM3RH5aI1)
 *   ราคาเต็ม (fullPrice)  : 1900 (คงเดิม)
 *   ราคาลด (price)        : 990 → 690
 *
 *   node set-exambank-price-690.js            # dry run
 *   node set-exambank-price-690.js --commit   # เขียนจริง (สำรอง salesPage ก่อน)
 * ----------------------------------------------------------
 * แทนที่แบบเจาะจง: ถ้าค่าเดิมไม่ตรงตามที่คาด จะเตือนและไม่แก้จุดนั้น (แล้วหยุด ไม่เขียน)
 * ไม่แตะ:
 *   - anchor คู่แข่ง "1,500–3,000 บาท / ภาคเรียน" และ "8,000–15,000 บาท / เทอม"
 *   - value-stack items (2,990 / 990 / 2,500 = มูลค่ารวม 6,480) — เป็นมูลค่าของแถม ไม่ใช่ราคาเรา
 *   - ราคาเต็ม 1,900 ทุกจุด (regularPriceText / countdown subtitle / priceStack.regularPrice)
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const COMMIT = process.argv.includes('--commit');
const COURSE_ID = '26UeeaBMMFswM3RH5aI1';
const OLD = 990, NEW = 690;

const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

let changes = 0, errors = 0;

function setStr(obj, key, expect, next, tag) {
  if (obj == null || !(key in obj)) { console.log(`  ⚠️  [${tag}] ไม่พบ field "${key}" — ข้าม`); errors++; return; }
  const cur = obj[key];
  if (cur === next) { console.log(`  ✓  [${tag}] ${key} เป็นค่าใหม่อยู่แล้ว`); return; }
  if (cur !== expect) {
    console.log(`  ❌ [${tag}] ${key} ค่าเดิมไม่ตรง!\n       คาด : ${JSON.stringify(expect)}\n       เจอ : ${JSON.stringify(cur)}`);
    errors++; return;
  }
  console.log(`  •  [${tag}] ${key}\n       ${JSON.stringify(cur)}\n       →  ${JSON.stringify(next)}`);
  obj[key] = next; changes++;
}

/** แทนที่ข้อความย่อยในสตริงยาว (FAQ) — ต้องเจอ needle พอดี 1 ครั้ง */
function subStr(obj, key, needle, replacement, tag) {
  if (obj == null || typeof obj[key] !== 'string') { console.log(`  ⚠️  [${tag}] ไม่พบข้อความ "${key}" — ข้าม`); errors++; return; }
  const cur = obj[key];
  if (cur.includes(replacement) && !cur.includes(needle)) { console.log(`  ✓  [${tag}] "${needle}" แก้เป็นค่าใหม่อยู่แล้ว`); return; }
  const n = cur.split(needle).length - 1;
  if (n !== 1) {
    console.log(`  ❌ [${tag}] เจอ "${needle}" ${n} ครั้ง (ต้องเจอ 1 ครั้ง) — ไม่แก้`);
    errors++; return;
  }
  console.log(`  •  [${tag}] "${needle}"  →  "${replacement}"`);
  obj[key] = cur.replace(needle, replacement); changes++;
}

(async () => {
  console.log(COMMIT ? '🟢 COMMIT MODE — เขียนจริง\n' : '🔍 DRY RUN — ยังไม่เขียน\n');

  const ref = db.collection('courses').doc(COURSE_ID);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`ไม่พบคอร์ส ${COURSE_ID}`);
  const c = snap.data();
  console.log(`คอร์ส: ${c.title}  [${COURSE_ID}]\n`);

  const update = {};

  // === 1) ฟิลด์ราคาระดับบนสุด (การ์ดหน้าแรก / หัวหน้าคอร์ส / หน้าชำระเงิน / CTASection) ===
  console.log('=== 1) ราคาระดับบนสุด ===');
  if (c.price === NEW) console.log(`  ✓  price = ${NEW} อยู่แล้ว`);
  else if (c.price === OLD) { console.log(`  •  price : ${OLD}  →  ${NEW}`); update.price = NEW; changes++; }
  else { console.log(`  ❌ price ค่าเดิมไม่ตรง (เจอ ${c.price})`); errors++; }

  if (c.fullPrice === 1900) console.log('  ✓  fullPrice = 1900 (ราคาเต็ม คงเดิม)');
  else { console.log(`  ❌ fullPrice ไม่ใช่ 1900 (เจอ ${c.fullPrice})`); errors++; }

  const sp = c.salesPage;
  const newSp = JSON.parse(JSON.stringify(sp));
  const byType = (t) => newSp.sections.filter((s) => s.type === t);

  // === 2) hero ===
  console.log('\n=== 2) hero (แถบราคาบนสุดหน้าขาย) ===');
  for (const s of byType('hero')) {
    setStr(s.data, 'ctaPriceText', '฿990', '฿690', 'hero');
    setStr(s.data, 'pricePerDayText', 'เฉลี่ยวันละ 0.54 บาทเท่านั้น', 'เฉลี่ยวันละ 0.38 บาทเท่านั้น', 'hero');
    const chip = (s.data.trustChips || [])[0];
    setStr(chip, 'boldText', '0.54', '0.38', 'hero·ชิป "ค่าใช้จ่ายเฉลี่ยวันละ"');
    if (s.data.regularPriceText === 'ราคาปกติ 1,900') console.log('  ✓  regularPriceText = "ราคาปกติ 1,900" (คงเดิม)');
    else { console.log(`  ❌ regularPriceText เปลี่ยนไปจากที่คาด: ${JSON.stringify(s.data.regularPriceText)}`); errors++; }
  }

  // === 3) countdown (endDate หมดอายุแล้ว ไม่แสดง แต่แก้ไว้เผื่อเปิดใหม่) ===
  console.log('\n=== 3) countdown (แถบนับถอยหลัง — ตอนนี้หมดอายุ ไม่แสดงผล) ===');
  for (const s of byType('countdown')) {
    setStr(s.data, 'title', '⏰ ราคาเปิดตัว 990 บาท — เหลือเวลาอีก', '⏰ ราคาเปิดตัว 690 บาท — เหลือเวลาอีก', 'countdown');
    if (String(s.data.subtitle).includes('1,900')) console.log('  ✓  subtitle ยังอ้างราคาเต็ม 1,900 (คงเดิม)');
    else { console.log(`  ❌ subtitle ไม่ได้อ้าง 1,900: ${JSON.stringify(s.data.subtitle)}`); errors++; }
  }

  // === 4) comparison (ตารางเทียบ 3 คอลัมน์) — แก้เฉพาะคอลัมน์ของเรา ===
  console.log('\n=== 4) comparison (คอลัมน์ "คอร์สครูฮีม" เท่านั้น) ===');
  for (const s of byType('comparison')) {
    const ours = s.data.columns[1];
    setStr(ours.features[0], 'text', '990 บาท ครั้งเดียว ใช้ได้ 5 ปี', '690 บาท ครั้งเดียว ใช้ได้ 5 ปี', 'comparison');
    const rival0 = s.data.columns[0].features[0].text, rival2 = s.data.columns[2].features[0].text;
    console.log(`  🔒 ไม่แตะ anchor คู่แข่ง: ${JSON.stringify(rival0)} / ${JSON.stringify(rival2)}`);
  }

  // === 5) priceStack ===
  console.log('\n=== 5) priceStack (ตาราง "คุ้มทุกบาท ทุกสตางค์") ===');
  for (const s of byType('priceStack')) {
    const d = s.data;
    if (d.finalPrice === NEW) console.log(`  ✓  finalPrice = ${NEW} อยู่แล้ว`);
    else if (d.finalPrice === OLD) { console.log(`  •  finalPrice : ${OLD}  →  ${NEW}`); d.finalPrice = NEW; changes++; }
    else { console.log(`  ❌ finalPrice ค่าเดิมไม่ตรง (เจอ ${d.finalPrice})`); errors++; }

    if (d.regularPrice === 1900) {
      const save = 1900 - NEW, pct = Math.round((save / 1900) * 100);
      console.log(`  ✓  regularPrice = 1900 (คงเดิม) → ป้ายประหยัดจะเปลี่ยนเป็น "ประหยัด ${save.toLocaleString('en-US')} ฿ (${pct}%)"`);
    } else { console.log(`  ❌ regularPrice ไม่ใช่ 1900 (เจอ ${d.regularPrice})`); errors++; }

    const total = (d.items || []).reduce((a, i) => a + Number(i.value || 0), 0);
    console.log(`  🔒 ไม่แตะ value-stack items (มูลค่ารวม ${total.toLocaleString('en-US')} ฿ — เป็นมูลค่าของแถม ไม่ใช่ราคาขาย)`);
  }

  // === 6) faq ===
  console.log('\n=== 6) faq (คำถามที่พูดถึงราคา) ===');
  for (const s of byType('faq')) {
    const faqs = s.data.faqs || [];
    const qi = faqs.findIndex((f) => /ราคาแค่ 990 บาท/.test(f.q || ''));
    if (qi < 0) { console.log('  ❌ ไม่พบคำถาม "ราคาแค่ 990 บาท…"'); errors++; }
    else {
      subStr(faqs[qi], 'q', 'ราคาแค่ 990 บาท', 'ราคาแค่ 690 บาท', `faq[${qi}].q`);
      subStr(faqs[qi], 'a', 'จ่าย 990 จบทันที', 'จ่าย 690 จบทันที', `faq[${qi}].a`);
    }
    const ci = faqs.findIndex((f) => /คุ้มแน่นอน 990 บาท/.test(f.a || ''));
    if (ci < 0) { console.log('  ❌ ไม่พบคำตอบ "คอร์สนี้คุ้มแน่นอน 990 บาท…"'); errors++; }
    else {
      subStr(faqs[ci], 'a', 'คุ้มแน่นอน 990 บาท', 'คุ้มแน่นอน 690 บาท', `faq[${ci}].a`);
      subStr(faqs[ci], 'a', 'ตกเดือนละ 17 บาท', 'ตกเดือนละ 12 บาท', `faq[${ci}].a·ต่อเดือน`);
    }
  }

  // === 7) cta ท้ายหน้า + stickyCTA ===
  console.log('\n=== 7) ปุ่มปิดการขาย (cta ท้ายหน้า + แถบลอย) ===');
  for (const s of byType('cta')) setStr(s.data, 'priceText', '฿990', '฿690', 'cta ท้ายหน้า');
  if (newSp.boosters?.stickyCTA) {
    setStr(newSp.boosters.stickyCTA, 'priceText', '฿990', '฿690', `แถบลอย (enabled=${newSp.boosters.stickyCTA.enabled})`);
  }

  // === 8) ตรวจ 990 ที่ตกค้าง ===
  console.log('\n=== 8) ตรวจ "990" ที่ยังเหลือ (ควรเหลือแค่ value-stack) ===');
  const leftovers = [];
  (function walk(o, p) {
    if (o == null) return;
    if (typeof o === 'string') { if (/990/.test(o)) leftovers.push([p, o.length > 90 ? o.slice(0, 90) + '…' : o]); return; }
    if (typeof o === 'number') { if (o === 990) leftovers.push([p, o]); return; }
    if (Array.isArray(o)) return o.forEach((v, i) => walk(v, `${p}[${i}]`));
    if (typeof o === 'object') for (const k of Object.keys(o)) walk(o[k], p ? `${p}.${k}` : k);
  })({ price: update.price ?? c.price, fullPrice: c.fullPrice, salesPage: newSp }, '');
  if (!leftovers.length) console.log('  ✓  ไม่มี 990 เหลือ');
  for (const [p, v] of leftovers) console.log(`  ℹ️  ${p} : ${JSON.stringify(v)}`);

  update.salesPage = newSp;
  console.log(`\n=== สรุป: แก้ ${changes} จุด, เตือน/ผิดพลาด ${errors} จุด ===`);

  if (!COMMIT) { console.log('\n(dry run — รันซ้ำด้วย --commit เพื่อเขียนจริง)'); process.exit(0); }
  if (errors > 0) { console.log('⛔ มีจุดที่ค่าเดิมไม่ตรง — หยุดไว้ก่อน ไม่เขียน'); process.exit(1); }

  const backupPath = path.resolve(__dirname, `salespage-exambank-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ price: c.price, fullPrice: c.fullPrice, salesPage: sp }, null, 2));
  console.log(`📦 สำรองของเดิม → ${backupPath}`);

  await ref.update(update);
  console.log('✅ เขียนแล้ว — ราคาเต็ม 1,900 / ราคาลด 690 ครบทุกจุดใน Firestore');
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
