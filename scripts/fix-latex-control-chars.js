/**
 * ซ่อม LaTeX ที่โดนอักขระควบคุมกลืน backslash ไป
 *
 * อาการ: ข้อความที่เคยเป็น `\neq` `\ne` `\notin` ถูกเก็บเป็น "ขึ้นบรรทัดใหม่ + eq"
 * ทำให้ตัวเรนเดอร์สมการ (components/exam/MathRenderer.tsx) แยกชิ้นไม่ออก
 * เพราะ inline math ของมันคือ /\$[^$\n]+\$/ ซึ่งข้ามบรรทัดไม่ได้
 * ผลที่นักเรียนเห็นคือข้อความดิบ เช่น  เมื่อ $x,y   แล้วขึ้นบรรทัดใหม่เป็น  eq 0$
 *
 * ซ่อมเฉพาะตอนที่ขึ้นบรรทัดใหม่นั้น "อยู่กลางสมการ" (จำนวน $ ก่อนหน้าเป็นเลขคี่)
 * บรรทัดใหม่ปกติในเนื้อเฉลยจึงไม่ถูกแตะ
 *
 * รัน: node scripts/fix-latex-control-chars.js <examId ...>          (dry-run)
 *      node scripts/fix-latex-control-chars.js <examId ...> --apply
 *      node scripts/fix-latex-control-chars.js --all [--apply]
 * หลังเขียนจริง: node scripts/bust-caches.js exams
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');
const ALL = process.argv.includes('--all');
const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!ALL && !ids.length) { console.error('ระบุ examId หรือใช้ --all'); process.exit(1); }

// คำสั่ง LaTeX ที่ขึ้นต้นด้วยตัวอักษรควบคุม แล้วโดนกลืน backslash
const RULES = [
    { ch: '\n', tail: 'eq', tex: '\\neq' },
    { ch: '\n', tail: 'otin', tex: '\\notin' },
    { ch: '\n', tail: 'e', tex: '\\ne' },      // ต้องอยู่ท้ายสุด เพราะ eq/otin ขึ้นต้นด้วย e
];

// ตำแหน่งไหนของสตริงอยู่ "กลางสมการ" บ้าง — รองรับทั้ง $...$ และ $$...$$
function mathMask(s) {
    const mask = new Array(s.length).fill(false);
    let i = 0, inDisplay = false, inInline = false;
    while (i < s.length) {
        if (s[i] === '$' && s[i + 1] === '$') {
            inDisplay = !inDisplay;
            mask[i] = mask[i + 1] = true;
            i += 2;
            continue;
        }
        if (s[i] === '$') {
            if (inDisplay) { mask[i] = true; i++; continue; }
            inInline = !inInline;
            mask[i] = true;
            i++;
            continue;
        }
        mask[i] = inDisplay || inInline;
        i++;
    }
    return mask;
}

function repair(s) {
    if (typeof s !== 'string' || !s.includes('\n')) return { out: s, n: 0 };
    let out = s, n = 0;
    for (const r of RULES) {
        let guard = 0;
        for (;;) {
            if (++guard > 500) break;
            const mask = mathMask(out);
            const i = (() => {
                let j = -1;
                while ((j = out.indexOf(r.ch + r.tail, j + 1)) !== -1) {
                    const after = out[j + 1 + r.tail.length];
                    const boundaryOk = after === undefined || !/[a-zA-Z]/.test(after);
                    if (boundaryOk && mask[j]) return j;
                }
                return -1;
            })();
            if (i === -1) break;
            out = out.slice(0, i) + r.tex + out.slice(i + 1 + r.tail.length);
            n++;
        }
    }
    return { out, n };
}

(async () => {
    console.log(`โหมด: ${APPLY ? '✍️  เขียนจริง (--apply)' : '🔍 dry-run — ตรวจอย่างเดียว'}\n`);
    const snap = ALL
        ? await db.collection('exams').get()
        : { docs: await Promise.all(ids.map((id) => db.collection('exams').doc(id).get())) };

    let totalSets = 0, totalQ = 0, totalFix = 0;
    const jobs = [];
    for (const doc of snap.docs) {
        if (!doc.exists) { console.error(`❌ ไม่พบชุด ${doc.id}`); continue; }
        const x = doc.data();
        let qs = x.questions;
        if (!Array.isArray(qs)) continue;
        let fixQ = 0, fixN = 0;
        const next = qs.map((q) => {
            const nq = { ...q };
            let touched = 0;
            for (const f of ['question', 'explanation']) {
                const r = repair(nq[f]);
                if (r.n) { nq[f] = r.out; touched += r.n; }
            }
            if (Array.isArray(nq.options)) {
                const opts = nq.options.map((o) => { const r = repair(o); touched += r.n; return r.out; });
                if (touched) nq.options = opts;
            }
            if (touched) { fixQ++; fixN += touched; }
            return nq;
        });
        if (!fixQ) continue;
        totalSets++; totalQ += fixQ; totalFix += fixN;
        console.log(`── [${x.category}] ${String(x.title).replace(/\s+/g, ' ')} (${doc.id})`);
        console.log(`   ซ่อม ${fixN} จุด ใน ${fixQ} ข้อ`);
        jobs.push({ ref: doc.ref, id: doc.id, title: x.title, qs, next });
    }
    console.log(`\nรวม ${totalFix} จุด · ${totalQ} ข้อ · ${totalSets} ชุด`);
    if (!APPLY) { console.log('(dry-run) สั่ง --apply เพื่อเขียนจริง'); process.exit(0); }

    const bdir = path.resolve(__dirname, 'tmp/latexfix/backup');
    fs.mkdirSync(bdir, { recursive: true });
    for (const j of jobs) {
        fs.writeFileSync(path.join(bdir, `${j.id}-${Date.now()}.json`),
            JSON.stringify({ examId: j.id, title: j.title, questions: j.qs }), 'utf8');
        await j.ref.update({ questions: j.next, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        console.log(`✅ ${String(j.title).replace(/\s+/g, ' ')}`);
    }
    console.log('\n⚠️  ขั้นต่อไป: node scripts/bust-caches.js exams');
    process.exit(0);
})();
