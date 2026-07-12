/**
 * นำเข้าชุดข้อสอบ "สแกนจุดอ่อนคณิต" (ฟรี 7 ชุด ป.ปลาย→ม.6) เข้า Firestore `exams`
 * — shape ตรงกับที่หลังบ้านสร้าง (questions เป็น array, questionCount sync, addDoc auto-id)
 * — isFree + showAnswerChecking เปิด (หน้าวิเคราะห์ 4 มุมต้องใช้), order:-1 ให้อยู่บนสุดของหมวด
 * — กันซ้ำด้วย title: ถ้ามีชุดชื่อเดิมอยู่แล้วจะข้าม ไม่เขียนทับ
 * รัน: node scripts/import-diagnostic-exams.js        (ตรวจอย่างเดียว dry-run)
 *      node scripts/import-diagnostic-exams.js --apply (เขียนจริง)
 */
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const HOME = process.env.HOME;
const BASE = path.join(HOME, 'Documents', 'kruheem-exams');
const APPLY = process.argv.includes('--apply');

const DESC = (scope, focus) =>
    `ชุดสแกนจุดอ่อนฟรี 24 ข้อ (~20 นาที) ครอบคลุม ${scope} ` +
    `ทำเสร็จเห็นผลวิเคราะห์ทันที 4 มุม: อ่อนสาระไหน อ่อนทักษะไหน (คิดเลข/เข้าใจ/แปลโจทย์) ` +
    `รูรั่วอยู่ชั้นไหน และพลาดเพราะอะไร — ${focus}`;

const SETS = [
    {
        file: 'diagnostic-p456/output/webquiz_entrance_m1_diagnostic_p456_24q.json',
        title: 'สแกนจุดอ่อนคณิต ป.ปลาย (เตรียมสอบเข้า ม.1)',
        description: DESC('8 สาระหลัก ป.4–ป.6', 'เช็กความพร้อมก่อนลงสนามสอบเข้า ม.1'),
        category: 'สอบเข้า ม.1', level: 'ป.6',
    },
    {
        file: 'diagnostic-m1/output/webquiz_m1_diagnostic_24q.json',
        title: 'สแกนจุดอ่อนคณิต ม.1',
        description: DESC('8 บทหลัก ม.1 ทั้งสองเทอม', 'รู้ก่อนสอบว่าบทไหนต้องซ่อม'),
        category: 'ม.1', level: 'ม.1',
    },
    {
        file: 'diagnostic-m2/output/webquiz_m2_diagnostic_24q.json',
        title: 'สแกนจุดอ่อนคณิต ม.2',
        description: DESC('8 บทหลัก ม.2 ทั้งสองเทอม', 'พีทาโกรัสถึงแยกตัวประกอบ เช็กครบในชุดเดียว'),
        category: 'ม.2', level: 'ม.2',
    },
    {
        file: 'diagnostic-m3/output/webquiz_m3_diagnostic_24q.json',
        title: 'สแกนจุดอ่อนคณิต ม.3 (เตรียมสอบเข้า ม.4)',
        description: DESC('8 บทหลัก ม.3 ทั้งสองเทอม', 'ปีสำคัญก่อนสอบเข้า ม.4 — รู้จุดอ่อนก่อนได้เปรียบ'),
        category: 'ม.3', level: 'ม.3',
    },
    {
        file: 'diagnostic-m4/output/webquiz_m4_diagnostic_24q.json',
        title: 'สแกนจุดอ่อนคณิต ม.4',
        description: DESC('8 บทหลัก ม.4 ทั้งสองเทอม', 'เซตถึงภาคตัดกรวย วางรากฐาน ม.ปลายให้แน่น'),
        category: 'ม.4', level: 'ม.4',
    },
    {
        file: 'diagnostic-m5/output/webquiz_m5_diagnostic_24q.json',
        title: 'สแกนจุดอ่อนคณิต ม.5',
        description: DESC('8 บทหลัก ม.5 ทั้งสองเทอม', 'ตรีโกณ เมทริกซ์ เวกเตอร์ เช็กครบก่อนขึ้น ม.6'),
        category: 'ม.5', level: 'ม.5',
    },
    {
        file: 'diagnostic-m6/output/webquiz_m6_diagnostic_24q.json',
        title: 'สแกนจุดอ่อนคณิต ม.6 (เตรียม TCAS)',
        description: DESC('แคลคูลัสและสถิติ ม.6', 'เช็กความพร้อมก่อนลงสนาม A-Level'),
        category: 'ม.6', level: 'ม.6',
    },
];

