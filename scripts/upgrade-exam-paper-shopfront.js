/**
 * เติมของที่หน้าร้าน PDF ขาดอยู่ ให้สินค้าทั้งสองชุดดูเป็นสินค้าจริง
 *
 * ชุดสวนกุหลาบ (SXqBcMQ4nm1gMEYMWpd1) — เดิมไม่มีปก ไม่มีตัวอย่าง หมวดไม่ตรง:
 *   1. ปก  — เรนเดอร์หน้า 1 ของไฟล์จริงเป็น JPEG → exam-paper-covers/ (public)
 *   2. ตัวอย่างฟรี — ตัดหน้า 1,2,3,11 (ปก+โจทย์+เฉลยละเอียด 1 ข้อ) → exam-paper-previews/
 *   3. ภาพหน้าในเล่ม 4 หน้า → exam-paper-samples/ (public)
 *   4. หมวด "แนวข้อสอบ" → "สอบเข้า ม.1" (ชั้นวางหน้าร้านจัดกลุ่มตามหมวด
 *      ชุดนี้เป็นสอบเข้า ม.1 อยู่แล้วตามชื่อ การอยู่คนละหมวดทำให้แตกเป็น 2 ชั้น ชั้นละใบ)
 *   5. คำอธิบายใหม่ — อิงข้อเท็จจริงในเล่มจริง (20 ข้อ · 4 ตัวเลือก · 60 นาที ·
 *      อ้างอิงสถิติย้อนหลัง 8 ปี ตามที่ระบุท้ายหน้าปกของเล่มเอง)
 *
 * ชุด จ.ภ. (Uvv9ctkTgdy6Xv7zIvwD) — มีปก/ตัวอย่างแล้ว เติมภาพหน้าในเล่ม 4 หน้า
 *
 * ทุกไฟล์ต้นทางถูกดึงจาก Storage ของจริง ไม่ได้ทำจากไฟล์ใน ~/Downloads
 * รัน: node scripts/upgrade-exam-paper-shopfront.js          (dry-run)
 *      node scripts/upgrade-exam-paper-shopfront.js --apply  (เขียนจริง)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
const BUCKET = 'kruheem-course-45088.firebasestorage.app';
admin.initializeApp({ credential: admin.credential.cert(sa), storageBucket: BUCKET });

const db = admin.firestore();
const bucket = admin.storage().bucket();
const APPLY = process.argv.includes('--apply');

const WORK = fs.mkdtempSync(path.join(require('os').tmpdir(), 'shopfront-'));

const SK = 'SXqBcMQ4nm1gMEYMWpd1'; // สวนกุหลาบ
const PCS = 'Uvv9ctkTgdy6Xv7zIvwD'; // จ.ภ. ชุดที่ 1

// public URL แบบเดียวกับ getDownloadURL ของ client SDK (token ฝังใน metadata)
const publicUrl = (dest, token) =>
    `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;

async function uploadPublic(local, dest, contentType) {
    const token = crypto.randomUUID();
    if (!APPLY) return publicUrl(dest, token);
    await bucket.upload(local, {
        destination: dest,
        metadata: {
            contentType,
            cacheControl: 'public, max-age=31536000, immutable',
            metadata: { firebaseStorageDownloadTokens: token },
        },
    });
    return publicUrl(dest, token);
}

// เรนเดอร์หน้า N ของ PDF เป็น JPEG กว้าง `width` px
function renderPage(pdf, pageNo, width, outPrefix) {
    execFileSync('pdftoppm', [
        '-jpeg', '-r', '150',
        '-f', String(pageNo), '-l', String(pageNo),
        '-scale-to-x', String(width), '-scale-to-y', '-1',
        pdf, outPrefix,
    ]);
    const dir = path.dirname(outPrefix);
    const base = path.basename(outPrefix);
    const hit = fs.readdirSync(dir).find((f) => f.startsWith(base + '-') && f.endsWith('.jpg'));
    if (!hit) throw new Error(`เรนเดอร์หน้า ${pageNo} ไม่สำเร็จ: ${pdf}`);
    return path.join(dir, hit);
}

// ตัดเฉพาะหน้าที่เลือก (1-based) ออกมาเป็น PDF ใหม่
function slicePdf(src, pages, out) {
    const py = `
from pypdf import PdfReader, PdfWriter
r = PdfReader(${JSON.stringify(src)}); w = PdfWriter()
for p in ${JSON.stringify(pages)}: w.add_page(r.pages[p - 1])
with open(${JSON.stringify(out)}, "wb") as f: w.write(f)
`;
    execFileSync('python3', ['-c', py]);
    return out;
}

async function download(storagePath, local) {
    await bucket.file(storagePath).download({ destination: local });
    return local;
}

// ---- แผนงานรายชุด --------------------------------------------------------

const SUANKULARB_DESC =
    'ชุดจำลองสนามสอบ 20 ข้อ ปรนัย 4 ตัวเลือก จับเวลา 60 นาที ออกตามสัดส่วนสถิติจากข้อสอบย้อนหลัง 8 ปี ' +
    'เฉลยไม่ได้บอกแค่ว่าข้อไหนถูก แต่ไล่วิธีทำทีละขั้น พร้อมชี้ว่าตัวเลือกที่เหลือแต่ละตัวมาจากคิดผิดตรงไหน ' +
    'ให้คุณพ่อคุณแม่ปริ้นท์ให้ลูกซ้อมบนกระดาษจริงได้เลยครับ';

async function doSuankularb() {
    const snap = await db.doc(`examPapers/${SK}`).get();
    const d = snap.data();
    if (!d) throw new Error('ไม่พบ doc สวนกุหลาบ');

    const src = d.pdfPath || (d.files || [])[0]?.path;
    if (!src) throw new Error('ชุดสวนกุหลาบไม่มีไฟล์ใน Storage');
    const local = await download(src, path.join(WORK, 'sk.pdf'));

    const stamp = Date.now();
    const patch = {};

    // ปก
    const coverJpg = renderPage(local, 1, 1000, path.join(WORK, 'sk-cover'));
    const coverPath = `exam-paper-covers/${SK}_${stamp}.jpg`;
    patch.coverUrl = await uploadPublic(coverJpg, coverPath, 'image/jpeg');
    patch.coverPath = coverPath;

    // ตัวอย่างฟรี: ปก + โจทย์ 2 หน้า + เฉลยละเอียด 1 หน้า
    const previewPdf = slicePdf(local, [1, 2, 3, 11], path.join(WORK, 'sk-preview.pdf'));
    const previewPath = `exam-paper-previews/${SK}_${stamp}.pdf`;
    patch.previewUrl = await uploadPublic(previewPdf, previewPath, 'application/pdf');
    patch.previewPath = previewPath;

    // ภาพหน้าในเล่ม
    patch.samplePages = await buildSamples(local, [
        { page: 1, caption: 'หน้าปกและคำชี้แจง' },
        { page: 2, caption: 'หน้าโจทย์' },
        { page: 10, caption: 'ตารางสรุปคำตอบ' },
        { page: 12, caption: 'หน้าเฉลยละเอียด' },
    ], SK, stamp);

    patch.category = 'สอบเข้า ม.1';
    patch.description = SUANKULARB_DESC;
    patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    return { id: SK, title: d.title, patch };
}

async function doPcs() {
    const snap = await db.doc(`examPapers/${PCS}`).get();
    const d = snap.data();
    if (!d) throw new Error('ไม่พบ doc จ.ภ.');

    const examFile = (d.files || []).find((f) => f.label === 'ตัวข้อสอบ');
    const solFile = (d.files || []).find((f) => f.label === 'เฉลย');
    if (!examFile || !solFile) throw new Error('ชุด จ.ภ. ไม่มีไฟล์ข้อสอบ/เฉลยครบ');

    const exam = await download(examFile.path, path.join(WORK, 'pcs-exam.pdf'));
    const sol = await download(solFile.path, path.join(WORK, 'pcs-sol.pdf'));

    const stamp = Date.now();
    const samples = [];
    samples.push(...await buildSamples(exam, [
        { page: 6, caption: 'ตารางกระจายเนื้อหา' },
        { page: 9, caption: 'หน้าโจทย์' },
    ], PCS + '_e', stamp));
    samples.push(...await buildSamples(sol, [
        { page: 5, caption: 'หน้าเฉลยละเอียด' },
        { page: 6, caption: 'เฉลยพร้อมเทคนิคครูฮีม' },
    ], PCS + '_s', stamp));

    return {
        id: PCS,
        title: d.title,
        patch: {
            samplePages: samples,
            // ป้ายมุมการ์ด: ชุดนี้เป็นชุดที่เพิ่งลงและออกสำหรับปีการศึกษา 2570
            badge: 'ออกใหม่ ปี 2570',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
    };
}

async function buildSamples(pdf, specs, keyPrefix, stamp) {
    const out = [];
    for (let i = 0; i < specs.length; i++) {
        const { page, caption } = specs[i];
        const jpg = renderPage(pdf, page, 900, path.join(WORK, `${keyPrefix}-s${i}`));
        const dest = `exam-paper-samples/${keyPrefix}_${stamp}_${i}.jpg`;
        out.push({ url: await uploadPublic(jpg, dest, 'image/jpeg'), path: dest, caption });
    }
    return out;
}

// ---- run -----------------------------------------------------------------

(async () => {
    console.log(APPLY ? '=== APPLY (เขียนจริง) ===' : '=== DRY-RUN (ไม่เขียนอะไร) ===');
    console.log('working dir:', WORK, '\n');

    const jobs = [await doSuankularb(), await doPcs()];

    for (const j of jobs) {
        console.log(`\n--- ${j.id} · ${j.title}`);
        for (const [k, v] of Object.entries(j.patch)) {
            if (k === 'samplePages') {
                console.log(`  ${k}: ${v.length} ภาพ`);
                v.forEach((s) => console.log(`     · ${s.caption} → ${s.path}`));
            } else if (k === 'updatedAt') continue;
            else console.log(`  ${k}: ${String(v).slice(0, 110)}`);
        }
        if (APPLY) {
            await db.doc(`examPapers/${j.id}`).update(j.patch);
            console.log('  ✅ เขียนลง Firestore แล้ว');
        }
    }

    console.log(APPLY
        ? '\nเสร็จ — อย่าลืมบัสต์แคชหน้าร้าน (/api/revalidate-exam-papers) หรือรอ ISR 5 นาที'
        : '\nยังไม่ได้เขียนอะไร — รันซ้ำด้วย --apply เมื่อพร้อม');
    process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
