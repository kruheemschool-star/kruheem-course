/**
 * publish-carelessness-detective-post.js
 * ----------------------------------------------------------
 * ลงบทความ "ยิ่งดุว่า 'ทำไมสะเพร่า!' ลูกยิ่งพลาดซ้ำ" (คู่มือนักสืบหยุดโรคสะเพร่า)
 * สไลด์ The_Carelessness_Detective_Playbook.pdf 13 หน้า เข้า collection posts:
 *   1) อัปโหลดสไลด์ (แปลง+ย่อแล้ว) ขึ้น Storage พร้อม download token
 *      - ปก (ประกอบเอง จากสไลด์หน้า 1 + หน้าที่ครูฮีมเลือก) → posts/…cover.jpg
 *      - หน้า 2–13 (12 ไฟล์) → blog-content/… (รูปประกอบในเนื้อหา)
 *   2) แทน {{IMG02}}–{{IMG13}} ในไฟล์ HTML ด้วย URL จริง (ไม่ต้องเรียงลำดับ)
 *   3) addDoc posts (status published, contentType html)
 *
 *   node scripts/publish-carelessness-detective-post.js            # dry run
 *   node scripts/publish-carelessness-detective-post.js --commit   # ทำจริง
 * ----------------------------------------------------------
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const COMMIT = process.argv.includes('--commit');
const SCRATCH = '/private/tmp/claude-501/-Users-kruheem-Documents-webapp-kruheem-course/b59d8f78-60cd-429f-bbeb-1a72c43bf856/scratchpad';
const SLIDES_DIR = path.join(SCRATCH, 'detective-slides-web');
const HTML_PATH = path.join(SCRATCH, 'detective-article.html');
const COVER_PATH = path.join(SCRATCH, 'det-cand-A.jpg'); // เปลี่ยนเป็น det-cand-B.jpg ได้ถ้าครูฮีมเลือกแบบ B

const SLUG = 'stop-careless-mistakes-3-checkpoints';
const TITLE = 'ยิ่งดุว่า "ทำไมสะเพร่า!" ลูกยิ่งพลาดซ้ำ';
const EXCERPT = 'ครูฮีมเปิดต้นตอของโรคเอ๋อ-โรคสะเพร่า พร้อมระบบ "ด่านตรวจ 3 ด่าน" ที่คุณพ่อคุณแม่ฝึกลูกเองได้ที่บ้าน ดึงคะแนน 10-15 แต้มที่หายไปฟรีๆ กลับมา โดยไม่ต้องเรียนเนื้อหาใหม่สักบรรทัด';
const KEYWORDS = ['ครูฮีม', 'ลูกสะเพร่า', 'ทำโจทย์ผิดพลาด', 'ตรวจทานข้อสอบ', 'เทคนิคทำข้อสอบคณิต', 'ลดความสะเพร่า'];

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'kruheem-course-45088.firebasestorage.app',
});
const db = admin.firestore();
const bucket = admin.storage().bucket();

async function uploadWithToken(localFile, storagePath) {
    const token = crypto.randomUUID();
    const buf = fs.readFileSync(localFile);
    if (COMMIT) {
        await bucket.file(storagePath).save(buf, {
            contentType: 'image/jpeg',
            resumable: false,
            metadata: {
                contentType: 'image/jpeg',
                cacheControl: 'public, max-age=31536000, immutable',
                metadata: { firebaseStorageDownloadTokens: token },
            },
        });
    }
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

(async () => {
    console.log(COMMIT ? '🟢 COMMIT MODE — อัปโหลด + เขียน DB จริง\n' : '🔍 DRY RUN — ตรวจความพร้อมอย่างเดียว\n');

    const dup = await db.collection('posts').where('slug', '==', SLUG).get();
    if (!dup.empty) throw new Error(`slug "${SLUG}" มีอยู่แล้ว (${dup.docs[0].id}) — ยกเลิกเพื่อกันลงซ้ำ`);

    let html = fs.readFileSync(HTML_PATH, 'utf8');
    const ts = Date.now();

    if (!fs.existsSync(COVER_PATH)) throw new Error('ไม่พบไฟล์ปก: ' + COVER_PATH);
    const coverUrl = await uploadWithToken(COVER_PATH, `posts/${ts}_carelessness-detective-cover.jpg`);
    console.log(`ปก: ${path.basename(COVER_PATH)} (${(fs.statSync(COVER_PATH).size / 1024).toFixed(0)}KB) → ${COMMIT ? 'อัปโหลดแล้ว' : 'พร้อมอัปโหลด'}`);

    for (let n = 2; n <= 13; n++) {
        const nn = String(n).padStart(2, '0');
        const local = path.join(SLIDES_DIR, `slide-${nn}.jpg`);
        if (!fs.existsSync(local)) throw new Error(`ไม่พบ slide-${nn}.jpg`);
        const placeholder = `{{IMG${nn}}}`;
        if (!html.includes(placeholder)) throw new Error(`ไม่พบ placeholder ${placeholder} ในไฟล์ HTML`);
        const url = await uploadWithToken(local, `blog-content/${ts}_carelessness-detective-${nn}.jpg`);
        html = html.split(placeholder).join(url);
        console.log(`รูป ${nn}: ${(fs.statSync(local).size / 1024).toFixed(0)}KB → ${COMMIT ? 'อัปโหลดแล้ว' : 'พร้อม'}`);
    }

    const leftover = html.match(/\{\{IMG\d+\}\}/g);
    if (leftover) throw new Error(`ยังมี placeholder ค้าง: ${leftover.join(', ')}`);

    const docData = {
        title: TITLE,
        slug: SLUG,
        content: html,
        contentType: 'html',
        excerpt: EXCERPT,
        keywords: KEYWORDS,
        coverImage: coverUrl,
        status: 'published',
        views: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (COMMIT) {
        const ref = await db.collection('posts').add(docData);
        console.log(`\n✅ ลงบทความแล้ว: posts/${ref.id}`);
        console.log(`🔗 https://www.kruheemmath.com/blog/${SLUG}`);
    } else {
        console.log(`\n📝 dry run ผ่าน: HTML ${(html.length / 1024).toFixed(0)}KB, title/slug/excerpt/keywords พร้อม`);
        console.log(`slug: ${SLUG}`);
    }
    process.exit(0);
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
