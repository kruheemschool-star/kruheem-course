/**
 * gen-chapter-checklist.js — สร้างไฟล์ HTML เช็คลิสต์ A4 จากโครงคอร์สจริงใน Firestore
 *
 *   node scripts/gen-chapter-checklist.js <key>       สร้างไฟล์เดียว
 *   node scripts/gen-chapter-checklist.js --all       สร้างทุกคอร์สในตาราง COURSES
 *
 * ใช้กับคอร์สที่ "บทน้อยแต่คลิปเยอะ" (มัธยม) — ติกทีละคลิปเป็นช่องเล็กเรียงต่อกัน
 * เด็กจึงเห็นความคืบหน้าละเอียดกว่าติกรายบท (บทละ 70 คลิปกว่าจะได้ติกครั้งเดียว)
 *
 * ไฟล์ที่ได้ → scripts/generated/<key>-checklist-a4.html
 * จากนั้น: render-checklist-pdf.js → upload-checklist.js → add-checklist-lesson.js
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const PALETTE = ['#D97706', '#2563EB', '#059669', '#7C3AED', '#E11D48', '#0F766E'];

const COURSES = {
  m1t1: { id: 'fhoc1u2JT8WghFHapzx8', short: 'ม.1 เทอม 1', tips: 'm1' },
  m1t2: { id: 'fu5mtwI48TrhJwXtMev4', short: 'ม.1 เทอม 2', tips: 'm1' },
  m2t1: { id: 'dEdh5HfBU7zCSdJsdGK5', short: 'ม.2 เทอม 1', tips: 'mid' },
  m3t1: { id: 'XCHje0hKhhGD2jd5RMnz', short: 'ม.3 เทอม 1', tips: 'mid' },
  m4t1: { id: 'RPEJPtOJg3sSL7P2AyPi', short: 'ม.4 เทอม 1', tips: 'high' },
  m4t2: { id: 'ZhpY3GMWh3SOua5yAVnu', short: 'ม.4 เทอม 2', tips: 'high' },
  m5t1: { id: 'nQIVvwyuJkrwK0pYQJKB', short: 'ม.5 เทอม 1', tips: 'high' },
  m5t2: { id: 'IFAiTpvLzOFEm7aIn3A5', short: 'ม.5 เทอม 2', tips: 'high' },
};

const TIPS = {
  m1: [
    'ดูคลิปแล้วหยุดทำตามทันที อย่าดูรวดเดียวจบ สมองจำจากมือที่ลงมือทำ ไม่ใช่ตาที่ดูผ่าน',
    'วันละ 3–5 คลิปกำลังดี ติกทุกวันให้ได้ ความสม่ำเสมอชนะการอัดทีเดียวเสมอ',
    'ข้อไหนทำไม่ได้ อย่าข้าม ให้ย้อนดูคลิปเดิมซ้ำอีกรอบก่อนไปคลิปถัดไป',
    'บทแรกคือรากฐานของทั้งเทอม ถ้ายังไม่แน่นอย่าเพิ่งรีบไปบทหลัง',
  ],
  mid: [
    'ดูคลิปแล้วหยุดทำตามทันที อย่าดูรวดเดียวจบ สมองจำจากมือที่ลงมือทำ ไม่ใช่ตาที่ดูผ่าน',
    'วันละ 3–5 คลิปกำลังดี ติกทุกวันให้ได้ ความสม่ำเสมอชนะการอัดทีเดียวเสมอ',
    'ข้อไหนทำไม่ได้ อย่าข้าม ให้ย้อนดูคลิปเดิมซ้ำอีกรอบก่อนไปคลิปถัดไป',
    'ก่อนสอบกลางภาค–ปลายภาค ให้กลับมาดูช่องที่ยังไม่ได้ติก นั่นคือจุดอ่อนที่ต้องเก็บ',
  ],
  high: [
    'ดูคลิปแล้วหยุดทำตามทันที อย่าดูรวดเดียวจบ สมองจำจากมือที่ลงมือทำ ไม่ใช่ตาที่ดูผ่าน',
    'วันละ 3–5 คลิปกำลังดี ติกทุกวันให้ได้ ความสม่ำเสมอชนะการอัดทีเดียวเสมอ',
    'ข้อไหนทำไม่ได้ อย่าข้าม ให้ย้อนดูคลิปเดิมซ้ำอีกรอบก่อนไปคลิปถัดไป',
    'เนื้อหาระดับนี้ใช้ต่อยอดถึงสนามสอบเข้ามหาวิทยาลัย เก็บให้แน่นตั้งแต่ตอนเรียนจะคุ้มที่สุด',
  ],
};

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cleanTitle = (t) => String(t || '').replace(/\s*\(กำลังอัพเดต\)\s*/g, '').trim();

