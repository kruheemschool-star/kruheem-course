/**
 * upload-checklist.js — อัปโหลด PDF + รูป preview ของเช็คลิสต์ขึ้น Firebase Storage
 * พร้อม download token แล้วพิมพ์ URL ออกมาให้เอาไปแปะในหน้าบทเรียน
 *
 *   node scripts/upload-checklist.js gifted --tag v20260817b
 *   node scripts/upload-checklist.js p6     --tag v20260817
 *
 * ตั้งชื่อไฟล์แบบมีเวอร์ชันเสมอ เพราะไฟล์เดิมถูก cache แบบ immutable —
 * ทับชื่อเดิมแล้วคนที่เคยเปิดจะยังเห็นของเก่า
 */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const TARGETS = {
  gifted: { courseId: 'HiHvqQmFz9s41oxW8lne', name: 'checklist-40-topics' },
  p6: { courseId: 'lBj1ZUlnBiU8vv3lm94y', name: 'p6-checklist-16-chapters' },
  equation: { courseId: 'z41lCWEynOVjHhaoeT9B', name: 'equation-checklist-19-levels' },
  banyat: { courseId: 'xELVM7Nbeua9jm0NjJK7', name: 'banyat-checklist-15-clips' },
  m1t1: { courseId: 'fhoc1u2JT8WghFHapzx8', name: 'm1t1-checklist' },
  m1t2: { courseId: 'fu5mtwI48TrhJwXtMev4', name: 'm1t2-checklist' },
  m2t1: { courseId: 'dEdh5HfBU7zCSdJsdGK5', name: 'm2t1-checklist' },
  m3t1: { courseId: 'XCHje0hKhhGD2jd5RMnz', name: 'm3t1-checklist' },
  m4t1: { courseId: 'RPEJPtOJg3sSL7P2AyPi', name: 'm4t1-checklist' },
  m4t2: { courseId: 'ZhpY3GMWh3SOua5yAVnu', name: 'm4t2-checklist' },
  m5t1: { courseId: 'nQIVvwyuJkrwK0pYQJKB', name: 'm5t1-checklist' },
  m5t2: { courseId: 'IFAiTpvLzOFEm7aIn3A5', name: 'm5t2-checklist' },
};

const key = process.argv[2];
if (!TARGETS[key]) {
  console.error('ใช้: node scripts/upload-checklist.js <' + Object.keys(TARGETS).join('|') + '> [--tag vYYYYMMDD]');
  process.exit(1);
}
const T = TARGETS[key];
const tagArg = process.argv.indexOf('--tag');
const TAG = tagArg > -1 ? process.argv[tagArg + 1] : 'v1';
const OUT = path.resolve(__dirname, 'out', key);

const serviceAccount = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'kruheem-course-45088.firebasestorage.app',
});
const bucket = admin.storage().bucket();

async function upload(localFile, remoteName, contentType) {
  const buf = fs.readFileSync(localFile);
  const token = crypto.randomUUID();
  const storagePath = `course-docs/${T.courseId}/${remoteName}`;
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
  const pdf = path.join(OUT, T.name + '.pdf');
  const png = path.join(OUT, T.name + '-preview.png');
  for (const f of [pdf, png]) {
    if (!fs.existsSync(f)) throw new Error(`ไม่พบ ${f} — รัน node scripts/render-checklist-pdf.js ${key} ก่อน`);
  }
  await upload(pdf, `${T.name}-${TAG}.pdf`, 'application/pdf');
  await upload(png, `${T.name}-preview-${TAG}.png`, 'image/png');
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
