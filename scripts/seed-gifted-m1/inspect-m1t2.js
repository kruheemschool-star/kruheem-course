/** inspect-m1t2.js — READ ONLY. ม.1 เทอม 2: basics + lesson titles + backup salesPage. */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const COURSE_ID = 'fu5mtwI48TrhJwXtMev4';
(async () => {
  const ref = db.collection('courses').doc(COURSE_ID);
  const c = (await ref.get()).data();
  console.log('title:', c.title, '| price:', c.price, '| full:', c.fullPrice, '| videoId:', c.videoId || '-');
  // backup current (placeholder) salesPage
  const file = path.resolve(__dirname, `m1t2-salespage-backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(c.salesPage || null, null, 2));
  console.log('backup →', path.basename(file), '| sections:', c.salesPage?.sections?.length, '| theme:', c.salesPage?.theme?.id);
  // lessons
  const ls = await ref.collection('lessons').get();
  const lessons = ls.docs.map(d => d.data()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  console.log('lessons:', lessons.length, '\n');
  lessons.forEach(L => console.log(`[${String(L.order).padStart(3,' ')}] (${L.type}) ${L.title}${L.isFree ? ' 🆓' : ''}`));
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
