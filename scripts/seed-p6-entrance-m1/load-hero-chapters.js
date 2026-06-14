/**
 * load-hero-chapters.js — คอร์ส ป.6 สอบเข้า ม.1
 *
 * Reads the course's REAL lessons, groups them by header (same as the learn
 * page), and writes a chapter summary into the hero section's data.chapters
 * (stored — no runtime fetch). Each chapter:
 *   title : header title (strip "บทที่ N" / "[EPxx]")
 *   desc  : "X คลิป" + (" · แบบฝึก Y")
 *   free  : true if the chapter contains any free lesson
 *
 *   node load-hero-chapters.js            # dry run (prints what it will write)
 *   node load-hero-chapters.js --commit   # write it
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const COMMIT = process.argv.includes('--commit');
const COURSE_ID = 'lBj1ZUlnBiU8vv3lm94y';

const serviceAccount = require(path.resolve(__dirname, '..', 'seed-gifted-m1', 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const cleanTitle = (t) => (t || '')
  .replace(/^\[EP\d+\]\s*/i, '')
  .replace(/^บทที่\s*\d+[\s:.\-–]*/u, '')
  .trim();

(async () => {
  console.log(COMMIT ? '🟢 COMMIT MODE\n' : '🔍 DRY RUN — no writes\n');

  const lessonsSnap = await db.collection('courses').doc(COURSE_ID).collection('lessons').get();
  const lessons = lessonsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const headers = lessons.filter((l) => l.type === 'header').sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (headers.length === 0) throw new Error('No headers found in lessons');

  const chapters = headers.map((h) => {
    const subs = lessons
      .filter((l) => l.headerId === h.id && l.type !== 'header')
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const videos = subs.filter((l) => l.type === 'video').length;
    const exercises = subs.filter((l) => l.type === 'exercise' || l.type === 'quiz').length;
    const free = subs.some((l) => l.isFree);
    const descParts = [];
    if (videos) descParts.push(`${videos} คลิป`);
    if (exercises) descParts.push(`แบบฝึก ${exercises}`);
    const chap = { title: cleanTitle(h.title) };
    if (descParts.length) chap.desc = descParts.join(' · ');
    if (free) chap.free = true;
    return chap;
  });

  console.log(`course ${COURSE_ID}: ${lessons.length} lessons → ${chapters.length} chapters`);
  chapters.forEach((c, i) => console.log(`  ${String(i + 1).padStart(2, '0')} ${c.free ? '🆓' : '🔒'} ${c.title}${c.desc ? `  (${c.desc})` : ''}`));

  const ref = db.collection('courses').doc(COURSE_ID);
  const snap = await ref.get();
  const salesPage = snap.data().salesPage;
  const hero = (salesPage?.sections || []).find((s) => s.type === 'hero');
  if (!hero) throw new Error('No hero section in salesPage');

  if (!COMMIT) { console.log('\n(dry run — re-run with --commit to write into hero.data.chapters)'); process.exit(0); }

  const backupPath = path.resolve(__dirname, `salespage-backup-${COURSE_ID}-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(salesPage, null, 2));
  console.log(`📦 backed up → ${backupPath}`);

  hero.data.chapters = chapters;
  await ref.update({ salesPage });
  console.log(`\n✅ wrote ${chapters.length} chapters into hero.data.chapters`);
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
