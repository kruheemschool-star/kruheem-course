/**
 * เขียนเฉลยชุด ม.4 ฟังก์ชันเอกซ์โพเนนเชียลและลอการิทึมใหม่ทั้ง 250 ข้อ
 * (exams/qJe7moeg7guVZyUG5dMO)
 *
 * เหตุผล: เฉลยเดิมเฉลี่ย 501 ตัวอักษร สั้นกว่าชุด ม.6 ที่ผลิตทีหลังถึง 2.7 เท่า
 * ควบหลายขั้นในบรรทัดเดียว วิเคราะห์ตัวลวงสั้นเกินไป และยังมีอุปมาโลกภายนอก
 * ที่สเปก voice-and-format.md ห้ามไว้ ("ขึ้นไปนั่งบนหลังคา", "ต่อกันเป็นโซ่")
 *
 * ⚠️ แตะเฉพาะ field `explanation` เท่านั้น — โจทย์ ตัวเลือก คำตอบ tag และรูป SVG
 *    คงของเดิมทุกตัวอักษร เพราะทุกข้อผ่าน SymPy มาแล้วตั้งแต่ตอนผลิต
 *    ตรวจยืนยันด้วย final-check.py ก่อนแล้วว่าไม่มี field ใดถูกเปลี่ยน
 *
 * ที่มาไฟล์: ~/Documents/workspace/kruheem-exams/rework-2026-08/m4-explog-solutions/
 *   ผ่าน verify.py 250/250 ข้อ (หัวเฉลยตรง correctIndex, วิเคราะห์ตัวลวงครบ 3 ตัว,
 *   คำคมจำง่ายไม่ซ้ำ 250 แบบ, LaTeX สมดุล, ไม่มีวลีต้องห้าม/อุปมาโลกภายนอก)
 *
 * รัน: node scripts/replace-m4-explog-solutions.js          (dry-run)
 *      node scripts/replace-m4-explog-solutions.js --apply  (เขียนจริง)
 *
 * หลังเขียนจริง: node scripts/bust-caches.js exams
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');
const EXAM_ID = 'qJe7moeg7guVZyUG5dMO';
const SRC = path.resolve(process.env.HOME,
    'Documents/workspace/kruheem-exams/rework-2026-08/m4-explog-solutions/output/webquiz_m4t2_explog_250q_REWRITTEN.json');
const BACKUP_DIR = path.resolve(__dirname, 'tmp');
const LIMIT = 1048576;
const SAFE = 1000000;

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

    const next = JSON.parse(fs.readFileSync(SRC, 'utf8'));
    if (next.length !== 250) throw new Error(`ไฟล์ใหม่มี ${next.length} ข้อ ไม่ใช่ 250`);

    const ref = db.collection('exams').doc(EXAM_ID);
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`ไม่พบชุดข้อสอบ ${EXAM_ID}`);
    const cur = snap.data();
    const prev = cur.questions || [];
    console.log(`ชุดปลายทาง: "${cur.title}" [${EXAM_ID}] — ${prev.length} ข้อ`);
    if (prev.length !== 250) throw new Error(`ชุดบนเว็บมี ${prev.length} ข้อ ไม่ใช่ 250 — ยกเลิก`);

    // ---------- ตรวจว่าไม่มีอะไรนอกจากเฉลยถูกเปลี่ยน ----------
    const errs = [];
    for (let i = 0; i < 250; i++) {
        const o = prev[i], n = next[i];
        if (o.question !== n.question) errs.push(`ข้อ ${i + 1}: โจทย์ถูกเปลี่ยน`);
        if (o.correctIndex !== n.correctIndex) errs.push(`ข้อ ${i + 1}: คำตอบถูกเปลี่ยน`);
        if (JSON.stringify(o.options) !== JSON.stringify(n.options)) errs.push(`ข้อ ${i + 1}: ตัวเลือกถูกเปลี่ยน`);
        if (JSON.stringify(o.tags) !== JSON.stringify(n.tags)) errs.push(`ข้อ ${i + 1}: tag ถูกเปลี่ยน`);
        if ((o.svg || '') !== (n.svg || '')) errs.push(`ข้อ ${i + 1}: รูป svg ถูกเปลี่ยน`);
        if (o.explanation === n.explanation) errs.push(`ข้อ ${i + 1}: เฉลยยังไม่ได้เขียนใหม่`);
        if (!n.explanation.startsWith(`**คำตอบ: ข้อ ${n.correctIndex + 1}.**`)) errs.push(`ข้อ ${i + 1}: หัวเฉลยไม่ตรงคำตอบ`);
    }
    if (errs.length) {
        console.error(`❌ ตรวจไม่ผ่าน ${errs.length} จุด:`);
        errs.slice(0, 15).forEach((e) => console.error('   -', e));
        process.exit(1);
    }
    console.log('✅ ตรวจผ่าน: โจทย์/ตัวเลือก/คำตอบ/tag/รูป ไม่ถูกแตะเลย · เฉลยเขียนใหม่ครบ 250 ข้อ');

    const oldLen = prev.reduce((s, q) => s + String(q.explanation).length, 0);
    const newLen = next.reduce((s, q) => s + q.explanation.length, 0);
    console.log(`   เฉลยเดิมเฉลี่ย ${Math.round(oldLen / 250)} ตัวอักษร → ใหม่ ${Math.round(newLen / 250)} ตัวอักษร (${(newLen / oldLen).toFixed(1)} เท่า)`);

    const payload = { ...cur, questions: next, questionCount: next.length };
    const size = docSize(payload);
    console.log(`   ขนาด doc ใหม่: ${size.toLocaleString()} bytes (${(100 * size / LIMIT).toFixed(1)}% ของเพดาน 1MiB)`);
    if (size > SAFE) throw new Error('ขนาดเกินเกณฑ์ปลอดภัย — ต้องแบ่งชุด');

    if (!APPLY) { console.log('\n(dry-run) สั่ง --apply เพื่อเขียนจริง'); process.exit(0); }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const bak = path.join(BACKUP_DIR, `BACKUP-${EXAM_ID}-solutions-${stamp}.json`);
    fs.writeFileSync(bak, JSON.stringify(cur, null, 1));
    console.log(`\n💾 สำรองชุดเดิมไว้ที่ ${path.relative(process.cwd(), bak)}`);

    await ref.update({
        questions: next,
        questionCount: next.length,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const after = (await ref.get()).data();
    console.log(`✅ เขียนสำเร็จ: "${after.title}" — ${after.questions.length} ข้อ`);
    console.log('\nขั้นต่อไป: node scripts/bust-caches.js exams');
    process.exit(0);
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
