/**
 * ถอดรูปปกที่ตั้งไว้ออกจากชุด "แนวข้อสอบ เข้า ม. 1 ชุดที่ 3-12"
 * คืนค่า coverImage เป็นว่าง (การ์ดกลับไปเป็นพื้นเทาเข้ม) และลบไฟล์ใน Storage
 * ส่วนสีธีมที่ไล่ตามบันไดความยาก (เย็น -> อุ่น -> ร้อน) คงไว้ เพราะการ์ดไม่ได้ม่วงซ้ำกัน 10 ใบแล้ว
 *
 * รัน: node scripts/unset-covers-entrance-m1-r2.js          (dry-run)
 *      node scripts/unset-covers-entrance-m1-r2.js --apply  (เขียนจริง)
 */
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
const BUCKET = 'kruheem-course-45088.firebasestorage.app';
admin.initializeApp({ credential: admin.credential.cert(sa), storageBucket: BUCKET });

const db = admin.firestore();
const bucket = admin.storage().bucket();
const APPLY = process.argv.includes('--apply');
const CATEGORY = 'สอบเข้า ม.1';
const PREFIX = 'exam-covers/entrance-m1-r2-set';

(async () => {
    console.log(`โหมด: ${APPLY ? 'เขียนจริง (--apply)' : 'dry-run (ไม่เขียน)'}\n`);

    const snap = await db.collection('exams').where('category', '==', CATEGORY).get();
    const targets = snap.docs
        .map(d => ({ id: d.id, ref: d.ref, ...d.data() }))
        .filter(r => (r.order ?? -99) >= 13)
        .sort((a, b) => a.order - b.order);

    let cleared = 0;
    for (const r of targets) {
        const title = r.title.replace(/\n/g, ' ');
        // กันพลาด: แตะเฉพาะชุดที่ปกเป็นไฟล์ที่สคริปต์ชุดนี้อัปไว้เท่านั้น
        const mine = typeof r.coverImage === 'string'
            && r.coverImage.includes(encodeURIComponent(PREFIX).replace(/%2F/g, '%2F'));
        if (!r.coverImage) { console.log(`ข้าม (ปกว่างอยู่แล้ว): ${title}`); continue; }
        if (!mine) { console.log(`ข้าม (ปกไม่ใช่ของชุดนี้ ไม่แตะ): ${title}`); continue; }

        if (APPLY) {
            await r.ref.update({
                coverImage: '',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`ถอดปกแล้ว: ${title}`);
            cleared++;
        } else {
            console.log(`พร้อมถอดปก: ${title}`);
        }
    }

    if (APPLY) {
        const [files] = await bucket.getFiles({ prefix: PREFIX });
        for (const f of files) {
            await f.delete();
            console.log(`ลบไฟล์: ${f.name}`);
        }
        console.log(`\nสรุป: ถอดปก ${cleared} ชุด · ลบไฟล์ใน Storage ${files.length} ไฟล์`);
    } else {
        const [files] = await bucket.getFiles({ prefix: PREFIX });
        console.log(`\nไฟล์ใน Storage ที่จะถูกลบ ${files.length} ไฟล์`);
        console.log('สรุป: dry-run ผ่าน — รันซ้ำด้วย --apply เพื่อเขียนจริง');
    }
    process.exit(0);
})().catch(e => { console.error('ผิดพลาด:', e.message); process.exit(1); });
