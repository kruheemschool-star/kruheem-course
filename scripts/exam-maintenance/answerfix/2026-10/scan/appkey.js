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


module.exports=(q)=>appKey(q).key;module.exports.ext=ext;
