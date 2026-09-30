const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const sa = require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const SCRATCH = '/private/tmp/claude-501/-Users-kruheem-Documents-webapp-kruheem-course/b59d8f78-60cd-429f-bbeb-1a72c43bf856/scratchpad';
const BACKUP_DIR = path.resolve('scripts/tmp/khb-reformat-backups');

const articles = [
  { id: 'YsteVTr21peCs2FaxZ3z', slug: '15-min-math-rule', newFile: `${SCRATCH}/khb-15-min-math-rule.html`, origFile: `${SCRATCH}/a1-YsteVTr21peCs2FaxZ3z-content.html` },
  { id: 'yLFdsBfVwRywVr5ukCxG', slug: 'stop-saying-smart-math', newFile: `${SCRATCH}/khb-stop-saying-smart-math.html`, origFile: `${SCRATCH}/a2-yLFdsBfVwRywVr5ukCxG-content.html` },
  { id: '3qnTVOWPWYUrrwNURg2q', slug: 'gambaru-spirit-success', newFile: `${SCRATCH}/khb-gambaru-spirit-success.html`, origFile: `${SCRATCH}/a3-3qnTVOWPWYUrrwNURg2q-content.html` },
  { id: 'mgH8aTAQ4qTLcL6sCd1j', slug: '5000-year-old-secret-revealed', newFile: `${SCRATCH}/khb-5000-year-old-secret-revealed.html`, origFile: `${SCRATCH}/a4-mgH8aTAQ4qTLcL6sCd1j-content.html` },
];

const ts = Date.now();

(async () => {
  for (const art of articles) {
    const doc = await db.collection('posts').doc(art.id).get();
    if (!doc.exists) {
      console.log(`SKIP ${art.slug} (${art.id}): doc not found`);
      continue;
    }
    const data = doc.data();
    const liveContent = data.content || '';
    const capturedOriginal = fs.readFileSync(art.origFile, 'utf-8');

    if (liveContent !== capturedOriginal) {
      console.log(`SKIP ${art.slug} (${art.id}): live content differs from the content this conversion was verified against (possible concurrent edit). NOT writing.`);
      continue;
    }

    const newHtml = fs.readFileSync(art.newFile, 'utf-8');

    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const backupPath = path.join(BACKUP_DIR, `${art.slug}-${ts}.html`);
    fs.writeFileSync(backupPath, liveContent);

    await db.collection('posts').doc(art.id).update({
      content: newHtml,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`DONE ${art.slug} (${art.id}): backed up to ${backupPath}, content updated (${liveContent.length} -> ${newHtml.length} chars)`);
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
