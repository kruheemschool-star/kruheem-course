/**
 * add-gifted-checklist-lesson.js — เพิ่มบทเรียน "🖨️ เช็คลิสต์พิชิต 40 แนวข้อสอบ"
 * (หน้าดาวน์โหลด PDF เช็คลิสต์ A4) เข้าคอร์สติวเข้ม Gifted ม.1
 *
 * ตำแหน่ง: order 39.5 = แถวแรกของการ์ด "ตะลุยโจทย์" (ก่อนแนวข้อสอบชุดที่ 1)
 * type 'html' → ไม่ถูกนับใน % ความคืบหน้า (เด็กที่จบ 100% แถบไม่ร่วง ใบประกาศไม่หลุด)
 * ไฟล์ PDF + รูปตัวอย่างอัปโหลดขึ้น Storage แล้ว (course-docs/HiHvqQmFz9s41oxW8lne/)
 *
 *   node scripts/add-gifted-checklist-lesson.js           (dry-run ดูก่อน)
 *   node scripts/add-gifted-checklist-lesson.js --apply   (เขียนจริง — LIVE ทันที)
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const COURSE_ID = 'HiHvqQmFz9s41oxW8lne';
const TITLE = '🖨️ เช็คลิสต์พิชิต 40 แนวข้อสอบ';
const HTML_PATH = path.join(__dirname, 'gifted-checklist-lesson.html');
const APPLY = process.argv.includes('--apply');

(async () => {
  const htmlCode = fs.readFileSync(HTML_PATH, 'utf8');
  console.log(`htmlCode: ${(htmlCode.length / 1024).toFixed(1)} KB`);
  if (htmlCode.trim().startsWith('[') || htmlCode.trim().startsWith('{')) {
    throw new Error('htmlCode เผลอเป็น JSON — จะโดนตีความเป็นชุดข้อสอบ');
  }

  const lessonsCol = db.collection('courses').doc(COURSE_ID).collection('lessons');

  // กันซ้ำด้วย title — ถ้ามีอยู่แล้วจะอัปเดต htmlCode แทนการเพิ่มซ้ำ
  const existing = await lessonsCol.get();
  const dup = existing.docs.find((d) => (d.data().title || '').includes('เช็คลิสต์พิชิต 40 แนวข้อสอบ'));
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

  const payload = {
    title: TITLE,
    type: 'html',
    headerId: '',
    htmlCode,
    content: '',
    order: 39.5,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  console.log('จะเพิ่ม lesson:', { ...payload, htmlCode: `(${(htmlCode.length / 1024).toFixed(1)} KB)`, createdAt: '(serverTimestamp)' });
  if (!APPLY) {
    console.log('\nDRY-RUN — ยังไม่เขียนจริง (เติม --apply เพื่อเขียน)');
    process.exit(0);
  }
  const ref = await lessonsCol.add(payload);
  console.log(`\n✅ เพิ่มแล้ว: ${ref.id} — เปิดดูได้ทันทีที่ /learn/${COURSE_ID} (การ์ดตะลุยโจทย์ แถวแรก)`);
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
