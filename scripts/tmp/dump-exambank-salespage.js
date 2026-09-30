const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const COURSE_ID = '26UeeaBMMFswM3RH5aI1';
const OUT = '/private/tmp/claude-501/-Users-kruheem-Documents-webapp-kruheem-course/ddecb77a-e9d5-4192-a3eb-63dd8d95724f/scratchpad/exambank-course.json';
(async () => {
  const snap = await db.collection('courses').doc(COURSE_ID).get();
  const c = snap.data();
  require('fs').writeFileSync(OUT, JSON.stringify(c, null, 2));
  console.log('title:', c.title, '| price:', c.price, '| fullPrice:', c.fullPrice);
  console.log('salesPage keys:', Object.keys(c.salesPage || {}).join(', '));
  const secs = c.salesPage?.sections || [];
  console.log('sections:', secs.map(s => `${s.type||s.id}${s.enabled===false?'(off)':''}`).join(' | '));
  console.log('written to', OUT, JSON.stringify(c).length, 'bytes');
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
