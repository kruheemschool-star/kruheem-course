/**
 * recompress-summary-images.js
 * ----------------------------------------------------------
 * บีบอัดรูปประกอบบทความ (summaries) ที่ค้างเป็น PNG ก้อนใหญ่บน Storage
 * ให้เป็น JPEG q85 กว้างสุด 1920px — เขียนทับ path เดิม + คง download token เดิม
 * เพื่อให้ URL ที่ฝังอยู่ในเนื้อหา Firestore ใช้ได้ต่อโดยไม่ต้องแก้เอกสารใดๆ
 *
 * เงื่อนไขความปลอดภัยต่อไฟล์:
 *   - ประมวลเฉพาะ URL ที่อ้างอยู่จริงในเนื้อหา summaries (content/htmlContent)
 *   - เฉพาะไฟล์ contentType image/png ใต้ prefix summaries/
 *   - ข้ามถ้ารูปมีพิกเซลโปร่งใสจริง (JPEG ไม่มี alpha)
 *   - ข้ามถ้าบีบแล้วไม่เล็กลง
 *   - สำรองไฟล์ต้นฉบับลง scripts/_backups/summary-images-<date>/ ก่อนเขียนทับเสมอ
 *
 *   node scripts/recompress-summary-images.js            # dry run — โชว์ก่อน/หลัง ไม่เขียน
 *   node scripts/recompress-summary-images.js --commit   # เขียนจริง
 * ----------------------------------------------------------
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const COMMIT = process.argv.includes('--commit');
const BACKUP_DIR = path.resolve(__dirname, '_backups/summary-images-2026-07-31');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'kruheem-course-45088.firebasestorage.app',
});
const db = admin.firestore();
const bucket = admin.storage().bucket();

function extractStoragePaths(text) {
    // getDownloadURL format: .../o/<url-encoded-object-path>?alt=media&token=...
    const out = new Map(); // objectPath -> token from URL (fallback)
    const re = /https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?"'\s\\)]+)\?alt=media(?:&(?:amp;)?token=([a-f0-9-]+))?/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        const objectPath = decodeURIComponent(m[1]);
        if (objectPath.startsWith('summaries/')) out.set(objectPath, m[2] || null);
    }
    return out;
}

const fmtKB = (n) => `${(n / 1024).toFixed(0)}KB`;

(async () => {
    console.log(COMMIT ? '🟢 COMMIT MODE — จะเขียนทับไฟล์บน Storage จริง\n' : '🔍 DRY RUN — วัดผลอย่างเดียว ไม่เขียน\n');
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const snap = await db.collection('summaries').get();
    const targets = new Map();
    snap.forEach((doc) => {
        const d = doc.data();
        for (const [p, tok] of extractStoragePaths(`${d.content || ''}\n${d.htmlContent || ''}`)) {
            if (!targets.has(p)) targets.set(p, tok);
        }
    });
    console.log(`พบรูปอ้างอิงในบทความ ${snap.size} ชิ้น → ${targets.size} ไฟล์ (unique)\n`);

    let done = 0, skipped = 0, failed = 0, beforeTotal = 0, afterTotal = 0;

    for (const [objectPath, urlToken] of targets) {
        const label = objectPath.replace('summaries/', '');
        try {
            const file = bucket.file(objectPath);
            const [exists] = await file.exists();
            if (!exists) { console.log(`⏭️  ${label} — ไม่พบไฟล์บน Storage`); skipped++; continue; }

            const [meta] = await file.getMetadata();
            const origSize = Number(meta.size);
            const token = (meta.metadata && meta.metadata.firebaseStorageDownloadTokens) || urlToken;

            if (meta.contentType !== 'image/png') {
                console.log(`⏭️  ${label} — ${meta.contentType} (${fmtKB(origSize)}) ไม่ใช่ PNG ข้าม`);
                skipped++; continue;
            }
            if (!token) {
                console.log(`⏭️  ${label} — หา download token ไม่เจอ ข้ามเพื่อความปลอดภัย`);
                skipped++; continue;
            }

            const [buf] = await file.download();

            // สำรองต้นฉบับก่อนเสมอ (ชื่อไฟล์แทน / ด้วย __)
            const backupPath = path.join(BACKUP_DIR, objectPath.replace(/\//g, '__'));
            if (!fs.existsSync(backupPath)) fs.writeFileSync(backupPath, buf);

            const stats = await sharp(buf).stats();
            if (!stats.isOpaque) {
                console.log(`⏭️  ${label} — มีพื้นโปร่งใสจริง คง PNG ไว้ (${fmtKB(origSize)})`);
                skipped++; continue;
            }

            const newBuf = await sharp(buf)
                .rotate()
                .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 85, mozjpeg: true })
                .toBuffer();

            if (newBuf.length >= origSize) {
                console.log(`⏭️  ${label} — บีบแล้วไม่เล็กลง (${fmtKB(origSize)} → ${fmtKB(newBuf.length)}) ข้าม`);
                skipped++; continue;
            }

            beforeTotal += origSize; afterTotal += newBuf.length;
            const pct = ((1 - newBuf.length / origSize) * 100).toFixed(0);

            if (COMMIT) {
                await file.save(newBuf, {
                    contentType: 'image/jpeg',
                    resumable: false,
                    metadata: {
                        contentType: 'image/jpeg',
                        metadata: { firebaseStorageDownloadTokens: token },
                    },
                });
                console.log(`✅ ${label} — ${fmtKB(origSize)} → ${fmtKB(newBuf.length)} (ลด ${pct}%)`);
            } else {
                console.log(`📝 ${label} — ${fmtKB(origSize)} → ${fmtKB(newBuf.length)} (ลด ${pct}%)`);
            }
            done++;
        } catch (err) {
            console.log(`❌ ${label} — ${err.message}`);
            failed++;
        }
    }

    console.log(`\n===== สรุป (${COMMIT ? 'เขียนจริง' : 'dry run'}) =====`);
    console.log(`ทำสำเร็จ ${done} | ข้าม ${skipped} | พลาด ${failed}`);
    if (done > 0) {
        console.log(`ขนาดรวม ${(beforeTotal / 1e6).toFixed(1)}MB → ${(afterTotal / 1e6).toFixed(1)}MB (ลด ${((1 - afterTotal / beforeTotal) * 100).toFixed(0)}%)`);
    }
    console.log(`สำรองต้นฉบับที่: ${BACKUP_DIR}`);
    process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
