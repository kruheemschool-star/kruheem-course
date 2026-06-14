/**
 * inspect-posts-covers.js — READ ONLY. List every blog post and whether it has
 * a coverImage, so we can confirm the new sales-page "บทความ" cards will pull
 * the real blog cover image. Does not write anything.
 *   node scripts/seed-gifted-m1/inspect-posts-covers.js
 */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('posts').get();
  console.log(`=== posts collection: ${snap.size} docs ===\n`);

  let withCover = 0;
  let withExcerpt = 0;
  let withViews = 0;
  const rows = snap.docs.map((d) => {
    const p = d.data();
    const hasCover = !!(p.coverImage && String(p.coverImage).trim());
    const hasExcerpt = !!(p.excerpt && String(p.excerpt).trim());
    const views = typeof p.views === 'number' ? p.views : 0;
    if (hasCover) withCover++;
    if (hasExcerpt) withExcerpt++;
    if (views > 0) withViews++;
    return {
      title: p.title || '(no title)',
      slug: p.slug || '(no slug)',
      status: p.status || '(none)',
      views,
      cover: hasCover ? '🖼️  yes' : '— none',
      excerpt: hasExcerpt ? 'yes' : '—',
    };
  });

  // Sort by views desc — this is how the new picker will order them.
  rows.sort((a, b) => b.views - a.views);

  console.log('=== sorted by views (most → least) — preview of new picker order ===\n');
  rows.forEach((r, i) => {
    console.log(`${String(i + 1).padStart(2)}. 👁 ${String(r.views).padStart(5)}  ${r.cover}  [${r.status}]  ${r.title.slice(0, 50)}`);
  });

  console.log(`\n=== summary ===`);
  console.log(`มีรูปปก (coverImage): ${withCover}/${snap.size}`);
  console.log(`มีเกริ่นนำ (excerpt): ${withExcerpt}/${snap.size}`);
  console.log(`มียอดวิว (views > 0): ${withViews}/${snap.size}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
