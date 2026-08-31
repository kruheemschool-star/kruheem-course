/**
 * แก้ข้อบกพร่องในชุดข้อสอบของคอร์ส ที่พบจากการตรวจกรณีผู้ปกครองทักท้วง (2026-08-31)
 *
 * 1) คอร์ส ม.1 เทอม 1 · "แนวข้อสอบ: จำนวนเต็ม"
 *    - ข้อ 158 เฉลยชี้ผิดตัว: (-5)(4)(-2)(-3) / (-15-(-3)) = -120/-12 = 10 → ต้องเป็นข้อ 2
 *      (ระบบเก็บ answerIndex 0 = -10) เด็กตอบถูกแล้วโดนตัดว่าผิด
 *    - ข้อ 110 โจทย์พัง: a=-2, b=-3, c=4 แล้วตัวเลือก 2, 3, 4 ถูกพร้อมกันทั้งสามข้อ
 *      → แก้ค่าที่ระบุในตัวเลือก 1-3 ให้ผิด เหลือถูกข้อเดียวคือข้อ 4 (คง answerIndex เดิม)
 *    - ทั้งสองข้อมีข้อความ AI คุยกับตัวเองหลุดอยู่ในเฉลย ("เอ๊ะ! เดี๋ยวนะ",
 *      "ขออนุญาตปรับ answerIndex") → เขียนเฉลยใหม่ทั้งข้อ
 *
 * 2) คอร์ส ป.6 สอบเข้า ม.1 · "การหารทศนิยม"
 *    - ข้อ 87 คำผิด "ตัดตัดชุดละ" → "ตัดชุดละ"
 *
 * สำรองก่อนเสมอ: เขียน JSON ของ content เดิมลง scripts/backup-course-exam-fix/
 *
 * รัน: node scripts/fix-course-exam-answer-defects.js          (สำรอง + dry-run)
 *      node scripts/fix-course-exam-answer-defects.js --apply  (เขียนจริง)
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

const M1_COURSE = 'fhoc1u2JT8WghFHapzx8';
const M1_LESSON = 'AwZXP71PyhKw8Z5LhGrC'; // แนวข้อสอบ: จำนวนเต็ม (170 ข้อ)
const P6_COURSE = 'lBj1ZUlnBiU8vv3lm94y';
const P6_LESSON = '35CkVbfKqQO0Lieu6WQO'; // การหารทศนิยม (100 ข้อ)

/* ── เฉลยใหม่ ข้อ 158 (index 157) ─────────────────────────────────────────── */
const EXPL_158 = `## หลักการที่ใช้
ข้อนี้วัด **การคูณและการหารจำนวนเต็ม** ที่เครื่องหมายลบเกลื่อนไปหมด กับ **ลำดับการดำเนินการ** — ตัวเศษกับตัวส่วนต้องเคลียร์ให้จบก่อน ถึงจะเอามาหารกันได้

---

## แสดงวิธีทำอย่างละเอียด
นับเครื่องหมายลบก่อน แล้วค่อยคูณตัวเลข จะไม่หลง

**ขั้นที่ 1: เคลียร์ตัวเศษ**
$$(-5) \\times 4 \\times (-2) \\times (-3)$$

เทคนิคลับจากครูฮีม: อย่าเพิ่งคูณ ให้นับก่อนว่ามีเครื่องหมายลบกี่ตัว — ข้อนี้มี 3 ตัว เป็นเลขคี่ แปลว่าผลลัพธ์ **ติดลบ** แน่นอน รู้ตั้งแต่ยังไม่คูณ
จากนั้นค่อยคูณตัวเลขเปล่าๆ
$$5 \\times 4 \\times 2 \\times 3 = 120$$
เอาเครื่องหมายที่นับไว้มาใส่ ตัวเศษคือ $-120$

**ขั้นที่ 2: เคลียร์ตัวส่วน**
$$-15 - (-3)$$

ลบเจอลบกลายเป็นบวก
$$-15 + 3 = -12$$

**ขั้นที่ 3: หารกัน**
$$\\frac{-120}{-12} = 10$$

ลบหารลบได้บวก คำตอบจึงเป็นบวก $10$ ไม่ใช่ $-10$

---

## จุดอันตราย ⚠️
คนที่พลาดข้อนี้ส่วนใหญ่คิดเลขถูกหมด แต่ไปตกตอนบรรทัดสุดท้าย เห็นตัวเศษติดลบก็เผลอลากเครื่องหมายลบไปติดคำตอบด้วย ทั้งที่ตัวส่วนก็ลบเหมือนกัน — ลบสองตัวหักล้างกันไปแล้ว

**จำไว้: นับเครื่องหมายลบให้ครบทั้งบนและล่างก่อนตอบ อย่านับแค่ข้างบน**`;

