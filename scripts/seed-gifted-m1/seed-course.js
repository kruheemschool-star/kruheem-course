/**
 * seed-course.js
 * ----------------------------------------------------------
 * ยิงข้อมูลคอร์ส + salesPage จากไฟล์ JSON เข้า Firestore
 *
 * วิธีใช้ (สั้น):
 *   1. npm install firebase-admin
 *   2. วาง serviceAccountKey.json ไว้ในโฟลเดอร์เดียวกัน
 *   3. แก้ DOC_ID ด้านล่างถ้าต้องการ (default = "gifted-m1")
 *   4. node seed-course.js
 *
 * ดู README.md สำหรับวิธีตั้งค่าแบบละเอียด
 * ----------------------------------------------------------
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ============ ตั้งค่าตรงนี้ ============
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';
const JSON_FILE = './course-gifted-m1.json';
const COLLECTION = 'courses';
const DOC_ID = 'gifted-m1';      // ใช้เป็น document id ใน Firestore
const DRY_RUN = false;            // true = แสดงข้อมูลเฉยๆ ไม่ยิงเข้า DB
// =====================================

function log(emoji, msg) {
  console.log(`${emoji}  ${msg}`);
}

async function main() {
  // 1. ตรวจไฟล์
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    log('❌', `ไม่พบ ${SERVICE_ACCOUNT_PATH}`);
    log('💡', 'ดูวิธีดาวน์โหลด service account ใน README.md ข้อ 2');
    process.exit(1);
  }
  if (!fs.existsSync(JSON_FILE)) {
    log('❌', `ไม่พบ ${JSON_FILE}`);
    process.exit(1);
  }

  // 2. โหลด JSON
  const raw = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
  const { course, salesPage } = raw;

  if (!course || !salesPage) {
    log('❌', 'JSON ต้องมีทั้ง field "course" และ "salesPage"');
    process.exit(1);
  }

  // 3. รวมเป็น document เดียวตาม schema
  const docData = {
    ...course,
    salesPage,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // 4. แสดงสรุปก่อนยิง
  log('📋', `Course: ${course.title}`);
  log('💰', `Price: ฿${course.price.toLocaleString()} (full ฿${course.fullPrice.toLocaleString()})`);
  log('📦', `Sections: ${salesPage.sections.length} | Boosters: ${Object.keys(salesPage.boosters).length}`);
  log('🎯', `Target: ${COLLECTION}/${DOC_ID}`);
  log('🚦', `salesPage.enabled = ${salesPage.enabled} (false = ยังไม่แสดงผลในหน้าเว็บ)`);

  if (DRY_RUN) {
    log('🧪', 'DRY_RUN = true — ไม่ยิงเข้า DB');
    log('✅', 'JSON valid พร้อมยิงเมื่อปรับ DRY_RUN = false');
    return;
  }

  // 5. init Firebase Admin
  const serviceAccount = require(path.resolve(SERVICE_ACCOUNT_PATH));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  // 6. เช็คว่ามี doc อยู่แล้วไหม
  const docRef = db.collection(COLLECTION).doc(DOC_ID);
  const existing = await docRef.get();

  if (existing.exists) {
    log('⚠️ ', `document "${DOC_ID}" มีอยู่แล้ว — จะเขียนทับ`);
    log('💡', 'ถ้าไม่ต้องการเขียนทับ กด Ctrl+C ใน 5 วินาที...');
    await new Promise(r => setTimeout(r, 5000));
  } else {
    // ถ้าเป็น doc ใหม่ ใส่ createdAt
    docData.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }

  // 7. ยิง
  await docRef.set(docData, { merge: false });

  log('✅', `Seed สำเร็จ! เปิด Firestore console เช็คได้ที่ ${COLLECTION}/${DOC_ID}`);
  log('📝', 'ขั้นต่อไป: เข้าหลังบ้าน → ตรวจรายละเอียด → กด enable เปิดขาย');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    log('💥', 'Error: ' + err.message);
    console.error(err);
    process.exit(1);
  });
