/**
 * ขั้นที่ 2 — ติดธงข้อที่ "คีย์ที่เว็บใช้จริง" ไม่ตรงกับสิ่งที่วิธีทำบอก
 * ใช้ตัวอ่านเฉลยสำเนาเดียวกับ lib/exam-utils.ts (เว็บอ่านคำตอบจากหัวเฉลยก่อน correctIndex)
 * สัญญาณ: B/B2/B3 ส่วนวิเคราะห์ตัวลวงพูดถึงข้อที่เป็นคีย์ · C วิธีทำชี้ตัวเลือกอื่น
 *         D/D0 ค่าในตัวเลือกที่เป็นคีย์ไม่โผล่ในวิธีทำ · A2 ตัวอ่านไปจับประโยคกลางเฉลย
 * รอบ 2026-10: 29,464 ข้อ → ติดธง 259 → คิดเลขยืนยันแล้วผิดจริง 20 (สุ่มข้อไม่ติดธง 120 ข้อ ไม่พบคีย์ผิด)
 * ผลติดธงเป็นแค่ "ข้อที่ต้องอ่าน" ต้องคิดเลขยืนยันทุกข้อก่อนแก้
 * รัน: node scan.js <path/all.json>   → เขียน flags.json ข้าง all.json
 */
// สแกนทั้งคลัง: คีย์ที่แอปใช้จริง vs สิ่งที่วิธีทำบอก
const fs = require('fs');
const all = require(require('path').resolve(process.argv[2]));

// ---- ตัวอ่านเฉลย สำเนาจาก lib/exam-utils.ts (ตัวที่แอปใช้จริง) ----
const ext = (e) => {
  if (!e || typeof e !== 'string') return null;
  const c = e.replace(/\\\[[\s\S]*?\\\]/g, '').replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/\\\([\s\S]*?\\\)/g, '').replace(/\$[^$]+\$/g, '').replace(/\*\*/g, '');
  for (const p of [/คำตอบ\s*:?\s*ข้อ\s*(\d)/, /คำตอบคือ\s*ข้อ\s*(\d)/, /คำตอบที่ถูกต้อง\s*(?:คือ)?\s*:?\s*ข้อ\s*(\d)/,
    /เฉลย\s*:?\s*ข้อ\s*(\d)/, /ตอบ\s*ข้อ\s*(\d)/, /ข้อที่ถูกต้อง\s*(?:คือ)?\s*:?\s*(?:ข้อ\s*)?(\d)/,
    /ดังนั้น\s*ข้อ\s*(\d)/, /ตอบข้อ\s*(\d)/]) {
    const m = c.match(p); if (m) { const n = +m[1]; if (n >= 1 && n <= 4) return { idx: n - 1, at: m.index, pat: String(p) }; }
  }
  const map = { 'ก': 0, 'ข': 1, 'ค': 2, 'ง': 3 };
  for (const p of [/คำตอบ\s*:?\s*ข้อ\s*([กขคง])(?![ก-๙])/, /เฉลย\s*:?\s*ข้อ\s*([กขคง])(?![ก-๙])/,
    /คำตอบ\s*:?\s*([กขคง])(?![ก-๙])/, /เฉลย\s*:?\s*([กขคง])(?![ก-๙])/]) {
    const m = c.match(p); if (m) return { idx: map[m[1]], at: m.index, pat: String(p) };
  }
  return null;
};
const thaiToIdx = (v) => ({ 'ก': 0, 'ข': 1, 'ค': 2, 'ง': 3 })[String(v).trim()] ?? null;
const appKey = (q) => {
  const opts = Array.isArray(q.options) ? q.options : [];
  const optLen = opts.length || 4;
  const e = ext(q.explanation || q.solution || '');
  if (e && e.idx >= 0 && e.idx < optLen) return { key: e.idx, from: 'exp', e };
  const raw = q.answerIndex ?? q.correctIndex ?? q.correctAnswer ?? 0;
  let idx = thaiToIdx(raw); if (idx === null) { idx = Number(raw); if (isNaN(idx)) idx = 0; }
  if (idx >= optLen && idx > 0) idx -= 1; if (idx < 0 || idx >= optLen) idx = 0;
  return { key: idx, from: 'stored', e };
};

