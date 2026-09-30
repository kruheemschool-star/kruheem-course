const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  const id = 'z41lCWEynOVjHhaoeT9B';
  const doc = await db.collection('courses').doc(id).get();
  const d = doc.data();
  console.log('TITLE:', d.title);
  console.log('DESC:', (d.description||'').slice(0,400));
  console.log('KEYS:', Object.keys(d).join(', '));
  const ls = await db.collection('courses').doc(id).collection('lessons').orderBy('order').get();
  console.log('LESSON COUNT:', ls.size);
  ls.forEach(s => {
    const l = s.data();
    const c = (l.content||'');
    console.log([s.id, l.order, l.type, JSON.stringify(l.title), 'contentLen=' + c.length, c.trim().startsWith('[') ? 'JSON-EXAM' : ''].join(' | '));
  });
})();
