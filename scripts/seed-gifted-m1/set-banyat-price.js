/**
 * set-banyat-price.js
 * ----------------------------------------------------------
 * ปรับราคาคอร์ส "การเทียบบัญญัติไตรยางค์" (courses/xELVM7Nbeua9jm0NjJK7)
 * ให้ครบทุกจุด: ฟิลด์ระดับบนสุด (price/fullPrice) + ราคาที่ฝังใน salesPage
 *
 *   ราคาใหม่ : 1500 (fullPrice 2000)
 *
 *   node set-banyat-price.js            # dry run — โชว์ก่อน/หลัง ไม่เขียน
 *   node set-banyat-price.js --commit   # เขียนจริง (สำรอง salesPage เดิมก่อน)
 * ----------------------------------------------------------
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const COMMIT = process.argv.includes('--commit');
const COURSE_ID = 'xELVM7Nbeua9jm0NjJK7';

const NEW_PRICE = 1500;
const NEW_FULL = 2000;
const PRICE_TXT = '฿1,500';
// วันละ ... บาท = ราคา / 365 (ปัดทศนิยม 2 ตำแหน่ง) เดิมใช้ "วันละ 0.32 บาท" ที่ 118฿? ใช้ราคา/365
const perDay = (NEW_PRICE / 365).toFixed(2);
const PRICE_TXT_PERDAY = `${PRICE_TXT} (วันละ ${perDay} บาท)`;

const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function fmtBaht(n) {
  return '฿' + Number(n).toLocaleString('en-US');
}

(async () => {
  console.log(COMMIT ? '🟢 COMMIT MODE — จะเขียนจริง\n' : '🔍 DRY RUN — ไม่เขียน\n');

  const ref = db.collection('courses').doc(COURSE_ID);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`Course ${COURSE_ID} not found`);
  const course = snap.data();

  console.log(`คอร์ส: ${course.title || '(none)'}  [${COURSE_ID}]`);
  console.log(`\n=== ฟิลด์ราคาระดับบนสุด (course card / payment / CTA) ===`);
  console.log(`  price     : ${course.price}  →  ${NEW_PRICE}`);
  console.log(`  fullPrice : ${course.fullPrice}  →  ${NEW_FULL}`);

  const sp = course.salesPage;
  const update = { price: NEW_PRICE, fullPrice: NEW_FULL };

  if (sp && Array.isArray(sp.sections)) {
    console.log(`\n=== ราคาที่ฝังใน salesPage (${sp.sections.length} sections, enabled=${sp.enabled}) ===`);
    // clone salesPage เพื่อแก้
    const newSp = JSON.parse(JSON.stringify(sp));

    for (const s of newSp.sections) {
      const d = s.data || {};
      const tag = `[${String(s.order).padStart(2)}] ${s.type}`;

      // Hero: ctaPriceText / regularPriceText
      if (d.ctaPriceText !== undefined) {
        console.log(`  ${tag} .ctaPriceText : "${d.ctaPriceText}"  →  "${PRICE_TXT}"`);
        d.ctaPriceText = PRICE_TXT;
      }
      if (d.regularPriceText !== undefined) {
        console.log(`  ${tag} .regularPriceText : "${d.regularPriceText}"  →  "${fmtBaht(NEW_FULL)}"`);
        d.regularPriceText = fmtBaht(NEW_FULL);
      }
      // PriceStack: regularPrice / finalPrice (ตัวเลขล้วน)
      if (d.regularPrice !== undefined) {
        console.log(`  ${tag} .regularPrice : ${d.regularPrice}  →  ${NEW_FULL}`);
        d.regularPrice = NEW_FULL;
      }
      if (d.finalPrice !== undefined) {
        console.log(`  ${tag} .finalPrice : ${d.finalPrice}  →  ${NEW_PRICE}`);
        d.finalPrice = NEW_PRICE;
      }
      // FinalCTA-ish: priceText (อาจมี "วันละ")
      if (d.priceText !== undefined) {
        const next = /วันละ/.test(d.priceText) ? PRICE_TXT_PERDAY : PRICE_TXT;
        console.log(`  ${tag} .priceText : "${d.priceText}"  →  "${next}"`);
        d.priceText = next;
      }
      // เผื่อมีฟิลด์ราคาอื่น ๆ ที่เป็นตัวเลข 590/700
      if (d.price !== undefined && (d.price === course.price || d.price === course.fullPrice)) {
        const next = d.price === course.fullPrice ? NEW_FULL : NEW_PRICE;
        console.log(`  ${tag} .price : ${d.price}  →  ${next}`);
        d.price = next;
      }
      s.data = d;
    }

    // boosters.stickyCTA.priceText
    if (newSp.boosters && newSp.boosters.stickyCTA && newSp.boosters.stickyCTA.priceText !== undefined) {
      const cur = newSp.boosters.stickyCTA.priceText;
      const next = /วันละ/.test(cur) ? PRICE_TXT_PERDAY : PRICE_TXT;
      console.log(`  [boosters.stickyCTA] .priceText : "${cur}"  →  "${next}"`);
      newSp.boosters.stickyCTA.priceText = next;
    }

    update.salesPage = newSp;
  } else {
    console.log(`\n(ไม่มี salesPage หรือไม่มี sections — ข้ามส่วนเซลล์เพจ)`);
  }

  if (!COMMIT) {
    console.log('\n(dry run — รันซ้ำด้วย --commit เพื่อเขียนจริง)');
    process.exit(0);
  }

  // สำรอง salesPage เดิม
  if (sp) {
    const backupPath = path.resolve(__dirname, `salespage-backup-${COURSE_ID}-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(sp, null, 2));
    console.log(`\n📦 สำรอง salesPage เดิม → ${backupPath}`);
  }

  await ref.update(update);
  console.log(`\n✅ เขียนราคาใหม่แล้ว (price=${NEW_PRICE}, fullPrice=${NEW_FULL}) ครบทุกจุด`);
  process.exit(0);
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
