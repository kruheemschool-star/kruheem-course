/**
 * set-exambank-sale-price.js — เปลี่ยน "ราคาลด" (และราคาเต็มได้ด้วย) ของคอร์สคลังข้อสอบ
 * ----------------------------------------------------------
 *   node set-exambank-sale-price.js --from=690 --to=990            # dry run
 *   node set-exambank-sale-price.js --from=690 --to=990 --commit   # เขียนจริง (สำรอง salesPage ก่อน)
 *   เปลี่ยนราคาเต็มด้วย: เพิ่ม --full-from=1900 --full-to=3900 (ไม่ใส่ = ราคาเต็มคงเดิม)
 * ----------------------------------------------------------
 * แก้ให้ครบทุกจุดใน Firestore แล้วคำนวณข้อความ "เฉลี่ยวันละ / ตกเดือนละ" ให้เอง
 * ค่าเดิมจุดไหนไม่ตรงกับ --from = เตือนแล้วหยุด ไม่เขียนอะไรเลย
 *
 * ⚠️ ราคาในโค้ดอีก 1 จุดต้องแก้มือ: lib/constants.ts → EXAM_BANK_PRICE.sale (แล้ว push ให้ Vercel deploy)
 *
 * ไม่แตะ: anchor คู่แข่ง (คอลัมน์ 1 และ 3 ของตารางเทียบ) · value-stack items (มูลค่ารวม 6,480 ฿)
 *        · ราคาเต็ม (ถ้าไม่ใส่ --full-to) · boosters.exitIntent (ปิดใช้งานอยู่)
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1];
const COMMIT = process.argv.includes('--commit');
const FROM = Number(arg('from'));
const TO = Number(arg('to'));
const COURSE_ID = '26UeeaBMMFswM3RH5aI1';
const FULL_FROM = Number(arg('full-from') || 1900);
const FULL_PRICE = Number(arg('full-to') || FULL_FROM);  // ราคาเต็มหลังแก้
const YEARS = 5, DAYS = 365 * YEARS, MONTHS = 12 * YEARS;

if (!FROM || !TO) {
  console.error('ใช้: node set-exambank-sale-price.js --from=<ราคาเดิม> --to=<ราคาใหม่> [--commit]');
  process.exit(1);
}

const baht = (n) => n.toLocaleString('en-US');
const perDay = (n) => (n / DAYS).toFixed(2);          // 990→0.54, 690→0.38
const perMonth = (n) => Math.round(n / MONTHS);        // 990→17,   690→12

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

/** แทนที่ข้อความย่อยในสตริงยาว — ต้องเจอ needle พอดี 1 ครั้ง */
function subStr(obj, key, needle, replacement, tag) {
  if (obj == null || typeof obj[key] !== 'string') { console.log(`  ⚠️  [${tag}] ไม่พบข้อความ "${key}" — ข้าม`); errors++; return; }
  const cur = obj[key];
  if (!cur.includes(needle) && cur.includes(replacement)) { console.log(`  ✓  [${tag}] "${needle}" แก้เป็นค่าใหม่อยู่แล้ว`); return; }
  const n = cur.split(needle).length - 1;
  if (n !== 1) { console.log(`  ❌ [${tag}] เจอ "${needle}" ${n} ครั้ง (ต้องเจอ 1 ครั้ง) — ไม่แก้`); errors++; return; }
  console.log(`  •  [${tag}] "${needle}"  →  "${replacement}"`);
  obj[key] = cur.replace(needle, replacement); changes++;
}

