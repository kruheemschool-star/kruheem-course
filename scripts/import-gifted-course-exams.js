/**
 * คัดลอกชุดข้อสอบ "แบบฝึกหัด สอบเข้า ม.1 ห้อง GIFTED ชุดที่ 1-3" จากคลังข้อสอบ (`exams`)
 * เข้าเป็นบทเรียนตะลุยโจทย์ (type: 'html') ในคอร์ส "ติวเข้ม Gifted ม.1"
 * — โจทย์+เฉลยคัดลอกตรงจากคลังทุกตัวอักษร (verbatim), เก็บเป็น JSON string ใน field `content`
 *   ตาม shape เดียวกับบทเรียน "เส้นขนาน" (9zlbAfmLKl4jXVgykTTW) ที่ใช้งานอยู่แล้ว
 * — ไม่ใส่ field id รายข้อ: getQuestionKey จะ hash จากตัวโจทย์ กันคีย์ชนกันข้ามชุด
 *   (ระบบทำข้อที่ผิด/ฝึกหัวข้อ cross-set ใช้คีย์นี้)
 * — กันซ้ำด้วย title: ถ้ามีบทเรียนชื่อเดิมในคอร์สแล้วจะข้าม ไม่เขียนทับ
 * รัน: node scripts/import-gifted-course-exams.js          (dry-run ตรวจอย่างเดียว)
 *      node scripts/import-gifted-course-exams.js --apply  (เขียนจริง)
 */
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');

const COURSE_ID = 'HiHvqQmFz9s41oxW8lne'; // ติวเข้ม Gifted ม.1 — พิชิตทุกสนามสอบเข้าห้องพิเศษ

const SETS = [
    { examId: 'HGU5Z1yocS67YEcKs4iM', lessonTitle: 'แนวข้อสอบชุดที่ 1', order: 40, expectCount: 99 },
    { examId: 'pjqgphxSaz38cd5FPKWj', lessonTitle: 'แนวข้อสอบชุดที่ 2', order: 41, expectCount: 100 },
    { examId: '9DA2KagKT3LtmmmMfXAm', lessonTitle: 'แนวข้อสอบชุดที่ 3', order: 42, expectCount: 57 },
];

function validateQuestions(qs, name, expectCount) {
    const errs = [];
    if (!Array.isArray(qs)) throw new Error(`${name}: questions ไม่ใช่ array`);
    if (qs.length !== expectCount) errs.push(`จำนวนข้อ ${qs.length} != ${expectCount}`);
    qs.forEach((q, i) => {
        if (typeof q.question !== 'string' || !q.question.trim()) errs.push(`ข้อ ${i + 1}: question ว่าง`);
        if (!Array.isArray(q.options) || q.options.length !== 4) errs.push(`ข้อ ${i + 1}: options != 4`);
        if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) errs.push(`ข้อ ${i + 1}: correctIndex ผิด`);
        if (typeof q.explanation !== 'string' || !q.explanation.trim()) errs.push(`ข้อ ${i + 1}: ไม่มีเฉลย`);
        if ('svg' in q && !String(q.svg).startsWith('<svg')) errs.push(`ข้อ ${i + 1}: svg ผิดรูป`);
    });
    if (errs.length) throw new Error(`${name} ตรวจไม่ผ่าน:\n  - ` + errs.join('\n  - '));
    return qs;
}

(async () => {
    const courseSnap = await db.collection('courses').doc(COURSE_ID).get();
    if (!courseSnap.exists) throw new Error(`ไม่พบคอร์ส ${COURSE_ID}`);
    console.log(`คอร์สปลายทาง: ${courseSnap.data().title} [${COURSE_ID}]`);
    console.log(`โหมด: ${APPLY ? '✍️ เขียนจริง (--apply)' : '🔍 dry-run (ตรวจอย่างเดียว)'}\n`);

    const lessonsCol = db.collection('courses').doc(COURSE_ID).collection('lessons');
    let created = 0, skipped = 0;

    for (const s of SETS) {
        const examSnap = await db.collection('exams').doc(s.examId).get();
        if (!examSnap.exists) throw new Error(`ไม่พบชุดข้อสอบ ${s.examId}`);
        const exam = examSnap.data();
        let questions = exam.questions;
        if (typeof questions === 'string') questions = JSON.parse(questions);
        validateQuestions(questions, s.lessonTitle, s.expectCount);

        const content = JSON.stringify(questions);
        const sizeKB = Math.round(Buffer.byteLength(content, 'utf8') / 1024);
        if (sizeKB > 900) throw new Error(`${s.lessonTitle}: content ${sizeKB}KB ใกล้เพดาน 1MiB ของ Firestore`);

        // กันซ้ำ: มีบทเรียนชื่อเดียวกันในคอร์สแล้ว → ข้าม
        const dup = await lessonsCol.where('title', '==', s.lessonTitle).limit(1).get();
        if (!dup.empty) {
            console.log(`⏭️  ข้าม (มีอยู่แล้ว): ${s.lessonTitle} [id=${dup.docs[0].id}]`);
            skipped++;
            continue;
        }

        const payload = {
            title: s.lessonTitle,
            type: 'html',            // = บทเรียนตะลุยโจทย์ (ExamRunner อ่าน questions จาก content)
            headerId: '',
            htmlCode: '',
            isFree: false,           // เฉพาะสมาชิก ตามสิทธิ์ในคลังข้อสอบ
            order: s.order,
            content,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const src = (exam.title || '').replace(/\n/g, ' ');
        if (APPLY) {
            const ref = await lessonsCol.add(payload);
            console.log(`✅ สร้างแล้ว: ${s.lessonTitle} [id=${ref.id}] ← "${src}" (${questions.length} ข้อ, ${sizeKB}KB)`);
            created++;
        } else {
            console.log(`✔️  พร้อมนำเข้า: ${s.lessonTitle} ← "${src}" (${questions.length} ข้อ, ${sizeKB}KB, ตรวจผ่าน)`);
        }
    }

    console.log(`\nสรุป: ${APPLY ? `สร้าง ${created} / ข้าม ${skipped}` : `dry-run ผ่าน — รันซ้ำด้วย --apply เพื่อเขียนจริง`}`);
    process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
