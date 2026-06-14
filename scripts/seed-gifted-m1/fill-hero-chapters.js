/**
 * fill-hero-chapters.js
 * ----------------------------------------------------------
 * Fill the hero section's "สารบัญ" (chapters), free-preview clip, and stat strip
 * from the course's REAL lessons (so it stops showing the default Gifted ม.1 list).
 *
 * Only the hero section's data is touched (preview, chaptersTitle, chapters,
 * cardStats). Everything else in salesPage is kept as-is.
 *
 *   node fill-hero-chapters.js            # dry run
 *   node fill-hero-chapters.js --commit   # write
 * ----------------------------------------------------------
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const COMMIT = process.argv.includes('--commit');
const COURSE_ID = 'xELVM7Nbeua9jm0NjJK7';

const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function clean(title) {
  const m = String(title).match(/\[EP(\d+)\]\s*(.*)/i);
  if (m) return { ep: m[1], name: m[2].trim() };
  return { ep: null, name: String(title).trim() };
}
function descFor(name) {
  if (/แบบฝึกหัด/.test(name)) return 'แบบฝึกหัด';
  if (/แนวข้อสอบ/.test(name)) return 'แนวข้อสอบ';
  return 'วิดีโอบทเรียน';
}

(async () => {
  console.log(COMMIT ? '🟢 COMMIT MODE\n' : '🔍 DRY RUN\n');

  const ref = db.collection('courses').doc(COURSE_ID);
  const snap = await ref.get();
  const course = snap.data();
  if (!course.salesPage) throw new Error('course has no salesPage');

  const lessonsSnap = await ref.collection('lessons').get();
  const episodes = lessonsSnap.docs
    .map(d => d.data())
    .filter(L => /\[EP\d+\]/i.test(L.title || ''))   // real episodes only (exclude chapter headers)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const chapters = episodes.map(L => {
    const { ep, name } = clean(L.title);
    return { title: ep ? `EP${ep} · ${name}` : name, desc: descFor(name), free: !!L.isFree };
  });

  const firstFree = episodes.find(L => L.isFree) || episodes[0];
  const ff = clean(firstFree.title);
  const preview = {
    label: 'คลิปตัวอย่างฟรี',
    epLabel: ff.ep ? `EP.${ff.ep}` : 'EP.01',
    freeChipText: 'ดูฟรี · ไม่ต้องสมัคร',
    playingChipText: 'กำลังเล่น',
    chapterTitle: `บทที่ ${ff.ep || '01'} · ${ff.name}`,
  };

  const chaptersTitle = `สารบัญทั้งหมด · ${chapters.length} ตอน`;
  const freeCount = chapters.filter(c => c.free).length;
  // Honest factual stats (not fabricated social proof) — ครูปรับเองได้
  const cardStats = [
    { value: String(chapters.length), label: 'ตอน' },
    { value: String(freeCount), label: 'ดูฟรี' },
    { value: '5 ปี', label: 'เรียนซ้ำได้' },
  ];

  console.log(`real episodes: ${chapters.length} (free: ${freeCount})`);
  console.log(`chaptersTitle: ${chaptersTitle}`);
  console.log(`preview clip : ${preview.chapterTitle}  [${preview.epLabel}]`);
  console.log(`cardStats    : ${cardStats.map(s => s.value + ' ' + s.label).join('  ·  ')}\n`);
  console.log('สารบัญที่จะใส่:');
  chapters.forEach((c, i) => console.log(`  ${String(i + 1).padStart(2)}. ${c.free ? '🆓' : '🔒'} ${c.title}  — ${c.desc}`));

  const hero = course.salesPage.sections.find(s => s.type === 'hero');
  if (!hero) throw new Error('no hero section found');

  if (!COMMIT) {
    console.log('\n(dry run — re-run with --commit to write)');
    process.exit(0);
  }

  // Back up current salesPage first.
  const backupPath = path.resolve(__dirname, `salespage-backup-${COURSE_ID}-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(course.salesPage, null, 2));
  console.log(`\n📦 backed up current salesPage → ${backupPath}`);

  hero.data = {
    ...hero.data,
    preview,
    chaptersTitle,
    chaptersScrollLabel: 'เลื่อนต่อเนื่อง',
    chapters,
    cardStats,
    cardViewAllText: 'ดูทั้งหมด →',
  };

  await ref.update({ salesPage: course.salesPage });
  console.log('✅ hero สารบัญ updated from real lessons (enabled stays true)');
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
