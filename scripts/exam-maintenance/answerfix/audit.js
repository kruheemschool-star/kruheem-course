/**
 * ตรวจว่า correctIndex ที่เก็บไว้ ตรงกับ "คำตอบที่เฉลยเขียนไว้จริง" หรือไม่
 *
 * ที่มา: ชุดสอบเข้า ม.1 มีการกระจายคำตอบพิลึก (63/0/24/11 — ตัวเลือก ข ไม่เคยเป็นคำตอบเลย)
 * พอเปิดอ่านจึงพบว่าไม่ใช่การออกแบบเอียง แต่เป็น correctIndex ผิด — เฉลยชี้ตัวหนึ่ง แต่ระบบเก็บอีกตัวหนึ่ง
 * เด็กตอบถูกแล้วโดนตัดว่าผิด
 *
 * วิธีตรวจสองชั้น
 *   ชั้นที่ 1  หัวเฉลย "คำตอบ: ข้อ ก/ข/ค/ง" บอกตัวอักษรมาตรงๆ
 *   ชั้นที่ 2  ดึง "ค่าคำตอบสุดท้าย" จากท้ายเฉลย แล้วจับคู่กับข้อความในตัวเลือก
 * สองชั้นตรงกันเมื่อไหร่ = มั่นใจ · ไม่ตรงกัน = ต้องอ่านเอง
 *
 * รัน: node scripts/exam-maintenance/answerfix/audit.js <examId ...>
 */
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname, '../../seed-gifted-m1/serviceAccountKey.json'))) });

const L = 'กขคง';

// ทำข้อความให้เทียบกันได้ — ตัด LaTeX, ตัดวรรค, ตัดลูกน้ำในตัวเลข
function norm(s) {
    return String(s)
        .replace(/\$+/g, ' ')
        .replace(/\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1/$2')
        .replace(/\\times/g, '*').replace(/\\div/g, '/')
        .replace(/\\[a-zA-Z]+/g, ' ')
        .replace(/[{}]/g, ' ')
        .replace(/(\d),(\d)/g, '$1$2')
        .replace(/\s+/g, ' ')
        .trim();
}
// ตัวเลขทั้งหมดในข้อความ (ตัดลูกน้ำหลักพันออกแล้ว)
const nums = (s) => (norm(s).match(/-?\d+(?:\.\d+)?/g) || []).map((x) => String(parseFloat(x)));

function headerLetter(exp) {
    const m = String(exp).match(/คำตอบ\s*[:：]\s*ข้อ\s*([กขคง])/);
    return m ? L.indexOf(m[1]) : -1;
}

// เดาคำตอบจากเนื้อเฉลย: ดูประโยคสรุปท้ายๆ ว่าเอ่ยถึงค่าไหน แล้วค่านั้นตรงกับตัวเลือกใดตัวเดียว
function guessFromBody(exp, options) {
    const e = String(exp);
    const tail = e.slice(Math.floor(e.length * 0.45));          // ครึ่งหลังของเฉลย
    const claims = [];
    const re = /(?:คำตอบคือ|คำตอบที่ถูกต้องคือ|ดังนั้น\s*คำตอบคือ|จึงตอบ|ตอบว่า|สรุป\s*[:：]?\s*ตอบ|ตอบ)\s*([^\n]{0,60})/g;
    let m;
    while ((m = re.exec(tail))) claims.push(m[1]);
    const lastDisplay = [...e.matchAll(/\$\$([^$]+)\$\$/g)].map((x) => x[1]).slice(-3);
    claims.push(...lastDisplay);
    if (!claims.length) return -1;

    const scores = options.map((o) => {
        const on = nums(o);
        if (!on.length) return 0;
        const key = on[on.length - 1];                           // ตัวเลขตัวสุดท้ายของตัวเลือก (มักเป็นค่าคำตอบ)
        let s = 0;
        claims.forEach((c, ci) => {
            const cn = nums(c);
            if (cn.includes(key)) s += (ci < 3 ? 3 : 1);          // ประโยค "คำตอบคือ..." น้ำหนักมากกว่าสมการท้าย
            if (on.every((v) => cn.includes(v)) && on.length > 1) s += 2;
        });
        return s;
    });
    const mx = Math.max(...scores);
    if (mx === 0) return -1;
    if (scores.filter((v) => v === mx).length !== 1) return -1;    // เสมอกัน = ไม่มั่นใจ
    return scores.indexOf(mx);
}

(async () => {
    const ids = process.argv.slice(2).filter((a) => !a.startsWith('-'));
    const db = admin.firestore();
    const out = [];
    for (const id of ids) {
        const s = await db.collection('exams').doc(id).get();
        if (!s.exists) { console.error('ไม่พบ ' + id); continue; }
        const x = s.data();
        const qs = x.questions || [];
        const rows = [];
        qs.forEach((q, i) => {
            const ci = q.correctIndex;
            const hd = headerLetter(q.explanation);
            const gs = guessFromBody(q.explanation, q.options || []);
            let verdict;
            if (hd >= 0 && gs >= 0 && hd === gs) verdict = hd === ci ? 'ตรง' : 'ผิดแน่นอน';
            else if (hd >= 0 && gs < 0) verdict = hd === ci ? 'ตรง(หัวอย่างเดียว)' : 'น่าจะผิด(หัวอย่างเดียว)';
            else if (hd < 0 && gs >= 0) verdict = gs === ci ? 'ตรง(เนื้ออย่างเดียว)' : 'น่าจะผิด(เนื้ออย่างเดียว)';
            else if (hd >= 0 && gs >= 0) verdict = 'หัวกับเนื้อขัดกัน';
            else verdict = 'อ่านเองไม่ออก';
            rows.push({ i: i + 1, ci, hd, gs, verdict, options: q.options, q: String(q.question).slice(0, 90) });
        });
        const tally = {};
        rows.forEach((r) => { tally[r.verdict] = (tally[r.verdict] || 0) + 1; });
        console.log(`\n════ ${String(x.title).replace(/\s+/g, ' ')} (${qs.length} ข้อ) ════`);
        Object.entries(tally).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`   ${String(v).padStart(3)}  ${k}`));
        out.push({ id, title: String(x.title).replace(/\s+/g, ' '), rows });
    }
    fs.writeFileSync(path.join(__dirname, 'audit.json'), JSON.stringify(out, null, 1), 'utf8');
    console.log('\nเขียน scripts/exam-maintenance/answerfix/audit.json');
    process.exit(0);
})();
