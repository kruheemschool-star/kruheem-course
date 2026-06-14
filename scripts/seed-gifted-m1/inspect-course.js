/**
 * inspect-course.js — read-only. Dump a course's structure + lessons so we can
 * see the real chapters/episodes (to fill the hero "สารบัญ" on the sales page).
 *   node inspect-course.js
 */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const COURSE_ID = 'xELVM7Nbeua9jm0NjJK7';

(async () => {
  const ref = db.collection('courses').doc(COURSE_ID);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('course not found');
  const c = snap.data();

  console.log('=== course doc top-level keys ===');
  console.log(Object.keys(c).sort().join(', '));

  // Show any chapter/lesson/syllabus-like inline fields.
  for (const k of Object.keys(c)) {
    const v = c[k];
    if (Array.isArray(v) && /chapter|lesson|syllabus|curriculum|toc|content|episode/i.test(k)) {
      console.log(`\n=== inline field "${k}" (array, ${v.length}) ===`);
      console.log(JSON.stringify(v.slice(0, 3), null, 2));
    }
  }

  // Lessons subcollection.
  const lessonsSnap = await ref.collection('lessons').get();
  console.log(`\n=== lessons subcollection: ${lessonsSnap.size} docs ===`);
  lessonsSnap.docs.slice(0, 50).forEach((d, i) => {
    const L = d.data();
    const keys = Object.keys(L);
    // try to surface common fields
    const title = L.title || L.name || L.chapterTitle || '(no title)';
    const order = L.order ?? L.index ?? i;
    const clips = L.clips?.length ?? L.videos?.length ?? L.clipCount ?? L.lessons?.length ?? '?';
    const ex = L.exercises ?? L.exerciseCount ?? L.quiz?.length ?? '?';
    const free = L.free ?? L.isFree ?? L.preview ?? '?';
    console.log(`[${order}] ${title}  | clips:${clips} ex:${ex} free:${free}  | keys: ${keys.join(',')}`);
  });

  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
