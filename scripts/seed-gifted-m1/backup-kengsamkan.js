/**
 * backup-kengsamkan.js — READ ONLY. Save the current salesPage of the
 * "เก่งสมการ" course to a timestamped JSON file so we can restore it if needed.
 *   node backup-kengsamkan.js
 */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const COURSE_ID = 'z41lCWEynOVjHhaoeT9B';

(async () => {
  const snap = await db.collection('courses').doc(COURSE_ID).get();
  if (!snap.exists) throw new Error('course not found');
  const sp = snap.data().salesPage || null;
  const file = path.resolve(__dirname, `kengsamkan-salespage-backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(sp, null, 2));
  console.log('backed up salesPage →', file);
  console.log('sections:', (sp?.sections || []).length, '· enabled:', sp?.enabled, '· theme:', JSON.stringify(sp?.theme));
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
