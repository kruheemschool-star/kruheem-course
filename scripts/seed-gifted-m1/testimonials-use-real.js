/** testimonials-use-real.js — WRITE. Flip every sales-page "testimonial" section
 *  to useRealReviews (pulls real reviews from /api/home-reviews as a marquee),
 *  replacing the hand-written stories. */
const admin = require('firebase-admin'); const path = require('path');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname,'serviceAccountKey.json'))) });
const db = admin.firestore();
(async()=>{
  const snap = await db.collection('courses').get();
  let n = 0;
  for (const d of snap.docs){
    const sp = d.data().salesPage;
    if (!sp?.sections) continue;
    let changed = false;
    const sections = sp.sections.map(s => {
      if (s.type === 'testimonial' && !s.data?.useRealReviews) { changed = true; return { ...s, data: { ...s.data, useRealReviews: true } }; }
      return s;
    });
    if (changed){ await d.ref.update({ 'salesPage.sections': sections }); n++; console.log(`✅ ${d.data().title} · testimonial → real reviews`); }
  }
  console.log(`\nupdated ${n} course(s)`);
  process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
