/** พิมพ์โจทย์+ตัวเลือกแบบเต็ม (ไม่ตัด) ของชุดที่ 1 */
const path = require('path');
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname, '../../seed-gifted-m1/serviceAccountKey.json'))) });
const L = 'กขคง';
(async () => {
    const s = await admin.firestore().collection('exams').doc(process.argv[2] || '095GrIS5n200tSGqfdO8').get();
    const qs = s.data().questions;
    for (const i of process.argv[3].split(',').map(Number)) {
        const q = qs[i - 1];
        console.log(`\n══ ${i} · เก็บ ${L[q.correctIndex]} · answerIndex ${q.answerIndex !== undefined ? L[q.answerIndex] : '-'} ══`);
        console.log('Q: ' + String(q.question).replace(/\s+/g, ' '));
        q.options.forEach((o, j) => console.log(`   ${L[j]}. ${String(o).replace(/\s+/g, ' ')}`));
    }
    process.exit(0);
})();
