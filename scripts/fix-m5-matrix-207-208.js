/**
 * แก้ 2 ข้อสุดท้ายที่ยังมีข้อความ AI คุยกับตัวเองหลุด — ชุดเมทริกซ์ ม.5 เทอม 1
 * courses/nQIVvwyuJkrwK0pYQJKB/lessons/d932smhv7Nbqyk54xAjo
 *
 * ข้อ 207  det(A) ของเมทริกซ์ในโจทย์ = 7x - 10 โจทย์ระบุ det(A) = 15
 *          จะได้ x = 25/7 ซึ่งไม่มีในตัวเลือก (2, -3, 3, -2)
 *          เฉลยเดิมหาทางออกไม่ได้ เลยเขียนสารภาพไว้ในเฉลยว่า "ขออนุมานว่าโจทย์พิมพ์ผิด"
 *          → แก้โจทย์เป็น det(A) = 11 ซึ่งให้ x = 3 ตรงกับคำตอบเดิม (ข้อ 3)
 *          ตรวจด้วย SymPy: det = 7x - 10 → 7x = 21 → x = 3
 *
 * ข้อ 208  คำตอบถูกอยู่แล้ว (det(B) = 32) แต่ในคำอธิบายตัวลวงมีเศษข้อความหลุด
 *          "...เอ๊ะ ไม่ตรงตัวเลือก)" และเหตุผลของตัวลวงข้อ 1 เขียนสลับกับข้อ 3
 *          → เขียนเฉลยใหม่ ไม่แตะโจทย์และคำตอบ
 *
 * รัน: node scripts/fix-m5-matrix-207-208.js            (สำรอง + dry-run)
 *      node scripts/fix-m5-matrix-207-208.js --apply    (เขียนจริง)
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const { rebuildLessonsIndex } = require('./lib/lessons-index');

const APPLY = process.argv.includes('--apply');
const BACKUP_DIR = path.resolve(__dirname, 'backup-course-exam-fix');
const COURSE = 'nQIVvwyuJkrwK0pYQJKB';
const LESSON = 'd932smhv7Nbqyk54xAjo';

const QUES_207 = `กำหนดเมทริกซ์ $$A = \\begin{bmatrix} x & 2 & 1 \\\\ 0 & 3 & -1 \\\\ 2 & 1 & 2 \\end{bmatrix}$$ และทราบว่า $$\\det(A) = 11$$ จงหาค่าของ $$x$$`;

const EXPL_207 = `**คำตอบ: ข้อ 3.**

**1) หลักการคิด:** มีตัวแปรซ่อนอยู่ในเมทริกซ์ แปลว่าดีเทอร์มิแนนต์จะออกมาเป็นสมการของ $x$ แล้วเราค่อยเอาค่าที่โจทย์ให้มาจับเท่ากัน เคล็ดคือเลือกกระจายโคแฟกเตอร์ตามแนวที่มีเลข $0$ อยู่ เพราะพจน์นั้นจะหายไปเลย ประหยัดแรงไปหนึ่งตัว ข้อนี้หลักที่ 1 มี $0$ อยู่พอดี

**2) วิธีทำทีละขั้นตอน:**
กระจายโคแฟกเตอร์ตามหลักที่ 1
$$\\det(A) = a_{11}C_{11} + a_{21}C_{21} + a_{31}C_{31} = x \\cdot C_{11} + 0 \\cdot C_{21} + 2 \\cdot C_{31}$$

หา $C_{11}$
$$C_{11} = (-1)^{1+1}\\det\\begin{bmatrix} 3 & -1 \\\\ 1 & 2 \\end{bmatrix} = (6) - (-1) = 7$$

หา $C_{31}$
$$C_{31} = (-1)^{3+1}\\det\\begin{bmatrix} 2 & 1 \\\\ 3 & -1 \\end{bmatrix} = (-2) - (3) = -5$$

ประกอบกลับ
$$\\det(A) = 7x + 2(-5) = 7x - 10$$

โจทย์ให้ $\\det(A) = 11$
$$7x - 10 = 11 \\quad\\Rightarrow\\quad 7x = 21 \\quad\\Rightarrow\\quad x = 3$$

**3) จุดที่ควรระวัง:** เวลาใช้กฎคูณทแยง (ลงลบขึ้น) ต้องใส่วงเล็บครอบก้อนที่จะเอาไปลบให้ครบ ไม่งั้นเครื่องหมายของพจน์ที่มีตัวแปรจะพลิกผิดฝั่งทันที ลองตรวจด้วยกฎทแยงดูก็ได้ครับ ทแยงลงได้ $6x - 4$ ทแยงขึ้นได้ $6 - x$ เอามาลบกันได้ $7x - 10$ ตรงกับที่กระจายโคแฟกเตอร์พอดี

**4) จุดที่ผิดบ่อย:**
ตัวเลือกที่ 1 ($2$) มาจากคิด $C_{31}$ ได้ $-3$ ทำให้สมการกลายเป็น $7x - 6 = 11$
ตัวเลือกที่ 2 ($-3$) มาจากย้ายข้างผิดเครื่องหมาย ตั้งเป็น $7x = -21$
ตัวเลือกที่ 4 ($-2$) มาจากลืมว่า $C_{31}$ ติดลบ ทำให้ได้ $7x + 10 = 11$ แล้วแก้เพี้ยนต่อ`;

const EXPL_208 = `**คำตอบ: ข้อ 4.**

**1) หลักการคิด:** สมการเมทริกซ์ก็เหมือนตราชั่งครับ ถ้าสองข้างเท่ากัน ดีเทอร์มิแนนต์ของสองข้างก็ต้องเท่ากันด้วย เราจึงแค่ครอบ $\\det()$ ลงไปทั้งสองข้าง แล้วใช้สมบัติสองข้อคือ $\\det(AB) = \\det(A)\\det(B)$ กับการดึงสเกลาร์ออกจาก $\\det$

**2) วิธีทำทีละขั้นตอน:**
จาก $AB = 2C$ ครอบ $\\det$ ทั้งสองข้าง
$$\\det(AB) = \\det(2C)$$

ฝั่งซ้ายแยกการคูณได้
$$\\det(A) \\cdot \\det(B)$$

ฝั่งขวาดึงสเกลาร์ออก ต้องยกกำลังด้วยมิติของเมทริกซ์ซึ่งเป็น $3 \\times 3$
$$\\det(2C) = 2^3 \\cdot \\det(C) = 8\\det(C)$$

แทนค่าที่โจทย์ให้
$$4 \\cdot \\det(B) = 8 \\times 16 = 128$$
$$\\det(B) = \\frac{128}{4} = 32$$

**3) จุดที่ควรระวัง:** จุดชี้เป็นชี้ตายอยู่ที่ฝั่งขวา หลายคนเห็น $2C$ แล้วเขียน $2\\det(C)$ ดื้อๆ ซึ่งผิด ค่าคงที่ที่คูณอยู่กับเมทริกซ์ เวลาดึงออกมานอก $\\det$ ต้องยกกำลังด้วยมิติของเมทริกซ์เสมอ เมทริกซ์ $n \\times n$ ก็ยกกำลัง $n$

**4) จุดที่ผิดบ่อย:**
ตัวเลือกที่ 3 ($8$) คือข้อผิดพลาดที่ฮิตที่สุด เกิดจากดึง $2$ ออกมาเพียวๆ ได้ $4\\det(B) = 2(16) = 32$ แล้วหารเหลือ $8$
ตัวเลือกที่ 1 ($16$) มาจากยกกำลังแค่ $2^2$ เพราะเผลอใช้มิติของเมทริกซ์ $2 \\times 2$ ได้ $4\\det(B) = 64$
ตัวเลือกที่ 2 ($64$) มาจากเอา $\\det(C) \\times \\det(A) = 16 \\times 4$ ตรงๆ โดยไม่ผ่านสมการ`;

function backup(name, data) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const file = path.join(BACKUP_DIR, `${name}-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`  สำรอง → ${path.relative(process.cwd(), file)}`);
}
const getAnswer = (q) => q.answerIndex ?? q.correctIndex ?? q.correctAnswer;

(async () => {
    console.log(APPLY ? '=== เขียนจริง ===\n' : '=== dry-run (ยังไม่เขียน) ===\n');
    const ref = db.collection('courses').doc(COURSE).collection('lessons').doc(LESSON);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('ไม่พบบทเรียน');
    const data = snap.data();
    const qs = JSON.parse(data.content);
    backup('m5-matrix-content', data.content);

    const q207 = qs[206];
    if (!q207.question.includes('\\det(A) = 15')) throw new Error('ข้อ 207 ไม่ตรงกับที่คาด');
    if (String(q207.options[getAnswer(q207)]).trim() !== '3') throw new Error(`ข้อ 207 คำตอบเดิมไม่ใช่ 3 แต่เป็น "${q207.options[getAnswer(q207)]}"`);
    console.log(`  ข้อ 207: แก้โจทย์ det(A) = 15 → 11 (ของเดิมให้ x = 25/7 ซึ่งไม่มีในตัวเลือก) คำตอบคงเป็นข้อ ${getAnswer(q207) + 1} (x = 3)`);
    q207.question = QUES_207;
    q207.explanation = EXPL_207;

    const q208 = qs[207];
    if (!q208.question.includes('AB = 2C')) throw new Error('ข้อ 208 ไม่ตรงกับที่คาด');
    if (String(q208.options[getAnswer(q208)]).trim() !== '32') throw new Error(`ข้อ 208 คำตอบเดิมไม่ใช่ 32 แต่เป็น "${q208.options[getAnswer(q208)]}"`);
    console.log(`  ข้อ 208: คำตอบถูกอยู่แล้ว (ข้อ ${getAnswer(q208) + 1} = 32) เขียนเฉลยใหม่ล้างข้อความหลุด + แก้เหตุผลตัวลวงที่สลับกัน`);
    q208.explanation = EXPL_208;

    const dumpIdx = process.argv.indexOf('--dump');
    if (dumpIdx > -1 && process.argv[dumpIdx + 1]) {
        const dir = process.argv[dumpIdx + 1];
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'm5-matrix.json'), JSON.stringify(qs, null, 2));
        console.log(`เขียนผลลัพธ์ลง ${dir}`);
    }
    if (!APPLY) { console.log('\ndry-run จบ — ใส่ --apply เพื่อเขียนจริง'); process.exit(0); }

    const content = JSON.stringify(qs);
    const bytes = Buffer.byteLength(content, 'utf8');
    console.log(`\nขนาด content: ${bytes.toLocaleString()} bytes`);
    if (bytes > 1_000_000) throw new Error('ใหญ่เกินปลอดภัย — หยุด');
    await ref.update({ content });
    console.log('✅ เขียนชุดเมทริกซ์ ม.5 แล้ว');
    await rebuildLessonsIndex(db, COURSE);
    console.log('✅ สร้างสารบัญบทเรียนใหม่แล้ว');
    process.exit(0);
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