const tryParseQuestions = (raw) => {
  const s = (raw || '').trim();
  if (!s.startsWith('[')) return null;
  try { const p = JSON.parse(s); return Array.isArray(p) ? p : null; } catch { return null; }
};

/** ปรับขนาดช่องติกและจำนวนบรรทัดโน้ตตามปริมาณคลิป
 *  คอร์สคลิปเยอะต้องบีบให้ลงหน้าเดียว ส่วนคอร์สคลิปน้อยขยายช่องให้ติกง่ายและไม่เหลือหน้าโล่ง */
function scaleFor(totalClips, chapterCount) {
  if (totalClips > 300) return { cell: 13, gap: 4, chGap: 11, notes: 2 };
  if (totalClips > 180) return { cell: 15, gap: 5, chGap: 13, notes: 2 };
  if (totalClips > 110) return { cell: 18, gap: 6, chGap: 16, notes: 3 };
  return { cell: 22, gap: 8, chGap: 20, notes: chapterCount <= 2 ? 5 : 4 };
}

function buildHtml({ courseTitle, short, chapters, exams, totalClips, tipsKey }) {
  const tips = TIPS[tipsKey] || TIPS.mid;
  const S = scaleFor(totalClips, chapters.length);

  const blocks = chapters.map((c) => {
    if (c.clips === 0) {
      return `<div class="ch">
        <div class="ch-head">
          <span class="ch-num" style="background:${c.color}">${c.no}</span>
          <span class="ch-name">${esc(c.name)}</span>
          <span class="ch-soon">ยังไม่เปิดในคอร์ส</span>
        </div>
      </div>`;
    }
    let cells = '';
    for (let i = 1; i <= c.clips; i++) {
      const tens = i % 10 === 0 ? ' tens' : '';
      cells += `<span class="cell${tens}"></span>`;
    }
    return `<div class="ch">
      <div class="ch-head">
        <span class="ch-num" style="background:${c.color}">${c.no}</span>
        <span class="ch-name">${esc(c.name)}</span>
        <span class="ch-count">${c.clips} คลิป</span>
        <span class="ch-date">เสร็จวันที่ <span class="dline"></span></span>
      </div>
      <div class="cells">${cells}</div>
    </div>`;
  }).join('');

  const examBlock = exams.length
    ? `<div class="mock">
        <div class="mock-head">
          <h3>ชุดตะลุยโจทย์ในคอร์ส</h3>
          <span class="sub">ทำหลังดูคลิปในบทนั้นครบ แล้วจดคะแนนไว้</span>
        </div>
        <div class="mock-list">
          ${exams.map((e) => `<div class="mock-item"><span class="mbox"></span><span class="mlabel">${esc(e.title)}</span><span class="mscore"></span><span class="munit">/${e.count}</span></div>`).join('')}
        </div>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>เช็คลิสต์ ${esc(short)} — ${esc(courseTitle)}</title>
<style>
  @font-face { font-family: 'Sarabun'; font-weight: 400; src: url('../fonts/Sarabun-Regular.ttf') format('truetype'); }
  @font-face { font-family: 'Sarabun'; font-weight: 700; src: url('../fonts/Sarabun-Bold.ttf') format('truetype'); }
  @font-face { font-family: 'Sarabun'; font-weight: 800; src: url('../fonts/Sarabun-Bold.ttf') format('truetype'); }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #fff; }
  body { font-family: 'Sarabun', sans-serif; color: #1C1917; }

  .page {
    width: 794px; height: 1123px;
    padding: 34px 36px 20px;
    background: #FFFDF7;
    display: flex; flex-direction: column; gap: 12px;
    overflow: hidden;
  }

  .head {
    display: grid; grid-template-columns: 1fr 232px; gap: 18px;
    border: 2.5px solid #052A25; border-radius: 14px;
    padding: 13px 16px; background: #fff; align-items: center;
  }
  .kicker {
    display: inline-block; border: 1.5px solid #0F766E; color: #0F766E;
    font-size: 11.5px; font-weight: 700; padding: 2px 10px;
    border-radius: 99px; margin-bottom: 5px;
  }
  h1 { font-size: 27px; font-weight: 800; color: #052A25; line-height: 1.15; letter-spacing: -.3px; }
  .course-line { font-size: 12.5px; color: #3F3F46; margin-top: 4px; line-height: 1.45; }
  .course-line .by { color: #78716C; }
  .nowrap { white-space: nowrap; }

  .fields { display: flex; flex-direction: column; gap: 7px; }
  .field { font-size: 11.5px; color: #3F3F46; font-weight: 700; display: flex; align-items: baseline; gap: 5px; }
  .field .line { flex: 1; border-bottom: 1.5px dashed #A8A29E; height: 13px; }

  .how {
    font-size: 11.5px; color: #57534E;
    background: #F6F1E4; border-radius: 10px; padding: 7px 12px;
    display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
  }
  .how .demo { width: 13px; height: 13px; border: 1.5px solid #A8A29E; border-radius: 3px; display: inline-block; }

  /* บทและช่องติกรายคลิป */
  .chapters { display: flex; flex-direction: column; gap: ${S.chGap}px; }
  .ch-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .ch-num {
    min-width: 21px; height: 21px; padding: 0 6px; border-radius: 6px;
    color: #fff; font-size: 11.5px; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
  }
  .ch-name { font-size: 13px; font-weight: 700; color: #1C1917; }
  .ch-count { font-size: 10.5px; color: #78716C; white-space: nowrap; }
  .ch-soon {
    font-size: 10.5px; color: #9A3412; background: #FFEDD5;
    border-radius: 99px; padding: 1px 9px; white-space: nowrap;
  }
  .ch-date {
    margin-left: auto; font-size: 10px; color: #A8A29E;
    display: flex; align-items: baseline; gap: 4px; white-space: nowrap;
  }
  .ch-date .dline { display: inline-block; width: 62px; border-bottom: 1.2px dashed #C6C2BC; height: 11px; }

  .cells { display: flex; flex-wrap: wrap; gap: ${S.gap}px; }
  .cell {
    width: ${S.cell}px; height: ${S.cell}px;
    border: 1.3px solid #A8A29E; border-radius: 3px;
  }
  .cell.tens { border-color: #52525B; margin-right: ${S.gap + 4}px; }

  .mock {
    border: 2px solid #C2410C; border-radius: 14px;
    background: #FFF7ED; padding: 9px 14px 10px;
  }
  .mock-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 7px; }
  .mock-head h3 { font-size: 13.5px; font-weight: 800; color: #7C2D12; }
  .mock-head .sub { font-size: 11px; color: #9A3412; }
  .mock-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 16px; }
  .mock-item { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #431407; }
  .mock-item .mbox { width: 14px; height: 14px; border: 1.5px solid #C2410C; border-radius: 4px; flex-shrink: 0; }
  .mock-item .mlabel { font-weight: 700; }
  .mock-item .mscore { flex: 1; border-bottom: 1.2px solid #FDBA74; height: 11px; min-width: 22px; }
  .mock-item .munit { font-size: 10.5px; color: #9A3412; white-space: nowrap; }

  .notes {
    border: 1.5px dashed #A8A29E; border-radius: 12px;
    padding: 9px 14px 12px; background: #FEFDFB;
  }
  .notes-title { font-size: 11.5px; font-weight: 800; color: #57534E; margin-bottom: 9px; }
  .note-line { border-bottom: 1.2px dashed #D6D3D1; height: 20px; }

  .tips {
    border: 2.5px solid #052A25; border-radius: 14px;
    background: #fff; padding: 11px 15px 12px;
  }
  .tips-head { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
  .tips-head h2 { font-size: 16px; font-weight: 800; color: #052A25; }
  .tips-badge {
    width: 22px; height: 22px; flex-shrink: 0;
    border: 2px solid #052A25; border-radius: 7px;
    font-size: 12px; font-weight: 800; color: #052A25;
    display: flex; align-items: center; justify-content: center;
  }
  .tips-list { display: grid; grid-template-columns: 1fr 1fr; column-gap: 20px; row-gap: 6px; }
  .tip { display: flex; gap: 6px; font-size: 13px; line-height: 1.45; color: #292524; }
  .tip .n { color: #0F766E; font-weight: 800; flex-shrink: 0; }
  .tip.full { grid-column: 1 / -1; }

  .parents {
    background: #FFF7ED; border-left: 4px solid #C2410C; border-radius: 10px;
    padding: 10px 15px; font-size: 12.5px; line-height: 1.55; color: #431407;
  }
  .parents strong { color: #7C2D12; font-weight: 800; }

  .foot { font-size: 11.5px; color: #8A8580; text-align: center; margin-top: auto; }
</style>
</head>
<body>
<section class="page">

  <div class="head">
    <div>
      <span class="kicker">เครื่องมือคู่ใจประจำคอร์ส · แผ่นเดียวจบ</span>
      <h1>เช็คลิสต์พิชิตคณิต ${esc(short)}</h1>
      <div class="course-line">${esc(courseTitle)} — ${chapters.length} บท · ${totalClips} คลิป<br><span class="by nowrap">ครูฮีม · kruheemmath.com</span></div>
    </div>
    <div class="fields">
      <div class="field">ชื่อ <span class="line"></span></div>
      <div class="field">โรงเรียน/ห้อง <span class="line"></span></div>
      <div class="field">เริ่มติกวันที่ <span class="line"></span></div>
    </div>
  </div>

  <div class="how">
    <span>วิธีใช้: หนึ่งช่อง = หนึ่งคลิป ดูจบแล้วทำตามได้เองค่อยระบายทึบ</span>
    <span class="demo"></span>
    <span>— ช่องที่เส้นเข้มคือทุก ๆ 10 คลิป ไว้นับง่าย</span>
  </div>

  <div class="chapters">${blocks}</div>

  ${examBlock}

  <div class="notes">
    <div class="notes-title">จดไว้กันลืม — คลิปหรือหัวข้อที่ยังไม่เข้าใจ ต้องกลับมาดูซ้ำ</div>
    ${'<div class="note-line"></div>'.repeat(S.notes)}
  </div>

  <div class="tips">
    <div class="tips-head">
      <span class="tips-badge">5</span>
      <h2>คำแนะนำในการเรียนจากครูฮีม</h2>
    </div>
    <div class="tips-list">
      ${tips.map((t, i) => `<div class="tip"><span class="n">${i + 1}.</span><span>${esc(t)}</span></div>`).join('')}
      <div class="tip full"><span class="n">5.</span><span>ระบายครบทั้งแผ่นเมื่อไหร่ แปลว่าเก็บคอร์สนี้จบทั้งเทอมแล้ว เก็บแผ่นนี้ไว้ดูตอนท้อ จะได้เห็นว่าตัวเองเดินมาไกลแค่ไหน</span></div>
    </div>
  </div>

  <div class="parents">
    <strong>ฝากถึงคุณพ่อคุณแม่ครับ</strong> — แผ่นนี้แปะไว้ตรงไหน ลูกระบายไปกี่ช่อง คือคำตอบของคำถามว่า "อ่านหนังสือหรือยัง" โดยไม่ต้องเอ่ยถามเลยครับ เห็นระบายเพิ่มเมื่อไหร่ ชมสักคำ กำลังใจจากบ้านสำคัญกว่าทุกเทคนิคในคอร์สนี้ครับ
  </div>

  <div class="foot">พิมพ์แผ่นนี้แปะข้างโต๊ะอ่านหนังสือ — เห็นทุกวัน ระบายทุกวัน เก่งขึ้นทุกวัน · ฉบับเดือนสิงหาคม 2569 · kruheemmath.com</div>
</section>
</body>
</html>
`;
}

