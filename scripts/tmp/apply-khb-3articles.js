const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const sa = require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const SCRATCH = '/private/tmp/claude-501/-Users-kruheem-Documents-webapp-kruheem-course/b59d8f78-60cd-429f-bbeb-1a72c43bf856/scratchpad';
const BACKUP_DIR = path.resolve('scripts/tmp/khb-reformat-backups');

const articles = [
  { id: 'qMy7v7wI87TY9Yag7EKl', slug: 'pareto-principle', newFile: `${SCRATCH}/pareto-NEW.html`, origFile: `${SCRATCH}/pareto-qMy7v7wI87TY9Yag7EKl-ORIGINAL.html` },
  { id: 'BiagXZeHrTcAcFzC46SQ', slug: 'homework-vs-future-success', newFile: `${SCRATCH}/homework-NEW.html`, origFile: `${SCRATCH}/homework-BiagXZeHrTcAcFzC46SQ-ORIGINAL.html` },
  { id: 'XeYR7tpfTCJdrv8720si', slug: 'podomoro', newFile: `${SCRATCH}/podomoro-NEW.html`, origFile: `${SCRATCH}/podomoro-XeYR7tpfTCJdrv8720si-ORIGINAL.html` },
];

(async () => {
  for (const a of articles) {
    const docRef = db.collection('posts').doc(a.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      console.log(`${a.slug} (${a.id}): NOT FOUND — skipping`);
      continue;
    }
    const data = snap.data();
    if (data.slug !== a.slug) {
      console.log(`${a.slug} (${a.id}): SLUG MISMATCH (found "${data.slug}") — ABORTING this one for safety`);
      continue;
    }
    const oldContent = data.content || '';
    const newContent = fs.readFileSync(a.newFile, 'utf-8');
    const cachedOrig = fs.readFileSync(a.origFile, 'utf-8');

    // safety: live doc must be byte-identical to what we verified against earlier
    if (oldContent !== cachedOrig) {
      console.log(`${a.slug}: LIVE CONTENT CHANGED since fetch — ABORTING (re-fetch and redo conversion)`);
      continue;
    }

    // safety: new content must not be empty and must differ from old
    if (!newContent || newContent.length < oldContent.length * 0.9) {
      console.log(`${a.slug}: SUSPICIOUS new content length (old=${oldContent.length} new=${newContent.length}) — ABORTING`);
      continue;
    }

    const ts = Date.now();
    const backupPath = path.join(BACKUP_DIR, `${a.slug}-${ts}.html`);
    fs.writeFileSync(backupPath, oldContent, 'utf-8');

    await docRef.update({
      content: newContent,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`${a.slug} (${a.id}): DONE. old=${oldContent.length} new=${newContent.length} backup=${backupPath}`);
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
