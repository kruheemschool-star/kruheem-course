/** พิมพ์ข้อสอบแบบกระชับสำหรับอ่านตรวจด้วยตา: node dump.js <examId> <จากข้อ> <ถึงข้อ> */
const path = require('path');
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname, '../../seed-gifted-m1/serviceAccountKey.json'))) });
const L = 'กขคง';
const [id, a, b] = [process.argv[2], +process.argv[3] || 1, +process.argv[4] || 999];
(async () => {
    const s = await admin.firestore().collection('exams').doc(id).get();
    const qs = s.data().questions;
    for (let i = a; i <= Math.min(b, qs.length); i++) {
        const q = qs[i - 1];
        const hd = (String(q.explanation).match(/คำตอบ\s*[:：]\s*ข้อ\s*([กขคง])/) || [])[1] || '-';
        console.log(`\n─── ข้อ ${i} · เก็บ ${L[q.correctIndex]} · หัวเฉลย ${hd} ───`);
        console.log('Q: ' + String(q.question).replace(/\s+/g, ' ').slice(0, 150));
        q.options.forEach((o, j) => console.log(`   ${L[j]}. ${String(o).replace(/\s+/g, ' ').slice(0, 52)}`));
        const e = String(q.explanation).replace(/\s+/g, ' ');
        console.log('E: ' + e.slice(0, 120) + '  ⋯  ' + e.slice(-230));
    }
    process.exit(0);
})();
