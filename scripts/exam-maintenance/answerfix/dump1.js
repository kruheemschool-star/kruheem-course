/** ชุดที่ 1 เฉลยยาวและไม่มีหัว — พิมพ์ท้ายเฉลยยาวขึ้นเพื่ออ่านหาคำตอบ */
const path = require('path');
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname, '../../seed-gifted-m1/serviceAccountKey.json'))) });
const L = 'กขคง';
(async () => {
    const s = await admin.firestore().collection('exams').doc('095GrIS5n200tSGqfdO8').get();
    const qs = s.data().questions;
    const [a, b] = [+process.argv[2] || 1, +process.argv[3] || 999];
    for (let i = a; i <= Math.min(b, qs.length); i++) {
        const q = qs[i - 1];
        console.log(`\n─── ${i} · เก็บ ${L[q.correctIndex]} ───`);
        console.log('Q: ' + String(q.question).replace(/\s+/g, ' ').slice(0, 135));
        q.options.forEach((o, j) => console.log(`   ${L[j]}. ${String(o).replace(/\s+/g, ' ').slice(0, 44)}`));
        const e = String(q.explanation).replace(/\s+/g, ' ');
        console.log('E⋯ ' + e.slice(-330));
    }
    process.exit(0);
})();
