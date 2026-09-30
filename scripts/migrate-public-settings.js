/**
 * ย้ายการตั้งค่าสาธารณะเข้า doc รวม settings/homepage_promotion (ครั้งเดียว)
 *   settings/homeCountdown  → homepage_promotion.countdown
 *   settings/examConfig     → homepage_promotion.examConfig
 *
 * เหตุผล: หน้าแรก/หน้าข้อสอบอ่านค่าตั้งฝั่งเซิร์ฟเวอร์ผ่าน Firestore REST ด้วย
 * public key ซึ่ง rules ที่ deploy จริงเปิดอ่านสาธารณะเฉพาะ settings/homepage_promotion
 * — settings ตัวอื่นโดน 403 เงียบ ทำให้การ์ดนับถอยหลังค้างค่า default และสวิตช์
 * บันทึกผลสอบกลายเป็นปิด (ดู lib/publicSettings.ts)
 *
 * ใช้ merge จึงไม่แตะ field แบนเนอร์โปรโมชันเดิม (ถ้ามี) และไม่ลบ doc ต้นทาง
 * (เก็บเป็นสำรอง — โค้ดแอดมินมี fallback อ่าน doc เดิมอยู่แล้ว)
 *
 * รัน: node scripts/migrate-public-settings.js          (dry-run)
 *      node scripts/migrate-public-settings.js --apply  (ย้ายจริง)
 */
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');

(async () => {
    console.log(`โหมด: ${APPLY ? '✍️  ย้ายจริง (--apply)' : '🔍 dry-run (ไม่เขียน)'}\n`);

    const [cdSnap, ecSnap, destSnap] = await Promise.all([
        db.doc('settings/homeCountdown').get(),
        db.doc('settings/examConfig').get(),
        db.doc('settings/homepage_promotion').get(),
    ]);

    const payload = {};
    if (cdSnap.exists) {
        payload.countdown = cdSnap.data();
        console.log(`✓ homeCountdown → countdown: "${payload.countdown.examName}" สอบ ${payload.countdown.targetDate} (คำคม ${(payload.countdown.quotes || []).length} ข้อ)`);
    } else {
        console.log('– settings/homeCountdown ไม่มีข้อมูล ข้าม');
    }
    if (ecSnap.exists) {
        payload.examConfig = ecSnap.data();
        console.log(`✓ examConfig → examConfig: ${JSON.stringify(payload.examConfig)}`);
    } else {
        console.log('– settings/examConfig ไม่มีข้อมูล ข้าม');
    }

    console.log(`\nปลายทาง settings/homepage_promotion เดิม: ${destSnap.exists ? JSON.stringify(Object.keys(destSnap.data())) : '(ยังไม่มี doc)'}`);

    if (!Object.keys(payload).length) { console.log('ไม่มีอะไรให้ย้าย'); process.exit(0); }
    if (!APPLY) { console.log('\n(dry-run จบ — รันซ้ำด้วย --apply เพื่อย้ายจริง)'); process.exit(0); }

    await db.doc('settings/homepage_promotion').set(payload, { merge: true });
    const after = (await db.doc('settings/homepage_promotion').get()).data();
    console.log(`\n✅ ย้ายแล้ว — field ใน doc ปลายทางตอนนี้: ${JSON.stringify(Object.keys(after))}`);
    process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
