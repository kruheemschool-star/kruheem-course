const admin = require('firebase-admin');
const path = require('path');
const COURSE_ID = 'xELVM7Nbeua9jm0NjJK7';
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const NEEDLES = ['590', '0.32', '700', '฿590', 'วันละ'];

function walk(obj, pathStr, hits) {
  if (obj == null) return;
  if (typeof obj === 'string') {
    for (const n of NEEDLES) {
      if (obj.includes(n)) { hits.push({ path: pathStr, needle: n, value: obj }); break; }
    }
    return;
  }
  if (typeof obj === 'number') {
    if (obj === 590 || obj === 700) hits.push({ path: pathStr, needle: String(obj), value: obj });
    return;
  }
  if (Array.isArray(obj)) { obj.forEach((v, i) => walk(v, `${pathStr}[${i}]`, hits)); return; }
  if (typeof obj === 'object') {
    for (const k of Object.keys(obj)) walk(obj[k], pathStr ? `${pathStr}.${k}` : k, hits);
  }
}

(async () => {
  const snap = await db.collection('courses').doc(COURSE_ID).get();
  const course = snap.data();
  const hits = [];
  walk(course.salesPage, 'salesPage', hits);
  // เช็คฟิลด์บรรยายคอร์สระดับบนสุดด้วย
  for (const k of ['desc', 'description', 'subtitle', 'tagline']) {
    if (course[k]) walk(course[k], k, hits);
  }
  console.log(`เจอ ${hits.length} จุดที่ยังมีร่องรอยราคาเดิม:\n`);
  hits.forEach(h => {
    const v = typeof h.value === 'string' && h.value.length > 90 ? h.value.slice(0, 90) + '…' : h.value;
    console.log(`  [${h.needle}] ${h.path}`);
    console.log(`         = ${JSON.stringify(v)}`);
  });
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
