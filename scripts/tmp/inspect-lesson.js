const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const ID = process.argv[2];
(async () => {
  const d = await db.collection('courses').doc('fhoc1u2JT8WghFHapzx8').collection('lessons').doc(ID).get();
  const L = d.data();
  const meta = { ...L }; delete meta.content;
  console.log('META:', JSON.stringify(meta, null, 2).slice(0, 2000));
  const c = L.content || '';
  console.log('content length:', c.length);
  let parsed;
  try { parsed = JSON.parse(c); } catch(e) { console.log('not JSON:', c.slice(0,300)); process.exit(0); }
  console.log('parsed type:', Array.isArray(parsed) ? `array ${parsed.length}` : Object.keys(parsed));
  const arr = Array.isArray(parsed) ? parsed : (parsed.questions || []);
  console.log('questions:', arr.length);
  console.log('sample[0]:', JSON.stringify(arr[0], null, 2));
  console.log('sample[last]:', JSON.stringify(arr[arr.length-1], null, 2));
  fs.writeFileSync(path.resolve(__dirname, `dump-${ID}.json`), c);
  process.exit(0);
})().catch(e=>{console.error(e); process.exit(1);});
