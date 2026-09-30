const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const sa = require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const SP = '/private/tmp/claude-501/-Users-kruheem-Documents-webapp-kruheem-course/b59d8f78-60cd-429f-bbeb-1a72c43bf856/scratchpad';
const BACKUP_DIR = path.resolve('scripts/tmp/khb-reformat-backups');

const articles = [
  { id: 'lO9SoJhnXlpDatDREzhd', slug: 'stop-forcing-kids-to-read', oldFile: `${SP}/khb3-a1-lO9SoJhnXlpDatDREzhd-content.html`, newFile: `${SP}/khb3-a1-work.html` },
  { id: 'kY9JX20z18cPawRYO6bJ', slug: 'math-basic', oldFile: `${SP}/khb3-a2-kY9JX20z18cPawRYO6bJ-content.html`, newFile: `${SP}/khb3-a2-work.html` },
  { id: 'SmKuoOjpALCxtMHR0K6h', slug: 'time-boxing', oldFile: `${SP}/khb3-a3-SmKuoOjpALCxtMHR0K6h-content.html`, newFile: `${SP}/khb3-a3-work.html` },
];

(async () => {
  const ts = Date.now();
  for (const art of articles) {
    // Re-fetch current doc to confirm content still matches our pristine backup (no concurrent edits happened)
    const docRef = db.collection('posts').doc(art.id);
    const doc = await docRef.get();
    if (!doc.exists) {
      console.log(`${art.slug} (${art.id}): NOT FOUND — skipping`);
      continue;
    }
    const liveContent = doc.data().content || '';
    const pristineOld = fs.readFileSync(art.oldFile, 'utf8');
    if (liveContent !== pristineOld) {
      console.log(`${art.slug} (${art.id}): SKIP — live Firestore content differs from what we fetched earlier (possible concurrent edit). Not writing.`);
      continue;
    }

    const newContent = fs.readFileSync(art.newFile, 'utf8');

    // Backup old content first
    const backupPath = path.join(BACKUP_DIR, `${art.slug}-${ts}.html`);
    fs.writeFileSync(backupPath, liveContent);

    await docRef.update({
      content: newContent,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`${art.slug} (${art.id}): UPDATED. backup=${backupPath} oldLen=${liveContent.length} newLen=${newContent.length}`);
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
