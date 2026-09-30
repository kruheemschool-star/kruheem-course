const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const sa = require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const SCRATCH = '/private/tmp/claude-501/-Users-kruheem-Documents-webapp-kruheem-course/b59d8f78-60cd-429f-bbeb-1a72c43bf856/scratchpad';

const articles = [
  { id: 'qMy7v7wI87TY9Yag7EKl', slug: 'pareto-principle' },
  { id: 'BiagXZeHrTcAcFzC46SQ', slug: 'homework-vs-future-success' },
  { id: 'XeYR7tpfTCJdrv8720si', slug: 'podomoro' },
];

(async () => {
  for (const a of articles) {
    const snap = await db.collection('posts').doc(a.id).get();
    fs.writeFileSync(`${SCRATCH}/${a.slug}-LIVE-AFTER.html`, snap.data().content || '');
  }
  console.log('dumped');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
