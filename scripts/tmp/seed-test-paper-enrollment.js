/**
 * สร้าง "รายการซื้อข้อสอบ PDF ทดสอบ (อนุมัติแล้ว)" ให้บัญชีแอดมิน kruheemschool@gmail.com
 * เพื่อให้ครูฮีมเห็นหน้า "ข้อสอบ PDF ของฉัน" หลังอนุมัติเป็นของจริง
 *
 * รัน:  node scripts/tmp/seed-test-paper-enrollment.js          (สร้าง)
 *       node scripts/tmp/seed-test-paper-enrollment.js --remove (ลบรายการทดสอบทิ้ง)
 */
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const PAPER_ID = 'Uvv9ctkTgdy6Xv7zIvwD';
const EMAIL = 'kruheemschool@gmail.com';
const NOTE = 'รายการทดสอบระบบโดย Claude — ลบได้';
const REMOVE = process.argv.includes('--remove');

(async () => {
    if (REMOVE) {
        const snap = await db.collection('enrollments')
            .where('paperId', '==', PAPER_ID)
            .where('adminNote', '==', NOTE)
            .get();
        for (const d of snap.docs) {
            await d.ref.delete();
            console.log('ลบรายการทดสอบแล้ว:', d.id);
        }
        if (snap.empty) console.log('ไม่พบรายการทดสอบ');
        process.exit(0);
    }

    const u = await admin.auth().getUserByEmail(EMAIL);

    // กันสร้างซ้ำ
    const dup = await db.collection('enrollments')
        .where('paperId', '==', PAPER_ID)
        .where('userId', '==', u.uid)
        .get();
    if (!dup.empty) {
        console.log('มีรายการอยู่แล้ว:', dup.docs.map((d) => d.id).join(', '));
        process.exit(0);
    }

    const now = new Date();
    const ref = await db.collection('enrollments').add({
        userId: u.uid,
        email: EMAIL,
        userName: 'ด.ช.ครูฮีม (ทดสอบระบบ)',
        productType: 'examPaper',
        paperId: PAPER_ID,
        courseTitle: 'ข้อสอบ PDF: แนวข้อสอบเข้า ม.1 จุฬาภรณราชวิทยาลัย จ.ภ. (ปี2570) ชุดที่ 1',
        price: 200,
        finalPrice: 200,
        discountAmount: 0,
        status: 'approved',
        accessType: 'lifetime',
        approvedAt: now,
        createdAt: now,
        adminNote: NOTE,
    });
    console.log('✅ สร้างรายการทดสอบ (approved/lifetime):', ref.id);
    process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
