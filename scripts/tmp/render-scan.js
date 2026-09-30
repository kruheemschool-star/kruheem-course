const admin = require('firebase-admin');
const path = require('path');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'))) });
const db = admin.firestore();

const IDS = {
    qJe7moeg7guVZyUG5dMO: 'ม.4 เอกซ์โพเนนเชียล-ลอการิทึม',
    TDlFl2ESfOpLNYu3I7TJ: 'ม.6 ลำดับและอนุกรม',
    C4oNClMjwbd9dhWLuPef: 'ม.6 การแจกแจงความน่าจะเป็น ชุดที่ 1',
    G5m3lqao3vUJNLbxv2Ja: 'ม.6 การแจกแจงความน่าจะเป็น ชุดที่ 2',
};

// อักขระควบคุมที่ทำ MathRenderer พังตอนรอบก่อน (ยกเว้น \n \t)
const CTRL = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]');

(async () => {
    let bad = 0, total = 0;
    for (const [id, name] of Object.entries(IDS)) {
        const q = (await db.collection('exams').doc(id).get()).data().questions;
        const issues = [];
        q.forEach((x, i) => {
            total++;
            const all = [x.question, x.explanation, ...(x.options || [])].join(' ');
            if (CTRL.test(all)) issues.push(`ข้อ ${i + 1}: มีอักขระควบคุมแปลกปลอม`);
            for (const [f, s] of [['โจทย์', x.question], ['เฉลย', x.explanation]]) {
                const str = String(s);
                const blocks = (str.match(/\$\$/g) || []).length;
                if (blocks % 2) issues.push(`ข้อ ${i + 1}: $$ ไม่สมดุลใน${f}`);
                const inline = (str.replace(/\$\$[\s\S]*?\$\$/g, '').match(/(?<!\\)\$/g) || []).length;
                if (inline % 2) issues.push(`ข้อ ${i + 1}: $ ไม่สมดุลใน${f}`);
            }
            (x.options || []).forEach((o, oi) => {
                const inline = (String(o).replace(/\$\$[\s\S]*?\$\$/g, '').match(/(?<!\\)\$/g) || []).length;
                if (inline % 2) issues.push(`ข้อ ${i + 1}: $ ไม่สมดุลในตัวเลือกที่ ${oi + 1}`);
            });
            if (x.svg && !/<\/svg>\s*$/.test(String(x.svg).trim())) issues.push(`ข้อ ${i + 1}: svg ไม่ปิด tag`);
        });
        bad += issues.length;
        console.log(`${issues.length ? '⚠️ ' : '✅ '}${name}: ${issues.length ? issues.length + ' จุด' : 'ผ่าน'}  (${q.length} ข้อ)`);
        issues.slice(0, 8).forEach((e) => console.log('      - ' + e));
    }
    console.log(`\nรวมตรวจ ${total} ข้อ · พบปัญหา ${bad} จุด`);
    process.exit(0);
})();
