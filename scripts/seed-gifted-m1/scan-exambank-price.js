/** scan-exambank-price.js — READ ONLY. Dump every price-ish field in คลังข้อสอบ course. */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const COURSE_ID = '26UeeaBMMFswM3RH5aI1';
const HITS = ['790', '990', '1,500', '1500', '฿'];

function walk(obj, pathStr, out) {
  if (obj == null) return;
  if (typeof obj === 'string' || typeof obj === 'number') {
    const s = String(obj);
    if (HITS.some((h) => s.includes(h))) out.push([pathStr, obj]);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => walk(v, `${pathStr}[${i}]`, out));
    return;
  }
  if (typeof obj === 'object') {
    for (const k of Object.keys(obj)) walk(obj[k], pathStr ? `${pathStr}.${k}` : k, out);
  }
}

(async () => {
  const snap = await db.collection('courses').doc(COURSE_ID).get();
  if (!snap.exists) throw new Error('not found');
  const c = snap.data();
  console.log(`คอร์ส: ${c.title}  [${COURSE_ID}]`);
  console.log(`top: price=${c.price}  fullPrice=${c.fullPrice}\n`);
  const out = [];
  walk(c, '', out);
  console.log(`=== fields containing a price token (${out.length}) ===`);
  for (const [p, v] of out) console.log(`  ${p} : ${JSON.stringify(v)}`);
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
