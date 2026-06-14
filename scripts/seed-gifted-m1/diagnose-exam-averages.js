/**
 * diagnose-exam-averages.js — READ ONLY. The prod /api/exam-averages route
 * (Admin SDK, collectionGroup("examResults")) returns HTTP 500. This replays
 * its core query with the service account to tell apart the two causes:
 *   - query works here  -> prod 500 is missing Vercel admin env vars
 *   - query fails here   -> a real data/index problem (error will say which)
 *
 *   node diagnose-exam-averages.js
 */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

(async () => {
  console.log('Running collectionGroup("examResults").get() with the admin service account...');
  const snap = await db.collectionGroup('examResults').get();
  console.log(`OK — examResults docs across all users: ${snap.size}`);

  // Mirror the route's aggregate so we know it would produce real numbers.
  let totalPercent = 0, totalExams = 0;
  const users = new Set();
  snap.docs.forEach((d) => {
    const data = d.data();
    const uid = d.ref.path.split('/')[1];
    if (uid) users.add(uid);
    if (typeof data.percent === 'number') { totalPercent += data.percent; totalExams++; }
  });
  const avg = totalExams > 0 ? Math.round(totalPercent / totalExams) : 0;
  console.log(`distinct users: ${users.size}, exams with percent: ${totalExams}, global avg: ${avg}%`);
  console.log('\n=> The query + aggregation work fine with admin creds.');
  console.log('=> So the prod 500 means FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY');
  console.log('   are missing or malformed in the Vercel Production environment.');
  process.exit(0);
})().catch((e) => {
  console.error('QUERY FAILED:', e.message);
  if (/index/i.test(e.message)) console.error('-> looks like a missing Firestore index, NOT an env problem.');
  process.exit(1);
});
