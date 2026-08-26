/**
 * รอบ 2: ยกระดับข้อ "ยากมาก" 19 ข้อของชุด ม.4 เอกซ์โพเนนเชียล-ลอการิทึม
 * (exams/qJe7moeg7guVZyUG5dMO)
 *
 * เหตุผล: เฉลยเดิมเฉลี่ย 501 ตัวอักษร สั้นกว่าชุด ม.6 ที่ผลิตทีหลังถึง 2.7 เท่า
 * ควบหลายขั้นในบรรทัดเดียว วิเคราะห์ตัวลวงสั้นเกินไป และยังมีอุปมาโลกภายนอก
 * ที่สเปก voice-and-format.md ห้ามไว้ ("ขึ้นไปนั่งบนหลังคา", "ต่อกันเป็นโซ่")
 *
 * ⚠️ 231 ข้อที่ไม่ได้ยกระดับ ทั้งโจทย์และเฉลยต้องเหมือนเดิมทุกตัวอักษร
 *    ส่วน 19 ข้อที่ยกระดับ คงตำแหน่งคำตอบเดิมไว้ เพื่อให้การกระจาย
 *    คำตอบทั้งชุดยังเป็น 62/63/62/63 เท่าเดิม
 *    โจทย์ใหม่ทุกข้อผ่าน SymPy (upgrade/build_hard.py) และไม่ซ้ำโครงกับข้อเดิม
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
    'Documents/workspace/kruheem-exams/rework-2026-08/m4-explog-solutions/output/webquiz_m4t2_explog_250q_FINAL.json');
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
    // 19 ข้อนี้ตั้งใจยกระดับโจทย์ใหม่ ส่วนอีก 231 ข้อโจทย์ต้องคงเดิมทุกตัวอักษร
    const UPGRADED = new Set([50,73,75,109,110,138,139,140,155,169,180,203,204,219,220,241,244,247,249]);
    const errs = [];
    for (let i = 0; i < 250; i++) {
        const o = prev[i], n = next[i], no = i + 1;
        if (!UPGRADED.has(no)) {
            if (o.question !== n.question) errs.push(`ข้อ ${no}: โจทย์ถูกเปลี่ยน`);
            if (o.correctIndex !== n.correctIndex) errs.push(`ข้อ ${no}: คำตอบถูกเปลี่ยน`);
            if (JSON.stringify(o.options) !== JSON.stringify(n.options)) errs.push(`ข้อ ${no}: ตัวเลือกถูกเปลี่ยน`);
            if ((o.svg || '') !== (n.svg || '')) errs.push(`ข้อ ${no}: รูป svg ถูกเปลี่ยน`);
        } else if (o.correctIndex !== n.correctIndex) {
            errs.push(`ข้อ ${no}: ตำแหน่งคำตอบเปลี่ยน จะทำให้การกระจายเสียสมดุล`);
        }
        if (JSON.stringify(o.tags) !== JSON.stringify(n.tags)) errs.push(`ข้อ ${no}: tag ถูกเปลี่ยน`);
        // 19 ข้อที่ยกระดับต้องมีเฉลยใหม่ ส่วน 231 ข้อที่เหลือเฉลยต้องเหมือนเดิมเป๊ะ
        if (UPGRADED.has(no)) {
            if (o.explanation === n.explanation) errs.push(`ข้อ ${no}: ยกระดับแล้วแต่เฉลยยังเป็นของเดิม`);
        } else if (o.explanation !== n.explanation) {
            errs.push(`ข้อ ${no}: เฉลยของข้อที่ไม่ได้ยกระดับถูกแตะ`);
        }
        if (!n.explanation.startsWith(`**คำตอบ: ข้อ ${n.correctIndex + 1}.**`)) errs.push(`ข้อ ${no}: หัวเฉลยไม่ตรงคำตอบ`);
    }
    const dist = [0,0,0,0]; next.forEach(q => dist[q.correctIndex]++);
    console.log(`   การกระจายคำตอบ ก/ข/ค/ง: ${dist.join(' / ')}`);
    if (errs.length) {
        console.error(`❌ ตรวจไม่ผ่าน ${errs.length} จุด:`);
        errs.slice(0, 15).forEach((e) => console.error('   -', e));
        process.exit(1);
    }
    console.log('✅ ตรวจผ่าน: 231 ข้อคงเดิม · 19 ข้อยกระดับตามตั้งใจ · เฉลยใหม่ครบ 250 ข้อ');

    const newLen = next.reduce((s, q) => s + q.explanation.length, 0);
    console.log(`   เฉลยเฉลี่ยทั้งชุด ${Math.round(newLen / 250)} ตัวอักษร`);

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
