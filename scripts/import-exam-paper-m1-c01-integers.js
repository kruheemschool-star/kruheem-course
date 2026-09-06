/**
 * ลงสินค้าร้านข้อสอบ PDF: "เอกสารสรุปบท คณิต ม.1 · บทที่ 1 จำนวนเต็ม" (KH-M1-C01)
 *
 * ต่างจากชุดสอบเข้าตรงที่เป็น "เอกสารสรุปบท" — ขายทั้งเทอมเป็นซีรีส์
 * จึงตั้งหมวดใหม่ "สรุปบท ม.1 เทอม 1" (ชั้นวางบนหน้าร้านแยกจากชั้นสอบเข้า)
 *
 * ของที่ลง (doc ใหม่ใน examPapers แบบ hidden: true — รอครูฮีมดูหน้าขายแล้วเคาะราคา):
 *   1. เล่มเต็ม 90 หน้า          -> exam-pdfs/{docId}/ (private, โหลดผ่าน /api/download-pdf เท่านั้น)
 *   2. ตัวอย่างฟรี 8 หน้า        -> exam-paper-previews/ (public)  [1,2,3,4,5,31,43,57]
 *   3. ปก (หน้า 1 -> JPEG 1200px) -> exam-paper-covers/ (public)
 *   4. ภาพหน้าในเล่ม 4 หน้า      -> exam-paper-samples/ (public)   [8,40,43,57]
 *   5. analysis.article = บทวิเคราะห์จากครูฮีม (Markdown)
 *
 * ⚠️ ตั้งใจไม่ใส่ analysis.chapters / years / totalQuestions / coverage —
 *    ExamAnalysisSection พาดหัวตายตัวว่า "วิเคราะห์จากข้อสอบจริง N ปีล่าสุด"
 *    ซึ่งเป็นคำโฆษณาของชุดเก็ง ไม่ใช่ของเอกสารสรุปบท ใส่ไปเท่ากับพูดเกินจริง
 *
 * รัน: node scripts/import-exam-paper-m1-c01-integers.js          (dry-run)
 *      node scripts/import-exam-paper-m1-c01-integers.js --apply  (เขียนจริง)
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

const ASSETS = '/private/tmp/claude-501/-Users-kruheem-Documents-webapp-kruheem-course/8ce4941e-ef0d-4591-9933-9006fbf37c08/scratchpad/m1c01';
const SRC = {
    book: '/Users/kruheem/Downloads/จำนวนเต็ม.pdf',
    preview: path.join(ASSETS, 'preview.pdf'),
    cover: path.join(ASSETS, 'cover.jpg'),
};
const SAMPLES = [
    { file: path.join(ASSETS, 'pg8-08.jpg'), caption: 'หน้าเนื้อหา — กฎเป๊ะ · จุดที่มันพัง · อ๋อ!' },
    { file: path.join(ASSETS, 'pg40-40.jpg'), caption: 'ตารางสรุปแนวโจทย์ 13 แนว บอกว่าแนวไหนออกบ่อย' },
    { file: path.join(ASSETS, 'pg43-43.jpg'), caption: 'ชุดข้อสอบ 50 ข้อ เรียงง่าย → กลาง → ยาก' },
    { file: path.join(ASSETS, 'pg57-57.jpg'), caption: 'เฉลยละเอียด — บอกว่าตัวลวงแต่ละตัวมาจากคิดผิดแบบไหน' },
];
const ARTICLE = path.resolve(__dirname, 'exam-paper-content/m1-c01-integers-analysis.md');

// public URL แบบเดียวกับ getDownloadURL ของ client SDK (token ฝังใน metadata)
const publicUrl = (dest, token) =>
    `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;

(async () => {
    for (const [k, p] of Object.entries(SRC)) {
        if (!fs.existsSync(p)) throw new Error(`ไม่พบไฟล์ ${k}: ${p}`);
        console.log(`ไฟล์ ${k.padEnd(8)} ${Math.round(fs.statSync(p).size / 1024)} KB · ${p}`);
    }
    for (const s of SAMPLES) if (!fs.existsSync(s.file)) throw new Error(`ไม่พบภาพตัวอย่าง: ${s.file}`);
    if (!fs.existsSync(ARTICLE)) throw new Error(`ไม่พบบทวิเคราะห์: ${ARTICLE}`);
    const article = fs.readFileSync(ARTICLE, 'utf8');
    if (article.length > 400_000) throw new Error('บทวิเคราะห์ยาวเกิน 400KB (เพดาน 1MiB ต่อ doc)');

    // กันลงซ้ำ
    const dup = await db.collection('examPapers').where('category', '==', 'สรุปบท ม.1 เทอม 1').get();
    const same = dup.docs.filter((d) => (d.data().title || '').includes('จำนวนเต็ม'));
    if (same.length) {
        console.log(`⚠️ มีชุดสรุปบทจำนวนเต็มอยู่แล้ว ${same.length} ชุด:`);
        same.forEach((d) => console.log(`   ${d.id} · ${d.data().title}`));
        if (APPLY) throw new Error('ยกเลิก — กันลงซ้ำ (ลบ/เช็ค doc เดิมก่อน)');
    }

    const ref = db.collection('examPapers').doc();
    const ts = Date.now();
    const bookPath = `exam-pdfs/${ref.id}/${ts}_kh-m1-c01-integers.pdf`;
    const previewDest = `exam-paper-previews/${ref.id}_preview.pdf`;
    const previewToken = crypto.randomUUID();
    const coverDest = `exam-paper-covers/${ref.id}_cover.jpg`;
    const coverToken = crypto.randomUUID();
    const samples = SAMPLES.map((s, i) => {
        const token = crypto.randomUUID();
        const dest = `exam-paper-samples/${ref.id}_p${i + 1}.jpg`;
        return { ...s, dest, token, url: publicUrl(dest, token) };
    });

    const docData = {
        title: 'เอกสารสรุปบท คณิต ม.1 · บทที่ 1 จำนวนเต็ม',
        description:
            'สรุปทั้งบทจำนวนเต็มไว้ในเล่มเดียว 90 หน้า — เนื้อหา 6 หัวข้อพร้อมตัวอย่างแสดงวิธีทำ 23 ข้อ '
            + 'ตารางสรุปแนวโจทย์ 13 แนวว่าข้อสอบชอบออกแบบไหน ชุดข้อสอบ 50 ข้อแยกระดับง่าย–กลาง–ยาก '
            + 'และเฉลยละเอียดครบทั้ง 50 ข้อ ที่บอกด้วยว่าตัวเลือกลวงแต่ละตัวมาจากการคิดผิดแบบไหน '
            + 'มีช่องจดของตัวเองแทรกไว้ทั้งเล่ม ปริ้นแล้วใช้เป็นสมุดประจำบทได้เลย',
        price: 190, // ⏳ ชั่วคราว — รอครูฮีมเคาะ (ชุดนี้ hidden อยู่ ยังไม่ขึ้นหน้าร้าน)
        level: 'ม.1',
        category: 'สรุปบท ม.1 เทอม 1',
        badge: 'ออกใหม่',
        coverUrl: publicUrl(coverDest, coverToken),
        coverPath: coverDest,
        previewUrl: publicUrl(previewDest, previewToken),
        previewPath: previewDest,
        files: [{
            id: crypto.randomUUID(),
            label: 'เล่มเต็ม 90 หน้า (เนื้อหา + ข้อสอบ + เฉลย)',
            name: 'สรุปบทที่-1-จำนวนเต็ม-ม1.pdf',
            path: bookPath,
        }],
        samplePages: samples.map((s) => ({ url: s.url, path: s.dest, caption: s.caption })),
        pageCount: 90,
        questionCount: 50,
        analysis: { article },
        hidden: true, // เปิดขายเมื่อครูฮีมเคาะราคาแล้ว
        order: 10,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    console.log(`\ndoc ใหม่: examPapers/${ref.id} (hidden: true)`);
    console.log(JSON.stringify(
        { ...docData, analysis: { article: `(${article.length} ตัวอักษร จาก ${path.basename(ARTICLE)})` }, createdAt: '(serverTimestamp)', updatedAt: '(serverTimestamp)' },
        null, 2,
    ));

    if (!APPLY) {
        console.log('\n(dry-run — ยังไม่เขียนอะไร รันด้วย --apply เพื่อลงจริง)');
        process.exit(0);
    }

    await bucket.upload(SRC.book, {
        destination: bookPath,
        metadata: { contentType: 'application/pdf' }, // private — ไม่ใส่ download token
    });
    console.log(`อัปแล้ว (private): ${bookPath}`);

    const pub = { cacheControl: 'public, max-age=31536000, immutable' };
    await bucket.upload(SRC.preview, {
        destination: previewDest,
        metadata: { contentType: 'application/pdf', ...pub, metadata: { firebaseStorageDownloadTokens: previewToken } },
    });
    console.log(`อัปแล้ว (public): ${previewDest}`);
    await bucket.upload(SRC.cover, {
        destination: coverDest,
        metadata: { contentType: 'image/jpeg', ...pub, metadata: { firebaseStorageDownloadTokens: coverToken } },
    });
    console.log(`อัปแล้ว (public): ${coverDest}`);
    for (const s of samples) {
        await bucket.upload(s.file, {
            destination: s.dest,
            metadata: { contentType: 'image/jpeg', ...pub, metadata: { firebaseStorageDownloadTokens: s.token } },
        });
        console.log(`อัปแล้ว (public): ${s.dest}`);
    }

    await ref.set(docData);
    console.log(`\n✅ ลงแล้ว examPapers/${ref.id}`);
    console.log(`   หน้าขาย (หลังเอา hidden ออก): https://kruheemmath.com/exam-papers/${ref.id}`);
    process.exit(0);
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
