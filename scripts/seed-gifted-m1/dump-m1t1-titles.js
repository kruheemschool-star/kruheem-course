/** dump-m1t1-titles.js — READ ONLY. Every video title in order. */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
(async () => {
  const ls = await db.collection('courses').doc('fhoc1u2JT8WghFHapzx8').collection('lessons').get();
  const lessons = ls.docs.map(d => d.data()).filter(L => L.type === 'video');
  lessons.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  lessons.forEach(L => console.log(`${L.title}${L.isFree ? ' 🆓' : ''}`));
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
