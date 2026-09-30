const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const ids = [
  'Yu1MnLwmUMU6QNBggrsE',
  '59HkkYa1szG2jLYIjf44',
  '8zLQZUkL45nJ4v7hBDSB',
  'R8DgNyp1IoIFovcb182e',
];

(async () => {
  for (const id of ids) {
    const doc = await db.collection('posts').doc(id).get();
    if (!doc.exists) {
      console.log(`MISSING: ${id}`);
      continue;
    }
    const data = doc.data();
    const out = {
      id,
      title: data.title || null,
      slug: data.slug || null,
      contentLength: (data.content || '').length,
    };
    fs.writeFileSync(
      path.join(__dirname, `khb-src-${id}.html`),
      data.content || ''
    );
    fs.writeFileSync(
      path.join(__dirname, `khb-meta-${id}.json`),
      JSON.stringify(out, null, 2)
    );
    console.log(JSON.stringify(out));
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