function validateQuestions(qs, name) {
    const errs = [];
    if (!Array.isArray(qs) || qs.length !== 24) errs.push(`จำนวนข้อ ${qs.length} != 24`);
    qs.forEach((q, i) => {
        if (typeof q.question !== 'string' || !q.question.trim()) errs.push(`ข้อ ${i + 1}: question ว่าง`);
        if (!Array.isArray(q.options) || q.options.length !== 4) errs.push(`ข้อ ${i + 1}: options != 4`);
        if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) errs.push(`ข้อ ${i + 1}: correctIndex ผิด`);
        if (typeof q.explanation !== 'string' || !q.explanation.startsWith('**คำตอบ')) errs.push(`ข้อ ${i + 1}: explanation ผิดรูป`);
        if (!Array.isArray(q.tags) || q.tags.length !== 5) errs.push(`ข้อ ${i + 1}: tags != 5`);
        if ('answer' in q || 'solution' in q || 'space' in q) errs.push(`ข้อ ${i + 1}: มี field ต้องห้าม`);
        if ('svg' in q && !String(q.svg).startsWith('<svg')) errs.push(`ข้อ ${i + 1}: svg ผิดรูป`);
    });
    if (errs.length) throw new Error(`${name} ตรวจไม่ผ่าน:\n  - ` + errs.join('\n  - '));
    return qs;
}

(async () => {
    // เช็กว่า category ทั้งหมดมีจริงใน examCategories (กันตกหมวด "อื่นๆ")
    const catSnap = await db.collection('examCategories').get();
    const known = new Set(catSnap.docs.map(d => d.data().name));
    for (const s of SETS) {
        if (!known.has(s.category)) throw new Error(`ไม่มีหมวด "${s.category}" ใน examCategories`);
    }
    console.log(`โหมด: ${APPLY ? '✍️ เขียนจริง (--apply)' : '🔍 dry-run (ตรวจอย่างเดียว)'}\n`);

    let created = 0, skipped = 0;
    for (const s of SETS) {
        const full = path.join(BASE, s.file);
        const questions = validateQuestions(JSON.parse(fs.readFileSync(full, 'utf8')), s.title);
        const sizeKB = Math.round(fs.statSync(full).size / 1024);

        // กันซ้ำ: มีชุดชื่อเดียวกันอยู่แล้ว → ข้าม
        const dup = await db.collection('exams').where('title', '==', s.title).limit(1).get();
        if (!dup.empty) {
            console.log(`⏭️  ข้าม (มีอยู่แล้ว): ${s.title} [id=${dup.docs[0].id}]`);
            skipped++;
            continue;
        }

        const payload = {
            title: s.title,
            description: s.description,
            category: s.category,
            level: s.level,
            questions,                       // array of objects — ตรงกับที่หลังบ้านเก็บ
            questionCount: questions.length,
            timeLimit: 20,                   // ~20 นาที ตามดีไซน์ชุดวินิจฉัย
            recommendedSecondsPerQuestion: 50, // 20 นาที / 24 ข้อ
            timedMode: false,                // ไม่บังคับจับเวลา (ของฟรีเน้นทำจบ)
            difficulty: 'Medium',
            isFree: true,                    // ⭐ ชุดฟรี — กรวยเข้าคลังเต็ม
            hidden: false,
            showAnswerChecking: true,        // ⭐ ต้องเปิด หน้าวิเคราะห์ 4 มุมถึงแสดง
            order: -1,                       // ขึ้นบนสุดของหมวด (ลากจัดใหม่ในหลังบ้านได้)
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (APPLY) {
            const ref = await db.collection('exams').add(payload);
            console.log(`✅ สร้างแล้ว: ${s.title} → ${s.category} [id=${ref.id}] (${sizeKB}KB, 24 ข้อ)`);
            created++;
        } else {
            console.log(`✔️  พร้อมนำเข้า: ${s.title} → ${s.category} (${sizeKB}KB, 24 ข้อ, ตรวจผ่าน)`);
        }
    }
    console.log(`\nสรุป: ${APPLY ? `สร้าง ${created} / ข้าม ${skipped}` : `ตรวจผ่านทั้ง ${SETS.length} ชุด — รันซ้ำด้วย --apply เพื่อเขียนจริง`}`);
    process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
