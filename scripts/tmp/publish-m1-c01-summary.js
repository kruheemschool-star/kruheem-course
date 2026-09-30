// เปิดขายชุด "เอกสารสรุปบท คณิต ม.1 · บทที่ 1 จำนวนเต็ม" (ครูฮีมเคาะราคา 190 เมื่อ 2026-09-06)
const path = require('path');
const admin = require('firebase-admin');
const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const ID = 'Z1qS6fd3YJb4fGDOarft';
const APPLY = process.argv.includes('--apply');

(async () => {
    const snap = await db.doc(`examPapers/${ID}`).get();
    if (!snap.exists) throw new Error('ไม่พบ doc');
    const d = snap.data();
    console.log(`ก่อนแก้: "${d.title}" · ราคา ${d.price} · hidden ${d.hidden} · หมวด ${d.category}`);
    if (!APPLY) return console.log('(dry-run — รันด้วย --apply)');
    await db.doc(`examPapers/${ID}`).update({
        price: 190,
        hidden: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const after = (await db.doc(`examPapers/${ID}`).get()).data();
    console.log(`หลังแก้: ราคา ${after.price} · hidden ${after.hidden}`);
    console.log(`✅ เปิดขายแล้ว https://kruheemmath.com/exam-papers/${ID}`);
})().then(() => process.exit(0)).catch((e) => { console.error('❌', e.message); process.exit(1); });
