/**
 * update-cta.js
 * ----------------------------------------------------------
 * ปรับ "เนื้อหา" ของ CTA section ให้ตรงกับดีไซน์ Apple-style ใหม่
 *   - urgencyText : eyebrow ด้านบน (เอา 🔥 + ราคาออก ให้เป็น tag สะอาดๆ)
 *   - ctaText     : ปุ่มหลัก ให้สั้นลง "สมัครเลย"
 *   - priceText   : ตัด "ประหยัด 800 บาท" ออก (ราคาขีดฆ่าบอกอยู่แล้ว)
 *
 * สำรองข้อมูล salesPage เดิมไว้เป็นไฟล์ก่อนเขียนทับเสมอ
 * รันจากในโฟลเดอร์ scripts/seed-gifted-m1/ :  node update-cta.js
 * ----------------------------------------------------------
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const sa = require(path.resolve('./serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const TARGET_DOC = 'HiHvqQmFz9s41oxW8lne'; // คอร์ส Gifted ตัวจริงที่เว็บใช้

const NEW_CTA = {
  urgencyText: 'ใหม่ · หลักสูตรเตรียม Gifted 2026',
  ctaText: 'สมัครเลย',
  priceText: 'ใช้ได้ 5 ปี',
};

(async () => {
  const docRef = db.collection('courses').doc(TARGET_DOC);
  const snap = await docRef.get();
  if (!snap.exists) {
    console.log('❌ ไม่พบ document', TARGET_DOC);
    process.exit(1);
  }

  const data = snap.data();
  const sections = data.salesPage?.sections || [];

  const ctaIdx = sections.findIndex((s) => s.type === 'cta');
  if (ctaIdx === -1) {
    console.log('❌ ไม่พบ CTA section');
    process.exit(1);
  }

  // 1) สำรอง salesPage เดิม
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `backup-salesPage-${stamp}.json`;
  fs.writeFileSync(backupFile, JSON.stringify(data.salesPage, null, 2), 'utf-8');
  console.log('💾 สำรองข้อมูลเดิมไว้ที่', backupFile);

  // 2) แสดงค่าเดิม
  const before = sections[ctaIdx].data;
  console.log('\n📋 CTA เดิม:');
  console.log('   urgencyText:', JSON.stringify(before.urgencyText));
  console.log('   ctaText    :', JSON.stringify(before.ctaText));
  console.log('   priceText  :', JSON.stringify(before.priceText));

  // 3) อัปเดตเฉพาะ 3 ฟิลด์ (คงฟิลด์อื่น เช่น title/subtitle ไว้)
  const newSections = [...sections];
  newSections[ctaIdx] = {
    ...newSections[ctaIdx],
    data: { ...before, ...NEW_CTA },
  };

  await docRef.update({
    'salesPage.sections': newSections,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('\n✅ อัปเดต CTA สำเร็จ!');
  console.log('   urgencyText:', JSON.stringify(NEW_CTA.urgencyText));
  console.log('   ctaText    :', JSON.stringify(NEW_CTA.ctaText));
  console.log('   priceText  :', JSON.stringify(NEW_CTA.priceText));
  process.exit(0);
})().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
