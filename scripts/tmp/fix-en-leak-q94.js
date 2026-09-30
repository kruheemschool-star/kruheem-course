/** ลบข้อความภาษาอังกฤษที่หลุดมาจากคำสั่งสร้างรูป ในโจทย์ข้อ 94 ชุดแบบฝึกหัดสอบเข้า ม.1 ชุดที่ 7 */
const path = require('path');
const admin = require('firebase-admin');
const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const APPLY = process.argv.includes('--apply');
const EXAM = 'x7gseHZqPh0KMXaSyEni';

(async () => {
  const ref = db.collection('exams').doc(EXAM);
  const snap = await ref.get();
  const cur = snap.data();
  const qs = [...(cur.questions || [])];
  let hit = 0;
  const next = qs.map((q) => {
    const before = String(q.question || '');
    // ตัดเฉพาะวงเล็บเหลี่ยมต้นโจทย์ที่มี "ตัวอักษรอังกฤษ" อยู่ข้างใน (คำสั่งสร้างรูปที่หลุดมา)
    // ไม่แตะช่องว่างหรือส่วนอื่นของโจทย์ เพื่อให้แก้เฉพาะข้อที่เสียจริง
    const after = /^\[[\x20-\x7E]*[A-Za-z][\x20-\x7E]*\]/.test(before)
        ? before.replace(/^\[[\x20-\x7E]*\]\s*/, '')
        : before;
    if (after !== before) { hit++; console.log('  ก่อน:', before.slice(0, 90)); console.log('  หลัง:', after.slice(0, 90)); }
    return after === before ? q : { ...q, question: after };
  });
  console.log(`พบ ${hit} ข้อที่มีอังกฤษหลุด`);
  if (!hit) { console.log('ไม่มีอะไรต้องแก้'); process.exit(0); }
  if (!APPLY) { console.log('\n(dry-run) สั่ง --apply เพื่อเขียนจริง'); process.exit(0); }
  await ref.update({ questions: next });
  console.log('✅ เขียนแล้ว · ขั้นต่อไป node scripts/bust-caches.js exams');
  process.exit(0);
})();
