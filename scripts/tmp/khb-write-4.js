const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const ARTICLES = [
  { id: 'Yu1MnLwmUMU6QNBggrsE', slug: '3-minutes-exam-trap-kruheem' },
  { id: '59HkkYa1szG2jLYIjf44', slug: 'social-detox-before-exam' },
  { id: '8zLQZUkL45nJ4v7hBDSB', slug: 'unplug-stress-math-secret' },
  { id: 'R8DgNyp1IoIFovcb182e', slug: 'handle-child-failing-exam' },
];

const backupDir = path.join(__dirname, 'khb-reformat-backups');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

(async () => {
  for (const { id, slug } of ARTICLES) {
    const docRef = db.collection('posts').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      console.log(`SKIP ${slug} (${id}) - doc missing`);
      continue;
    }
    const oldContent = doc.data().content || '';
    const newContentPath = path.join(__dirname, `khb-new-${id}.html`);
    const newContent = fs.readFileSync(newContentPath, 'utf8');

    // Sanity: make sure old content in Firestore right now still matches what we verified against
    const srcSnapshotPath = path.join(__dirname, `khb-src-${id}.html`);
    const srcSnapshot = fs.readFileSync(srcSnapshotPath, 'utf8');
    if (oldContent !== srcSnapshot) {
      console.log(`ABORT ${slug} (${id}) - live content differs from verified snapshot! Someone else may have edited it. Not writing.`);
      continue;
    }

    const ts = Date.now();
    const backupPath = path.join(backupDir, `${slug}-${ts}.html`);
    fs.writeFileSync(backupPath, oldContent);

    await docRef.update({
      content: newContent,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`OK ${slug} (${id}) - backed up to ${backupPath}, updated content (${oldContent.length} -> ${newContent.length} chars)`);
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
