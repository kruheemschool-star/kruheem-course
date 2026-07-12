/**
 * Mirror ปฏิทินสอบ: examCalendar (collection ต้นทาง, แอดมินแก้) → public_stats/examCalendar (doc เดียว)
 *
 * ทำไมต้อง mirror: rules ของ collection examCalendar ยังรอ `firebase deploy` (ทำได้เฉพาะครูฮีม)
 * แต่ `public_stats/*` เปิดอ่านสาธารณะอยู่แล้ว — หน้า /exam จึงอ่านปฏิทินจาก mirror นี้ได้ทันที
 * โดยไม่ต้องรอ rules ใหม่. เมื่อไหร่ที่แก้ข้อมูลใน examCalendar ให้รันสคริปต์นี้ซ้ำหนึ่งครั้ง.
 *
 * รัน: node scripts/sync-exam-calendar.js
 */
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
    const snap = await db.collection('examCalendar').get();
    const tracks = snap.docs
        .map(d => {
            const x = d.data();
            return {
                trackId: x.trackId || d.id,
                label: x.label || '',
                // เก็บเป็น ISO string ให้ตรง shape ที่ component ใช้ (examAtIso)
                examAt: x.examAt ? x.examAt.toDate().toISOString() : null,
                sourceUrl: x.sourceUrl || '',
                isEstimate: x.isEstimate !== false,
                chaptersToMaster: x.chaptersToMaster || 9,
                hoursPerWeek: x.hoursPerWeek || 3,
                hasContent: !!x.hasContent,
                order: x.order ?? 99,
            };
        })
        .sort((a, b) => a.order - b.order);

    await db.doc('public_stats/examCalendar').set({
        tracks,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ mirror แล้ว ${tracks.length} tracks → public_stats/examCalendar`);
    tracks.forEach(t => {
        const clock = t.examAt && t.sourceUrl ? `⏰ ${t.examAt}${t.isEstimate ? ' (ประมาณ)' : ''}` : '— ยังไม่มีนาฬิกา (รอกรอกวัน/ลิงก์)';
        console.log(`  ${String(t.order).padStart(2)} ${t.trackId.padEnd(14)} ${clock}`);
    });
    process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
