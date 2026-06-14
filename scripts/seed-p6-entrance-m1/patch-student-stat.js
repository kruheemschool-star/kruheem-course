/**
 * patch-student-stat.js — คอร์ส ป.6 สอบเข้า ม.1
 *
 * Cleans the trustBadges student stat so it auto-fills the live count:
 *   number "___+"  ->  "{students}+"
 *   label  "...นักเรียนที่เรียนกับครูฮีม (ครูเติมเลขจริง)" -> "นักเรียนที่เรียนกับครูฮีม"
 * Only that one stat is touched; everything else in salesPage is preserved.
 *
 *   node patch-student-stat.js            # dry run
 *   node patch-student-stat.js --commit   # write
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const COMMIT = process.argv.includes('--commit');
const COURSE_ID = 'lBj1ZUlnBiU8vv3lm94y';

const serviceAccount = require(path.resolve(__dirname, '..', 'seed-gifted-m1', 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

(async () => {
  console.log(COMMIT ? '🟢 COMMIT MODE\n' : '🔍 DRY RUN — no writes\n');

  const ref = db.collection('courses').doc(COURSE_ID);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`Course ${COURSE_ID} not found`);
  const salesPage = snap.data().salesPage;
  if (!salesPage?.sections) throw new Error('No salesPage.sections');

  const tb = salesPage.sections.find((s) => s.type === 'trustBadges');
  if (!tb) throw new Error('No trustBadges section');

  let changed = 0;
  tb.data.stats = (tb.data.stats || []).map((stat) => {
    const looksLikeStudents = /นักเรียน/.test(stat.label || '') || /_{2,}/.test(stat.number || '');
    if (!looksLikeStudents) return stat;
    const next = {
      ...stat,
      number: /_{2,}/.test(stat.number || '') ? stat.number.replace(/_{2,}/, '{students}') : '{students}+',
      label: (stat.label || '').replace(/\s*\(ครูเติมเลขจริง\)\s*/g, '').trim(),
    };
    if (next.number !== stat.number || next.label !== stat.label) {
      console.log(`  stat: "${stat.number}" / "${stat.label}"`);
      console.log(`     -> "${next.number}" / "${next.label}"`);
      changed++;
    }
    return next;
  });

  if (changed === 0) { console.log('nothing to change.'); process.exit(0); }

  if (!COMMIT) { console.log(`\n(dry run — ${changed} stat(s) would change; re-run with --commit)`); process.exit(0); }

  const backupPath = path.resolve(__dirname, `salespage-backup-${COURSE_ID}-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(snap.data().salesPage, null, 2));
  console.log(`📦 backed up → ${backupPath}`);

  await ref.update({ salesPage });
  console.log(`\n✅ patched ${changed} stat(s).`);
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
