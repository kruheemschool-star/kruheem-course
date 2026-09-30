const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const COURSE_ID = 'lBj1ZUlnBiU8vv3lm94y';
const LESSON = process.argv[2];
const OUT = process.argv[3];
(async () => {
  const d = await db.collection('courses').doc(COURSE_ID).collection('lessons').doc(LESSON).get();
  const x = d.data();
  fs.writeFileSync(OUT, JSON.stringify(x, null, 2));
  console.log('keys:', Object.keys(x).join(', '));
  console.log('title:', x.title, '| type:', x.type, '| content len:', (x.content||'').length);
  process.exit(0);
})();
