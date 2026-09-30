const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const sa = require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const SP = '/private/tmp/claude-501/-Users-kruheem-Documents-webapp-kruheem-course/b59d8f78-60cd-429f-bbeb-1a72c43bf856/scratchpad';

const articles = [
  { id: 'lO9SoJhnXlpDatDREzhd', slug: 'stop-forcing-kids-to-read', newFile: `${SP}/khb3-a1-work.html`, title: 'เลิกพูดว่า "ไปอ่านหนังสือเดี๋ยวนี้!" ถ้าอยากให้ลูกขยันแบบไม่ต้องสั่ง' },
  { id: 'kY9JX20z18cPawRYO6bJ', slug: 'math-basic', newFile: `${SP}/khb3-a2-work.html`, title: 'พื้นฐานไม่แน่น แต่โดนบังคับให้วิ่ง?   วิธีแก้ปมคณิตศาสตร์แบบไม่ต้องเริ่มใหม่หมด' },
  { id: 'SmKuoOjpALCxtMHR0K6h', slug: 'time-boxing', newFile: `${SP}/khb3-a3-work.html`, title: 'เหลือเวลาแค่นี้ จะอ่านทันไหม? วิธีจัดตารางติวโค้งสุดท้ายให้คะแนนพุ่งปรี๊ด' },
];

(async () => {
  for (const art of articles) {
    const doc = await db.collection('posts').doc(art.id).get();
    const data = doc.data();
    const expected = fs.readFileSync(art.newFile, 'utf8');
    const contentMatches = data.content === expected;
    console.log(`--- ${art.slug} (${art.id}) ---`);
    console.log(`  content matches intended new HTML: ${contentMatches}`);
    console.log(`  title unchanged: ${data.title === art.title} ("${data.title}")`);
    console.log(`  slug unchanged: ${data.slug === art.slug} ("${data.slug}")`);
    console.log(`  updatedAt: ${data.updatedAt ? data.updatedAt.toDate().toISOString() : 'MISSING'}`);
    console.log(`  status: ${data.status}, views: ${data.views}`);
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
