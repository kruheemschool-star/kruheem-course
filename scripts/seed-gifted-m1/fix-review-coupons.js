/**
 * fix-review-coupons.js
 * ----------------------------------------------------------
 * One-off recovery for the review-coupon bug.
 *
 * Around 26 Mar 2026 a Firestore rule started reading a field
 * (discountPercent) that the client never sent, which made the rule error
 * out and DENY every review-coupon write. Reviews were still saved (their
 * rule is lenient), so students were left "already reviewed" with no coupon.
 *
 * This script scans every review that recorded a couponCode and creates the
 * matching coupon if it is missing. It runs with Admin privileges, so it
 * bypasses the (now fixed) rules.
 *
 * Safe & idempotent: it skips any code that already exists and never deletes.
 *
 *   node fix-review-coupons.js            # dry run (no writes)
 *   node fix-review-coupons.js --commit   # actually create the coupons
 * ----------------------------------------------------------
 */
const admin = require('firebase-admin');
const path = require('path');

const COMMIT = process.argv.includes('--commit');
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

(async () => {
  console.log(COMMIT ? '🟢 COMMIT MODE — coupons WILL be created\n' : '🔍 DRY RUN — no writes\n');

  const [reviewsSnap, couponsSnap] = await Promise.all([
    db.collection('reviews').get(),
    db.collection('coupons').get(),
  ]);

  // Codes that already have a coupon (case-insensitive).
  const existingCodes = new Set(
    couponsSnap.docs.map((d) => String(d.data().code || '').toUpperCase()).filter(Boolean)
  );

  // Reviews that recorded a coupon code but have no matching coupon.
  const seen = new Set();
  const missing = [];
  reviewsSnap.docs.forEach((d) => {
    const r = d.data();
    const code = String(r.couponCode || '').toUpperCase();
    if (!code) return;                 // review with no coupon code
    if (existingCodes.has(code)) return; // coupon already exists
    if (seen.has(code)) return;        // de-dupe within this run
    seen.add(code);
    missing.push({
      code,
      userId: r.userId || null,
      courseId: r.courseId || null,
      courseName: r.courseName || '-',
      userName: r.userName || '-',
      createdAt: r.createdAt || null,
    });
  });

  console.log(`reviews scanned: ${reviewsSnap.size}  |  existing coupons: ${couponsSnap.size}`);
  console.log(`coupons missing (to create): ${missing.length}\n`);

  missing.forEach((m, i) => {
    const when = m.createdAt && m.createdAt.toDate ? m.createdAt.toDate().toLocaleDateString('th-TH') : '-';
    console.log(`${String(i + 1).padStart(2)}. ${m.code}  |  ${m.userName}  |  ${m.courseName}  |  ${when}`);
  });

  const students = new Set(missing.map((m) => m.userId).filter(Boolean));
  console.log(`\nunique students affected: ${students.size}`);

  if (!COMMIT) {
    console.log('\n(dry run — re-run with --commit to create these coupons)');
    process.exit(0);
  }

  let created = 0;
  for (const m of missing) {
    await db.collection('coupons').add({
      code: m.code,
      discountAmount: 100,
      discountPercent: null,
      userId: m.userId,
      courseId: m.courseId,
      isUsed: false,
      usedAt: null,
      usedForCourseId: null,
      // Keep the original review date so the coupon sorts correctly in admin.
      createdAt: m.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      source: 'review_reward',
    });
    created++;
  }
  console.log(`\n✅ created ${created} coupons`);
  process.exit(0);
})().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
