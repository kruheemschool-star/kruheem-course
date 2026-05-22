/**
 * write-chapters.js
 * ----------------------------------------------------------
 * เขียน "รายชื่อตอนจริง" ลงในการ์ด hero ของหน้าขาย (salesPage)
 * เฉพาะคอร์สเดียว — ไม่กระทบคอร์สอื่นที่ใช้ template เดียวกัน
 *
 * ความปลอดภัย:
 *  - ดึงตอนจาก subcollection lessons จริง (single source of truth)
 *  - BACKUP salesPage เดิมเป็นไฟล์ JSON ก่อนเขียนทุกครั้ง
 *  - เขียนกลับเฉพาะ field "salesPage" (update) — ไม่แตะ price/title/lessons
 *  - ถ้าไม่พบ video / hero / salesPage จะยกเลิก ไม่เขียนอะไร
 *
 * วิธีใช้:  node write-chapters.js [courseId]
 * ----------------------------------------------------------
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const COURSE_ID = process.argv[2] || 'HiHvqQmFz9s41oxW8lne';

async function main() {
  const ref = db.collection('courses').doc(COURSE_ID);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('course not found: ' + COURSE_ID);
  const data = snap.data();

  // 1) build chapters from REAL lessons (video only, sorted by order, strip "[EPxx] ")
  const ls = await ref.collection('lessons').get();
  const chapters = ls.docs
    .map((d) => d.data())
    .filter((l) => l.type === 'video')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((l) => {
      const title = (l.title || '').replace(/^\[EP\d+\]\s*/, '').trim();
      return l.isFree ? { title, free: true } : { title };
    });
  console.log('📚 built chapters from lessons:', chapters.length);
  if (chapters.length === 0) throw new Error('no video lessons found — aborting (nothing written)');

  // 2) BACKUP current salesPage
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(__dirname, `backup-salesPage-${ts}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(data.salesPage ?? null, null, 2), 'utf-8');
  console.log('💾 backup saved:', backupPath);

  // 3) modify hero.data.chapters in memory
  const salesPage = data.salesPage;
  if (!salesPage || !Array.isArray(salesPage.sections)) {
    throw new Error('this course has no salesPage.sections — aborting');
  }
  const hero = salesPage.sections.find((s) => s.type === 'hero');
  if (!hero) throw new Error('no hero section in salesPage — aborting');
  hero.data = hero.data || {};
  const before = Array.isArray(hero.data.chapters) ? hero.data.chapters.length : 0;
  hero.data.chapters = chapters;
  if (hero.data.chaptersTitle) {
    console.log('ℹ️  existing chaptersTitle (left as-is):', hero.data.chaptersTitle);
  }
  console.log(`🔧 hero.data.chapters: ${before} -> ${chapters.length}`);

  // 4) write back ONLY the salesPage field (+ updatedAt)
  await ref.update({
    salesPage,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('✅ updated salesPage.hero.data.chapters for', COURSE_ID);
  console.log('   (backup kept at:', path.basename(backupPath) + ')');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('💥', e.message);
    process.exit(1);
  });
