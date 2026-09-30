/**
 * ใส่รูปปก + สีธีม ให้ชุด "แนวข้อสอบ เข้า ม. 1 ชุดที่ 3-12" ให้การ์ดเข้าชุดกัน
 *
 * ปกสร้างจาก kruheem-exams/.../scripts/make_covers.py (SVG -> PNG 900x1200 สัดส่วน 3:4)
 * ออกแบบให้ลายอยู่ครึ่งบน ครึ่งล่างโล่ง เพราะเว็บวางไล่เฉดดำ + พิมพ์ชื่อชุดทับครึ่งล่าง
 * สีไล่ตามบันไดความยาก เย็น (ชุดปูพื้น) -> อุ่น (มาตรฐาน) -> ร้อน (เข้มข้น)
 *
 * รัน: node scripts/set-covers-entrance-m1-r2.js          (dry-run)
 *      node scripts/set-covers-entrance-m1-r2.js --apply  (เขียนจริง)
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

const COVER_DIR = '/Users/kruheem/Documents/workspace/kruheem-exams/00 · สอบเข้า ม.1/เก็งพรีเทสต์-รอบ2-10ชุด/output/covers';
const CATEGORY = 'สอบเข้า ม.1';

// เลขชุด -> สีธีมของเว็บ (ไล่เย็น->อุ่น->ร้อน ตามบันไดความยาก)
const THEME = {
    3: 'Sky', 4: 'Cyan', 5: 'Teal', 6: 'Emerald',
    7: 'Lime', 8: 'Amber', 9: 'Orange',
    10: 'Rose', 11: 'Pink', 12: 'Red',
};

const setNoOf = (title) => {
    const m = String(title).replace(/\s+/g, ' ').match(/ชุดที่\s*(\d+)/);
    return m ? Number(m[1]) : null;
};

(async () => {
    console.log(`โหมด: ${APPLY ? 'เขียนจริง (--apply)' : 'dry-run (ไม่เขียน)'}`);
    console.log(`bucket: ${BUCKET}\n`);

    const snap = await db.collection('exams').where('category', '==', CATEGORY).get();
    const targets = snap.docs
        .map(d => ({ id: d.id, ref: d.ref, ...d.data() }))
        .filter(r => (r.order ?? -99) >= 13)
        .sort((a, b) => a.order - b.order);

    if (targets.length !== 10) throw new Error(`เจอชุดเป้าหมาย ${targets.length} ชุด ควรเป็น 10`);

    let done = 0;
    for (const r of targets) {
        const n = setNoOf(r.title);
        if (!n || !THEME[n]) throw new Error(`อ่านเลขชุดจาก title ไม่ได้: ${JSON.stringify(r.title)}`);

        const local = path.join(COVER_DIR, `cover_set${String(n).padStart(2, '0')}.png`);
        if (!fs.existsSync(local)) throw new Error(`ไม่พบไฟล์ปก: ${local}`);
        const kb = Math.round(fs.statSync(local).size / 1024);

        const dest = `exam-covers/entrance-m1-r2-set${String(n).padStart(2, '0')}.png`;
        const token = crypto.randomUUID();
        const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/`
            + encodeURIComponent(dest) + `?alt=media&token=${token}`;

        if (APPLY) {
            await bucket.upload(local, {
                destination: dest,
                metadata: {
                    contentType: 'image/png',
                    cacheControl: 'public, max-age=31536000',
                    metadata: { firebaseStorageDownloadTokens: token },
                },
            });
            await r.ref.update({
                coverImage: url,
                themeColor: THEME[n],
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`ตั้งแล้ว: ชุดที่ ${String(n).padStart(2)} · ${THEME[n].padEnd(8)} · ${kb} KB · ${dest}`);
            done++;
        } else {
            console.log(`พร้อมตั้ง: ชุดที่ ${String(n).padStart(2)} · ${THEME[n].padEnd(8)} · ${kb} KB · ${dest}`
                + `  (เดิม: ${r.themeColor}, ปก ${r.coverImage ? 'มี' : 'ว่าง'})`);
        }
    }

    console.log(APPLY ? `\nสรุป: ตั้งปก+สีธีมแล้ว ${done} ชุด`
        : `\nสรุป: dry-run ผ่าน — รันซ้ำด้วย --apply เพื่อเขียนจริง`);
    process.exit(0);
})().catch(e => { console.error('ผิดพลาด:', e.message); process.exit(1); });
