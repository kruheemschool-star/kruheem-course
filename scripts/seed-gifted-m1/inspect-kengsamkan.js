/**
 * inspect-kengsamkan.js — READ ONLY. Dump the "เก่งสมการ" course: basics +
 * current salesPage (sections & their data) + lesson count, so we can write
 * sales copy that fits the real form without overwriting anything blindly.
 *   node inspect-kengsamkan.js
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
  if (!snap.exists) throw new Error('course not found: ' + COURSE_ID);
  const c = snap.data();

  console.log('=== top-level keys ===');
  console.log(Object.keys(c).sort().join(', '));

  console.log('\n=== basics ===');
  for (const k of ['title', 'name', 'price', 'fullPrice', 'category', 'level', 'previewVideoId', 'coverImage', 'image', 'thumbnail']) {
    if (c[k] !== undefined) console.log(`${k}:`, JSON.stringify(c[k]));
  }

  const sp = c.salesPage;
  console.log('\n=== salesPage ===');
  if (!sp) {
    console.log('(none — course has no section-based sales page yet)');
  } else {
    console.log('enabled:', sp.enabled);
    console.log('theme:', JSON.stringify(sp.theme || null));
    console.log('boosters:', sp.boosters ? Object.keys(sp.boosters).join(',') : '(none)');
    const secs = Array.isArray(sp.sections) ? [...sp.sections].sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
    console.log(`sections: ${secs.length}`);
    secs.forEach((s) => {
      const title = s.data?.title || s.data?.badgeText || '';
      console.log(`  #${s.order} ${s.type}  enabled=${s.enabled !== false}  ${title ? '· ' + title : ''}`);
    });
  }

  const lessonsSnap = await ref.collection('lessons').get();
  console.log(`\n=== lessons subcollection: ${lessonsSnap.size} docs ===`);

  console.log('\n=== FULL salesPage JSON (for backup/reference) ===');
  console.log(JSON.stringify(sp || null, null, 2));

  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
