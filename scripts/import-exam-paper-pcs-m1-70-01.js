/**
 * ลงสินค้าร้านข้อสอบ PDF: "แนวข้อสอบเข้า ม.1 จุฬาภรณราชวิทยาลัย (จ.ภ.) ชุดที่ 1 ปี 2570"
 *
 * ของที่ลง (สร้าง doc ใหม่ใน examPapers แบบ hidden: true — รอครูฮีมเคาะราคาแล้วค่อยเปิด):
 *   1. เล่มข้อสอบ 38 หน้า  -> exam-pdfs/{docId}/ (private, โหลดผ่าน /api/download-pdf เท่านั้น)
 *   2. เล่มเฉลย 46 หน้า    -> exam-pdfs/{docId}/ (private)
 *   3. ตัวอย่างฟรี 8 หน้าแรก -> exam-paper-previews/ (public)
 *   4. ปก (หน้า 1 เรนเดอร์เป็น JPEG 1200px) -> exam-paper-covers/ (public)
 *   5. analysis.chapters ตามตารางกระจายเนื้อหาหน้า 6 ของเล่มจริง (30 ข้อ)
 *
 * รัน: node scripts/import-exam-paper-pcs-m1-70-01.js          (dry-run)
 *      node scripts/import-exam-paper-pcs-m1-70-01.js --apply  (เขียนจริง)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
const BUCKET = 'kruheem-course-45088.firebasestorage.app';
admin.initializeApp({ credential: admin.credential.cert(sa), storageBucket: BUCKET });

const db = admin.firestore();
const bucket = admin.storage().bucket();
const APPLY = process.argv.includes('--apply');

const SCRATCH = '/private/tmp/claude-501/-Users-kruheem-Documents-webapp-kruheem-course/97b0a7b5-5161-4bcd-87ab-868933085505/scratchpad';
const SRC = {
    exam: '/Users/kruheem/Downloads/แนวข้อสอบโรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย.pdf',
    solutions: '/Users/kruheem/Downloads/เฉลยแนวข้อสอบโรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย.pdf',
    preview: path.join(SCRATCH, 'pcs-m1-70-01-preview.pdf'),
    cover: path.join(SCRATCH, 'pcs-m1-70-01-cover.jpg'),
};

// public URL แบบเดียวกับ getDownloadURL ของ client SDK (token ฝังใน metadata)
const publicUrl = (dest, token) =>
    `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;

(async () => {
    for (const [k, p] of Object.entries(SRC)) {
        if (!fs.existsSync(p)) throw new Error(`ไม่พบไฟล์ ${k}: ${p}`);
        console.log(`ไฟล์ ${k.padEnd(9)} ${Math.round(fs.statSync(p).size / 1024)} KB · ${p}`);
    }

    // กันลงซ้ำ
    const dup = await db.collection('examPapers').where('title', '>=', 'แนวข้อสอบเข้า ม.1 จุฬาภรณ').where('title', '<', 'แนวข้อสอบเข้า ม.1 จุฬาภรทฮ').get();
    if (!dup.empty) {
        console.log(`⚠️ มีชุดชื่อคล้ายกันอยู่แล้ว ${dup.size} ชุด:`);
        dup.forEach((d) => console.log(`   ${d.id} · ${d.data().title}`));
        if (APPLY) throw new Error('ยกเลิก — กันลงซ้ำ (ลบ/เช็ค doc เดิมก่อน)');
    }

    const ref = db.collection('examPapers').doc(); // auto id
    const ts = Date.now();
    const files = [
        { id: crypto.randomUUID(), label: 'ตัวข้อสอบ', name: 'pcs-m1-70-01-exam.pdf', path: `exam-pdfs/${ref.id}/${ts}_pcs-m1-70-01-exam.pdf`, src: SRC.exam },
        { id: crypto.randomUUID(), label: 'เฉลย', name: 'pcs-m1-70-01-solutions.pdf', path: `exam-pdfs/${ref.id}/${ts}_pcs-m1-70-01-solutions.pdf`, src: SRC.solutions },
    ];
    const previewDest = `exam-paper-previews/${ref.id}_preview.pdf`;
    const previewToken = crypto.randomUUID();
    const coverDest = `exam-paper-covers/${ref.id}_cover.jpg`;
    const coverToken = crypto.randomUUID();

    const docData = {
        title: 'แนวข้อสอบเข้า ม.1 จุฬาภรณราชวิทยาลัย จ.ภ. (ปี2570) ชุดที่ 1',
        description:
            'แนวข้อสอบพยากรณ์ 30 ข้อ แบบเติมคำตอบ+แสดงวิธีทำ ตรงรูปแบบสนามจริง จ.ภ. รอบแรก '
            + '(2 ตอน 62 คะแนน 120 นาที) ระดับเข้มข้น ใช้ซ้อมได้ทั้งสนาม Gifted และห้องเรียนพิเศษวิทย์–คณิต '
            + 'แยกเล่มข้อสอบ/เล่มเฉลยวิธีทำละเอียดทุกข้อ พร้อมเกณฑ์ให้คะแนนตรวจเองและเทคนิคทำข้อสอบจากครูฮีม',
        price: 190, // ชั่วคราว — รอครูฮีมเคาะ (ชุดนี้ hidden อยู่ ยังไม่ขึ้นหน้าร้าน)
        level: 'ม.1',
        category: 'สอบเข้า ม.1',
        coverUrl: publicUrl(coverDest, coverToken),
        coverPath: coverDest,
        previewUrl: publicUrl(previewDest, previewToken),
        previewPath: previewDest,
        files: files.map(({ id, label, name, path: p }) => ({ id, label, name, path: p })),
        pageCount: 38,
        questionCount: 30,
        analysis: {
            headline: 'ออกตามพิมพ์เขียวสนามจริง จ.ภ. — จำนวนเต็ม + เรขาคณิต กินสัดส่วน 2 ใน 3 ของชุด',
            years: 'เตรียมสอบเข้ารอบแรก ปีการศึกษา 2570',
            totalQuestions: 30,
            note: 'ระดับเข้มข้น: ข้อยาก+ยากมาก 50% ของชุด (ตั้งใจให้โหดกว่าสนามทั่วไป) ทำได้ 60% ถือว่าอยู่ในเกณฑ์ดีมาก · รูปแบบเติมคำตอบ ต้องแสดงวิธีทำ ให้คะแนนแยกคำตอบ/วิธีทำเหมือนกรรมการตรวจจริง',
            chapters: [
                { name: 'จำนวนเต็ม', percent: 37 },
                { name: 'รูปเรขาคณิตสองมิติและสามมิติ', percent: 30 },
                { name: 'การนำเสนอข้อมูล', percent: 10 },
                { name: 'อัตราส่วน สัดส่วน ร้อยละ', percent: 10 },
                { name: 'สมการเชิงเส้นตัวแปรเดียว', percent: 7 },
                { name: 'ทศนิยมและเศษส่วน', percent: 3 },
                { name: 'เลขยกกำลัง', percent: 3 },
            ],
        },
        hidden: true, // เปิดขายเมื่อครูฮีมเคาะราคาแล้ว
        order: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    console.log(`\ndoc ใหม่: examPapers/${ref.id} (hidden: true)`);
    console.log(JSON.stringify({ ...docData, createdAt: '(serverTimestamp)', updatedAt: '(serverTimestamp)' }, null, 2));

    if (!APPLY) {
        console.log('\n(dry-run — ยังไม่เขียนอะไร รันด้วย --apply เพื่อลงจริง)');
        process.exit(0);
    }

    for (const f of files) {
        await bucket.upload(f.src, {
            destination: f.path,
            metadata: { contentType: 'application/pdf' }, // private — ไม่ใส่ download token
        });
        console.log(`อัปแล้ว (private): ${f.path}`);
    }
    await bucket.upload(SRC.preview, {
        destination: previewDest,
        metadata: { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable', metadata: { firebaseStorageDownloadTokens: previewToken } },
    });
    console.log(`อัปแล้ว (public): ${previewDest}`);
    await bucket.upload(SRC.cover, {
        destination: coverDest,
        metadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000, immutable', metadata: { firebaseStorageDownloadTokens: coverToken } },
    });
    console.log(`อัปแล้ว (public): ${coverDest}`);

    await ref.set(docData);
    console.log(`\n✅ ลงเรียบร้อย: examPapers/${ref.id} (ซ่อนไว้ รอเคาะราคา)`);
    console.log(`หน้าขาย (หลังเปิด): https://www.kruheemmath.com/exam-papers/${ref.id}`);
    process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
