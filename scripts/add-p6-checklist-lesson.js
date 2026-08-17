/**
 * add-p6-checklist-lesson.js — เพิ่ม/อัปเดตบทเรียน "🖨️ เช็คลิสต์พิชิต 16 บท สอบเข้า ม.1"
 * (หน้าดาวน์โหลด PDF เช็คลิสต์ A4) ในคอร์ส ป.6 สอบเข้าชั้น ม.1
 *
 * ตำแหน่ง: order 266.5 = ก่อนชุดตะลุยโจทย์ชุดแรก (order 267) → ขึ้นเป็นการ์ด
 * "เอกสารแจก" ในไซด์บาร์ เห็นตั้งแต่เปิดคอร์ส
 * type 'html' + content ว่าง → ระบบมองเป็นหน้าเอกสาร ไม่ใช่ชุดข้อสอบ
 * และไม่ถูกนับใน % ความคืบหน้า (เด็กที่จบ 100% แถบไม่ร่วง ใบประกาศไม่หลุด)
 *
 *   node scripts/add-p6-checklist-lesson.js           (dry-run ดูก่อน)
 *   node scripts/add-p6-checklist-lesson.js --apply   (เขียนจริง — LIVE ทันที)
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const COURSE_ID = 'lBj1ZUlnBiU8vv3lm94y';
const TITLE = '🖨️ เช็คลิสต์พิชิต 16 บท สอบเข้า ม.1';
const MATCH = 'เช็คลิสต์พิชิต 16 บท';
const HTML_PATH = path.join(__dirname, 'p6-checklist-lesson.html');
const ORDER = 266.5;
const APPLY = process.argv.includes('--apply');

(async () => {
  const htmlCode = fs.readFileSync(HTML_PATH, 'utf8');
  console.log(`htmlCode: ${(htmlCode.length / 1024).toFixed(1)} KB`);
  if (htmlCode.trim().startsWith('[') || htmlCode.trim().startsWith('{')) {
    throw new Error('htmlCode เผลอเป็น JSON — จะโดนตีความเป็นชุดข้อสอบ');
  }

  const lessonsCol = db.collection('courses').doc(COURSE_ID).collection('lessons');
  const existing = await lessonsCol.get();

  // กันซ้ำด้วย title — ถ้ามีอยู่แล้วจะอัปเดต htmlCode แทนการเพิ่มซ้ำ
  const dup = existing.docs.find((d) => (d.data().title || '').includes(MATCH));
  if (dup) {
    console.log(`มีอยู่แล้ว: ${dup.id} — "${dup.data().title}"`);
    if (APPLY) {
      await dup.ref.update({ htmlCode, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      console.log('→ อัปเดต htmlCode ของบทเดิมแล้ว');
    } else {
      console.log('DRY-RUN — ถ้ารัน --apply จะอัปเดต htmlCode ของบทเดิม');
    }
    process.exit(0);
  }

  // กันชน order กับบทอื่น (ต้องมาก่อนชุดตะลุยโจทย์ชุดแรกเท่านั้น)
  const clash = existing.docs.filter((d) => d.data().order === ORDER);
  if (clash.length) {
    throw new Error(`มีบทที่ order ${ORDER} อยู่แล้ว (${clash.map((c) => c.data().title).join(', ')})`);
  }

  const payload = {
    title: TITLE,
    type: 'html',
    headerId: '',
    htmlCode,
    content: '',
    order: ORDER,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  console.log('จะเพิ่ม lesson:', { ...payload, htmlCode: `(${(htmlCode.length / 1024).toFixed(1)} KB)`, createdAt: '(serverTimestamp)' });
  if (!APPLY) {
    console.log('\nDRY-RUN — ยังไม่เขียนจริง (เติม --apply เพื่อเขียน)');
    process.exit(0);
  }
  const ref = await lessonsCol.add(payload);
  console.log(`\n✅ เพิ่มแล้ว: ${ref.id} — เปิดดูได้ทันทีที่ /learn/${COURSE_ID} (การ์ดเอกสารแจกในไซด์บาร์)`);
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
