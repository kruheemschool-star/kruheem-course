/**
 * นำเข้าชุดข้อสอบที่ผลิตเสร็จแล้วแต่ยังไม่เคยขึ้นเว็บ 3 ชุด (750 ข้อ)
 *
 *   1) ม.4  ฟังก์ชันเอกซ์โพเนนเชียลและลอการิทึม   250 ข้อ  → สร้าง doc ใหม่
 *   2) ม.6  ลำดับและอนุกรม                        250 ข้อ  → เขียนทับ doc ว่างที่มีอยู่
 *   3) ม.6  การแจกแจงความน่าจะเป็น                250 ข้อ  → แบ่ง 2 ชุด (ไฟล์เกินเพดาน 1MiB)
 *
 * ทุกชุดตรวจ SymPy ผ่านแล้วตั้งแต่ตอนผลิต สคริปต์นี้ตรวจซ้ำเฉพาะโครงสร้างที่เว็บต้องใช้
 * และวัดขนาด doc ก่อนเขียนทุกครั้ง กันพังเพราะเพดาน 1MiB ของ Firestore
 *
 * รัน: node scripts/import-ready-exams-2026-08.js          (dry-run ตรวจอย่างเดียว)
 *      node scripts/import-ready-exams-2026-08.js --apply  (เขียนจริง)
 *
 * หลังเขียนจริง อย่าลืม: node scripts/bust-caches.js exams
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');
const SRC_ROOT = path.resolve(process.env.HOME, 'Documents/workspace/kruheem-exams');
const BACKUP_DIR = path.resolve(__dirname, 'tmp');

const LIMIT = 1048576;   // เพดาน Firestore ต่อ 1 doc
const SAFE = 1000000;    // เผื่อไว้ ไม่เขียนถ้าเกินนี้

// ---------- วัดขนาด doc แบบเดียวกับที่ Firestore นับ ----------
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

// ---------- ตรวจไฟล์ต้นทาง ----------
function validate(qs, label) {
    const errs = [];
    qs.forEach((q, i) => {
        const at = `${label} ข้อ ${i + 1}`;
        if (typeof q.question !== 'string' || !q.question.trim()) errs.push(`${at}: โจทย์ว่าง`);
        if (!Array.isArray(q.options) || q.options.length !== 4) errs.push(`${at}: ตัวเลือกไม่ครบ 4`);
        else {
            if (new Set(q.options).size !== 4) errs.push(`${at}: ตัวเลือกซ้ำกัน`);
            q.options.forEach((o, oi) => { if (typeof o !== 'string' || !o.trim()) errs.push(`${at}: ตัวเลือกที่ ${oi + 1} ว่าง`); });
        }
        if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) errs.push(`${at}: correctIndex ผิด`);
        if (typeof q.explanation !== 'string' || !q.explanation.trim()) errs.push(`${at}: เฉลยว่าง`);
        else if (!q.explanation.startsWith(`**คำตอบ: ข้อ ${q.correctIndex + 1}.**`)) errs.push(`${at}: เฉลยขึ้นต้นไม่ตรงกับ correctIndex`);
        if (!Array.isArray(q.tags) || !q.tags.length) errs.push(`${at}: ไม่มี tag`);
        if ('svg' in q) {
            if (typeof q.svg !== 'string' || !q.svg.trim().startsWith('<svg')) errs.push(`${at}: svg ไม่ได้ขึ้นต้นด้วย <svg — เว็บจะไม่แสดงรูป`);
        }
        for (const bad of ['answer', 'solution']) if (bad in q) errs.push(`${at}: มี field ต้องห้าม ${bad}`);
    });
    // โครงโจทย์ซ้ำ (แทนตัวเลขด้วย #)
    const skel = new Map();
    let dup = 0;
    qs.forEach((q, i) => {
        const k = String(q.question).replace(/[0-9,.]+/g, '#').replace(/\s+/g, ' ').trim();
        if (skel.has(k)) dup++; else skel.set(k, i + 1);
    });
    return { errs, distinctSkeletons: skel.size, dup };
}

// เติม field ที่ชุดซึ่ง live อยู่มีเหมือนกันทุกชุด
const normalize = (qs) => qs.map((q) => ({ type: 'choice', ...q }));

// ---------- แผนงาน ----------
const PLAN = [
    {
        key: 'm4-explog',
        src: path.join(SRC_ROOT, '05 · ม.4 เทอม 2/เลขยกกำลังและลอการิทึม/output/webquiz_m4t2_exponential_logarithm_250q.json'),
        mode: 'create',
        doc: {
            title: 'ฟังก์ชันเอกซ์โพเนนเชียลและลอการิทึม',
            description: 'รายละเอียดเบื้องต้น...',
            category: 'ม.4',
            level: '',
            timeLimit: 30,
            difficulty: 'Medium',
            order: 54,               // ต่อจาก เรขาคณิตวิเคราะห์ฯ (53)
            themeColor: 'Amber',
            recommendedSecondsPerQuestion: 90,
            timedMode: false,
            isFree: false,
            hidden: false,
        },
    },
    {
        key: 'm6-sequences',
        src: path.join(SRC_ROOT, '08 · ม.6/ลำดับและอนุกรม/output/webquiz_m6_sequences_series_250q.json'),
        mode: 'update',
        examId: 'TDlFl2ESfOpLNYu3I7TJ',   // doc ว่าง 0 ข้อ ที่เปิดขายอยู่บนเว็บ
        doc: {
            title: 'ลำดับและอนุกรม',
            themeColor: 'Amber',
            recommendedSecondsPerQuestion: 90,
            timedMode: false,
            hidden: false,
        },
    },
    {
        key: 'm6-probdist',
        src: path.join(SRC_ROOT, 'probability-distribution-m6/output/webquiz_m6_probability_distribution_250q.json'),
        mode: 'create',
        split: 2,                    // ไฟล์ 1.01MB เกินเพดาน ต้องแบ่ง
        doc: {
            title: 'การแจกแจงความน่าจะเป็น',
            description: 'รายละเอียดเบื้องต้น...',
            category: 'ม.6',
            level: '',
            timeLimit: 30,
            difficulty: 'Medium',
            order: 67,               // ต่อจาก ลำดับและอนุกรม (66)
            themeColor: 'Amber',
            recommendedSecondsPerQuestion: 90,
            timedMode: false,
            isFree: false,
            hidden: false,
        },
    },
];

(async () => {
    console.log(`โหมด: ${APPLY ? '✍️  เขียนจริง (--apply)' : '🔍 dry-run — ตรวจอย่างเดียว ไม่เขียนอะไร'}\n`);

    const jobs = [];   // งานที่พร้อมเขียนจริง
    let fatal = 0;

    for (const p of PLAN) {
        console.log(`── ${p.doc.title} (${p.doc.category || 'ม.6'}) ──`);
        if (!fs.existsSync(p.src)) { console.error(`   ❌ ไม่พบไฟล์ต้นทาง: ${p.src}`); fatal++; continue; }

        const raw = JSON.parse(fs.readFileSync(p.src, 'utf8'));
        const all = normalize(Array.isArray(raw) ? raw : raw.questions);
        const { errs, distinctSkeletons, dup } = validate(all, p.doc.title);

        console.log(`   ไฟล์: ${path.basename(p.src)}`);
        console.log(`   จำนวนข้อ: ${all.length}`);
        const ci = [0, 0, 0, 0]; all.forEach((q) => ci[q.correctIndex]++);
        console.log(`   การกระจายคำตอบ ก/ข/ค/ง: ${ci.join(' / ')}`);
        console.log(`   มีรูป SVG: ${all.filter((q) => q.svg).length} ข้อ`);
        console.log(`   โครงโจทย์ต่างกัน: ${distinctSkeletons} แบบ${dup ? ` (ซ้ำโครง ${dup} ข้อ)` : ''}`);

        if (errs.length) {
            console.error(`   ❌ ตรวจไม่ผ่าน ${errs.length} จุด:`);
            errs.slice(0, 15).forEach((e) => console.error('      -', e));
            fatal++; console.log(''); continue;
        }
        console.log('   ✅ ตรวจโครงสร้างผ่านทุกข้อ');

        // แบ่งชุดถ้าจำเป็น
        const parts = [];
        if (p.split && p.split > 1) {
            const per = Math.ceil(all.length / p.split);
            for (let i = 0; i < p.split; i++) {
                const slice = all.slice(i * per, (i + 1) * per);
                parts.push({ suffix: ` ชุดที่ ${i + 1}`, orderBump: i, questions: slice });
            }
        } else {
            parts.push({ suffix: '', orderBump: 0, questions: all });
        }

        for (const part of parts) {
            const title = p.doc.title + part.suffix;
            let base = {};
            let ref = null;

            if (p.mode === 'update') {
                ref = db.collection('exams').doc(p.examId);
                const snap = await ref.get();
                if (!snap.exists) { console.error(`   ❌ ไม่พบ doc ${p.examId}`); fatal++; continue; }
                const cur = snap.data();
                console.log(`   ปลายทาง: doc เดิม [${p.examId}] "${cur.title}" — ตอนนี้มี ${(cur.questions || []).length} ข้อ`);
                base = { ...cur };
            } else {
                console.log(`   ปลายทาง: สร้าง doc ใหม่ "${title}"`);
            }

            const next = {
                ...base,
                ...p.doc,
                title,
                order: p.doc.order != null ? p.doc.order + part.orderBump : base.order,
                questions: part.questions,
                questionCount: part.questions.length,
            };
            const size = docSize(next);
            const pct = (100 * size / LIMIT).toFixed(1);
            console.log(`   ขนาด doc: ${size.toLocaleString()} bytes (${pct}% ของเพดาน 1MiB) — ${part.questions.length} ข้อ`);
            if (size > SAFE) {
                console.error(`   ❌ ขนาดเกินเกณฑ์ปลอดภัย ${SAFE.toLocaleString()} bytes — ต้องแบ่งชุดเพิ่ม`);
                fatal++; continue;
            }
            jobs.push({ ref, next, title, key: p.key, mode: p.mode, examId: p.examId, prev: p.mode === 'update' ? base : null });
        }
        console.log('');
    }

    if (fatal) { console.error(`\n❌ มีปัญหา ${fatal} จุด — ยังไม่เขียนอะไรลงฐานข้อมูล`); process.exit(1); }

    console.log(`สรุป: พร้อมเขียน ${jobs.length} ชุด รวม ${jobs.reduce((s, j) => s + j.next.questionCount, 0)} ข้อ`);
    if (!APPLY) { console.log('\n(dry-run) สั่ง --apply เพื่อเขียนจริง'); process.exit(0); }

    // ---------- เขียนจริง ----------
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    console.log('');
    for (const j of jobs) {
        if (j.prev) {
            const bak = path.join(BACKUP_DIR, `BACKUP-${j.examId}-${stamp}.json`);
            fs.writeFileSync(bak, JSON.stringify(j.prev, null, 1));
            console.log(`💾 สำรอง doc เดิมไว้ที่ ${path.relative(process.cwd(), bak)}`);
        }
        const payload = { ...j.next, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
        if (j.mode === 'update') {
            await j.ref.set(payload, { merge: true });
            console.log(`✅ อัปเดต [${j.examId}] "${j.title}" — ${j.next.questionCount} ข้อ`);
        } else {
            payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
            const created = await db.collection('exams').add(payload);
            console.log(`✅ สร้างใหม่ [${created.id}] "${j.title}" — ${j.next.questionCount} ข้อ`);
        }
    }
    console.log('\nขั้นต่อไป: node scripts/bust-caches.js exams');
    process.exit(0);
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
