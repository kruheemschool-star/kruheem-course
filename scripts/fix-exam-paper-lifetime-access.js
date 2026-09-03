/**
 * ซ่อมสิทธิ์ใบสั่งซื้อข้อสอบ PDF ให้เป็น "ตลอดชีพ" ตามที่หน้าขายสัญญาไว้
 *
 * ปัญหา: ใบ productType "examPaper" ที่อนุมัติแล้วบางใบถูกประทับ
 *   accessType: "limited" + expiryDate อีก 5 ปี (พฤติกรรมของคอร์สเรียน)
 * ผลกระทบ: /api/download-pdf เคารพ expiryDate — พอถึงวันนั้นคนที่จ่ายเงินไปแล้ว
 *   จะโหลดไฟล์ไม่ได้ ทั้งที่หน้าขายกับ FAQ เขียนว่า "ซื้อครั้งเดียว โหลดได้ตลอดชีพ"
 *
 * ต้นเหตุที่แก้ไปแล้วในโค้ด (4ef376f): ปุ่มอนุมัติเคยตัดสินทุกใบเป็นคอร์ส
 *   ใบที่ยังผิดอยู่คือใบที่ถูกอนุมัติ "ก่อน" ฟิกซ์นั้นถึงเครื่องผู้ใช้ — รวมถึงกรณี
 *   เปิดแท็บหลังบ้านค้างไว้ข้ามการ deploy แล้วกดอนุมัติจากโค้ดชุดเก่าในแท็บนั้น
 *
 * สคริปต์นี้แตะเฉพาะใบ productType === "examPaper" ที่ status === "approved"
 * และมีสภาพผิด (accessType ไม่ใช่ lifetime หรือมี expiryDate ค้าง) เท่านั้น
 * ใบคอร์สเรียนไม่ถูกแตะ — 5 ปีของคอร์สคือพฤติกรรมที่ถูกต้อง
 *
 * รัน: node scripts/fix-exam-paper-lifetime-access.js          (dry-run)
 *      node scripts/fix-exam-paper-lifetime-access.js --apply  (เขียนจริง + สำรองก่อน)
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });

const db = admin.firestore();
const APPLY = process.argv.includes('--apply');

const asDate = (v) => (v && v.toDate ? v.toDate().toISOString().slice(0, 10) : null);

(async () => {
    console.log(APPLY ? '=== APPLY (เขียนจริง) ===' : '=== DRY-RUN (ไม่เขียนอะไร) ===\n');

    const snap = await db.collection('enrollments').where('productType', '==', 'examPaper').get();

    const broken = [];
    snap.forEach((d) => {
        const x = d.data();
        if (x.status !== 'approved') return;
        if (x.accessType === 'lifetime' && !x.expiryDate) return; // สภาพถูกอยู่แล้ว
        broken.push({ id: d.id, data: x });
    });

    console.log(`ใบข้อสอบ PDF ทั้งหมด ${snap.size} ใบ · ต้องซ่อม ${broken.length} ใบ\n`);
    if (broken.length === 0) { console.log('ไม่มีอะไรต้องซ่อม'); process.exit(0); }

    for (const b of broken) {
        console.log(`  ${b.id} · ${b.data.userEmail || b.data.userName || '(ไม่ระบุ)'}`);
        console.log(`     accessType: ${b.data.accessType ?? '(ไม่มี)'} → lifetime`);
        console.log(`     expiryDate: ${asDate(b.data.expiryDate) ?? '(ไม่มี)'} → ลบทิ้ง (ไม่มีวันหมดอายุ)`);
    }

    if (!APPLY) { console.log('\nยังไม่ได้เขียนอะไร — รันซ้ำด้วย --apply เมื่อพร้อม'); process.exit(0); }

    // สำรองสภาพเดิมก่อนแตะ — ย้อนกลับได้ถ้าตัดสินใจใหม่
    const backupPath = path.join(__dirname, `tmp/BACKUP-paper-access-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.writeFileSync(backupPath, JSON.stringify(
        broken.map((b) => ({ id: b.id, accessType: b.data.accessType ?? null, expiryDate: asDate(b.data.expiryDate) })),
        null, 2));
    console.log(`\nสำรองสภาพเดิมไว้ที่ ${backupPath}`);

    for (const b of broken) {
        await db.doc(`enrollments/${b.id}`).update({
            accessType: 'lifetime',
            expiryDate: admin.firestore.FieldValue.delete(),
        });
        console.log(`  ✅ ซ่อมแล้ว ${b.id}`);
    }

    console.log('\nเสร็จ — ผู้ซื้อข้อสอบ PDF ได้สิทธิ์ตลอดชีพตามที่หน้าขายสัญญาแล้ว');
    process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
