/** พิมพ์เฉพาะข้อที่ระบุ: node dumpn.js <examId> 18,20,23 */
const path = require('path');
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname, '../../seed-gifted-m1/serviceAccountKey.json'))) });
const L = 'กขคง';
(async () => {
    const s = await admin.firestore().collection('exams').doc(process.argv[2]).get();
    const qs = s.data().questions;
    for (const i of process.argv[3].split(',').map(Number)) {
        const q = qs[i - 1];
        const hd = (String(q.explanation).match(/คำตอบ\s*[:：]\s*ข้อ\s*([กขคง])/) || [])[1] || '-';
        console.log(`\n─── ข้อ ${i} · เก็บ ${L[q.correctIndex]} · หัวเฉลย ${hd} ───`);
        console.log('Q: ' + String(q.question).replace(/\s+/g, ' ').slice(0, 150));
        q.options.forEach((o, j) => console.log(`   ${L[j]}. ${String(o).replace(/\s+/g, ' ').slice(0, 48)}`));
        const e = String(q.explanation).replace(/\s+/g, ' ');
        console.log('E: ' + e.slice(0, 90) + ' ⋯ ' + e.slice(-210));
    }
    process.exit(0);
})();