async function generate(key, db) {
  const C = COURSES[key];
  const courseSnap = await db.collection('courses').doc(C.id).get();
  const courseTitle = courseSnap.data()?.title || C.short;

  const snap = await db.collection('courses').doc(C.id).collection('lessons').get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const headers = rows.filter((r) => r.type === 'header').sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const chapters = headers.map((h, i) => {
    const clips = rows.filter((r) => r.headerId === h.id && r.type === 'video').length;
    const name = cleanTitle(h.title);
    return {
      no: String(i + 1),
      name,
      shortName: name.replace(/^บทที่\s*\d+[:：]?\s*/, '').slice(0, 14),
      clips,
      color: PALETTE[i % PALETTE.length],
    };
  });

  const exams = rows
    .filter((r) => r.type === 'html' && tryParseQuestions(r.content))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((e) => ({ title: cleanTitle(e.title).replace(/^แนวข้อสอบ\s*[:：]?\s*/, ''), count: tryParseQuestions(e.content).length }));

  const totalClips = chapters.reduce((s, c) => s + c.clips, 0);
  const html = buildHtml({ courseTitle, short: C.short, chapters, exams, totalClips, tipsKey: C.tips });

  const outDir = path.resolve(__dirname, 'generated');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${key}-checklist-a4.html`);
  fs.writeFileSync(file, html, 'utf8');
  console.log(`✅ ${key}: ${chapters.length} บท / ${totalClips} คลิป / ชุดข้อสอบ ${exams.length} → ${path.relative(process.cwd(), file)}`);
  const empty = chapters.filter((c) => c.clips === 0);
  if (empty.length) console.log(`   ⚠️ บทที่ยังไม่มีคลิป: ${empty.map((c) => c.name).join(', ')}`);
}

(async () => {
  const serviceAccount = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const arg = process.argv[2];
  const keys = arg === '--all' ? Object.keys(COURSES) : [arg];
  if (!arg || (arg !== '--all' && !COURSES[arg])) {
    console.error('ใช้: node scripts/gen-chapter-checklist.js <' + Object.keys(COURSES).join('|') + '|--all>');
    process.exit(1);
  }
  for (const k of keys) await generate(k, db);
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
