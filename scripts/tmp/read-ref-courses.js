const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const IDS = { p6: 'lBj1ZUlnBiU8vv3lm94y', gifted: 'HiHvqQmFz9s41oxW8lne' };
(async () => {
  for (const [k, id] of Object.entries(IDS)) {
    const doc = await db.collection('courses').doc(id).get();
    console.log(`\n========== ${k} :: ${doc.data().title} [${id}] ==========`);
    const ls = await db.collection('courses').doc(id).collection('lessons').orderBy('order').get();
    console.log('LESSONS:', ls.size);
    let totalQ = 0;
    ls.forEach(s => {
      const l = s.data();
      const c = (l.content || '').trim();
      let n = '';
      if (c.startsWith('[')) { try { const p = JSON.parse(c); n = `Q=${p.length}`; totalQ += p.length; } catch { n = 'JSON-ERR'; } }
      if (l.type !== 'video' || n) console.log([String(l.order).padStart(6), l.type.padEnd(7), n.padEnd(8), l.headerId ? 'hdr:' + l.headerId.slice(0,6) : '', JSON.stringify(l.title)].join(' | '));
    });
    console.log('TOTAL QUESTIONS IN COURSE:', totalQ);
  }
})();
