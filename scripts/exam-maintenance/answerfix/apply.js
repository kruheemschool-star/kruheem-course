/**
 * เขียนการแก้ correctIndex (และเฉลย/โจทย์ที่ต้องเขียนใหม่) กลับเข้า Firestore
 *
 * รัน: node apply.js fix-set3.js            (dry-run)
 *      node apply.js fix-set3.js --apply    (เขียนจริง)
 * หลังเขียนจริง: node scripts/bust-caches.js exams
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname, '../../seed-gifted-m1/serviceAccountKey.json'))) });

const APPLY = process.argv.includes('--apply');
const spec = require(path.resolve(__dirname, process.argv[2]));
const L = 'กขคง';
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
    console.log(`โหมด: ${APPLY ? '✍️  เขียนจริง (--apply)' : '🔍 dry-run'}\n`);
    const ref = admin.firestore().collection('exams').doc(spec.examId);
    const snap = await ref.get();
    if (!snap.exists) { console.error('ไม่พบชุด ' + spec.examId); process.exit(1); }
    const cur = snap.data();
    const qs = cur.questions || [];
    const next = qs.map((q) => ({ ...q }));
    const errs = [];
    const changes = [];
    let same = 0;

    const setAll = { ...spec.setIndex, ...spec.extraIndex };
    for (const [posStr, ci] of Object.entries(setAll)) {
        const i = Number(posStr) - 1;
        if (!(i >= 0 && i < qs.length)) { errs.push(`ข้อ ${posStr} อยู่นอกช่วง`); continue; }
        if (!Array.isArray(qs[i].options) || qs[i].options.length !== 4) { errs.push(`ข้อ ${posStr} ตัวเลือกไม่ครบ 4`); continue; }
        if (qs[i].correctIndex === ci) { if (!('answerIndex' in qs[i]) || qs[i].answerIndex === ci) { same++; continue; } }
        next[i] = { ...qs[i], correctIndex: ci };
        if ('answerIndex' in qs[i]) next[i].answerIndex = ci;
        changes.push(`${posStr}: ${L[qs[i].correctIndex]}→${L[ci]}`);
    }
    for (const [posStr, r] of Object.entries(spec.rewrite || {})) {
        const i = Number(posStr) - 1;
        if (!(i >= 0 && i < qs.length)) { errs.push(`ข้อ ${posStr} อยู่นอกช่วง`); continue; }
        const q = next[i];
        const before = q.correctIndex;
        if (r.question) q.question = r.question;
        if (r.explanation) q.explanation = r.explanation;
        if (typeof r.correctIndex === 'number') { q.correctIndex = r.correctIndex; if ('answerIndex' in q) q.answerIndex = r.correctIndex; }
        // เฉลยที่เขียนใหม่ ต้องมีหัวตรงกับ correctIndex
        const hd = (String(q.explanation).match(/คำตอบ\s*[:：]\s*ข้อ\s*([กขคง])/) || [])[1];
        if (hd && L.indexOf(hd) !== q.correctIndex) errs.push(`ข้อ ${posStr}: หัวเฉลย ${hd} ไม่ตรงกับคำตอบ ${L[q.correctIndex]}`);
        if (/JSON|ระบบเฉลย|ขอแก้เป็น|ขออภัย|เดี๋ยวนะ|แก้ไขโจทย์/.test(String(q.explanation))) errs.push(`ข้อ ${posStr}: เฉลยใหม่ยังมีร่องรอยคนเขียนคุยกันเอง`);
        changes.push(`${posStr}: เขียนใหม่ ${L[before]}→${L[q.correctIndex]}`);
    }

    const before = [0, 0, 0, 0]; qs.forEach((q) => { if (q.correctIndex >= 0 && q.correctIndex < 4) before[q.correctIndex]++; });
    const after = [0, 0, 0, 0]; next.forEach((q) => { if (q.correctIndex >= 0 && q.correctIndex < 4) after[q.correctIndex]++; });
    const size = docSize({ ...cur, questions: next });
    if (size > 1000000) errs.push('ขนาด doc เกินที่ปลอดภัย');

    console.log(`── ${String(cur.title).replace(/\s+/g, ' ')} · ${qs.length} ข้อ`);
    console.log(`   แก้ ${changes.length} ข้อ · ถูกอยู่แล้วไม่แตะ ${same} ข้อ`);
    console.log(`   การกระจาย ก/ข/ค/ง: ${before.join('/')}  →  ${after.join('/')}`);
    const e = qs.length / 4, chi = after.reduce((s, v) => s + (v - e) * (v - e) / e, 0);
    console.log(`   ไคสแควร์: ${(before.reduce((s, v) => s + (v - e) * (v - e) / e, 0)).toFixed(1)} → ${chi.toFixed(1)} (ยิ่งน้อยยิ่งกระจายดี · เกิน 7.81 คือเอียง)`);
    console.log(`   ขนาด doc: ${docSize(cur).toLocaleString()} → ${size.toLocaleString()} (${(size / 1048576 * 100).toFixed(1)}%)`);
    console.log(`   ${changes.slice(0, 60).join(' ')}`);
    if (errs.length) { console.error(`\n❌ ตรวจไม่ผ่าน ${errs.length} จุด:`); errs.slice(0, 12).forEach((x) => console.error('   - ' + x)); process.exit(1); }
    console.log('   ✅ ตรวจผ่าน');
    if (!APPLY) { console.log('\n(dry-run) สั่ง --apply เพื่อเขียนจริง'); process.exit(0); }

    const bdir = path.join(__dirname, 'backup');
    fs.mkdirSync(bdir, { recursive: true });
    const stamp = process.env.STAMP || 'before-answerfix';
    fs.writeFileSync(path.join(bdir, `${spec.examId}-${stamp}.json`), JSON.stringify({ examId: spec.examId, title: cur.title, questions: qs }), 'utf8');
    await ref.update({ questions: next, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log(`\n✅ เขียนแล้ว · สำรองที่ answerfix/backup/${spec.examId}-${stamp}.json`);
    console.log('⚠️  ขั้นต่อไป: node scripts/bust-caches.js exams');
    process.exit(0);
})();
