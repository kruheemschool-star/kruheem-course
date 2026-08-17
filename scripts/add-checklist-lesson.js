/**
 * add-checklist-lesson.js — เพิ่ม/อัปเดตบทเรียน "หน้าดาวน์โหลดเช็คลิสต์" ในคอร์ส
 *
 *   node scripts/add-checklist-lesson.js <key>           (dry-run ดูก่อน)
 *   node scripts/add-checklist-lesson.js <key> --apply   (เขียนจริง — LIVE ทันที)
 *
 * type 'html' + content ว่าง → หน้า learn มองเป็น "เอกสารแจก" ขึ้นการ์ดเขียวในไซด์บาร์
 * (ถ้า content เป็น JSON จะกลายเป็นชุดข้อสอบ) และไม่ถูกนับใน % ความคืบหน้า
 * order ต้องมาก่อนชุดตะลุยโจทย์ชุดแรกของคอร์สนั้น
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const TARGETS = {
  gifted: {
    courseId: 'HiHvqQmFz9s41oxW8lne',
    title: '🖨️ เช็คลิสต์พิชิต 40 แนวข้อสอบ',
    match: 'เช็คลิสต์พิชิต 40 แนวข้อสอบ',
    html: 'gifted-checklist-lesson.html',
    order: 39.5,
  },
  p6: {
    courseId: 'lBj1ZUlnBiU8vv3lm94y',
    title: '🖨️ เช็คลิสต์พิชิต 16 บท สอบเข้า ม.1',
    match: 'เช็คลิสต์พิชิต 16 บท',
    html: 'p6-checklist-lesson.html',
    order: 266.5,
  },
  equation: {
    courseId: 'z41lCWEynOVjHhaoeT9B',
    title: '🖨️ เช็คลิสต์พิชิต 19 เลเวลสมการ',
    match: 'เช็คลิสต์พิชิต 19 เลเวล',
    html: 'equation-checklist-lesson.html',
    order: 0.5,
  },
  banyat: {
    courseId: 'xELVM7Nbeua9jm0NjJK7',
    title: '🖨️ เช็คลิสต์พิชิตบัญญัติไตรยางค์',
    match: 'เช็คลิสต์พิชิตบัญญัติไตรยางค์',
    html: 'banyat-checklist-lesson.html',
    order: 2.5,
  },
  m1t1: {
    courseId: 'fhoc1u2JT8WghFHapzx8',
    title: '🖨️ เช็คลิสต์พิชิตคณิต ม.1 เทอม 1',
    match: 'เช็คลิสต์พิชิตคณิต ม.1 เทอม 1',
    html: 'generated/m1t1-checklist-lesson.html',
    order: -0.5,
  },
  m1t2: {
    courseId: 'fu5mtwI48TrhJwXtMev4',
    title: '🖨️ เช็คลิสต์พิชิตคณิต ม.1 เทอม 2',
    match: 'เช็คลิสต์พิชิตคณิต ม.1 เทอม 2',
    html: 'generated/m1t2-checklist-lesson.html',
    order: 0.5,
  },
  m2t1: {
    courseId: 'dEdh5HfBU7zCSdJsdGK5',
    title: '🖨️ เช็คลิสต์พิชิตคณิต ม.2 เทอม 1',
    match: 'เช็คลิสต์พิชิตคณิต ม.2 เทอม 1',
    html: 'generated/m2t1-checklist-lesson.html',
    order: -0.5,
  },
  m3t1: {
    courseId: 'XCHje0hKhhGD2jd5RMnz',
    title: '🖨️ เช็คลิสต์พิชิตคณิต ม.3 เทอม 1',
    match: 'เช็คลิสต์พิชิตคณิต ม.3 เทอม 1',
    html: 'generated/m3t1-checklist-lesson.html',
    order: 0.5,
  },
  m4t1: {
    courseId: 'RPEJPtOJg3sSL7P2AyPi',
    title: '🖨️ เช็คลิสต์พิชิตคณิต ม.4 เทอม 1',
    match: 'เช็คลิสต์พิชิตคณิต ม.4 เทอม 1',
    html: 'generated/m4t1-checklist-lesson.html',
    order: 0.5,
  },
  m4t2: {
    courseId: 'ZhpY3GMWh3SOua5yAVnu',
    title: '🖨️ เช็คลิสต์พิชิตคณิต ม.4 เทอม 2',
    match: 'เช็คลิสต์พิชิตคณิต ม.4 เทอม 2',
    html: 'generated/m4t2-checklist-lesson.html',
    order: 0.5,
  },
  m5t1: {
    courseId: 'nQIVvwyuJkrwK0pYQJKB',
    title: '🖨️ เช็คลิสต์พิชิตคณิต ม.5 เทอม 1',
    match: 'เช็คลิสต์พิชิตคณิต ม.5 เทอม 1',
    html: 'generated/m5t1-checklist-lesson.html',
    order: 0.5,
  },
  m5t2: {
    courseId: 'IFAiTpvLzOFEm7aIn3A5',
    title: '🖨️ เช็คลิสต์พิชิตคณิต ม.5 เทอม 2',
    match: 'เช็คลิสต์พิชิตคณิต ม.5 เทอม 2',
    html: 'generated/m5t2-checklist-lesson.html',
    order: 0.5,
  },
};

const key = process.argv[2];
if (!TARGETS[key]) {
  console.error('ใช้: node scripts/add-checklist-lesson.js <' + Object.keys(TARGETS).join('|') + '> [--apply]');
  process.exit(1);
}
const T = TARGETS[key];
const APPLY = process.argv.includes('--apply');

const serviceAccount = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const tryParseQuestions = (raw) => {
  const s = (raw || '').trim();
  if (!s.startsWith('[')) return null;
  try { const p = JSON.parse(s); return Array.isArray(p) ? p : null; } catch { return null; }
};

(async () => {
  const htmlCode = fs.readFileSync(path.join(__dirname, T.html), 'utf8');
  console.log(`คอร์ส: ${T.courseId} | htmlCode: ${(htmlCode.length / 1024).toFixed(1)} KB`);
  if (htmlCode.trim().startsWith('[') || htmlCode.trim().startsWith('{')) {
    throw new Error('htmlCode เผลอเป็น JSON — จะโดนตีความเป็นชุดข้อสอบ');
  }

  const lessonsCol = db.collection('courses').doc(T.courseId).collection('lessons');
  const existing = await lessonsCol.get();

  // กันซ้ำด้วย title — ถ้ามีอยู่แล้วจะอัปเดต htmlCode แทนการเพิ่มซ้ำ
  const dup = existing.docs.find((d) => (d.data().title || '').includes(T.match));
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

  const clash = existing.docs.filter((d) => d.data().order === T.order);
  if (clash.length) {
    throw new Error(`มีบทที่ order ${T.order} อยู่แล้ว (${clash.map((c) => c.data().title).join(', ')})`);
  }

  // ต้องมาก่อนชุดตะลุยโจทย์ชุดแรก ไม่งั้นจะไปโผล่กลางรายการข้อสอบ
  const examOrders = existing.docs
    .filter((d) => d.data().type === 'html' && tryParseQuestions(d.data().content))
    .map((d) => d.data().order ?? Infinity);
  if (examOrders.length && T.order > Math.min(...examOrders)) {
    throw new Error(`order ${T.order} มาหลังชุดข้อสอบชุดแรก (${Math.min(...examOrders)}) — ต้องมาก่อน`);
  }

  const payload = {
    title: T.title,
    type: 'html',
    headerId: '',
    htmlCode,
    content: '',
    order: T.order,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  console.log('จะเพิ่ม lesson:', { ...payload, htmlCode: `(${(htmlCode.length / 1024).toFixed(1)} KB)`, createdAt: '(serverTimestamp)' });
  if (!APPLY) {
    console.log('\nDRY-RUN — ยังไม่เขียนจริง (เติม --apply เพื่อเขียน)');
    process.exit(0);
  }
  const ref = await lessonsCol.add(payload);
  console.log(`\n✅ เพิ่มแล้ว: ${ref.id} — เปิดดูได้ทันทีที่ /learn/${T.courseId} (การ์ดเอกสารแจกในไซด์บาร์)`);
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
