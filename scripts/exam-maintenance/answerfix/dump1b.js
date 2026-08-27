/** ชุดที่ 1 ข้อ 1-51: ดึงประโยคสรุปคำตอบออกมาให้เห็น (เฉลยยาว คำตอบอยู่กลางเรื่อง) */
const path = require('path');
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname, '../../seed-gifted-m1/serviceAccountKey.json'))) });
const L = 'กขคง';
(async () => {
    const s = await admin.firestore().collection('exams').doc('095GrIS5n200tSGqfdO8').get();
    const qs = s.data().questions;
    const [a, b] = [+process.argv[2] || 1, +process.argv[3] || 51];
    for (let i = a; i <= Math.min(b, qs.length); i++) {
        const q = qs[i - 1];
        console.log(`\n── ${i} · เก็บ ${L[q.correctIndex]} · answerIndex ${L[q.answerIndex]} ──`);
        console.log('Q: ' + String(q.question).replace(/\s+/g, ' ').slice(0, 120));
        q.options.forEach((o, j) => console.log(`   ${L[j]}. ${String(o).replace(/\s+/g, ' ').slice(0, 40)}`));
        // ประโยคที่มี ✅ หรือคำว่าคำตอบ/สรุป — คือจุดที่เฉลยชี้คำตอบ
        const e = String(q.explanation).replace(/\s+/g, ' ');
        const hits = e.split(/(?<=[✅❌])|(?=\*\*)/).filter((t) => /✅|คำตอบคือ|สรุป.*ตอบ|ดังนั้น/.test(t));
        console.log('E: ' + (hits.slice(0, 3).join(' ').slice(0, 300) || e.slice(-160)));
    }
    process.exit(0);
})();