/* ── เฉลยใหม่ ข้อ 110 (index 109) ─────────────────────────────────────────── */
const EXPL_110 = `## หลักการที่ใช้
ข้อนี้เป็น **การแทนค่าตัวแปร** ล้วนๆ แต่ที่ทำให้เสียเวลาคือมันบังคับให้ตรวจครบทุกตัวเลือก จะเดาจากหน้าตาไม่ได้เลย

---

## แสดงวิธีทำอย่างละเอียด
แทนค่า $a = -2$, $b = -3$, $c = 4$ แล้วไล่ทีละข้อ เจอข้อที่ตรงเมื่อไหร่ค่อยหยุด

**ตัวเลือก 1:** $a - b + c$
$$(-2) - (-3) + 4 = -2 + 3 + 4 = 5$$
ในตัวเลือกบอกว่าได้ $-1$ → ไม่ตรง

**ตัวเลือก 2:** $ab - c$
$$(-2)(-3) - 4 = 6 - 4 = 2$$
ในตัวเลือกบอกว่าได้ $10$ → ไม่ตรง

**ตัวเลือก 3:** $\\dfrac{a + b}{c}$
$$\\frac{(-2) + (-3)}{4} = \\frac{-5}{4} = -1.25$$
ในตัวเลือกบอกว่าได้ $1.25$ → เครื่องหมายไม่ตรง

**ตัวเลือก 4:** $a(b + c)$
$$-2 \\times ((-3) + 4) = -2 \\times 1 = -2$$
ตรงพอดี ข้อนี้คือคำตอบ

---

## จุดอันตราย ⚠️
ตัวเลือก 3 คือตัวที่คนออกข้อสอบวางไว้ดักโดยเฉพาะ ตัวเลขถูกเป๊ะทุกหลัก ผิดแค่เครื่องหมายลบตัวเดียว คนที่คิดในใจแล้วรีบกาจะไม่ทันสังเกต

ส่วนตัวเลือก 2 ดักคนที่จำสลับว่าลบคูณลบได้ลบ ถ้าคิด $(-2)(-3)$ เป็น $-6$ แล้วเผลอลบ $c$ เป็นบวก ก็จะได้เลขคนละทางไปเลย

**จำไว้: โจทย์แบบ "ข้อใดถูกต้อง" ห้ามหยุดที่ตัวเลข ต้องเช็คเครื่องหมายซ้ำอีกรอบก่อนกา**`;

/* ── ตัวเลือกใหม่ ข้อ 110 ─────────────────────────────────────────────────── */
const OPTIONS_110 = [
    '$a - b + c = -1$',
    '$ab - c = 10$',
    '$\\frac{a + b}{c} = 1.25$',
    '$a(b + c) = -2$',
];

