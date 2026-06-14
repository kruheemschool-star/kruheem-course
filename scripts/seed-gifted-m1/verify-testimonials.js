const admin = require('firebase-admin'); const path = require('path');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname,'serviceAccountKey.json'))) });
const db = admin.firestore();
const FAKE = ['น้องเอ','น้องบี','คุณแม่ของน้องซี','น้องภูมิ','น้องใบเตย','น้องมาร์ค','น้องไอซ์','น้องแพร'];
(async()=>{
  const snap = await db.collection('courses').get();
  let anyFake = false;
  for (const d of snap.docs){
    const t = d.data().salesPage?.sections?.find(s=>s.type==='testimonial');
    if (!t) continue;
    const names = (t.data?.stories||[]).map(s=>s.name);
    const fakeFound = names.filter(n => FAKE.some(f => n.includes(f)));
    if (fakeFound.length) anyFake = true;
    console.log(`${fakeFound.length?'🔴':'✅'} ${d.data().title} | useReal:${t.data?.useRealReviews} | stories:[${names.join(', ')}]${fakeFound.length?'  ← FAKE: '+fakeFound.join(','):''}`);
  }
  console.log(`\n${anyFake?'🔴 STILL HAS FAKE':'✅ NO FABRICATED NAMES anywhere'}`);
  process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
