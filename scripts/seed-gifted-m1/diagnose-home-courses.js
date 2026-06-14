/**
 * diagnose-home-courses.js — READ ONLY. Figure out why the homepage course
 * grid is empty. The homepage calls /api/home-courses, which runs:
 *     query(collection(db,'courses'), orderBy('createdAt','desc'))
 * Firestore SILENTLY drops any doc missing the orderBy field, so a course
 * without `createdAt` vanishes from the homepage even though it still exists.
 *
 * This script:
 *   1. counts ALL courses (no ordering)
 *   2. replays the exact homepage query (orderBy createdAt desc) and counts it
 *   3. lists every course: createdAt present? type? + title
 *   does NOT write anything.
 *
 *   node diagnose-home-courses.js
 */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function typeOf(v) {
  if (v === undefined) return 'MISSING';
  if (v === null) return 'null';
  if (v && typeof v.toDate === 'function') return 'Timestamp';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'string') return 'string';
  return typeof v;
}

(async () => {
  // 1. ALL courses, no ordering — the true count.
  const allSnap = await db.collection('courses').get();
  console.log(`\n=== TOTAL courses in collection (no ordering): ${allSnap.size} ===`);

  // 2. Replay the exact homepage API query.
  let orderedSize = 0;
  let orderedErr = null;
  try {
    const orderedSnap = await db.collection('courses').orderBy('createdAt', 'desc').get();
    orderedSize = orderedSnap.size;
  } catch (e) {
    orderedErr = e.message;
  }
  if (orderedErr) {
    console.log(`=== homepage query (orderBy createdAt desc): ERROR -> ${orderedErr} ===`);
  } else {
    console.log(`=== homepage query (orderBy createdAt desc) returns: ${orderedSize} ===`);
    const dropped = allSnap.size - orderedSize;
    if (dropped > 0) {
      console.log(`*** ${dropped} course(s) are DROPPED by the ordered query (missing/!comparable createdAt) ***`);
    }
  }

  // 3. Per-course detail.
  console.log(`\n=== per-course createdAt status ===`);
  allSnap.docs.forEach((d) => {
    const c = d.data();
    const t = typeOf(c.createdAt);
    let val = '';
    if (t === 'Timestamp') { try { val = c.createdAt.toDate().toISOString(); } catch {} }
    else if (t !== 'MISSING' && t !== 'null') val = String(c.createdAt);
    const flag = (t === 'MISSING' || t === 'null') ? '  <-- DROPPED FROM HOMEPAGE' : '';
    console.log(`${d.id}  createdAt:${t} ${val}  | title:"${c.title || '(no title)'}"${flag}`);
  });

  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
