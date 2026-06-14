/** enable-real-reviews.js — WRITE. Turn on useRealReviews on every course's
 *  testimonial section so it shows the real /api/home-reviews feed as a slow
 *  left-scrolling marquee (instead of hand-written stories). Non-destructive:
 *  the stories stay as a fallback. */
const admin = require('firebase-admin'); const path = require('path');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname,'serviceAccountKey.json'))) });
const db = admin.firestore();
(async()=>{
  const snap = await db.collection('courses').get();
  let changed = 0;
  for (const d of snap.docs){
    const sp = d.data().salesPage;
    if (!sp?.sections) continue;
    const idx = sp.sections.findIndex(s => s.type === 'testimonial');
    if (idx < 0) continue;
    if (sp.sections[idx].data?.useRealReviews === true) { console.log(`= ${d.data().title} (already on)`); continue; }
    const sections = sp.sections.map((s,i) => i===idx ? { ...s, data: { ...s.data, useRealReviews: true } } : s);
    await d.ref.update({ 'salesPage.sections': sections });
    console.log(`✅ ${d.data().title} · testimonial → useRealReviews=true`);
    changed++;
  }
  console.log(`\ndone · ${changed} courses updated`);
  process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
