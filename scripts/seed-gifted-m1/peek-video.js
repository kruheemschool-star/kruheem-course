/** peek-video.js (READ-ONLY, temp) — ดู videoId ของ EP01 + course.videoId */
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const COURSE_ID = process.argv[2] || 'HiHvqQmFz9s41oxW8lne';

async function main() {
  const c = await db.collection('courses').doc(COURSE_ID).get();
  const cd = c.data() || {};
  console.log('course.videoId:', JSON.stringify(cd.videoId));
  console.log('course.image  :', JSON.stringify(cd.image));

  const ls = await db.collection('courses').doc(COURSE_ID).collection('lessons').get();
  const vids = ls.docs
    .map((d) => d.data())
    .filter((l) => l.type === 'video')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const ep1 = vids[0] || {};
  console.log('\nEP01 title :', ep1.title);
  console.log('EP01 videoId:', JSON.stringify(ep1.videoId));
  console.log('EP01 isFree :', ep1.isFree);
  console.log('EP01 fields :', Object.keys(ep1).join(', '));
  console.log('\nfree lessons w/ videoId:');
  vids.filter((v) => v.isFree).forEach((v) => console.log('  -', v.title, '=>', JSON.stringify(v.videoId)));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
