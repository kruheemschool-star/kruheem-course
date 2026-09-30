/**
 * ลงสินค้าร้านข้อสอบ PDF: ชุดเตรียมสอบเข้า ม.4 มหิดลวิทยานุสรณ์ · จุฬาภรณราชวิทยาลัย 2570 (ราคา 790)
 *
 * อ่านสเปกสินค้าจากไฟล์ JSON (เขียนหลังวิเคราะห์ไฟล์ครบแล้ว) แล้วลงของ:
 *   1. ไฟล์ขายทุกไฟล์ → exam-pdfs/{docId}/ (private โหลดผ่าน /api/download-pdf เท่านั้น ประทับชื่อผู้ซื้อ)
 *   2. ปก (เรนเดอร์หน้าที่เลือกเป็น JPEG) → exam-paper-covers/ (public)
 *   3. ภาพหน้าตัวอย่าง (กว้าง 1400px ให้ซูมอ่านบนมือถือได้) → exam-paper-samples/ (public)
 *   4. doc ใหม่ใน examPapers
 *
 * รัน: node scripts/import-exam-paper-mwit-m4-2570.js <spec.json>            (dry-run)
 *      node scripts/import-exam-paper-mwit-m4-2570.js <spec.json> --apply    (ลงจริง)
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
const BUCKET = 'kruheem-course-45088.firebasestorage.app';
admin.initializeApp({ credential: admin.credential.cert(sa), storageBucket: BUCKET });
const db = admin.firestore();
const bucket = admin.storage().bucket();

const specPath = process.argv[2];
const APPLY = process.argv.includes('--apply');
if (!specPath) throw new Error('ใส่ไฟล์สเปก: node scripts/import-exam-paper-mwit-m4-2570.js <spec.json>');
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'kh-mwit-'));

const publicUrl = (dest, token) =>
    `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;

function renderPage(pdf, pageNo, width, outPrefix) {
    execFileSync('pdftoppm', ['-jpeg', '-jpegopt', 'quality=85', '-r', '200', '-f', String(pageNo), '-l', String(pageNo),
        '-scale-to-x', String(width), '-scale-to-y', '-1', pdf, outPrefix]);
    const dir = path.dirname(outPrefix); const base = path.basename(outPrefix);
    const hit = fs.readdirSync(dir).find((f) => f.startsWith(base + '-') && f.endsWith('.jpg'));
    if (!hit) throw new Error(`เรนเดอร์หน้า ${pageNo} ไม่สำเร็จ: ${pdf}`);
    return path.join(dir, hit);
}
const pageCountOf = (pdf) => Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [pdf]).toString())[1]);

async function uploadPublic(local, dest, contentType) {
    const token = crypto.randomUUID();
    await bucket.upload(local, { destination: dest, metadata: { contentType, cacheControl: 'public, max-age=31536000, immutable', metadata: { firebaseStorageDownloadTokens: token } } });
    return publicUrl(dest, token);
}

(async () => {
    // ตรวจไฟล์ต้นฉบับครบ + นับหน้า
    let totalPages = 0;
    for (const f of spec.files) {
        if (!fs.existsSync(f.src)) throw new Error(`ไม่พบไฟล์: ${f.src}`);
        f.pages = pageCountOf(f.src); totalPages += f.pages;
        console.log(`ไฟล์ ${String(f.pages).padStart(3)} หน้า ${String(Math.round(fs.statSync(f.src).size / 1024)).padStart(6)} KB · ${f.label}`);
    }
    // กันลงซ้ำ
    const dup = await db.collection('examPapers').where('title', '==', spec.title).get();
    if (!dup.empty) { console.log(`⚠️ มีสินค้าชื่อนี้อยู่แล้ว: ${dup.docs.map((d) => d.id).join(', ')}`); if (APPLY) throw new Error('ยกเลิก — กันลงซ้ำ'); }

    const ref = db.collection('examPapers').doc();
    const ts = Date.now();
    const files = spec.files.map((f, i) => ({ id: crypto.randomUUID(), label: f.label, name: f.downloadName, path: `exam-pdfs/${ref.id}/${ts}_${String(i + 1).padStart(2, '0')}.pdf`, src: f.src }));

    // เรนเดอร์ปก + ตัวอย่างไว้ดูก่อน (ทั้ง dry-run และ apply)
    // ปกใช้ภาพที่ออกแบบแยกได้ (เล่มนี้ไม่มีหน้าปกในไฟล์) หรือเรนเดอร์จากหน้าในไฟล์
    const coverJpg = spec.cover.image || renderPage(spec.cover.src, spec.cover.page, 1200, path.join(WORK, 'cover'));
    const sampleJpgs = spec.samples.map((s, i) => ({ ...s, jpg: renderPage(s.src, s.page, 1400, path.join(WORK, `s${i}`)) }));
    console.log(`\nปก: ${coverJpg}\nตัวอย่าง:\n${sampleJpgs.map((s) => `  ${s.jpg} · ${s.caption}`).join('\n')}`);

    const docData = {
        title: spec.title,
        description: spec.description,
        price: spec.price,
        level: spec.level,
        category: spec.category,
        badge: spec.badge || '',
        files: files.map(({ id, label, name, path: p }) => ({ id, label, name, path: p })),
        pageCount: spec.pageCount ?? totalPages,
        questionCount: spec.questionCount,
        analysis: spec.analysis,
        hidden: !!spec.hidden,
        order: spec.order ?? 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    console.log(`\ndoc ใหม่: examPapers/${ref.id}`);
    console.log(JSON.stringify({ ...docData, analysis: { ...docData.analysis, article: `(${(docData.analysis.article || '').length} ตัวอักษร)` }, createdAt: '(server)', updatedAt: '(server)' }, null, 2));
    if (!APPLY) { console.log(`\n(dry-run — ยังไม่เขียนอะไร ดูภาพปก/ตัวอย่างได้ที่ ${WORK})`); process.exit(0); }

    for (const f of files) { await bucket.upload(f.src, { destination: f.path, metadata: { contentType: 'application/pdf' } }); console.log(`อัปแล้ว (private): ${f.label}`); }
    const coverDest = `exam-paper-covers/${ref.id}_cover.jpg`;
    docData.coverUrl = await uploadPublic(coverJpg, coverDest, 'image/jpeg'); docData.coverPath = coverDest;
    docData.samplePages = [];
    for (let i = 0; i < sampleJpgs.length; i++) {
        const dest = `exam-paper-samples/${ref.id}_${ts}_${i}.jpg`;
        docData.samplePages.push({ url: await uploadPublic(sampleJpgs[i].jpg, dest, 'image/jpeg'), path: dest, caption: sampleJpgs[i].caption });
    }
    await ref.set(docData);
    console.log(`\n✅ ลงเรียบร้อย: examPapers/${ref.id}${docData.hidden ? ' (ซ่อนไว้)' : ''}`);
    console.log(`หน้าขาย: https://www.kruheemmath.com/exam-papers/${ref.id}`);
    fs.writeFileSync(specPath.replace(/\.json$/, '.result.json'), JSON.stringify({ id: ref.id, files, coverDest, samples: docData.samplePages }, null, 2));
    process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
