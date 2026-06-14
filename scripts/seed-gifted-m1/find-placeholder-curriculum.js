/** find-placeholder-curriculum.js — READ ONLY. Which courses still show the
 *  sample "บทที่ 1: ปูพื้นฐาน" curriculum, and what theme each uses. */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
(async () => {
  const snap = await db.collection('courses').get();
  for (const d of snap.docs) {
    const c = d.data(); const sp = c.salesPage;
    if (!sp?.sections) continue;
    const cur = sp.sections.find(s => s.type === 'curriculum');
    const ch0 = cur?.data?.chapters?.[0]?.title || '';
    const isPlaceholder = /ปูพื้นฐาน/.test(ch0);
    console.log(`${isPlaceholder ? '🟡 PLACEHOLDER' : '✅ real      '} | ${d.id} | ${c.title} | theme:${sp.theme?.id || '(default mint)'} | enabled:${sp.enabled} | ch1:"${ch0}"`);
  }
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
