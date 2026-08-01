/**
 * cleanup-orphan-article-images.js
 * ----------------------------------------------------------
 * กวาดไฟล์รูป "กำพร้า" ในโฟลเดอร์บทความ (posts/, blog-content/, summaries/)
 * = ไฟล์ที่ไม่มีเอกสารใดในฐานข้อมูลอ้างถึงแล้ว (ตกค้างจากการลบ/เปลี่ยนรูปในอดีต)
 *
 * ความปลอดภัย:
 *   - สแกนการอ้างอิงจากหลาย collection + บทเรียนทุกคอร์ส (collectionGroup lessons)
 *   - แตะเฉพาะ 3 prefix ของระบบบทความ ไม่ยุ่งไฟล์ส่วนอื่น
 *   - ก่อนลบ ดาวน์โหลดสำรองทุกไฟล์ + เขียน manifest ไว้ที่ scripts/_backups/
 *
 *   node scripts/cleanup-orphan-article-images.js            # dry run — รายงานอย่างเดียว
 *   node scripts/cleanup-orphan-article-images.js --commit   # สำรอง + ลบจริง
 * ----------------------------------------------------------
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const COMMIT = process.argv.includes('--commit');
const PREFIXES = ['posts/', 'blog-content/', 'summaries/'];
const SCAN_COLLECTIONS = ['posts', 'summaries', 'courses', 'settings', 'banners', 'promotions', 'reviews', 'exams', 'examPapers', 'exam_papers'];
const BACKUP_DIR = path.resolve(__dirname, `_backups/orphan-article-images-${new Date().toISOString().slice(0, 10)}`);

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa), storageBucket: 'kruheem-course-45088.firebasestorage.app' });
const db = admin.firestore();
const bucket = admin.storage().bucket();

const URL_RE = /firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?"'\s\\)]+)\?alt=media/g;
function grab(referenced, data) {
    const text = JSON.stringify(data ?? '');
    for (const m of text.matchAll(URL_RE)) referenced.add(decodeURIComponent(m[1]));
}

const fmtMB = (n) => (n / 1e6).toFixed(1) + 'MB';

(async () => {
    console.log(COMMIT ? '🟢 COMMIT MODE — สำรองแล้วลบจริง\n' : '🔍 DRY RUN — รายงานอย่างเดียว\n');

    // 1) รวบรวม path รูปที่ยังถูกอ้างอิงอยู่ทุกที่
    const referenced = new Set();
    for (const col of SCAN_COLLECTIONS) {
        try {
            const snap = await db.collection(col).get();
            snap.forEach((d) => grab(referenced, d.data()));
        } catch (e) { /* collection ไม่มีก็ข้าม */ }
    }
    const lessons = await db.collectionGroup('lessons').get();
    lessons.forEach((d) => grab(referenced, d.data()));
    console.log(`สแกนการอ้างอิงจาก ${SCAN_COLLECTIONS.join(', ')} + lessons (${lessons.size} บทเรียน)`);
    console.log(`รูปที่ยังถูกใช้งาน: ${referenced.size} ไฟล์\n`);

    // 2) หาไฟล์กำพร้าในแต่ละ prefix
    const orphans = [];
    let totalBytes = 0;
    for (const prefix of PREFIXES) {
        const [files] = await bucket.getFiles({ prefix });
        let n = 0, b = 0;
        for (const f of files) {
            if (referenced.has(f.name)) continue;
            const size = Number(f.metadata.size || 0);
            orphans.push({ name: f.name, size });
            n++; b += size; totalBytes += size;
        }
        console.log(`  ${prefix.padEnd(15)} กำพร้า ${String(n).padStart(3)} ไฟล์ ${fmtMB(b)}`);
    }
    console.log(`\nรวมไฟล์กำพร้า: ${orphans.length} ไฟล์ ${fmtMB(totalBytes)}`);

    if (!COMMIT) {
        console.log('\n(dry run) รายการ 15 ไฟล์แรก:');
        orphans.slice(0, 15).forEach((o) => console.log(`  - ${o.name} (${(o.size / 1024).toFixed(0)}KB)`));
        process.exit(0);
    }

    // 3) สำรอง + ลบ
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    let deleted = 0, failed = 0;
    for (const o of orphans) {
        try {
            const backupPath = path.join(BACKUP_DIR, o.name.replace(/\//g, '__'));
            if (!fs.existsSync(backupPath)) {
                const [buf] = await bucket.file(o.name).download();
                fs.writeFileSync(backupPath, buf);
            }
            await bucket.file(o.name).delete();
            deleted++;
            if (deleted % 20 === 0) console.log(`  ...ลบแล้ว ${deleted}/${orphans.length}`);
        } catch (e) {
            console.log(`  ❌ ${o.name}: ${e.message}`);
            failed++;
        }
    }
    fs.writeFileSync(path.join(BACKUP_DIR, '_manifest.json'), JSON.stringify(orphans, null, 2));

    console.log(`\n✅ ลบแล้ว ${deleted} ไฟล์ (${fmtMB(totalBytes)}) | พลาด ${failed}`);
    console.log(`สำรองไว้ที่: ${BACKUP_DIR}`);
    process.exit(0);
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
