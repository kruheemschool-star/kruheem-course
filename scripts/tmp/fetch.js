const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const sa = require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const ids = {
  reference: 'C4gagfwg4CuIWVIunkiv',
  a1: '5JbfgXaoncCC1IZu7AtD',
  a2: 'DGaIOsW4pB59Mm9wRi5w',
  a3: 'Ie3pLLghwFLSF8VwWmrh',
  a4: '6xKj92apWRpuOCvFkpQd',
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
    fs.writeFileSync(`${outDir}/${key}-${id}-content.html`, data.content || '');
    console.log(`${key} (${id}): title="${data.title}" slug="${data.slug}" content-length=${(data.content||'').length}`);
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
