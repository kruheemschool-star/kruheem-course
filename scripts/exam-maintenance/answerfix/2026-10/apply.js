/**
 * แก้ "วิธีทำในเฉลยถูก แต่ระบบตัดว่าคำตอบผิด" รอบ 2026-10 (ผู้ปกครองแจ้งซ้ำ)
 *
 * ที่มา: สแกนทั้งคลังข้อสอบ 107 ชุด + ข้อสอบในคอร์ส 102 ชุด รวม 29,464 ข้อ
 * แล้วให้ math-checker คิดเลขใหม่ทุกข้อที่ติดธง (259 ข้อ) + สุ่มข้อที่ไม่ติดธง 120 ข้อเทียบ
 *
 *   A  คีย์ชี้ผิดตัว (วิธีทำถูก)                     → เปลี่ยนคีย์ + หัวเฉลย
 *   B  ไม่มีตัวเลือกไหนถูก                           → แก้ตัวเลือกให้มีคำตอบจริง
 *   C  เฉลยติดป้ายว่าข้อที่ถูกเป็นตัวผิด              → แก้ป้าย
 *   D  ตัวลวงค่าเท่ากับคำตอบ (เช่น 2/5 กับ 18/45)     → เปลี่ยนตัวลวงเป็นค่าที่ผิดจริง (ครูฮีมเคาะ)
 *
 * ข้อมูลอยู่ข้างไฟล์นี้:
 *   items.json    สำเนาข้อเดิม ณ วันสแกน (ใช้เป็นด่านว่าข้อในฐานข้อมูลยังเป็นข้อเดิม)
 *   patches.json  ฉบับแก้ (ผ่าน math-checker + quality-checker แล้ว)
 *
 * ด่านกันพลาดก่อนเขียน (หยุดทั้งหมดถ้าข้อใดไม่ผ่าน):
 *   1. ตัวโจทย์ในฐานข้อมูลต้องตรงกับสำเนา items.json ทุกตัวอักษร (กัน index เลื่อน)
 *   2. หลังแก้ ตัวอ่านเฉลยตัวเดียวกับที่เว็บใช้ ต้องอ่านได้ newKey
 *   3. ไม่มีตัวเลือกสองตัวที่ค่าเท่ากัน
 *   4. ไม่มีอักขระควบคุมในข้อความ (บั๊กเก่า \neq → ขึ้นบรรทัด + "eq")
 *
 * สำรองทั้งเอกสารก่อนเขียนลง answerfix/backup/2026-10/ (ไม่ขึ้น git)
 * ข้อที่ผู้ใช้บันทึกไว้ (users/{uid}/savedQuestions) เป็นสำเนา ณ ตอนกดบันทึก — อัปเดตตามด้วย
 *
 * รัน: node scripts/exam-maintenance/answerfix/2026-10/apply.js           (dry-run)
 *      node scripts/exam-maintenance/answerfix/2026-10/apply.js --apply   (เขียนจริง)
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const ROOT = path.resolve(__dirname, '../../..');
admin.initializeApp({ credential: admin.credential.cert(require(path.join(ROOT, 'seed-gifted-m1/serviceAccountKey.json'))) });
const db = admin.firestore();
const { rebuildLessonsIndex } = require(path.join(ROOT, 'lib/lessons-index'));
const { bustCaches } = require(path.join(ROOT, 'lib/bust-cache'));

const APPLY = process.argv.includes('--apply');
const items = require('./items.json');
const patches = require('./patches.json');
const BACKUP_DIR = path.join(__dirname, '../backup/2026-10'); // อยู่ใน .gitignore

// ── ตัวอ่านเฉลย: สำเนาตรงตัวจาก lib/exam-utils.ts (extractAnswerFromExplanation) ──
const extractAnswer = (explanation) => {
    if (!explanation || typeof explanation !== 'string') return null;
    const clean = explanation
        .replace(/\\\[[\s\S]*?\\\]/g, '').replace(/\$\$[\s\S]*?\$\$/g, '')
        .replace(/\\\([\s\S]*?\\\)/g, '').replace(/\$[^$]+\$/g, '').replace(/\*\*/g, '');
    const numberPatterns = [/คำตอบ\s*:?\s*ข้อ\s*(\d)/, /คำตอบคือ\s*ข้อ\s*(\d)/, /คำตอบที่ถูกต้อง\s*(?:คือ)?\s*:?\s*ข้อ\s*(\d)/,
        /เฉลย\s*:?\s*ข้อ\s*(\d)/, /ตอบ\s*ข้อ\s*(\d)/, /ข้อที่ถูกต้อง\s*(?:คือ)?\s*:?\s*(?:ข้อ\s*)?(\d)/, /ดังนั้น\s*ข้อ\s*(\d)/, /ตอบข้อ\s*(\d)/];
    for (const p of numberPatterns) { const m = clean.match(p); if (m) { const n = parseInt(m[1]); if (n >= 1 && n <= 4) return n - 1; } }
    const thaiMap = { 'ก': 0, 'ข': 1, 'ค': 2, 'ง': 3 };
    for (const p of [/คำตอบ\s*:?\s*ข้อ\s*([กขคง])(?![ก-๙])/, /เฉลย\s*:?\s*ข้อ\s*([กขคง])(?![ก-๙])/, /คำตอบ\s*:?\s*([กขคง])(?![ก-๙])/, /เฉลย\s*:?\s*([กขคง])(?![ก-๙])/]) {
        const m = clean.match(p); if (m && thaiMap[m[1]] !== undefined) return thaiMap[m[1]];
    }
    return null;
};

