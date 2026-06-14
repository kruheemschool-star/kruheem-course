/**
 * load-salespage.js
 * ----------------------------------------------------------
 * Load a course's salesPage from a JSON file directly into the course doc —
 * the same write the admin sales-page editor performs:
 *     updateDoc(courses/{id}, { salesPage })
 *
 * Only the `salesPage` field is touched. Top-level course fields (title, price,
 * lessons, etc.) are left untouched.
 *
 *   node load-salespage.js            # dry run (shows course + what will be written)
 *   node load-salespage.js --commit   # actually write salesPage
 * ----------------------------------------------------------
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const COMMIT = process.argv.includes('--commit');
const COURSE_ID = 'xELVM7Nbeua9jm0NjJK7';
const JSON_PATH = '/Users/kruheem/Downloads/course-banyat-traiyang.json';

const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

(async () => {
  console.log(COMMIT ? '🟢 COMMIT MODE — salesPage WILL be written\n' : '🔍 DRY RUN — no writes\n');

  const source = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const salesPage = source.salesPage;
  if (!salesPage || !Array.isArray(salesPage.sections)) {
    throw new Error('JSON has no valid salesPage.sections');
  }
  // --live keeps the page published (overrides the JSON's enabled flag).
  if (process.argv.includes('--live')) salesPage.enabled = true;

  const ref = db.collection('courses').doc(COURSE_ID);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`Course ${COURSE_ID} not found`);
  const course = snap.data();

  console.log(`course id: ${COURSE_ID}`);
  console.log(`  current title : ${course.title || '(none)'}`);
  console.log(`  current price : ${course.price ?? '(none)'}`);
  if (course.salesPage) {
    const ex = course.salesPage;
    console.log(`  existing salesPage: ${ex.sections?.length || 0} sections — enabled=${ex.enabled} ${ex.enabled ? '⚠️ LIVE อยู่!' : '(ปิดอยู่)'} (จะถูกเขียนทับ)`);
    console.log(`    existing section types: ${(ex.sections || []).map(s => s.type).join(', ')}`);
  } else {
    console.log(`  existing salesPage: none`);
  }

  console.log(`\nwill write salesPage:`);
  console.log(`  enabled : ${salesPage.enabled}  (false = ยังไม่เผยแพร่ ต้องเปิดเองในหน้า editor)`);
  console.log(`  sections: ${salesPage.sections.length}`);
  salesPage.sections.forEach(s => console.log(`     [${String(s.order).padStart(2)}] ${s.type}${s.enabled ? '' : '  (disabled)'}`));
  const boosters = salesPage.boosters ? Object.keys(salesPage.boosters) : [];
  console.log(`  boosters: ${boosters.join(', ') || 'none'}`);

  if (!COMMIT) {
    console.log('\n(dry run — re-run with --commit to write it)');
    process.exit(0);
  }

  // Back up the existing salesPage before replacing it (recoverable).
  if (course.salesPage) {
    const backupPath = path.resolve(__dirname, `salespage-backup-${COURSE_ID}-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(course.salesPage, null, 2));
    console.log(`📦 backed up existing salesPage → ${backupPath}`);
  }

  await ref.update({ salesPage });
  console.log(`\n✅ salesPage written (enabled=${salesPage.enabled}). Open the editor / course page to review.`);
  process.exit(0);
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
