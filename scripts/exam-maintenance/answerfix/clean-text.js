/**
 * เก็บกวาดข้อความที่หลุดมาให้เด็กอ่าน
 *   1. `\n` ที่เก็บเป็นตัวอักษรจริงสองตัว (แบ็กสแลชกับ n) — เด็กเห็นเป็น \n ในเฉลย ไม่ได้ขึ้นบรรทัดใหม่
 *   2. ร่องรอยอ้างอิง [cite: 608] / [cite_start] ที่ติดมาจากตอนสร้างเนื้อหา
 *
 * แตะเฉพาะ question / explanation / options · ตรวจก่อนเขียนว่าเปลี่ยนเฉพาะสองอย่างนี้จริง
 * รัน: node clean-text.js [--apply]
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname, '../../seed-gifted-m1/serviceAccountKey.json'))) });

const APPLY = process.argv.includes('--apply');
const CITE = /\s*\[cite(?:_start)?(?::[^\]]*)?\]/g;
// แตะเฉพาะข้อที่มีปัญหาจริง — ไม่ไปจัดระเบียบช่องว่างของข้ออื่นให้เปลืองการเขียน
const NEEDS = (s) => typeof s === 'string' && (/\\n/.test(s) || CITE.test((CITE.lastIndex = 0, s)));
const clean = (s) => String(s)
    .replace(CITE, '')
    .replace(/\\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n');

// ต้องเปลี่ยนแค่สองอย่างนี้เท่านั้น — เทียบด้วยข้อความที่ถอดทั้งสองอย่างออกแล้ว
const canon = (s) => String(s).replace(CITE, '').replace(/\\n/g, '\n').replace(/\s+/g, ' ').trim();

const utf8 = (s) => Buffer.byteLength(s, 'utf8');
function docSize(o) {
    const sz = (v) => { if (v == null) return 1; const t = typeof v;
        if (t === 'string') return utf8(v) + 1; if (t === 'boolean') return 1; if (t === 'number') return 8;
        if (Array.isArray(v)) return v.reduce((s, e) => s + sz(e), 0);
        if (t === 'object') { let s = 32; for (const [k, val] of Object.entries(v)) s += utf8(k) + 1 + sz(val); return s; } return 8; };
    let t = 32; for (const [k, v] of Object.entries(o)) t += utf8(k) + 1 + sz(v); return t;
}

(async () => {
    console.log(`โหมด: ${APPLY ? '✍️  เขียนจริง' : '🔍 dry-run'}\n`);
    const db = admin.firestore();
    const snap = await db.collection('exams').get();
    const jobs = [];
    let qN = 0, fN = 0, bad = 0;
    snap.forEach((d) => {
        const x = d.data();
        const qs = x.questions || [];
        let touched = 0;
        const next = qs.map((q) => {
            const nq = { ...q };
            let hit = false;
            for (const k of ['question', 'explanation']) {
                if (!NEEDS(q[k])) continue;
                const v = clean(q[k]);
                if (canon(v) !== canon(q[k])) { bad++; continue; }
                nq[k] = v; hit = true; fN++;
            }
            if (Array.isArray(q.options) && q.options.some(NEEDS)) {
                const os = q.options.map((o) => (NEEDS(o) ? clean(o) : o));
                if (os.every((o, j) => canon(o) === canon(q.options[j]))) { nq.options = os; hit = true; fN++; }
                else bad++;
            }
            if (hit) { touched++; qN++; }
            return nq;
        });
        if (touched) jobs.push({ ref: d.ref, id: d.id, title: String(x.title).replace(/\s+/g, ' ').slice(0, 40), cat: x.category, cur: x, next, touched });
    });
    console.log(`ชุดที่ต้องแก้ ${jobs.length} · ข้อ ${qN} · ฟิลด์ ${fN} · ตรวจไม่ผ่านข้าม ${bad}`);
    jobs.sort((a, b) => b.touched - a.touched).slice(0, 12).forEach((j) => {
        const s = docSize({ ...j.cur, questions: j.next });
        console.log(`   ${String(j.touched).padStart(4)} ข้อ | ${j.cat} | ${j.title} | ${(s / 1048576 * 100).toFixed(1)}%`);
    });
    for (const j of jobs) if (docSize({ ...j.cur, questions: j.next }) > 1000000) { console.error('❌ doc เกินเพดาน: ' + j.title); process.exit(1); }
    if (!APPLY) { console.log('\n(dry-run) สั่ง --apply เพื่อเขียนจริง'); process.exit(0); }
    const bdir = path.join(__dirname, 'backup'); fs.mkdirSync(bdir, { recursive: true });
    for (const j of jobs) {
        fs.writeFileSync(path.join(bdir, `${j.id}-before-cleantext.json`), JSON.stringify({ examId: j.id, questions: j.cur.questions }), 'utf8');
        await j.ref.update({ questions: j.next, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
    console.log(`\n✅ เขียนแล้ว ${jobs.length} ชุด · สำรองไว้ที่ answerfix/backup/`);
    console.log('⚠️  ขั้นต่อไป: node scripts/bust-caches.js exams');
    process.exit(0);
})();