// ค่าตัวเลขของตัวเลือก (เศษส่วน จำนวนคละ ทศนิยม) — ใช้กันตัวเลือกค่าเท่ากัน
const optValue = (o) => {
    let s = String(o).replace(/\$/g, '')
        .replace(/(-?\d+)\s*\\[dt]?frac\{(\d+)\}\{(\d+)\}/g, '($1+$2/$3)')
        .replace(/\\[dt]?frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))')
        .replace(/\\left|\\right|\\,|\{,\}/g, '').replace(/−/g, '-').replace(/(\d),(\d{3})/g, '$1$2').trim();
    s = s.replace(/\s*[ก-๙.]+[ก-๙.\s]*$/, '').trim(); // ตัดหน่วยภาษาไทยท้ายค่า
    if (!/^[-+*/().\d\s]+$/.test(s) || !/\d/.test(s)) return null;
    try { const v = Function(`return (${s})`)(); return Number.isFinite(v) ? v : null; } catch { return null; }
};

const hasControlChars = (s) => /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(String(s || ''));

const parseRef = (ref) => {
    const [docPath, n] = ref.split('#');
    const qi = Number(n) - 1;
    if (docPath.includes('/')) { const [courseId, lessonId] = docPath.split('/'); return { kind: 'course', courseId, lessonId, qi }; }
    return { kind: 'exam', examId: docPath, qi };
};

