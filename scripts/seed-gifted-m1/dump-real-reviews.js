/** dump-real-reviews.js — READ ONLY. Real reviews from the `reviews` collection. */
const admin = require('firebase-admin'); const path = require('path');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname,'serviceAccountKey.json'))) });
const db = admin.firestore();
(async()=>{
  const snap = await db.collection('reviews').get();
  console.log('total reviews:', snap.size);
  const rows = snap.docs.map(d=>d.data())
    .filter(r => r.isHidden !== true && (r.comment||'').trim().length >= 8)
    .map(r => ({ name: r.userName||'', rating: r.rating??0, comment: (r.comment||'').trim(), course: r.courseName||'', photo: r.userPhoto||'', createdAt: r.createdAt||'' }))
    .sort((a,b)=> (b.rating-a.rating) || String(b.createdAt).localeCompare(String(a.createdAt)));
  console.log('usable (visible, comment>=8 chars):', rows.length);
  console.log('=== top 14 (by rating then newest) ===');
  rows.slice(0,14).forEach((r,i)=>console.log(`${i+1}. [${r.rating}★] ${r.name} | ${r.course}\n   "${r.comment}"  ${r.photo?'(photo:'+(r.photo.startsWith('http')?'url':r.photo)+')':''}`));
  process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
