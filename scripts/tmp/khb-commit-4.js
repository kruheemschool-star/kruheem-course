const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const sa = require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const SCRATCH = '/private/tmp/claude-501/-Users-kruheem-Documents-webapp-kruheem-course/b59d8f78-60cd-429f-bbeb-1a72c43bf856/scratchpad';
const BACKUP_DIR = path.resolve('scripts/tmp/khb-reformat-backups');

const articles = [
  {
    id: '5JbfgXaoncCC1IZu7AtD',
    slug: 'back-of-class-to-gifted-student',
    savedOriginal: `${SCRATCH}/a1-5JbfgXaoncCC1IZu7AtD-content.html`,
    newContent: `${SCRATCH}/khb-out-a1.html`,
  },
  {
    id: 'DGaIOsW4pB59Mm9wRi5w',
    slug: 'reading-but-forgetting-solution',
    savedOriginal: `${SCRATCH}/a2-DGaIOsW4pB59Mm9wRi5w-content.html`,
    newContent: `${SCRATCH}/khb-out-a2.html`,
  },
  {
    id: 'Ie3pLLghwFLSF8VwWmrh',
    slug: 'exam-panic-solution',
    savedOriginal: `${SCRATCH}/a3-Ie3pLLghwFLSF8VwWmrh-content.html`,
    newContent: `${SCRATCH}/khb-out-a3.html`,
  },
  {
    id: '6xKj92apWRpuOCvFkpQd',
    slug: 'math-anxiety-brain-shu',
    savedOriginal: `${SCRATCH}/a4-6xKj92apWRpuOCvFkpQd-content.html`,
    newContent: `${SCRATCH}/khb-out-a4.html`,
  },
];

(async () => {
  for (const art of articles) {
    console.log(`\n--- ${art.slug} (${art.id}) ---`);
    const docRef = db.collection('posts').doc(art.id);
    const doc = await docRef.get();
    if (!doc.exists) {
      console.log('SKIP: doc not found');
      continue;
    }
    const liveContent = doc.data().content || '';
    const savedOriginal = fs.readFileSync(art.savedOriginal, 'utf8');
    if (liveContent !== savedOriginal) {
      console.log('SKIP: live content differs from the snapshot this conversion was based on (possible concurrent edit) — not overwriting.');
      continue;
    }
    const newContent = fs.readFileSync(art.newContent, 'utf8');

    // backup old content first
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const backupPath = path.join(BACKUP_DIR, `${art.slug}-${Date.now()}.html`);
    fs.writeFileSync(backupPath, liveContent);
    console.log(`Backed up old content -> ${backupPath}`);

    await docRef.update({
      content: newContent,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Updated posts/${art.id} content field (${liveContent.length} -> ${newContent.length} chars)`);
  }
  process.exit(0);
})().catch((e) => {
  console.error('ERROR', e);
  process.exit(1);
});