(async () => {
  console.log(COMMIT ? '🟢 COMMIT MODE — เขียนจริง\n' : '🔍 DRY RUN — ยังไม่เขียน\n');
  console.log(`ราคาลด: ${baht(FROM)}  →  ${baht(TO)}   (ราคาเต็ม ${baht(FULL_FROM)} → ${baht(FULL_PRICE)})`);
  console.log(`เฉลี่ยวันละ: ${perDay(FROM)} → ${perDay(TO)} บาท · ตกเดือนละ: ${perMonth(FROM)} → ${perMonth(TO)} บาท`);
  console.log(`ป้ายประหยัด: ${baht(FULL_PRICE - TO)} ฿ (${Math.round(((FULL_PRICE - TO) / FULL_PRICE) * 100)}%)\n`);

  const ref = db.collection('courses').doc(COURSE_ID);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`ไม่พบคอร์ส ${COURSE_ID}`);
  const c = snap.data();
  console.log(`คอร์ส: ${c.title}  [${COURSE_ID}]\n`);

  const update = {};

  console.log('=== 1) ราคาระดับบนสุด (การ์ดหน้าแรก / หัวคอร์ส / หน้าแจ้งโอน / CTA ท้ายหน้า) ===');
  if (c.price === TO) console.log(`  ✓  price = ${TO} อยู่แล้ว`);
  else if (c.price === FROM) { console.log(`  •  price : ${FROM}  →  ${TO}`); update.price = TO; changes++; }
  else { console.log(`  ❌ price ค่าเดิมไม่ตรง (เจอ ${c.price})`); errors++; }

  if (c.fullPrice === FULL_PRICE) console.log(`  ✓  fullPrice = ${FULL_PRICE} อยู่แล้ว`);
  else if (c.fullPrice === FULL_FROM) { console.log(`  •  fullPrice : ${FULL_FROM}  →  ${FULL_PRICE}`); update.fullPrice = FULL_PRICE; changes++; }
  else { console.log(`  ❌ fullPrice ไม่ใช่ ${FULL_PRICE} (เจอ ${c.fullPrice})`); errors++; }

  const sp = c.salesPage;
  const newSp = JSON.parse(JSON.stringify(sp));
  const byType = (t) => newSp.sections.filter((s) => s.type === t);

  console.log('\n=== 2) hero (แถบราคาบนสุดหน้าขาย) ===');
  for (const s of byType('hero')) {
    setStr(s.data, 'ctaPriceText', `฿${baht(FROM)}`, `฿${baht(TO)}`, 'hero');
    setStr(s.data, 'pricePerDayText', `เฉลี่ยวันละ ${perDay(FROM)} บาทเท่านั้น`, `เฉลี่ยวันละ ${perDay(TO)} บาทเท่านั้น`, 'hero');
    setStr((s.data.trustChips || [])[0], 'boldText', perDay(FROM), perDay(TO), 'hero·ชิป "ค่าใช้จ่ายเฉลี่ยวันละ"');
    setStr(s.data, 'regularPriceText', `ราคาปกติ ${baht(FULL_FROM)}`, `ราคาปกติ ${baht(FULL_PRICE)}`, 'hero');
  }

  console.log('\n=== 3) countdown (แถบนับถอยหลัง — endDate หมดอายุ ไม่แสดงผล) ===');
  for (const s of byType('countdown')) {
    setStr(s.data, 'title', `⏰ ราคาเปิดตัว ${baht(FROM)} บาท — เหลือเวลาอีก`, `⏰ ราคาเปิดตัว ${baht(TO)} บาท — เหลือเวลาอีก`, 'countdown');
    if (FULL_FROM === FULL_PRICE && String(s.data.subtitle).includes(baht(FULL_PRICE))) console.log(`  ✓  subtitle ยังอ้างราคาเต็ม ${baht(FULL_PRICE)} (คงเดิม)`);
    else subStr(s.data, 'subtitle', baht(FULL_FROM), baht(FULL_PRICE), 'countdown·subtitle');
  }

  console.log('\n=== 4) comparison (แก้เฉพาะคอลัมน์ "คอร์สครูฮีม") ===');
  for (const s of byType('comparison')) {
    setStr(s.data.columns[1].features[0], 'text', `${baht(FROM)} บาท ครั้งเดียว ใช้ได้ 5 ปี`, `${baht(TO)} บาท ครั้งเดียว ใช้ได้ 5 ปี`, 'comparison');
    console.log(`  🔒 ไม่แตะ anchor คู่แข่ง: ${JSON.stringify(s.data.columns[0].features[0].text)} / ${JSON.stringify(s.data.columns[2].features[0].text)}`);
  }

  console.log('\n=== 5) priceStack (ตาราง "คุ้มทุกบาท ทุกสตางค์") ===');
  for (const s of byType('priceStack')) {
    const d = s.data;
    if (d.finalPrice === TO) console.log(`  ✓  finalPrice = ${TO} อยู่แล้ว`);
    else if (d.finalPrice === FROM) { console.log(`  •  finalPrice : ${FROM}  →  ${TO}`); d.finalPrice = TO; changes++; }
    else { console.log(`  ❌ finalPrice ค่าเดิมไม่ตรง (เจอ ${d.finalPrice})`); errors++; }

    if (d.regularPrice === FULL_FROM && FULL_FROM !== FULL_PRICE) { console.log(`  •  regularPrice : ${FULL_FROM}  →  ${FULL_PRICE}`); d.regularPrice = FULL_PRICE; changes++; }
    if (d.regularPrice === FULL_PRICE) {
      const save = FULL_PRICE - TO;
      console.log(`  ✓  regularPrice = ${FULL_PRICE} (คงเดิม) → ป้ายประหยัดจะเป็น "ประหยัด ${baht(save)} ฿ (${Math.round((save / FULL_PRICE) * 100)}%)"`);
    } else { console.log(`  ❌ regularPrice ไม่ใช่ ${FULL_PRICE} (เจอ ${d.regularPrice})`); errors++; }

    const total = (d.items || []).reduce((a, i) => a + Number(i.value || 0), 0);
    console.log(`  🔒 ไม่แตะ value-stack items (มูลค่ารวม ${baht(total)} ฿ — มูลค่าของแถม ไม่ใช่ราคาขาย)`);
  }

  console.log('\n=== 6) faq (คำถามที่พูดถึงราคา) ===');
  for (const s of byType('faq')) {
    const faqs = s.data.faqs || [];
    const qi = faqs.findIndex((f) => (f.q || '').includes(`ราคาแค่ ${baht(FROM)} บาท`) || (f.q || '').includes(`ราคาแค่ ${baht(TO)} บาท`));
    if (qi < 0) { console.log(`  ❌ ไม่พบคำถาม "ราคาแค่ ${baht(FROM)} บาท…"`); errors++; }
    else {
      subStr(faqs[qi], 'q', `ราคาแค่ ${baht(FROM)} บาท`, `ราคาแค่ ${baht(TO)} บาท`, `faq[${qi}].q`);
      subStr(faqs[qi], 'a', `จ่าย ${baht(FROM)} จบทันที`, `จ่าย ${baht(TO)} จบทันที`, `faq[${qi}].a`);
    }
    const ci = faqs.findIndex((f) => (f.a || '').includes(`คุ้มแน่นอน ${baht(FROM)} บาท`) || (f.a || '').includes(`คุ้มแน่นอน ${baht(TO)} บาท`));
    if (ci < 0) { console.log(`  ❌ ไม่พบคำตอบ "คอร์สนี้คุ้มแน่นอน ${baht(FROM)} บาท…"`); errors++; }
    else {
      subStr(faqs[ci], 'a', `คุ้มแน่นอน ${baht(FROM)} บาท`, `คุ้มแน่นอน ${baht(TO)} บาท`, `faq[${ci}].a`);
      subStr(faqs[ci], 'a', `ตกเดือนละ ${perMonth(FROM)} บาท`, `ตกเดือนละ ${perMonth(TO)} บาท`, `faq[${ci}].a·ต่อเดือน`);
    }
  }

  console.log('\n=== 7) ปุ่มปิดการขาย (cta ท้ายหน้า + แถบลอย) ===');
  for (const s of byType('cta')) setStr(s.data, 'priceText', `฿${baht(FROM)}`, `฿${baht(TO)}`, 'cta ท้ายหน้า');
  if (newSp.boosters?.stickyCTA) setStr(newSp.boosters.stickyCTA, 'priceText', `฿${baht(FROM)}`, `฿${baht(TO)}`, `แถบลอย (enabled=${newSp.boosters.stickyCTA.enabled})`);

  console.log(`\n=== 8) ตรวจ "${baht(FROM)}" ที่ยังตกค้าง (ควรไม่เหลือเลย) ===`);
  const leftovers = [];
  const pat = new RegExp([FROM, baht(FROM), ...(FULL_FROM !== FULL_PRICE ? [FULL_FROM, baht(FULL_FROM)] : [])].join('|'));
  (function walk(o, p) {
    if (o == null) return;
    if (typeof o === 'string') { if (pat.test(o)) leftovers.push([p, o.length > 90 ? o.slice(0, 90) + '…' : o]); return; }
    if (typeof o === 'number') { if (o === FROM || (FULL_FROM !== FULL_PRICE && o === FULL_FROM)) leftovers.push([p, o]); return; }
    if (Array.isArray(o)) return o.forEach((v, i) => walk(v, `${p}[${i}]`));
    if (typeof o === 'object') for (const k of Object.keys(o)) walk(o[k], p ? `${p}.${k}` : k);
  })({ price: update.price ?? c.price, fullPrice: update.fullPrice ?? c.fullPrice, salesPage: newSp }, '');
  if (!leftovers.length) console.log(`  ✓  ไม่มี ${baht(FROM)} เหลือแล้ว`);
  for (const [p, v] of leftovers) console.log(`  ℹ️  ${p} : ${JSON.stringify(v)}`);

  update.salesPage = newSp;
  console.log(`\n=== สรุป: แก้ ${changes} จุด, เตือน/ผิดพลาด ${errors} จุด ===`);

  if (!COMMIT) { console.log('\n(dry run — รันซ้ำด้วย --commit เพื่อเขียนจริง)'); process.exit(0); }
  if (errors > 0) { console.log('⛔ มีจุดที่ค่าเดิมไม่ตรง — หยุดไว้ก่อน ไม่เขียน'); process.exit(1); }

  const backupPath = path.resolve(__dirname, `salespage-exambank-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ price: c.price, fullPrice: c.fullPrice, salesPage: sp }, null, 2));
  console.log(`📦 สำรองของเดิม → ${backupPath}`);

  await ref.update(update);
  console.log(`✅ เขียนแล้ว — ราคาเต็ม ${baht(FULL_PRICE)} / ราคาลด ${baht(TO)} ครบทุกจุดใน Firestore`);
  console.log('⚠️  อย่าลืมแก้ lib/constants.ts → EXAM_BANK_PRICE (full/sale) แล้ว push');
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
