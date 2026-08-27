/** ชุดที่ 2 ข้อ 1-60 — เฉลยไม่มีหัว ต้องอ่านหาคำตอบเอง */
const path = require('path');
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname, '../../seed-gifted-m1/serviceAccountKey.json'))) });
const L = 'กขคง';
(async () => {
    const s = await admin.firestore().collection('exams').doc('7sdAGnFUbP1H03mpR3CH').get();
    const qs = s.data().questions;
    const [a, b] = [+process.argv[2] || 1, +process.argv[3] || 60];
    for (let i = a; i <= Math.min(b, qs.length); i++) {
        const q = qs[i - 1];
        console.log(`\n── ${i} · เก็บ ${L[q.correctIndex]} · ai ${q.answerIndex !== undefined ? L[q.answerIndex] : '-'} ──`);
        console.log('Q: ' + String(q.question).replace(/\s+/g, ' '));
        q.options.forEach((o, j) => console.log(`   ${L[j]}. ${String(o).replace(/\s+/g, ' ').slice(0, 42)}`));
        const e = String(q.explanation).replace(/\s+/g, ' ');
        console.log('E⋯ ' + e.slice(-210));
    }
    process.exit(0);
})();
