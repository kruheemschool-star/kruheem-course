/**
 * เกลี่ยตำแหน่งคำตอบ ก/ข/ค/ง ให้สม่ำเสมอขึ้น เฉพาะชุดที่เอียงอย่างมีนัยสำคัญ
 *
 * ทำไม: ชุดที่ตำแหน่งคำตอบกระจุก เด็กฝนตัวเดิมรวดทั้งชุดก็ได้คะแนนเกินจริง
 * คะแนนจึงไม่สะท้อนความสามารถ และระบบวิเคราะห์จุดอ่อนก็อ่านผิดตาม
 *
 * ⚠️ แตะเฉพาะข้อที่ "ปลอดภัยจริง" เท่านั้น ข้อไหนเข้าเงื่อนไขไม่ครบ ปล่อยไว้
 *   1. เฉลยต้องไม่อ้างถึงตัวเลือกด้วยตำแหน่ง (เช่น "ตัวเลือก 1" / "ข้อ ก.") นอกจากหัวเฉลย
 *      เพราะสลับแล้วข้อความพวกนั้นจะชี้ผิดตัว ซึ่งแย่กว่าปล่อยให้เอียง
 *   2. ตัวเลือกต้องไม่ได้เรียงลำดับตัวเลขอยู่แล้ว — ชุดที่เรียงไว้อ่านง่ายกว่า ไม่ควรไปรื้อ
 *   3. ตัวเลือกต้องไม่อ้างถึงกันเอง ("ถูกทุกข้อ", "ข้อ ก. และ ข.")
 *
 * วิธีสลับ: สลับแค่สองตำแหน่ง (คำตอบ ↔ ตัวเลือกที่อยู่ตำแหน่งเป้าหมาย) เปลี่ยนน้อยที่สุด
 * แล้วแก้ให้ครบทุกที่ที่อ้างตำแหน่ง: correctIndex, answerIndex, หัวเฉลย, distractorErrors
 *
 * รัน: node rebalance.js [--apply]
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname, '../../seed-gifted-m1/serviceAccountKey.json'))) });

const APPLY = process.argv.includes('--apply');
const L = 'กขคง';
const CHI_GATE = 16.27;                       // p<.001

// ---- ตัวอ่านคำตอบจากเฉลย (ตรงกับ lib/exam-utils.ts รุ่นที่แก้แล้ว) ----
const clean = (e) => String(e)
    .replace(/\\\[[\s\S]*?\\\]/g, '').replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/\\\([\s\S]*?\\\)/g, '').replace(/\$[^$]+\$/g, '').replace(/\*\*/g, '');
const NUM = [/คำตอบ\s*:?\s*ข้อ\s*(\d)/, /คำตอบคือ\s*ข้อ\s*(\d)/, /คำตอบที่ถูกต้อง\s*(?:คือ)?\s*:?\s*ข้อ\s*(\d)/,
    /เฉลย\s*:?\s*ข้อ\s*(\d)/, /ตอบ\s*ข้อ\s*(\d)/, /ข้อที่ถูกต้อง\s*(?:คือ)?\s*:?\s*(?:ข้อ\s*)?(\d)/,
    /ดังนั้น\s*ข้อ\s*(\d)/, /ตอบข้อ\s*(\d)/];
const TH = [/คำตอบ\s*:?\s*ข้อ\s*([กขคง])(?![ก-๙])/, /เฉลย\s*:?\s*ข้อ\s*([กขคง])(?![ก-๙])/,
    /คำตอบ\s*:?\s*([กขคง])(?![ก-๙])/, /เฉลย\s*:?\s*([กขคง])(?![ก-๙])/];
const MAP = { 'ก': 0, 'ข': 1, 'ค': 2, 'ง': 3 };
function extractAnswer(e) {
    if (!e || typeof e !== 'string') return null;
    const c = clean(e);
    for (const p of NUM) { const m = c.match(p); if (m) { const n = parseInt(m[1]); if (n >= 1 && n <= 4) return n - 1; } }
    for (const p of TH) { const m = c.match(p); if (m && MAP[m[1]] !== undefined) return MAP[m[1]]; }
    return null;
}

