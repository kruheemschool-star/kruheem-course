/**
 * load-salespage.js — คอร์ส ป.6 สอบเข้า ม.1
 *
 *   node load-salespage.js            # dry run
 *   node load-salespage.js --commit   # write salesPage
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const COMMIT = process.argv.includes('--commit');
const COURSE_ID = 'lBj1ZUlnBiU8vv3lm94y';
const JSON_PATH = '/Users/kruheem/Downloads/course-p6-entrance-m1.json';

const serviceAccount = require(path.resolve(__dirname, '..', 'seed-gifted-m1', 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

(async () => {
  console.log(COMMIT ? '🟢 COMMIT MODE — salesPage WILL be written\n' : '🔍 DRY RUN — no writes\n');

  const source = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const salesPage = source.salesPage;
  if (!salesPage || !Array.isArray(salesPage.sections)) {
    throw new Error('JSON has no valid salesPage.sections');
  }
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
  } else {
    console.log(`  existing salesPage: none`);
  }

  console.log(`\nwill write salesPage:`);
  console.log(`  enabled : ${salesPage.enabled}`);
  console.log(`  sections: ${salesPage.sections.length}`);
  salesPage.sections.forEach(s => console.log(`     [${String(s.order).padStart(2)}] ${s.type}${s.enabled ? '' : '  (disabled)'}`));
  const boosters = salesPage.boosters ? Object.keys(salesPage.boosters) : [];
  console.log(`  boosters: ${boosters.join(', ') || 'none'}`);

  if (!COMMIT) {
    console.log('\n(dry run — re-run with --commit to write it)');
    process.exit(0);
  }

  if (course.salesPage) {
    const backupPath = path.resolve(__dirname, `salespage-backup-${COURSE_ID}-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(course.salesPage, null, 2));
    console.log(`📦 backed up existing salesPage → ${backupPath}`);
  }

  await ref.update({ salesPage });
  console.log(`\n✅ salesPage written (enabled=${salesPage.enabled}). Open the editor to review.`);
  process.exit(0);
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
