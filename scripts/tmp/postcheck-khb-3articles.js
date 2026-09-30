const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const sa = require(path.resolve('scripts/seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const SCRATCH = '/private/tmp/claude-501/-Users-kruheem-Documents-webapp-kruheem-course/b59d8f78-60cd-429f-bbeb-1a72c43bf856/scratchpad';

const articles = [
  { id: 'qMy7v7wI87TY9Yag7EKl', slug: 'pareto-principle', newFile: `${SCRATCH}/pareto-NEW.html` },
  { id: 'BiagXZeHrTcAcFzC46SQ', slug: 'homework-vs-future-success', newFile: `${SCRATCH}/homework-NEW.html` },
  { id: 'XeYR7tpfTCJdrv8720si', slug: 'podomoro', newFile: `${SCRATCH}/podomoro-NEW.html` },
];

(async () => {
  for (const a of articles) {
    const snap = await db.collection('posts').doc(a.id).get();
    const data = snap.data();
    const expected = fs.readFileSync(a.newFile, 'utf-8');
    const matches = data.content === expected;
    console.log(`${a.slug}: content-matches-expected=${matches} title="${data.title}" slug="${data.slug}" status="${data.status}" views=${data.views} contentType="${data.contentType}" hasCreatedAt=${!!data.createdAt} hasUpdatedAt=${!!data.updatedAt} excerptLen=${(data.excerpt||'').length} keywordsLen=${(data.keywords||[]).length} coverImage="${(data.coverImage||'').slice(0,60)}..."`);
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
