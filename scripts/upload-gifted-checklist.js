/**
 * upload-gifted-checklist.js — อัปโหลด PDF + รูป preview จาก scripts/out/
 * ขึ้น Firebase Storage พร้อม download token แล้วพิมพ์ URL ออกมา
 *
 *   node scripts/upload-gifted-checklist.js [--tag v2]
 *
 * ตั้งชื่อไฟล์แบบมีเวอร์ชันเสมอ เพราะไฟล์เดิมถูก cache แบบ immutable —
 * ทับชื่อเดิมแล้วคนที่เคยเปิดจะยังเห็นของเก่า
 */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const serviceAccount = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'kruheem-course-45088.firebasestorage.app',
});
const bucket = admin.storage().bucket();

const COURSE_ID = 'HiHvqQmFz9s41oxW8lne';
const tagArg = process.argv.indexOf('--tag');
const TAG = tagArg > -1 ? process.argv[tagArg + 1] : 'v2';
const OUT = path.resolve(__dirname, 'out');

async function upload(localFile, remoteName, contentType) {
  const buf = fs.readFileSync(localFile);
  const token = crypto.randomUUID();
  const storagePath = `course-docs/${COURSE_ID}/${remoteName}`;
  await bucket.file(storagePath).save(buf, {
    resumable: false,
    contentType,
    metadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
  console.log(`${remoteName}  (${(buf.length / 1024).toFixed(0)} KB)\n  ${url}\n`);
  return url;
}

(async () => {
  const pdf = path.join(OUT, 'checklist-40-topics.pdf');
  const png = path.join(OUT, 'checklist-40-topics-preview.png');
  for (const f of [pdf, png]) {
    if (!fs.existsSync(f)) throw new Error(`ไม่พบ ${f} — รัน node scripts/render-gifted-checklist-pdf.js ก่อน`);
  }
  await upload(pdf, `checklist-40-topics-${TAG}.pdf`, 'application/pdf');
  await upload(png, `checklist-40-topics-preview-${TAG}.png`, 'image/png');
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
