/** list-all-courses.js — READ ONLY. id + title + price + lessons + salesPage state. */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
(async () => {
  const snap = await db.collection('courses').get();
  console.log('total courses:', snap.size, '\n');
  for (const d of snap.docs) {
    const c = d.data();
    const sp = c.salesPage;
    const lessons = await d.ref.collection('lessons').count().get().then(r => r.data().count).catch(() => '?');
    console.log(`${d.id}  | ${c.title}`);
    console.log(`   price:${c.price} full:${c.fullPrice ?? '-'} cat:${c.category ?? '-'} lessons:${lessons} salesPage:${sp ? (sp.enabled ? 'ENABLED' : 'off') + ' ' + (sp.sections?.length ?? 0) + 's' : 'none'} theme:${sp?.theme?.id ?? '-'}`);
  }
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
