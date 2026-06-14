/**
 * list-kengsamkan-lessons.js — READ ONLY. List every lesson/chapter title in the
 * "เก่งสมการ" classroom, in order, so we can see the real table of contents.
 *   node list-kengsamkan-lessons.js
 */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const COURSE_ID = 'z41lCWEynOVjHhaoeT9B';

(async () => {
  const ref = db.collection('courses').doc(COURSE_ID);
  const snap = await ref.get();
  console.log('course title:', snap.data()?.title);

  const ls = await ref.collection('lessons').get();
  console.log('lessons:', ls.size, '\n');

  const lessons = ls.docs.map((d) => ({ id: d.id, ...d.data() }));
  // figure out the order field
  lessons.sort((a, b) => (a.order ?? a.index ?? 0) - (b.order ?? b.index ?? 0));

  // show the schema of the first doc
  console.log('=== fields on first lesson ===');
  console.log(Object.keys(lessons[0] || {}).join(', '));
  console.log('');

  // detect headers/chapters vs content
  console.log('=== ALL lessons in order ===');
  lessons.forEach((L, i) => {
    const title = L.title || L.name || L.chapterTitle || '(no title)';
    const type = L.type || (L.isHeader ? 'header' : '') || L.kind || '';
    const ord = L.order ?? L.index ?? i;
    const clips = L.clips?.length ?? L.videos?.length ?? '';
    const ex = L.exercises?.length ?? L.exerciseCount ?? L.quiz?.length ?? '';
    const free = L.isFree ?? L.free ?? L.preview ?? '';
    console.log(`[${String(ord).padStart(2, ' ')}] ${type ? '(' + type + ') ' : ''}${title}` +
      `${clips !== '' ? `  · clips:${clips}` : ''}${ex !== '' ? ` ex:${ex}` : ''}${free !== '' ? ` free:${free}` : ''}`);
  });

  // also list just the chapter/header titles if a header type exists
  const headers = lessons.filter((L) => L.type === 'header' || L.isHeader || /^บท/.test(L.title || ''));
  if (headers.length) {
    console.log(`\n=== chapter/header titles only (${headers.length}) ===`);
    headers.forEach((h, i) => console.log(`${i + 1}. ${h.title || h.name}`));
  }

  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
