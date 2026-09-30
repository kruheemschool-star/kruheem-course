const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const sa = require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const ids = {
  pareto: 'qMy7v7wI87TY9Yag7EKl',
  homework: 'BiagXZeHrTcAcFzC46SQ',
  podomoro: 'XeYR7tpfTCJdrv8720si',
};

const outDir = '/private/tmp/claude-501/-Users-kruheem-Documents-webapp-kruheem-course/b59d8f78-60cd-429f-bbeb-1a72c43bf856/scratchpad';

(async () => {
  for (const [key, id] of Object.entries(ids)) {
    const doc = await db.collection('posts').doc(id).get();
    if (!doc.exists) {
      console.log(`${key} (${id}): NOT FOUND`);
      continue;
    }
    const data = doc.data();
    fs.writeFileSync(`${outDir}/${key}-${id}-ORIGINAL.html`, data.content || '');
    console.log(`${key} (${id}): title="${data.title}" slug="${data.slug}" content-length=${(data.content||'').length} fields=${Object.keys(data).join(',')}`);
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