// ---- เงื่อนไขความปลอดภัย ----
const POS_REFS = [/ตัวเลือก\s*(?:ที่\s*)?[1-4]/g, /ข้อ\s*[1-4](?!\d)/g, /ข้อ\s*[กขคง](?![ก-๙])/g, /[กขคง]\.\s/g];
const CROSS = /ถูกทุกข้อ|ผิดทุกข้อ|ไม่มีข้อ|ทั้งข้อ|ข้อ\s*[กขคง]|ตัวเลือก/;
const numOf = (s) => { const m = String(s).replace(/\$/g, '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : null; };

function headerless(exp) {
    // ตัดบรรทัดหัวเฉลยออก แล้วดูว่าที่เหลืออ้างตำแหน่งไหม
    return String(exp || '').replace(/^[^\n]*คำตอบ\s*[:：]\s*ข้อ\s*[กขคง1-4][^\n]*/, '');
}
function eligible(q) {
    if (!Array.isArray(q.options) || q.options.length !== 4) return false;
    if (new Set(q.options).size !== 4) return false;
    if (q.options.some((o) => CROSS.test(String(o)))) return false;
    const body = headerless(q.explanation);
    if (POS_REFS.reduce((s, r) => s + ((body.match(r) || []).length), 0) > 0) return false;
    // หัวเฉลยต้องอ่านออกและตรงกับ correctIndex — ไม่งั้นแปลว่าข้อนี้มีเรื่องอื่นอยู่ อย่าไปยุ่ง
    if (extractAnswer(q.explanation) !== q.correctIndex) return false;
    const ns = q.options.map(numOf);
    if (!ns.some((v) => v === null)) {
        const asc = ns.every((v, i) => i === 0 || ns[i - 1] <= v);
        const desc = ns.every((v, i) => i === 0 || ns[i - 1] >= v);
        if (asc || desc) return false;                     // เรียงอยู่แล้ว ปล่อยไว้
    }
    return true;
}

// ---- สลับตำแหน่ง a ↔ b แล้วแก้ทุกที่ที่อ้างตำแหน่ง ----
function swap(q, a, b) {
    const options = q.options.slice();
    [options[a], options[b]] = [options[b], options[a]];
    const next = { ...q, options, correctIndex: b };
    if ('answerIndex' in q) next.answerIndex = b;
    // หัวเฉลย: เขียนทับตัวอักษร/ตัวเลขในหัวให้เป็นตำแหน่งใหม่ (รูปแบบเดิม)
    next.explanation = String(q.explanation).replace(
        /(คำตอบ\s*[:：]\s*ข้อ\s*)([กขคง]|[1-4])/,
        (_m, head, tok) => head + (/[1-4]/.test(tok) ? String(b + 1) : L[b])
    );
    if (Array.isArray(q.distractorErrors)) {
        next.distractorErrors = q.distractorErrors.map((d) => ({
            ...d, choice: d.choice === a ? b : (d.choice === b ? a : d.choice),
        }));
    }
    return next;
}

function check(oldQ, newQ, a, b) {
    const errs = [];
    if ([...oldQ.options].sort().join('␟') !== [...newQ.options].sort().join('␟')) errs.push('ชุดตัวเลือกเปลี่ยน');
    if (newQ.options[newQ.correctIndex] !== oldQ.options[oldQ.correctIndex]) errs.push('ข้อความคำตอบเปลี่ยน');
    if (newQ.correctIndex !== b) errs.push('correctIndex ไม่ตรงเป้า');
    if (extractAnswer(newQ.explanation) !== b) errs.push('หัวเฉลยใหม่อ่านได้ไม่ตรงคำตอบ');
    if (new Set(newQ.options).size !== 4) errs.push('ตัวเลือกซ้ำ');
    if (clean(newQ.explanation).replace(/[กขคง1-4]/g, '') !== clean(oldQ.explanation).replace(/[กขคง1-4]/g, '')) errs.push('เนื้อเฉลยเปลี่ยนเกินหัว');
    if ('answerIndex' in oldQ && newQ.answerIndex !== b) errs.push('answerIndex ไม่ตรง');
    return errs;
}

(async () => {
    console.log(`โหมด: ${APPLY ? '✍️  เขียนจริง' : '🔍 dry-run'}\n`);
    const snap = await admin.firestore().collection('exams').get();
    const jobs = [];
    snap.forEach((d) => {
        const x = d.data();
        const qs = x.questions || [];
        const four = qs.filter((q) => q && Array.isArray(q.options) && q.options.length === 4);
        if (four.length < 40) return;
        const c = [0, 0, 0, 0]; four.forEach((q) => c[q.correctIndex]++);
        const e = four.length / 4;
        const chi = c.reduce((s, v) => s + (v - e) * (v - e) / e, 0);
        if (chi <= CHI_GATE) return;

        const next = qs.map((q) => ({ ...q }));
        const counts = [0, 0, 0, 0]; qs.forEach((q) => { if (q.correctIndex >= 0 && q.correctIndex < 4) counts[q.correctIndex]++; });
        // ข้อที่แตะได้ จัดกลุ่มตามตำแหน่งคำตอบปัจจุบัน
        const pool = [[], [], [], []];
        qs.forEach((q, i) => { if (eligible(q)) pool[q.correctIndex].push(i); });

        const moves = [];
        const errs = [];
        // ย้ายจากตำแหน่งที่มากที่สุด ไปตำแหน่งที่น้อยที่สุด ทีละข้อ จนกว่าจะไม่ดีขึ้น
        for (let guard = 0; guard < 4000; guard++) {
            let hi = -1, lo = -1;
            for (let k = 0; k < 4; k++) {
                if (pool[k].length && (hi < 0 || counts[k] > counts[hi])) hi = k;
                if (lo < 0 || counts[k] < counts[lo]) lo = k;
            }
            if (hi < 0 || lo < 0 || counts[hi] - counts[lo] <= 1) break;
            const idx = pool[hi].pop();
            const oldQ = next[idx];
            const nq = swap(oldQ, hi, lo);
            const bad = check(oldQ, nq, hi, lo);
            if (bad.length) { errs.push(`ข้อ ${idx + 1}: ${bad.join(', ')}`); continue; }
            next[idx] = nq;
            counts[hi]--; counts[lo]++;
            moves.push(`${idx + 1}:${L[hi]}→${L[lo]}`);
        }
        if (!moves.length) return;
        const after = [0, 0, 0, 0]; next.forEach((q) => { if (q.correctIndex >= 0 && q.correctIndex < 4) after[q.correctIndex]++; });
        const chi2 = after.reduce((s, v) => s + (v - e) * (v - e) / e, 0);
        jobs.push({ ref: d.ref, id: d.id, title: String(x.title).replace(/\s+/g, ' ').slice(0, 34), cat: x.category, cur: x, next, moves, c, after, chi, chi2, errs });
    });

    let totMoves = 0, totErr = 0;
    jobs.forEach((j) => {
        totMoves += j.moves.length; totErr += j.errs.length;
        console.log(`  ${j.cat} | ${j.title}`);
        console.log(`     ${j.c.join('/')}  χ²=${j.chi.toFixed(0)}   →   ${j.after.join('/')}  χ²=${j.chi2.toFixed(0)}   · สลับ ${j.moves.length} ข้อ${j.errs.length ? ` · ข้ามเพราะตรวจไม่ผ่าน ${j.errs.length}` : ''}`);
        j.errs.slice(0, 3).forEach((s) => console.log('        ⚠️ ' + s));
    });
    console.log(`\nรวม ${jobs.length} ชุด · สลับ ${totMoves} ข้อ · ข้ามเพราะตรวจไม่ผ่าน ${totErr}`);
    if (!APPLY) { console.log('\n(dry-run) สั่ง --apply เพื่อเขียนจริง'); process.exit(0); }
    const bdir = path.join(__dirname, 'backup'); fs.mkdirSync(bdir, { recursive: true });
    for (const j of jobs) {
        fs.writeFileSync(path.join(bdir, `${j.id}-before-rebalance.json`), JSON.stringify({ examId: j.id, questions: j.cur.questions }), 'utf8');
        await j.ref.update({ questions: j.next, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        console.log(`✅ ${j.title}`);
    }
    console.log('\n⚠️  ขั้นต่อไป: node scripts/bust-caches.js exams');
    process.exit(0);
})();
