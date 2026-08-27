/**
 * หา "ตัวเลือกที่ตัวเลขไม่ได้อยู่ในโหมดคณิต ทั้งที่ตัวเลือกอื่นในข้อเดียวกันอยู่"
 *
 * ทำไมสำคัญ: ถ้าในข้อเดียวกันมี "20 เส้น" ปนกับ "$23\frac{1}{3}$ เส้น"
 * เลข 20 จะแสดงด้วยฟอนต์ปกติ ส่วนอีกสามตัวเป็นฟอนต์คณิต เด็กมองปราดเดียวก็รู้ว่าตัวไหนคือคำตอบ
 * โดยไม่ต้องคิดเลขเลย — เป็นการใบ้คำตอบที่ไม่ได้ตั้งใจ
 *
 * ตัวเลือกที่เป็นประโยคไทยล้วน เช่น "ไม่มีคำตอบ" ไม่นับ เพราะต่างโดยเนื้อหาจริง ไม่ใช่ความพลาดของการจัดรูปแบบ
 *
 * ⚠️ ต้องรู้จัก $$...$$ (display math) ด้วย ไม่งั้นจะอ่าน $$ เป็นคู่ $...$ ว่างๆ
 *    แล้วเข้าใจผิดว่าทุกอย่างข้างในอยู่นอกโหมดคณิต
 *
 * รัน: node scripts/exam-maintenance/optfmt/scan.js
 */
const path = require('path');
const fs = require('fs');

// ตัดเป็นชิ้น: ชิ้นที่เป็นโหมดคณิต ($$..$$ หรือ $..$) กับชิ้นข้อความธรรมดา
function split(s) {
    const out = [];
    const re = /\$\$[\s\S]*?\$\$|\$[^$\n]*?\$/g;
    let last = 0, m;
    while ((m = re.exec(String(s)))) {
        if (m.index > last) out.push({ math: false, t: String(s).slice(last, m.index) });
        out.push({ math: true, t: m[0] });
        last = m.index + m[0].length;
    }
    if (last < String(s).length) out.push({ math: false, t: String(s).slice(last) });
    return out;
}

const hasMathDigit = (s) => split(s).some((p) => p.math && /\d/.test(p.t));
const hasPlainDigit = (s) => split(s).some((p) => !p.math && /\d/.test(p.t));
const plainText = (s) => split(s).filter((p) => !p.math).map((p) => p.t).join('');

// เลขหนึ่งจำนวน รวมลูกน้ำคั่นหลักพันและทศนิยม — ต้องกินทั้ง 1,980 เป็นก้อนเดียว
const NUM = /-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?/g;

/**
 * แก้เฉพาะตัวเลือกที่เป็น "คำตอบตัวเลข" จริงๆ เช่น "20 เส้น" "1" "7.5" "512 ตารางเซนติเมตร"
 * ไม่แตะ
 *   - ประโยคไทยที่บังเอิญมีตัวเลขอยู่กลางประโยค (เช่น "มีค่าน้อยกว่าร้อยละ 90 ของพื้นที่ทั้งหมด")
 *     เพราะเลขกลางประโยคเป็นการพิมพ์ปกติ ไม่ได้ใบ้อะไร และใส่ $ แล้วฟอนต์จะแปลกกลางประโยค
 *   - ตัวเลือกที่มีสัญลักษณ์ LaTeX ลอยอยู่นอกโหมดคณิต (เช่น "x^5y^6") เพราะต้องครอบทั้งก้อน
 *     ไม่ใช่ครอบทีละเลข — เกินขอบเขตงานนี้ ให้คนตัดสิน
 */
function isNumericOption(s) {
    const t = plainText(s).trim();
    if (!t || !/\d/.test(t)) return false;
    if (/[A-Za-z\\^_{}]/.test(t)) return false;          // มี LaTeX/อังกฤษลอยอยู่นอกโหมดคณิต
    return /^-?\d/.test(t);                              // ต้อง "ขึ้นต้น" ด้วยตัวเลข ไม่ใช่ประโยคที่มีเลขแทรก
}

// ครอบตัวเลขที่อยู่นอกโหมดคณิตด้วย $...$ (ชิ้นที่เป็นคณิตอยู่แล้วไม่แตะ)
function wrapPlainNumbers(s) {
    return split(s).map((p) => (p.math ? p.t : p.t.replace(NUM, (n) => `$${n}$`))).join('');
}

// กันของพัง: จำนวน $ ต้องคู่ และห้ามเกิด $$$ ที่ไม่ได้ตั้งใจ
function safe(before, after) {
    if (after === before) return true;
    if (/\$\$\$/.test(after)) return false;
    const strip = (x) => String(x).replace(/\$/g, '').replace(/\s+/g, ' ').trim();
    return strip(after) === strip(before);   // เนื้อหาต้องเหมือนเดิมเป๊ะ เปลี่ยนแค่ $
}

module.exports = { split, hasMathDigit, hasPlainDigit, isNumericOption, wrapPlainNumbers, safe };

if (require.main === module) {
    const admin = require('firebase-admin');
    admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname, '../../seed-gifted-m1/serviceAccountKey.json'))) });
    (async () => {
        const snap = await admin.firestore().collection('exams').get();
        const report = [];
        let qTot = 0, hitQ = 0, hitOpt = 0, leakQ = 0, skip = 0;
        snap.forEach((d) => {
            const x = d.data();
            const rows = [];
            (x.questions || []).forEach((q, i) => {
                const os = q.options || [];
                if (os.length !== 4) return;
                qTot++;
                const math = os.map(hasMathDigit);
                const plain = os.map(hasPlainDigit);
                if (!math.some(Boolean) || !plain.some(Boolean)) return;
                const fix = os.map((o, j) => (plain[j] && isNumericOption(o) ? wrapPlainNumbers(o) : o));
                if (fix.every((v, j) => v === os[j])) return;
                if (!fix.every((v, j) => safe(os[j], v)) || new Set(fix).size !== 4) { skip++; return; }
                hitQ++;
                hitOpt += fix.filter((v, j) => v !== os[j]).length;
                const ci = q.correctIndex;
                const leak = plain[ci] && os.every((_, j) => j === ci || !plain[j]);
                if (leak) leakQ++;
                rows.push({ i: i + 1, ci, os, fix, leak });
            });
            if (rows.length) report.push({ id: d.id, title: String(x.title).replace(/\s+/g, ' '), cat: x.category, rows });
        });
        fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(report, null, 1), 'utf8');
        console.log(`สแกน ${qTot} ข้อ`);
        console.log(`ข้อที่ตัวเลขปนสองโหมด: ${hitQ} ข้อ · ตัวเลือกที่ต้องแก้ ${hitOpt} ตัว`);
        console.log(`ในนั้น "คำตอบถูกเป็นตัวเดียวที่เลขไม่อยู่ในโหมดคณิต" (ใบ้คำตอบ): ${leakQ} ข้อ`);
        console.log(`ข้ามเพราะแก้แล้วไม่ปลอดภัย/ตัวเลือกซ้ำ: ${skip} ข้อ`);
        console.log(`\nรายงานเต็ม: scripts/exam-maintenance/optfmt/report.json (${report.length} ชุด)`);
        report.slice().sort((a, b) => b.rows.length - a.rows.length).slice(0, 15)
            .forEach((r) => console.log(`   ${String(r.rows.length).padStart(4)} ข้อ | ${r.cat} | ${r.title.slice(0, 40)}`));
        process.exit(0);
    })();
}
