/**
 * Seed collection `examCalendar` — ปฏิทินสนามสอบสำหรับฟีเจอร์ "นับถอยหลังวันสอบ" หน้า /exam
 *
 * สร้าง 7 tracks ด้วยค่า placeholder (examAt = null, sourceUrl = "")
 * ⚠️ นาฬิกาจะยังไม่ขึ้นจนกว่าครูฮีมจะกรอก examAt + sourceUrl จริงใน Firestore console
 *    (กติกา: countdown ที่ไม่มีลิงก์ประกาศจริง = countdown ปลอม ห้ามปล่อยขึ้นเว็บ)
 *
 * examAt ต้องกรอกเป็น Timestamp เวลาไทย เช่น สอบ 15 มี.ค. 2027 (พ.ศ.2570) 09:00 น.
 *   → ใส่ใน console เป็น 2027-03-15T09:00:00+07:00
 *
 * Idempotent: doc ที่มีอยู่แล้วจะถูกข้าม (ไม่เขียนทับค่าที่ครูฮีมกรอกแล้ว)
 * รัน: node scripts/seed-exam-calendar.js          (dry-run)
 *      node scripts/seed-exam-calendar.js --apply  (เขียนจริง)
 */
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const APPLY = process.argv.includes('--apply');

const TRACKS = [
    { trackId: 'entrance-m1',  label: 'สอบเข้า ม.1 · รอบทั่วไป',   chaptersToMaster: 9,  hasContent: true,  order: 1 },
    { trackId: 'entrance-m4',  label: 'สอบเข้า ม.4',               chaptersToMaster: 10, hasContent: true,  order: 2 },
    { trackId: 'onet-m3',      label: 'O-NET ม.3',                 chaptersToMaster: 8,  hasContent: true,  order: 3 },
    { trackId: 'onet-m6',      label: 'O-NET ม.6',                 chaptersToMaster: 10, hasContent: true,  order: 4 },
    { trackId: 'alevel-math1', label: 'A-Level คณิต 1',            chaptersToMaster: 12, hasContent: false, order: 5 },
    { trackId: 'tgat',         label: 'TGAT',                      chaptersToMaster: 6,  hasContent: false, order: 6 },
    // สนามพิเศษ: ไม่มีวันสอบกลาง — component แสดงการ์ดแบบไม่มีนาฬิกา
    { trackId: 'school-exam',  label: 'ยังไม่มีสนาม — เน้นสอบในโรงเรียน', chaptersToMaster: 8, hasContent: true, order: 7 },
];

(async () => {
    console.log(`โหมด: ${APPLY ? '✍️ เขียนจริง (--apply)' : '🔍 dry-run'}\n`);
    let created = 0, skipped = 0;
    for (const t of TRACKS) {
        const ref = db.collection('examCalendar').doc(t.trackId);
        const snap = await ref.get();
        if (snap.exists) {
            const cur = snap.data();
            const filled = cur.examAt && cur.sourceUrl;
            console.log(`⏭️  มีอยู่แล้ว${filled ? ' (กรอกครบ)' : ' ⚠️ ยังไม่ได้กรอก examAt/sourceUrl'}: ${t.trackId}`);
            skipped++;
            continue;
        }
        const doc = {
            trackId: t.trackId,
            label: t.label,
            examAt: null,          // ⚠️ placeholder — ครูฮีมกรอกวันสอบจริง (Timestamp, Asia/Bangkok)
            sourceUrl: '',         // ⚠️ placeholder — required ห้ามว่าง! ลิงก์ประกาศทางการ
            isEstimate: true,      // true จนกว่าจะยืนยันจากประกาศทางการ
            chaptersToMaster: t.chaptersToMaster,
            hoursPerWeek: 3,
            hasContent: t.hasContent,
            order: t.order,
        };
        if (APPLY) {
            await ref.set(doc);
            console.log(`✅ สร้าง: ${t.trackId} (${t.label})`);
            created++;
        } else {
            console.log(`✔️  จะสร้าง: ${t.trackId} (${t.label})`);
        }
    }
    console.log(`\nสรุป: ${APPLY ? `สร้าง ${created} / ข้าม ${skipped}` : 'dry-run — รันซ้ำด้วย --apply'}`);
    if (APPLY && created > 0) {
        console.log('\n⚠️ ⚠️ ⚠️  ยังไม่ได้กรอกวันสอบจริง!');
        console.log('นาฬิกาจะไม่แสดงจนกว่าจะกรอก examAt (Timestamp) + sourceUrl (ลิงก์ประกาศ) ในแต่ละ doc');
        console.log('เปิด Firebase console → Firestore → examCalendar → กรอกทีละ track');
    }
    process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
