/** list-m1t1-lessons.js — READ ONLY. Chapter structure of ม.1 เทอม 1. */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const COURSE_ID = 'fhoc1u2JT8WghFHapzx8';
(async () => {
  const ref = db.collection('courses').doc(COURSE_ID);
  const c = (await ref.get()).data();
  console.log('title:', c.title, '| price:', c.price, '| full:', c.fullPrice, '| videoId:', c.videoId || '-');
  const ls = await ref.collection('lessons').get();
  const lessons = ls.docs.map(d => ({ id: d.id, ...d.data() }));
  lessons.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  console.log('lessons:', lessons.length, '\n');
  // group under headers
  let cur = null; const groups = [];
  for (const L of lessons) {
    if (L.type === 'header') { cur = { title: L.title, videos: 0, free: 0, firstEp: null }; groups.push(cur); }
    else if (L.type === 'video') {
      if (!cur) { cur = { title: '(no header)', videos: 0, free: 0, firstEp: null }; groups.push(cur); }
      cur.videos++; if (L.isFree) cur.free++;
      if (!cur.firstEp) cur.firstEp = L.title;
    }
  }
  console.log('=== chapters (headers) ===');
  groups.forEach((g, i) => console.log(`${i + 1}. ${g.title}  · ${g.videos} คลิป · free:${g.free}\n     first: ${g.firstEp}`));
  console.log('\n=== first 12 lessons raw ===');
  lessons.slice(0, 12).forEach(L => console.log(`[${L.order}] (${L.type}) ${L.title} ${L.isFree ? '🆓' : ''}`));
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
