const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const sa = require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const SCRATCH = '/private/tmp/claude-501/-Users-kruheem-Documents-webapp-kruheem-course/b59d8f78-60cd-429f-bbeb-1a72c43bf856/scratchpad';

const ids = {
  '5JbfgXaoncCC1IZu7AtD': `${SCRATCH}/khb-out-a1.html`,
  'DGaIOsW4pB59Mm9wRi5w': `${SCRATCH}/khb-out-a2.html`,
  'Ie3pLLghwFLSF8VwWmrh': `${SCRATCH}/khb-out-a3.html`,
  '6xKj92apWRpuOCvFkpQd': `${SCRATCH}/khb-out-a4.html`,
};

(async () => {
  for (const [id, expectedFile] of Object.entries(ids)) {
    const doc = await db.collection('posts').doc(id).get();
    const data = doc.data();
    const expected = fs.readFileSync(expectedFile, 'utf8');
    const match = data.content === expected;
    console.log(`${id}: content matches intended output = ${match}`);
    console.log(`  title="${data.title}" slug="${data.slug}" status="${data.status}" views=${data.views}`);
    console.log(`  keywords=${JSON.stringify(data.keywords)}`);
    console.log(`  coverImage set: ${!!data.coverImage}`);
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