(async () => {
    console.log(APPLY ? '=== เขียนจริง ===\n' : '=== dry-run (ยังไม่เขียน) ===\n');
    if (patches.length !== items.length) throw new Error(`patches ${patches.length} ข้อ ไม่เท่ากับ items ${items.length} ข้อ`);
    const itemByRef = Object.fromEntries(items.map((it) => [it.ref, it]));

    // รวมการแก้ตามเอกสาร (หนึ่งชุด = หนึ่งเอกสาร เขียนครั้งเดียว)
    const docs = new Map();
    for (const p of patches) {
        const it = itemByRef[p.ref];
        if (!it) throw new Error(`${p.ref} ไม่อยู่ใน items.json`);
        const r = parseRef(p.ref);
        const key = r.kind === 'exam' ? `exams/${r.examId}` : `courses/${r.courseId}/lessons/${r.lessonId}`;
        if (!docs.has(key)) docs.set(key, { ...r, key, list: [] });
        docs.get(key).list.push({ p, it, qi: r.qi });
    }

    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const writes = [];
    const savedUpdates = [];

    for (const d of docs.values()) {
        const ref = db.doc(d.key);
        const snap = await ref.get();
        if (!snap.exists) throw new Error(`${d.key} ไม่มีอยู่แล้ว`);
        const data = snap.data();
        let questions;
        if (d.kind === 'exam') questions = typeof data.questions === 'string' ? JSON.parse(data.questions) : data.questions;
        else questions = JSON.parse(data.content);
        fs.writeFileSync(path.join(BACKUP_DIR, `${d.key.replace(/\//g, '__')}__${stamp}.json`), JSON.stringify(data));

        const title = (data.title || '').replace(/\s+/g, ' ');
        console.log(`[${title}] ${d.key}`);
        for (const { p, it, qi } of d.list) {
            const q = questions[qi];
            // ด่าน 1: ข้อในฐานข้อมูลยังเป็นข้อเดิม
            if (!q || q.question !== it.question) throw new Error(`${p.ref}: ตัวโจทย์ในฐานข้อมูลไม่ตรงกับตอนสแกน — หยุด`);
            const oldKey = (extractAnswer(q.explanation) ?? q.answerIndex ?? q.correctIndex ?? 0) + 1;
            const k = p.newKey - 1;
            const nq = { ...q };
            if (p.question) nq.question = p.question;
            if (p.options) {
                if (p.options.length !== q.options.length) throw new Error(`${p.ref}: จำนวนตัวเลือกเปลี่ยน — หยุด`);
                nq.options = p.options;
            }
            nq.explanation = p.explanation;
            nq.correctIndex = k;
            if ('answerIndex' in q) nq.answerIndex = k;
            if ('correctAnswer' in q) nq.correctAnswer = k;

            // ด่าน 2: ตัวอ่านของเว็บต้องได้คีย์ใหม่
            const read = extractAnswer(nq.explanation);
            if (read !== k) throw new Error(`${p.ref}: ตัวอ่านเฉลยของเว็บอ่านได้ข้อ ${read === null ? '-' : read + 1} ไม่ใช่ข้อ ${p.newKey} — หยุด`);
            if (!/^\s*\*\*คำตอบ: ข้อ [1-4]\.\*\*/.test(nq.explanation)) throw new Error(`${p.ref}: เฉลยไม่ขึ้นต้นด้วย **คำตอบ: ข้อ N.** — หยุด`);
            // ด่าน 3: ไม่มีตัวเลือกค่าเท่ากัน
            const vals = nq.options.map(optValue);
            for (let a = 0; a < vals.length; a++) for (let b = a + 1; b < vals.length; b++) {
                if (vals[a] !== null && vals[b] !== null && Math.abs(vals[a] - vals[b]) < 1e-9)
                    throw new Error(`${p.ref}: ตัวเลือก ${a + 1} กับ ${b + 1} ค่าเท่ากัน (${nq.options[a]} / ${nq.options[b]}) — หยุด`);
            }
            if (new Set(nq.options.map((o) => String(o).replace(/\s/g, ''))).size !== nq.options.length) throw new Error(`${p.ref}: ตัวเลือกซ้ำกัน — หยุด`);
            // ด่าน 4: อักขระควบคุม
            for (const t of [nq.question, nq.explanation, ...nq.options]) if (hasControlChars(t)) throw new Error(`${p.ref}: มีอักขระควบคุมในข้อความ (LaTeX เสีย) — หยุด`);

            const optNote = p.options ? ` · ตัวเลือก: ${q.options.map((o, i) => (o !== p.options[i] ? `${i + 1}) ${o} → ${p.options[i]}` : null)).filter(Boolean).join(' ; ')}` : '';
            console.log(`  ข้อ ${qi + 1}: คีย์ ข้อ ${oldKey} → ข้อ ${p.newKey} (${nq.options[k]})${optNote}${p.question ? ' · แก้โจทย์' : ''}`);
            questions[qi] = nq;
            if (d.kind === 'exam') savedUpdates.push({ examId: d.examId, qi, nq });
        }
        const payload = d.kind === 'exam'
            ? { questions: typeof data.questions === 'string' ? JSON.stringify(questions) : questions, updatedAt: admin.firestore.FieldValue.serverTimestamp() }
            : { content: JSON.stringify(questions) };
        const bytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
        if (bytes > 1_000_000) throw new Error(`${d.key} ใหญ่ ${bytes} bytes เกินเพดานปลอดภัย — หยุด`);
        writes.push({ d, ref, payload });
        console.log('');
    }

    // ข้อที่นักเรียนกดบันทึกไว้ (สำเนา) — หาเฉพาะข้อที่แก้
    // ทั้งเว็บมีแค่หลักร้อยรายการ อ่านทั้งหมดแล้วจับคู่เอง (query แบบกรองต้องสร้าง index เพิ่ม)
    const savedHits = [];
    const want = new Map(savedUpdates.map((s) => [`${s.examId}_q${s.qi}`, s.nq]));
    (await db.collectionGroup('savedQuestions').get()).forEach((doc) => {
        const x = doc.data();
        const nq = want.get(`${x.examId}_q${x.questionIndex}`);
        if (nq) savedHits.push({ ref: doc.ref, nq });
    });
    console.log(`ข้อที่นักเรียนบันทึกไว้และต้องอัปเดตสำเนา: ${savedHits.length} รายการ`);
    console.log(`รวม ${patches.length} ข้อ ใน ${writes.length} ชุด`);

    if (!APPLY) { console.log('\ndry-run จบ — ใส่ --apply เพื่อเขียนจริง'); process.exit(0); }

    for (const w of writes) { await w.ref.update(w.payload); console.log(`✅ ${w.d.key}`); }
    for (const h of savedHits) await h.ref.update({ questionData: h.nq, questionText: String(h.nq.question || '').substring(0, 200) });
    if (savedHits.length) console.log(`✅ อัปเดตข้อที่บันทึกไว้ ${savedHits.length} รายการ`);

    const courseIds = [...new Set([...docs.values()].filter((d) => d.kind === 'course').map((d) => d.courseId))];
    for (const c of courseIds) await rebuildLessonsIndex(db, c);
    if (courseIds.length) console.log(`✅ สร้างสารบัญบทเรียนใหม่ ${courseIds.length} คอร์ส`);
    if ([...docs.values()].some((d) => d.kind === 'exam')) { await bustCaches(['exams'], admin); console.log('✅ ล้างแคชคลังข้อสอบแล้ว'); }
    process.exit(0);
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
