/**
 * publish-m1-navigator-post.js
 * ----------------------------------------------------------
 * ลงบทความ "อย่าเพิ่งเลือกโรงเรียน ม.1 ให้ลูก ถ้ายังไม่รู้ความจริง 5 ข้อนี้"
 * เข้าส่วนสาระน่ารู้ (collection posts):
 *   1) อัปโหลดสไลด์ 13 หน้า (แปลง+ย่อแล้ว) ขึ้น Storage พร้อม download token
 *      - หน้า 1  → posts/…cover.jpg   (รูปปกการ์ด)
 *      - หน้า 2-13 → blog-content/…  (รูปประกอบในเนื้อหา)
 *   2) แทน {{IMG02}}–{{IMG13}} ในไฟล์ HTML ด้วย URL จริง
 *   3) addDoc posts (status published, contentType html)
 *
 *   node scripts/publish-m1-navigator-post.js            # dry run — อัปโหลดไม่จริง ไม่เขียน DB
 *   node scripts/publish-m1-navigator-post.js --commit   # ทำจริงทั้งหมด
 * ----------------------------------------------------------
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const COMMIT = process.argv.includes('--commit');
const SLIDES_DIR = '/private/tmp/claude-501/-Users-kruheem-Documents-webapp-kruheem-course/b59d8f78-60cd-429f-bbeb-1a72c43bf856/scratchpad/m1-slides-web';
const HTML_PATH = '/private/tmp/claude-501/-Users-kruheem-Documents-webapp-kruheem-course/b59d8f78-60cd-429f-bbeb-1a72c43bf856/scratchpad/m1-article.html';

const SLUG = 'choose-m1-school-5-paths';
const TITLE = 'อย่าเพิ่งเลือกโรงเรียน ม.1 ให้ลูก ถ้ายังไม่รู้ความจริง 5 ข้อนี้';
const EXCERPT = 'จุฬาภรณ์ / Gifted / EP / สาธิต / ห้องปกติ ต่างกันมากกว่าที่คิด ครูฮีมกางแผนที่ทั้ง 5 เส้นทางแบบหมดเปลือก พร้อมปฏิทินสอบเข้า ม.1 ปีการศึกษา 2570 และ 5 คำถามเช็กว่าลูกเราเหมาะกับทางไหน';
const KEYWORDS = ['ครูฮีม', 'สอบเข้า ม.1', 'จุฬาภรณ์', 'Gifted', 'EP', 'สาธิต', 'เลือกโรงเรียนให้ลูก', 'ป.6'];

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
                metadata: { firebaseStorageDownloadTokens: token },
            },
        });
    }
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

(async () => {
    console.log(COMMIT ? '🟢 COMMIT MODE — อัปโหลด + เขียน DB จริง\n' : '🔍 DRY RUN — ตรวจความพร้อมอย่างเดียว\n');

    // กันลงซ้ำ: slug ต้องยังไม่มีในระบบ
    const dup = await db.collection('posts').where('slug', '==', SLUG).get();
    if (!dup.empty) throw new Error(`slug "${SLUG}" มีอยู่แล้ว (${dup.docs[0].id}) — ยกเลิกเพื่อกันลงซ้ำ`);

    let html = fs.readFileSync(HTML_PATH, 'utf8');
    const ts = Date.now();

    // 1) รูปปก = สไลด์หน้า 1
    const coverLocal = path.join(SLIDES_DIR, 'slide-01.jpg');
    if (!fs.existsSync(coverLocal)) throw new Error('ไม่พบ slide-01.jpg');
    const coverUrl = await uploadWithToken(coverLocal, `posts/${ts}_m1-navigator-cover.jpg`);
    console.log(`ปก: slide-01.jpg (${(fs.statSync(coverLocal).size / 1024).toFixed(0)}KB) → ${COMMIT ? 'อัปโหลดแล้ว' : 'พร้อมอัปโหลด'}`);

    // 2) รูปประกอบ = สไลด์หน้า 2-13 → แทน placeholder ในเนื้อหา
    for (let n = 2; n <= 13; n++) {
        const nn = String(n).padStart(2, '0');
        const local = path.join(SLIDES_DIR, `slide-${nn}.jpg`);
        if (!fs.existsSync(local)) throw new Error(`ไม่พบ slide-${nn}.jpg`);
        const placeholder = `{{IMG${nn}}}`;
        if (!html.includes(placeholder)) throw new Error(`ไม่พบ placeholder ${placeholder} ในไฟล์ HTML`);
        const url = await uploadWithToken(local, `blog-content/${ts}_m1-navigator-${nn}.jpg`);
        html = html.split(placeholder).join(url);
        console.log(`รูป ${nn}: ${(fs.statSync(local).size / 1024).toFixed(0)}KB → ${COMMIT ? 'อัปโหลดแล้ว' : 'พร้อม'}`);
    }

    const leftover = html.match(/\{\{IMG\d+\}\}/g);
    if (leftover) throw new Error(`ยังมี placeholder ค้าง: ${leftover.join(', ')}`);

    // 3) ลงบทความ
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