// ---- แยกส่วน "วิธีทำ" กับ "ส่วนวิเคราะห์ตัวเลือกผิด" ----
const WRONG_HEAD = /\*\*\s*(ทำไม(ตัวเลือก|ข้อ)อื่น[^*]*|ตัวเลือกอื่นผิด[^*]*|วิเคราะห์ตัว(เลือก|ลวง)[^*]*|วิเคราะห์ตัวเลือก[^*]*|จุดที่(ผิดบ่อย|มักผิด|พลาดบ่อย|มักทำผิด|หลายคนพลาด)[^*]*|วิเคราะห์จุดที่[^*]*)\*\*/;
const OPT_LINE = /\n[ \t]*[-*•]?[ \t]*(?:\*\*)?[ \t]*(?:ข้อ|ตัวเลือก(?:ที่)?)[ \t]*[1-4](?![0-9])(?!\s*(?:ถูก|✅))/;
const splitExp = (e) => {
  const body = e.replace(/^\s*\*\*\s*คำตอบ[^\n]*\n/, '\n');
  const m = body.match(WRONG_HEAD);
  let cut = m ? m.index : body.length;
  const m2 = body.match(OPT_LINE);
  if (m2 && m2.index < cut) cut = m2.index;
  return { work: body.slice(0, cut), wrong: body.slice(cut) };
};

// ---- สัญญาณ 1: ส่วน "ทำไมตัวเลือกอื่นผิด" ระบุเลขข้อไหนบ้าง ----
const listedWrong = (wrong) => {
  const s = new Set();
  const re = /(?:^|\n)\s*[-*•]?\s*\**\s*(?:ข้อ|ตัวเลือก(?:ที่)?)\s*([1-4])\b/g;
  let m; while ((m = re.exec(wrong))) s.add(+m[1] - 1);
  return s;
};

// ---- สัญญาณ 2: ประโยคชี้ตัวถูกในวิธีทำ ----
const pointsCorrect = (work) => {
  const out = [];
  const c = work.replace(/\*\*/g, '');
  const res = [/ตัวเลือกที่\s*([1-4])[^\n]{0,80}✅/g, /(?:ข้อที่ถูก(?:ต้อง)?|ตัวเลือกที่ถูก(?:ต้อง)?)[ \t]*(?:คือ)?[ \t]*:?[ \t]*(?:ข้อ|ตัวเลือกที่)[ \t]*([1-4])/g,
    /(?:จึงตอบ|ดังนั้นตอบ|ควรตอบ|ต้องตอบ)[ \t]*(?:ข้อ|ตัวเลือกที่)[ \t]*([1-4])/g, /ตรงกับ[ \t]*(?:ข้อ|ตัวเลือก(?:ที่)?)[ \t]*([1-4])/g];
  for (const re of res) { let m; while ((m = re.exec(c))) out.push(+m[1] - 1); }
  return out;
};

// ---- สัญญาณ 3: ค่าในตัวเลือก โผล่ในวิธีทำไหม ----
const norm = (s) => String(s)
  .replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
  .replace(/\\text\{([^{}]*)\}/g, '$1').replace(/\\mathrm\{([^{}]*)\}/g, '$1')
  .replace(/\\left|\\right|\\,|\\;|\\!|\\ /g, '')
  .replace(/\\times/g, '×').replace(/\\div/g, '÷').replace(/\\cdot/g, '·')
  .replace(/[$\s{}]/g, '').replace(/(\d),(?=\d{3}\b)/g, '$1')
  .replace(/\((\w+)\)\/\((\w+)\)/g, '$1/$2');
const numsIn = (s) => (norm(s).replace(/−/g,'-').match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g) || []).map(x => x.replace(/^-/, ''));
const optCore = (o) => {
  const n = norm(o);
  return n;
};

