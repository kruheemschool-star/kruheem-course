/** build-review-slideshow.js — WRITE. Build a self-contained auto-scrolling
 *  reviews slideshow as HTML+CSS and put it into each course's testimonial
 *  section, CONVERTED to a `richText` section (richText is already deployed, so
 *  this works on the LIVE old build — no Vercel deploy needed). Pulls ALL real
 *  reviews from the reviews collection. Optional arg = single course id.
 *    node build-review-slideshow.js [courseId]
 */
const admin = require('firebase-admin'); const path = require('path');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname,'serviceAccountKey.json'))) });
const db = admin.firestore();
const ONLY = process.argv[2];

const esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const stars = (n) => { n = Math.max(0,Math.min(5,Math.round(n||0))); return '★'.repeat(n) + '<span style="color:var(--kh-line)">'+'★'.repeat(5-n)+'</span>'; };

function buildHtml(reviews) {
  const card = (r) => {
    const initial = esc((r.userName||'?').trim().charAt(0).toUpperCase() || '?');
    return `<div style="flex:0 0 290px;box-sizing:border-box;background:var(--kh-card);border:1px solid var(--kh-line);border-radius:16px;padding:16px 18px;box-shadow:0 12px 26px -18px rgba(16,48,44,.28);text-align:left;white-space:normal">`
      + `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">`
      + `<span style="flex:0 0 auto;width:40px;height:40px;border-radius:999px;background:linear-gradient(135deg,var(--kh-p),var(--kh-p2));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px">${initial}</span>`
      + `<span style="min-width:0"><b style="display:block;color:var(--kh-ink);font-size:14px;line-height:1.3">${esc(r.userName||'นักเรียน')}</b>`
      + `<span style="color:#f59e0b;font-size:12px;letter-spacing:1px">${stars(r.rating)} <span style="color:var(--kh-mut);font-size:11px;letter-spacing:0">ผู้เรียนจริง</span></span></span></div>`
      + `<p style="font-size:13px;color:var(--kh-body);line-height:1.6;margin:0">&ldquo;${esc(r.comment)}&rdquo;</p></div>`;
  };
  const cards = reviews.map(card).join('');
  const dur = Math.max(60, reviews.length * 4);
  return `<style>
body{overflow-x:clip}
@keyframes khRevScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.khrev-track{animation:khRevScroll ${dur}s linear infinite}
.khrev-track:hover{animation-play-state:paused}
@media(max-width:600px){.khrev-track{animation-duration:${Math.round(dur*0.6)}s}}
@media(prefers-reduced-motion:reduce){.khrev-track{animation:none}}
</style>
<h2 style="text-align:center;font-family:var(--font-kanit),var(--font-mitr),sans-serif;color:var(--kh-ink);font-size:clamp(26px,3.6vw,40px);font-weight:700;margin:0 0 6px">เรื่องจริงจากนักเรียน 💪</h2>
<p style="text-align:center;color:var(--kh-mut);margin:0 0 22px;font-size:15px">รีวิวจริงทั้งหมดจากนักเรียนของครูฮีม — เลื่อนดูได้เรื่อย ๆ</p>
<div style="position:relative;width:100vw;max-width:100vw;left:50%;margin-left:-50vw;overflow:hidden;-webkit-mask-image:linear-gradient(to right,transparent,#000 3%,#000 97%,transparent);mask-image:linear-gradient(to right,transparent,#000 3%,#000 97%,transparent)">
<div class="khrev-track" style="display:flex;gap:16px;width:max-content;padding:10px 18px">${cards}${cards}</div></div>`;
}

(async()=>{
  const rs = (await db.collection('reviews').get()).docs.map(d=>d.data())
    .filter(r => r.isHidden !== true && (r.comment||'').trim().length >= 8)
    .sort((a,b)=> (b.rating-a.rating) || String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  console.log('real reviews used:', rs.length);
  const html = buildHtml(rs);
  console.log('html length:', html.length);

  const snap = await db.collection('courses').get();
  let n=0;
  for (const d of snap.docs){
    if (ONLY && d.id !== ONLY) continue;
    const sp = d.data().salesPage; if (!sp?.sections) continue;
    const idx = sp.sections.findIndex(s => s.type === 'testimonial' || s.id === 'reviews-slideshow');
    if (idx < 0) continue;
    const sections = sp.sections.map((s,i)=> i===idx ? {
      id: 'reviews-slideshow', type: 'richText', order: s.order, enabled: true,
      data: { html, framed: false, color: '#13a892', bgIntensity: 1 },
    } : s);
    await d.ref.update({ 'salesPage.sections': sections });
    console.log(`✅ ${d.data().title} · testimonial → richText reviews-slideshow`);
    n++;
  }
  console.log(`\ndone · ${n} course(s)`);
  process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
