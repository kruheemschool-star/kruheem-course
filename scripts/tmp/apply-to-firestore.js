const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const sa = require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const BACKUP_DIR = path.resolve('scripts/tmp/khb-reformat-backups');
fs.mkdirSync(BACKUP_DIR, { recursive: true });

const articles = [
  { id: 'EWTj70wjWNzpplXtvYE0', slug: 'newton-law-beat-procrastination', newFile: 'scripts/tmp/a1-NEW.html' },
  { id: 'WhesQXg0zxzaNRiCMGzV', slug: 'game-theory-exam-guessing', newFile: 'scripts/tmp/a2-NEW.html' },
  { id: '782Ay0Fr2SV9ZSSLTF0F', slug: 'one-line-one-breath-math-technique', newFile: 'scripts/tmp/a3-NEW.html' },
  { id: 'arwbgG8yI9lS3pccW0nz', slug: 'process-over-result', newFile: 'scripts/tmp/a4-NEW.html' },
];

(async () => {
  for (const art of articles) {
    console.log(`\n=== ${art.slug} (${art.id}) ===`);
    const doc = await db.collection('posts').doc(art.id).get();
    if (!doc.exists) {
      console.log('SKIP — doc not found');
      continue;
    }
    const data = doc.data();
    const freshOld = data.content || '';
    const newHtml = fs.readFileSync(path.resolve(art.newFile), 'utf8');

    // Write fresh-old backup right before mutating, with timestamp.
    const ts = Date.now();
    const backupPath = path.join(BACKUP_DIR, `${art.slug}-${ts}.html`);
    fs.writeFileSync(backupPath, freshOld, 'utf8');

    // Re-verify freshly-fetched old content against the prepared new HTML
    // (defense in depth in case Firestore content drifted since we last fetched it).
    const tmpOld = path.join('/tmp', `verify-old-${art.id}.html`);
    fs.writeFileSync(tmpOld, freshOld, 'utf8');
    try {
      const out = execFileSync('python3', ['scripts/tmp/verify.py', tmpOld, art.newFile], { encoding: 'utf8' });
      console.log(out.trim());
    } catch (e) {
      console.log('VERIFY FAILED — skipping Firestore write for this article.');
      console.log(e.stdout ? e.stdout.toString() : e.message);
      continue;
    }

    await db.collection('posts').doc(art.id).update({
      content: newHtml,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`UPDATED. backup: ${backupPath}`);
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
