const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const sa = require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const ids = {
  reference: 'C4gagfwg4CuIWVIunkiv',
  a1: 'EWTj70wjWNzpplXtvYE0',
  a2: 'WhesQXg0zxzaNRiCMGzV',
  a3: '782Ay0Fr2SV9ZSSLTF0F',
  a4: 'arwbgG8yI9lS3pccW0nz',
};

(async () => {
  for (const [key, id] of Object.entries(ids)) {
    const doc = await db.collection('posts').doc(id).get();
    if (!doc.exists) {
      console.log(`${key} (${id}): NOT FOUND`);
      continue;
    }
    const data = doc.data();
    fs.writeFileSync(
      path.resolve(`scripts/tmp/${key}-${id}.html`),
      data.content || ''
    );
    console.log(`${key} (${id}): title="${data.title}" slug="${data.slug}" content length=${(data.content||'').length}`);
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
