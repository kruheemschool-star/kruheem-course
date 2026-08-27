/**
 * เขียน "ตัวเลือกที่จัดรูปแบบใหม่" กลับเข้า Firestore ตามที่ scan.js เสนอไว้ใน report.json
 *
 * แตะเฉพาะ options เท่านั้น — ไม่แตะโจทย์ ไม่แตะ correctIndex ไม่แตะเฉลย ไม่แตะ tags
 * ก่อนเขียนจะตรวจซ้ำอีกรอบว่า
 *   - ตัวเลือกเดิมใน Firestore ยังตรงกับที่สแกนไว้ (กันของเปลี่ยนระหว่างทาง)
 *   - เนื้อหาเปลี่ยนแค่เครื่องหมาย $ เท่านั้น
 *   - ตัวเลือกไม่ซ้ำกันเอง · ขนาด doc ไม่ชนเพดาน
 *
 * รัน: node scripts/exam-maintenance/optfmt/apply.js          (dry-run)
 *      node scripts/exam-maintenance/optfmt/apply.js --apply  (เขียนจริง)
 *
 * หลังเขียนจริง ต้องรัน: node scripts/bust-caches.js exams
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname, '../../seed-gifted-m1/serviceAccountKey.json'))) });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');
const report = JSON.parse(fs.readFileSync(path.join(__dirname, 'report.json'), 'utf8'));
const strip = (x) => String(x).replace(/\$/g, '');
const utf8 = (s) => Buffer.byteLength(s, 'utf8');
function docSize(obj) {
    const sz = (v) => {
        if (v == null) return 1;
        const t = typeof v;
        if (t === 'string') return utf8(v) + 1;
        if (t === 'boolean') return 1;
        if (t === 'number') return 8;
        if (Array.isArray(v)) return v.reduce((s, e) => s + sz(e), 0);
        if (t === 'object') { let s = 32; for (const [k, val] of Object.entries(v)) s += utf8(k) + 1 + sz(val); return s; }
        return 8;
    };
    let total = 32;
    for (const [k, v] of Object.entries(obj)) total += utf8(k) + 1 + sz(v);
    return total;
}

(async () => {
    console.log(`โหมด: ${APPLY ? '✍️  เขียนจริง (--apply)' : '🔍 dry-run — ตรวจอย่างเดียว'}\n`);
    const bdir = path.join(__dirname, 'backup');
    if (APPLY) fs.mkdirSync(bdir, { recursive: true });
    const stamp = process.env.OPTFMT_STAMP || String(report.length) + '-run';
    let fatal = 0, jobs = [], totQ = 0, totOpt = 0;

    for (const set of report) {
        const ref = db.collection('exams').doc(set.id);
        const snap = await ref.get();
        if (!snap.exists) { console.error(`❌ ไม่พบชุด ${set.id}`); fatal++; continue; }
        const cur = snap.data();
        const qs = cur.questions || [];
        const next = qs.map((q) => ({ ...q }));
        const errs = [];
        for (const row of set.rows) {
            const q = qs[row.i - 1];
            if (!q) { errs.push(`ข้อ ${row.i} อยู่นอกช่วง`); continue; }
            const os = q.options || [];
            if (JSON.stringify(os) !== JSON.stringify(row.os)) { errs.push(`ข้อ ${row.i}: ตัวเลือกใน Firestore ไม่ตรงกับตอนสแกน`); continue; }
            if (!row.fix.every((v, j) => strip(v) === strip(row.os[j]))) { errs.push(`ข้อ ${row.i}: เนื้อหาเปลี่ยน ไม่ใช่แค่ $`); continue; }
            if (new Set(row.fix).size !== 4) { errs.push(`ข้อ ${row.i}: ตัวเลือกซ้ำหลังแก้`); continue; }
            if (row.fix.some((v) => /\$\$\$/.test(v) || (v.match(/\$/g) || []).length % 2)) { errs.push(`ข้อ ${row.i}: $ ไม่สมดุล`); continue; }
            next[row.i - 1] = { ...q, options: row.fix };
            totOpt += row.fix.filter((v, j) => v !== row.os[j]).length;
        }
        const size = docSize({ ...cur, questions: next });
        if (size > 1000000) errs.push('ขนาด doc เกินที่ปลอดภัย');
        const nq = set.rows.length;
        const leaks = set.rows.filter((r) => r.leak).length;
        console.log(`── ${String(set.title).slice(0, 40)} [${set.cat}] · ${nq} ข้อ (ใบ้คำตอบ ${leaks}) · ${(size / 1048576 * 100).toFixed(1)}%`);
        if (errs.length) { errs.slice(0, 5).forEach((e) => console.error('   ❌ ' + e)); fatal++; continue; }
        totQ += nq;
        jobs.push({ ref, id: set.id, title: set.title, qs, next });
    }

    console.log(`\nรวม ${jobs.length} ชุด · ${totQ} ข้อ · ${totOpt} ตัวเลือก`);
    if (fatal) { console.error(`หยุด — มี ${fatal} ชุดที่ตรวจไม่ผ่าน`); process.exit(1); }
    if (!APPLY) { console.log('(dry-run) สั่ง --apply เพื่อเขียนจริง'); process.exit(0); }

    for (const j of jobs) {
        // สำรองแบบมี stamp — apply-dedup เคยเขียนทับ backup ของตัวเองจนของเดิมหาย ที่นี่ต้องไม่ซ้ำรอย
        fs.writeFileSync(path.join(bdir, `${j.id}-${stamp}.json`),
            JSON.stringify({ examId: j.id, title: j.title, questions: j.qs }), 'utf8');
        await j.ref.update({ questions: j.next, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        console.log(`✅ ${String(j.title).slice(0, 44)}`);
    }
    console.log('\n⚠️  ขั้นต่อไป: node scripts/bust-caches.js exams');
    process.exit(0);
})();