const rows = [];
let total = 0;
for (const set of all) {
  set.qs.forEach((q, i) => {
    total++;
    if (q.type === 'fill' || !Array.isArray(q.options) || q.options.length < 2) return;
    const e = String(q.explanation || q.solution || '');
    if (!e.trim()) { rows.push({ set, i, kind: 'no-exp', sev: 1 }); return; }
    const ak = appKey(q);
    const K = ak.key;
    const stored = q.correctIndex ?? q.answerIndex;
    const flags = [];
    // A: หัวเฉลย vs ค่าที่เก็บ (แอปใช้หัวเฉลย จึงไม่กระทบคะแนน แต่บอกว่าเคยแก้ไม่ครบ)
    if (ak.e && typeof stored === 'number' && stored !== ak.e.idx) flags.push(`A:หัวเฉลย=${ak.e.idx + 1} เก็บ=${stored + 1}`);
    // A2: ตัวอ่านจับประโยคที่ไม่ใช่หัวเฉลย (ไม่อยู่ต้นเฉลย)
    if (ak.e && ak.e.at > 200) flags.push(`A2:ตัวอ่านจับที่ตำแหน่ง ${ak.e.at}`);
    const { work, wrong } = splitExp(e);
    // B: ส่วนตัวเลือกผิด ระบุว่าข้อที่เป็นคีย์ "ผิด"
    const hm = e.match(WRONG_HEAD); const lw = hm ? listedWrong(e.slice(hm.index)) : new Set();
    if (lw.has(K)) flags.push(`B:ส่วนตัวผิดพูดถึงข้อ${K + 1}(คีย์)`);
    const n = q.options.length;
    if (lw.size === n - 1 && !lw.has(K)) { /* consistent */ }
    else if (lw.size === n - 1 && lw.has(K)) {
      const miss = [...Array(n).keys()].find(x => !lw.has(x));
      flags.push(`B2:ตัวที่ไม่ถูกเรียกว่าผิด=ข้อ${miss + 1}`);
    }
    // C: วิธีทำชี้ตัวเลือกอื่น
    const pc = [...pointsCorrect(work), ...(() => { const o = []; const re = /ตัวเลือกที่[ \t]*([1-4])[^\n]{0,80}✅/g; let m; const c = e.replace(/\*\*/g, ''); while ((m = re.exec(c))) o.push(+m[1] - 1); return o; })()].filter(x => x < n);
    if (pc.length && pc.some(x => x !== K)) flags.push(`C:วิธีทำชี้ข้อ${[...new Set(pc)].map(x => x + 1).join('/')}`);
    // D: ค่าในตัวเลือกที่เป็นคีย์ ไม่โผล่ในวิธีทำ แต่ตัวเลือกอื่นโผล่
    const wnums = new Set(numsIn(work));
    const onums = q.options.map(o => numsIn(o));
    const isNumeric = q.options.every(o => { const c = norm(o); return onums[q.options.indexOf(o)].length >= 1 && onums[q.options.indexOf(o)].length <= 2 && c.replace(/-?\d+(?:\.\d+)?(?:\/\d+)?/g, '').length <= 12; })
      && new Set(onums.map(a => a.join('|'))).size === q.options.length;
    if (isNumeric) {
      const present = onums.map(a => a.every(x => wnums.has(x) || wnums.has(String(+x))));
      if (!present[K]) {
        const others = present.map((p, j) => p && j !== K ? j : -1).filter(j => j >= 0);
        if (others.length) flags.push(`D:ค่าคีย์(${onums[K].join(',')})ไม่อยู่ในวิธีทำ แต่มี ${others.map(j => `ข้อ${j + 1}(${onums[j].join(',')})`).join(',')}`);
        else flags.push(`D0:ค่าคีย์(${onums[K].join(',')})ไม่อยู่ในวิธีทำ`);
      }
    }
    // B3: บรรทัดที่ขึ้นต้นด้วยเลขข้อของคีย์ แต่พูดเหมือนเป็นตัวลวง
    {
      const body = e.replace(/^\s*\*\*\s*คำตอบ[^\n]*\n/, '\n').replace(/\*\*/g, '');
      const re = new RegExp(`(?:^|\\n)[ \\t]*[-*•]?[ \\t]*(?:\\d\\)[ \\t]*)?(?:ตอบ)?(?:ข้อ|ตัวเลือก(?:ที่)?)[ \\t]*${K + 1}(?![0-9])[^\\n]{0,90}?(ผิด|คนที่|เกิดจาก|ลืม|เผลอ|สับสน|หลอก|❌|พลาด)`);
      const m = body.match(re);
      if (m && !/ถูก(?!ต้องแล้ว)|✅/.test(m[0].slice(0, 40))) flags.push(`B3:บรรทัด "ข้อ${K + 1}" (คีย์) ถูกพูดเหมือนตัวลวง: ${m[0].trim().slice(0, 70)}`);
    }
    if (flags.length) rows.push({ set, i, K, flags });
  });
}
const strong = rows.filter(r => r.flags && r.flags.some(f => /^(B:|C:|D:)/.test(f)));
console.log('total', total, 'flagged', rows.length, 'strong', strong.length);
const cnt = {};
for (const r of rows) for (const f of (r.flags || [r.kind])) { const k = f.split(':')[0]; cnt[k] = (cnt[k] || 0) + 1; }
console.log(cnt);
fs.writeFileSync(require('path').join(require('path').dirname(require('path').resolve(process.argv[2])), 'flags.json'), JSON.stringify(rows.map(r => ({ src: r.set.src, id: r.set.id, title: r.set.title, course: r.set.course, hidden: r.set.hidden, q: r.i + 1, K: r.K, flags: r.flags || [r.kind] })), null, 1));
