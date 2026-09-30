/**
 * ลบบทเรียนตะลุยโจทย์เก่า "แนวข้อสอบ ชุดที่ 1-3" ออกจากคอร์ส ป.6 สอบเข้าชั้น ม.1
 *
 * สำรองก่อนเสมอ: เขียนไฟล์ JSON ของบทเรียนทั้งดวง (รวม content) ลง scripts/backup-p6-lessons/
 * ก่อนลบ ทำให้กู้คืนได้ด้วย restore ในไฟล์เดียวกัน
 *
 * รัน: node scripts/delete-p6-old-exam-lessons.js            (สำรอง + dry-run ไม่ลบ)
 *      node scripts/delete-p6-old-exam-lessons.js --apply    (สำรองแล้วลบจริง)
 *      node scripts/delete-p6-old-exam-lessons.js --restore  (กู้คืนจากไฟล์สำรองล่าสุด)
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');
const RESTORE = process.argv.includes('--restore');

const COURSE_ID = 'lBj1ZUlnBiU8vv3lm94y';
const TITLES = ['แนวข้อสอบ ชุดที่ 1', 'แนวข้อสอบ ชุดที่ 2', 'แนวข้อสอบ ชุดที่ 3'];
const BACKUP_DIR = path.resolve(__dirname, 'backup-p6-lessons');

(async () => {
    const col = db.collection('courses').doc(COURSE_ID).collection('lessons');
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    if (RESTORE) {
        const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).sort();
        if (!files.length) throw new Error('ไม่พบไฟล์สำรองใน ' + BACKUP_DIR);
        for (const f of files) {
            const b = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), 'utf8'));
            const exists = await col.doc(b.id).get();
            if (exists.exists) { console.log(`⏭️  มีอยู่แล้ว ข้าม: ${b.data.title} [${b.id}]`); continue; }
            const d = { ...b.data };
            d.createdAt = admin.firestore.FieldValue.serverTimestamp();
            await col.doc(b.id).set(d);              // คืนด้วย id เดิม ความคืบหน้าของนักเรียนจึงกลับมาผูกได้
            console.log(`♻️  กู้คืนแล้ว: ${d.title} [${b.id}]`);
        }
        console.log('\nกู้คืนเสร็จ');
        process.exit(0);
    }

    console.log(`คอร์ส: ${COURSE_ID}`);
    console.log(`โหมด: ${APPLY ? '🗑️  ลบจริง (--apply)' : '🔍 dry-run (สำรองอย่างเดียว ไม่ลบ)'}\n`);

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    let n = 0;
    for (const title of TITLES) {
        const snap = await col.where('title', '==', title).get();
        if (snap.empty) { console.log(`⚠️  ไม่พบ: ${title}`); continue; }
        for (const d of snap.docs) {
            const data = d.data();
            let count = 0;
            try { count = JSON.parse(data.content || '[]').length; } catch (e) { }
            const out = path.join(BACKUP_DIR, `${stamp}__${d.id}__${title.replace(/\s+/g, '_')}.json`);
            fs.writeFileSync(out, JSON.stringify({ courseId: COURSE_ID, id: d.id, data }, null, 2), 'utf8');
            const kb = Math.round(fs.statSync(out).size / 1024);
            console.log(`💾 สำรองแล้ว: ${title} [${d.id}] ${count} ข้อ → ${path.basename(out)} (${kb}KB)`);

            if (APPLY) {
                await col.doc(d.id).delete();
                console.log(`🗑️  ลบแล้ว: ${title} [${d.id}]`);
                n++;
            }
        }
    }
    console.log(`\n${APPLY ? `ลบไปทั้งหมด ${n} บทเรียน` : 'dry-run: สำรองครบแล้ว ยังไม่ได้ลบ — รันซ้ำด้วย --apply เพื่อลบจริง'}`);
    console.log(`ไฟล์สำรองอยู่ที่ ${BACKUP_DIR}`);
    process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
