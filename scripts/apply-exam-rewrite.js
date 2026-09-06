/**
 * เขียนทับข้อในชุดข้อสอบด้วยข้อที่แต่งใหม่ (รุ่นที่ยอมให้ย้ายตำแหน่งคำตอบได้)
 *
 * ต่างจาก apply-dedup.js ตรงเดียว คือข้อใหม่ย้าย correctIndex ได้
 * เพราะเป็นโจทย์คนละข้อกับของเดิม จึงไม่มีเหตุผลต้องล็อกตำแหน่งคำตอบเดิมไว้
 * แลกกับการที่สคริปต์นี้ต้องรายงานการกระจาย ก/ข/ค/ง ก่อนหลังให้เห็นทุกครั้ง
 *
 * รัน: node scripts/apply-exam-rewrite.js <ไฟล์ json ...>          (dry-run)
 *      node scripts/apply-exam-rewrite.js <ไฟล์ json ...> --apply  (เขียนจริง)
 * หลังเขียนจริง: node scripts/bust-caches.js exams
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');
const files = process.argv.slice(2).filter((a) => a.endsWith('.json'));
if (!files.length) { console.error('ต้องระบุไฟล์ json อย่างน้อยหนึ่งไฟล์'); process.exit(1); }

const norm = (s) => String(s).replace(/[^\w฀-๿+\-]/g, '').replace(/\s+/g, '');
const fullKey = (q) => norm(q.question) + '||' + [...q.options].sort().map(norm).join('|');
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
    const byExam = {};
    for (const f of files) {
        const d = JSON.parse(fs.readFileSync(f, 'utf8'));
        byExam[d.examId] = byExam[d.examId] || {};
        for (const [pos, q] of Object.entries(d.replace)) {
            if (byExam[d.examId][pos]) { console.error(`❌ ข้อ ${pos} ถูกกำหนดซ้ำสองไฟล์`); process.exit(1); }
            byExam[d.examId][pos] = q;
        }
    }

    let fatal = 0;
    const jobs = [];
    for (const [examId, rep] of Object.entries(byExam)) {
        const ref = db.collection('exams').doc(examId);
        const snap = await ref.get();
        if (!snap.exists) { console.error(`❌ ไม่พบชุด ${examId}`); fatal++; continue; }
        const cur = snap.data();
        const qs = cur.questions || [];
        console.log(`── "${String(cur.title).replace(/\s+/g, ' ')}" [${cur.category}] ${qs.length} ข้อ · เขียนใหม่ ${Object.keys(rep).length} ข้อ`);

        const errs = [];
        const next = qs.map((q) => ({ ...q }));
        const moved = [];
        for (const [posStr, nq] of Object.entries(rep)) {
            const i = Number(posStr) - 1;
            if (!(i >= 0 && i < qs.length)) { errs.push(`ข้อ ${posStr} อยู่นอกช่วง`); continue; }
            if (!Array.isArray(nq.options) || nq.options.length !== 4) errs.push(`ข้อ ${posStr}: ตัวเลือกไม่ครบสี่`);
            if (new Set(nq.options).size !== 4) errs.push(`ข้อ ${posStr}: ตัวเลือกซ้ำ`);
            if (!nq.explanation.startsWith(`**คำตอบ: ข้อ ${nq.correctIndex + 1}.**`))
                errs.push(`ข้อ ${posStr}: หัวเฉลยไม่ตรง correctIndex`);
            if (/\neq/.test(nq.question) || nq.options.some((o) => /\neq/.test(o)))
                errs.push(`ข้อ ${posStr}: มี \\neq ที่กลายเป็นขึ้นบรรทัดใหม่`);
            if (nq.correctIndex !== qs[i].correctIndex) moved.push(`${posStr}: ${'กขคง'[qs[i].correctIndex]}→${'กขคง'[nq.correctIndex]}`);
            next[i] = { ...qs[i], ...nq };
        }

        const seen = new Map();
        next.forEach((q, i) => {
            const k = fullKey(q);
            if (seen.has(k)) errs.push(`หลังเขียนใหม่ ข้อ ${i + 1} ยังซ้ำกับข้อ ${seen.get(k) + 1}`);
            else seen.set(k, i);
        });

        const before = qs.length - new Set(qs.map(fullKey)).size;
        const after = next.length - new Set(next.map(fullKey)).size;
        console.log(`   ข้อซ้ำเป๊ะ: ${before} → ${after}`);
        const c0 = [0, 0, 0, 0]; qs.forEach((q) => c0[q.correctIndex]++);
        const c1 = [0, 0, 0, 0]; next.forEach((q) => c1[q.correctIndex]++);
        console.log(`   การกระจายคำตอบ ก/ข/ค/ง: ${c0.join(' / ')}  →  ${c1.join(' / ')}`);
        if (moved.length) console.log(`   ย้ายตำแหน่งคำตอบ ${moved.length} ข้อ: ${moved.join(' · ')}`);
        const size = docSize({ ...cur, questions: next });
        console.log(`   ขนาด doc: ${docSize(cur).toLocaleString()} → ${size.toLocaleString()} ไบต์ (${(size / 1048576 * 100).toFixed(1)}% ของเพดาน)`);
        if (size > 1000000) errs.push('ขนาด doc เกินที่ปลอดภัย');

        if (errs.length) {
            console.error(`   ❌ ตรวจไม่ผ่าน ${errs.length} จุด:`);
            errs.slice(0, 10).forEach((e) => console.error('      -', e));
            fatal++; console.log(''); continue;
        }
        console.log('   ✅ ตรวจผ่าน\n');
        jobs.push({ ref, examId, title: cur.title, qs, next });
    }

    if (fatal) { console.error(`หยุด — มี ${fatal} ชุดที่ตรวจไม่ผ่าน`); process.exit(1); }
    if (!APPLY) { console.log('(dry-run) สั่ง --apply เพื่อเขียนจริง'); process.exit(0); }

    const bdir = path.resolve(__dirname, 'tmp/rewrite/backup');
    fs.mkdirSync(bdir, { recursive: true });
    for (const j of jobs) {
        fs.writeFileSync(path.join(bdir, `${j.examId}-${Date.now()}.json`),
            JSON.stringify({ examId: j.examId, title: j.title, questions: j.qs }), 'utf8');
        await j.ref.update({ questions: j.next, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        console.log(`✅ เขียนแล้ว "${String(j.title).replace(/\s+/g, ' ')}" · สำรองไว้ที่ scripts/tmp/rewrite/backup/`);
    }
    console.log('\n⚠️  ขั้นต่อไป: node scripts/bust-caches.js exams');
    process.exit(0);
})();