function backup(name, data) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const file = path.join(BACKUP_DIR, `${name}-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`  สำรองไว้ที่ ${path.relative(process.cwd(), file)}`);
}

async function loadQuestions(courseId, lessonId) {
    const ref = db.collection('courses').doc(courseId).collection('lessons').doc(lessonId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`ไม่พบบทเรียน ${courseId}/${lessonId}`);
    const data = snap.data();
    const questions = JSON.parse(data.content);
    if (!Array.isArray(questions)) throw new Error('content ไม่ใช่อาร์เรย์ข้อสอบ');
    return { ref, data, questions };
}

(async () => {
    console.log(APPLY ? '=== โหมดเขียนจริง ===\n' : '=== โหมด dry-run (ยังไม่เขียน) ===\n');

    /* ── 1) ชุดจำนวนเต็ม ม.1 ── */
    console.log('[1] ม.1 เทอม 1 · แนวข้อสอบ: จำนวนเต็ม');
    const m1 = await loadQuestions(M1_COURSE, M1_LESSON);
    backup('m1-integers-content', m1.data.content);

    const q158 = m1.questions[157];
    const q110 = m1.questions[109];

    // กันแก้ผิดข้อ: ยืนยันว่าเป็นข้อที่ตั้งใจแก้จริง
    if (!q158.question.includes('-15-(-3)')) throw new Error('ข้อ 158 ไม่ตรงกับที่คาด — หยุดก่อน');
    if (!q110.question.includes('a = -2, b = -3')) throw new Error('ข้อ 110 ไม่ตรงกับที่คาด — หยุดก่อน');

    console.log(`  ข้อ 158: answerIndex ${q158.answerIndex} → 1 (ข้อ ${q158.answerIndex + 1} → ข้อ 2 = "${q158.options[1]}")`);
    q158.answerIndex = 1;
    q158.explanation = EXPL_158;

    console.log('  ข้อ 110: เขียนตัวเลือกใหม่ให้เหลือถูกข้อเดียว');
    q110.options.forEach((o, i) => console.log(`      ${i + 1}) ${o}  →  ${OPTIONS_110[i]}`));
    q110.options = OPTIONS_110;
    q110.explanation = EXPL_110;
    console.log(`      answerIndex คงเดิมที่ ${q110.answerIndex} (ข้อ ${q110.answerIndex + 1})`);

    /* ── 2) ชุดการหารทศนิยม ป.6 ── */
    console.log('\n[2] ป.6 สอบเข้า ม.1 · การหารทศนิยม');
    const p6 = await loadQuestions(P6_COURSE, P6_LESSON);
    backup('p6-decimal-division-content', p6.data.content);

    const q87 = p6.questions[86];
    if (!q87.question.includes('ตัดตัด')) throw new Error('ข้อ 87 ไม่พบคำผิด "ตัดตัด" — หยุดก่อน');
    const before87 = q87.question;
    q87.question = q87.question.replace('ตัดตัดชุดละ', 'ตัดชุดละ');
    console.log(`  ข้อ 87: "${before87}"\n      →  "${q87.question}"`);

    // --dump <dir> : เขียนผลลัพธ์ที่แก้แล้วลงไฟล์ ไว้ให้ตัวตรวจอ่านก่อนเขียนจริง
    const dumpIdx = process.argv.indexOf('--dump');
    if (dumpIdx > -1 && process.argv[dumpIdx + 1]) {
        const dir = process.argv[dumpIdx + 1];
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'm1-integers.json'), JSON.stringify(m1.questions, null, 2));
        fs.writeFileSync(path.join(dir, 'p6-decimal-division.json'), JSON.stringify(p6.questions, null, 2));
        console.log(`\nเขียนผลลัพธ์ที่แก้แล้วลง ${dir} เรียบร้อย`);
    }

    if (!APPLY) {
        console.log('\ndry-run จบ — ใส่ --apply เพื่อเขียนจริง');
        process.exit(0);
    }

    /* ── เขียนจริง ── */
    const m1Content = JSON.stringify(m1.questions);
    const p6Content = JSON.stringify(p6.questions);
    const LIMIT = 1_048_576;
    [['ม.1 จำนวนเต็ม', m1Content], ['ป.6 การหารทศนิยม', p6Content]].forEach(([label, c]) => {
        const bytes = Buffer.byteLength(c, 'utf8');
        console.log(`\nขนาด content ${label}: ${bytes.toLocaleString()} bytes (${((bytes / LIMIT) * 100).toFixed(1)}% ของเพดาน 1MiB)`);
        if (bytes > 1_000_000) throw new Error(`${label} ใหญ่เกินปลอดภัย — หยุดก่อน`);
    });

    await m1.ref.update({ content: m1Content });
    console.log('\n✅ เขียนชุดจำนวนเต็ม ม.1 แล้ว');
    await p6.ref.update({ content: p6Content });
    console.log('✅ เขียนชุดการหารทศนิยม ป.6 แล้ว');

    await rebuildLessonsIndex(db, M1_COURSE);
    await rebuildLessonsIndex(db, P6_COURSE);
    console.log('✅ สร้างสารบัญบทเรียนใหม่ทั้งสองคอร์สแล้ว');

    process.exit(0);
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
