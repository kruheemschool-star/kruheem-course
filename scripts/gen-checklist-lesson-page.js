/**
 * gen-checklist-lesson-page.js — สร้างหน้าดาวน์โหลดเช็คลิสต์ (บทเรียนชนิด html) ของคอร์สมัธยม
 *
 *   node scripts/gen-checklist-lesson-page.js <key>
 *   node scripts/gen-checklist-lesson-page.js --all
 *
 * อ่านโครงคอร์สจริงจาก Firestore (จำนวนบท/คลิป) + ลิงก์ไฟล์จาก scripts/generated/urls.json
 * ผลลัพธ์ → scripts/generated/<key>-checklist-lesson.html แล้วเอาไปใช้กับ add-checklist-lesson.js
 *
 * ดีไซน์เดียวกับหน้าเช็คลิสต์ของ Gifted/ป.6/เก่งสมการ (พื้นครีม + ฮีโร่บล็อกเข้ม + CTA เหลือง)
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const COURSES = {
  m1t1: { id: 'fhoc1u2JT8WghFHapzx8', short: 'ม.1 เทอม 1' },
  m1t2: { id: 'fu5mtwI48TrhJwXtMev4', short: 'ม.1 เทอม 2' },
  m2t1: { id: 'dEdh5HfBU7zCSdJsdGK5', short: 'ม.2 เทอม 1' },
  m3t1: { id: 'XCHje0hKhhGD2jd5RMnz', short: 'ม.3 เทอม 1' },
  m4t1: { id: 'RPEJPtOJg3sSL7P2AyPi', short: 'ม.4 เทอม 1' },
  m4t2: { id: 'ZhpY3GMWh3SOua5yAVnu', short: 'ม.4 เทอม 2' },
  m5t1: { id: 'nQIVvwyuJkrwK0pYQJKB', short: 'ม.5 เทอม 1' },
  m5t2: { id: 'IFAiTpvLzOFEm7aIn3A5', short: 'ม.5 เทอม 2' },
};

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const tryParseQuestions = (raw) => {
  const s = (raw || '').trim();
  if (!s.startsWith('[')) return null;
  try { const p = JSON.parse(s); return Array.isArray(p) ? p : null; } catch { return null; }
};

function page({ short, courseTitle, chapters, clips, examCount, pdf, png }) {
  const examLine = examCount > 0
    ? `<li>มีช่องบันทึกคะแนนชุดตะลุยโจทย์ในคอร์ส ${examCount} ชุด และคำแนะนำการเรียน 5 ข้อจากครูฮีม</li>`
    : `<li>มีช่องจดคลิปที่ยังไม่เข้าใจ และคำแนะนำการเรียน 5 ข้อจากครูฮีม</li>`;

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>เช็คลิสต์พิชิตคณิต ${esc(short)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Sarabun', -apple-system, 'Segoe UI', sans-serif;
    background: #FBF7EE; color: #1C1917; min-height: 100vh;
    padding: 26px 20px 44px; -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 1040px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }

  .hero {
    background: #052A25; border-radius: 30px; padding: 32px;
    display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
    gap: 30px; align-items: center;
    box-shadow: 0 26px 60px rgba(5, 42, 37, .35);
    animation: riseIn .6s cubic-bezier(.22, 1, .36, 1) .15s both;
  }
  .shot { justify-self: center; width: 100%; max-width: 380px; }
  .shot img {
    display: block; width: 100%; background: #fff; padding: 8px; border-radius: 10px;
    box-shadow: 0 20px 44px rgba(0, 0, 0, .38);
    transform: rotate(-2.2deg);
    transition: transform .35s cubic-bezier(.22, 1, .36, 1);
    animation: tiltIn .8s cubic-bezier(.22, 1, .36, 1) .22s both;
  }
  .shot img:hover { transform: rotate(0deg) scale(1.03); }

  .kicker {
    display: inline-block; background: rgba(94, 234, 212, .14);
    border: 1px solid rgba(94, 234, 212, .34); color: #5EEAD4;
    font-size: 12.5px; font-weight: 800; padding: 4px 13px;
    border-radius: 99px; margin-bottom: 12px;
  }
  h1 {
    font-size: clamp(26px, 3.2vw, 34px); font-weight: 800; line-height: 1.25;
    color: #fff; letter-spacing: -.5px; margin-bottom: 12px;
  }
  h1 .accent { color: #5EEAD4; }
  .lead { font-size: 16px; line-height: 1.7; color: #CCFBF1; margin-bottom: 16px; }
  .feat { list-style: none; margin-bottom: 22px; display: flex; flex-direction: column; gap: 8px; }
  .feat li { position: relative; padding-left: 27px; font-size: 14.5px; line-height: 1.55; color: #E7F6F2; }
  .feat li::before {
    content: "✓"; position: absolute; left: 0; top: 1px;
    width: 19px; height: 19px; background: #14B8A6; color: #052A25;
    border-radius: 6px; font-size: 12px; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
  }
  .feat li:nth-child(3)::before { background: #F472B6; color: #4A0B2C; }

  .btn {
    display: inline-flex; align-items: center; gap: 11px; text-decoration: none;
    background: linear-gradient(135deg, #FDE047, #FBBF24); color: #3F2A02;
    font-family: inherit; font-size: 20px; font-weight: 800;
    border: 0; border-radius: 16px; padding: 16px 32px; cursor: pointer;
    animation: glowPulse 2.8s ease-in-out infinite; transition: transform .18s ease;
  }
  .btn:hover { transform: translateY(-3px); }
  .btn svg { width: 22px; height: 22px; flex-shrink: 0; }
  .alt { font-size: 12.5px; color: #94A3A0; margin-top: 11px; }
  .warn {
    margin-top: 14px; background: #FFFBEB; border: 1px solid #FCD34D;
    border-radius: 12px; padding: 11px 14px; font-size: 13.5px;
    color: #92400E; line-height: 1.55;
  }

  .steps {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: 14px;
  }
  .step {
    background: #FFFDF8; border: 1px solid #EADFC8; border-radius: 22px;
    padding: 22px 20px 20px; text-align: center;
  }
  .step:nth-child(1) { animation: riseIn .55s cubic-bezier(.22, 1, .36, 1) .22s both; }
  .step:nth-child(2) { animation: riseIn .55s cubic-bezier(.22, 1, .36, 1) .29s both; }
  .step:nth-child(3) { animation: riseIn .55s cubic-bezier(.22, 1, .36, 1) .36s both; }
  .step .ic { font-size: 32px; margin-bottom: 9px; }
  .step .no {
    display: inline-block; background: #CCFBF1; color: #06302B;
    font-size: 11.5px; font-weight: 800; padding: 3px 11px;
    border-radius: 99px; margin-bottom: 7px;
  }
  .step:nth-child(2) .no { background: #FFEDD5; color: #7C2D12; }
  .step:nth-child(3) .no { background: #EEF2FF; color: #312E81; }
  .step h3 { font-size: 21px; font-weight: 800; color: #052A25; margin-bottom: 5px; }
  .step:nth-child(2) h3 { color: #7C2D12; }
  .step:nth-child(3) h3 { color: #312E81; }
  .step p { font-size: 13.5px; color: #57534E; line-height: 1.6; }

  .parents {
    background: #FFFDF8; border: 1px solid #EADFC8; border-left: 5px solid #7C2D12;
    border-radius: 24px; padding: 20px 24px; font-size: 14.5px;
    color: #57534E; line-height: 1.75;
    animation: riseIn .55s cubic-bezier(.22, 1, .36, 1) .36s both;
  }
  .parents strong { color: #7C2D12; }

  .foot { text-align: center; font-size: 12px; color: #A8A29E; }
  .foot a { color: #0F766E; text-decoration: none; font-weight: 600; }
  .foot a:hover { color: #134E4A; }

  @keyframes riseIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes tiltIn {
    from { opacity: 0; transform: rotate(-6deg) translateY(24px) scale(.96); }
    to   { opacity: 1; transform: rotate(-2.2deg) translateY(0) scale(1); }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 8px 20px rgba(251, 191, 36, .30); }
    50%      { box-shadow: 0 12px 30px rgba(251, 191, 36, .55); }
  }
  @media (prefers-reduced-motion: reduce) {
    .hero, .shot img, .step, .parents, .btn { animation: none !important; }
  }
  @media (max-width: 620px) {
    body { padding: 18px 14px 34px; }
    .hero { padding: 24px 20px; border-radius: 24px; }
    .btn { width: 100%; justify-content: center; font-size: 17px; padding: 15px 22px; }
  }
</style>
</head>
<body>
  <div class="wrap">

    <div class="hero">
      <div class="shot">
        <img src="${escAttr(png)}" alt="ตัวอย่างเช็คลิสต์คณิต ${esc(short)} ขนาด A4">
      </div>
      <div class="info">
        <span class="kicker">เครื่องมือคู่ใจประจำคอร์ส</span>
        <h1>ระบายให้ครบ ${clips} ช่อง<br><span class="accent">แล้วจบเทอมนี้แบบมั่นใจ</span></h1>
        <p class="lead">พิมพ์แผ่นเดียว แปะข้างโต๊ะอ่านหนังสือ ระบายทีละคลิป — เห็นความก้าวหน้าของตัวเองทุกวัน กำลังใจก็มาทุกวัน</p>
        <ul class="feat">
          <li>ครบทั้ง ${chapters} บท ${clips} คลิป หนึ่งช่องคือหนึ่งคลิป ระบายแล้วเห็นเลยว่าเหลืออีกเท่าไหร่</li>
          <li>มีช่องจดวันที่เรียนจบแต่ละบท เห็นชัดว่าเดินมาถึงไหนแล้ว</li>
          ${examLine}
        </ul>
        <!-- ลิงก์ธรรมดา ไม่ใช่ปุ่ม JavaScript — เบราว์เซอร์ในแอปเฟซบุ๊ก/ไลน์บล็อกสคริปต์เปิดหน้าต่างเงียบๆ
             แต่ลิงก์จริงยังกดค้างเพื่อเปิด/บันทึกได้เสมอ -->
        <a id="dl" class="btn" href="${escAttr(pdf)}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          เปิดเช็คลิสต์เพื่อพิมพ์ (ไฟล์ 1 หน้า)
        </a>
        <div class="alt">ถ้าแตะแล้วไม่มีอะไรขึ้น ให้แตะค้างไว้ แล้วเลือก "เปิดในแท็บใหม่" หรือ "ดาวน์โหลดลิงก์"</div>
        <div id="inapp" class="warn" hidden>💡 ตอนนี้เปิดจากแอปเฟซบุ๊กหรือไลน์อยู่ ถ้ากดปุ่มแล้วไฟล์ไม่ขึ้น ให้กดเมนู ⋯ มุมขวาบน แล้วเลือก "เปิดในเบราว์เซอร์" ก่อนนะครับ</div>
      </div>
    </div>

    <div class="steps">
      <div class="step">
        <div class="ic">🖨️</div>
        <div class="no">ขั้นที่ 1</div>
        <h3>พิมพ์</h3>
        <p>ขนาดมาตรฐานหนึ่งแผ่น พิมพ์ขาวดำก็ใช้ได้ พิมพ์สีจะเห็นบทชัดสวยเลย</p>
      </div>
      <div class="step">
        <div class="ic">📌</div>
        <div class="no">ขั้นที่ 2</div>
        <h3>แปะ</h3>
        <p>ข้างโต๊ะอ่านหนังสือ หน้าตู้เย็น หรือที่ที่เดินผ่านทุกวัน ให้มันคอยมองเรา</p>
      </div>
      <div class="step">
        <div class="ic">✅</div>
        <div class="no">ขั้นที่ 3</div>
        <h3>ระบาย</h3>
        <p>ดูคลิปจบแล้วทำตามได้เอง ค่อยระบายช่องนั้นทึบด้วยความภูมิใจ</p>
      </div>
    </div>

    <div class="parents">
      <strong>ฝากถึงคุณพ่อคุณแม่ครับ</strong> — แผ่นนี้แปะไว้ตรงไหน ลูกระบายไปกี่ช่อง คือคำตอบของคำถามว่า "อ่านหนังสือหรือยัง" โดยไม่ต้องเอ่ยถามเลยครับ เห็นลูกระบายเพิ่มเมื่อไหร่ ชมสักคำหนึ่ง กำลังใจจากบ้านสำคัญกว่าทุกเทคนิคในคอร์สนี้ครับ
    </div>

    <div class="foot">${esc(courseTitle)} • ครูฮีม <a href="https://kruheemmath.com" target="_blank" rel="noopener">kruheemmath.com</a> • ฉบับเดือนสิงหาคม 2569</div>
  </div>

<script>
  // ตัวลิงก์เป็น <a> จริง — สคริปต์พังหรือไม่รัน ก็ยังกดและกดค้างเพื่อบันทึกได้
  // สคริปต์นี้แค่กันกรณีหน้านี้ถูกฝังในกรอบที่ห้ามเปิดแท็บใหม่: ถ้าเปิดแท็บไม่ได้
  // ให้เปิดไฟล์ในกรอบแทน จะได้ไม่กลายเป็นปุ่มที่กดแล้วเงียบ
  var dl = document.getElementById('dl');
  dl.addEventListener('click', function (e) {
    var win = null;
    try { win = window.open(dl.href, '_blank'); } catch (err) { win = null; }
    e.preventDefault();
    if (!win) window.location.href = dl.href;
  });
  var ua = navigator.userAgent || '';
  if (/FBAN|FBAV|FB_IAB|FBIOS|Line\\/|LIFF/i.test(ua)) {
    document.getElementById('inapp').hidden = false;
  }
</script>
</body>
</html>
`;
}

(async () => {
  const serviceAccount = require(path.resolve(__dirname, 'seed-gifted-m1/serviceAccountKey.json'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const urls = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'generated/urls.json'), 'utf8'));
  const arg = process.argv[2];
  const keys = arg === '--all' ? Object.keys(COURSES) : [arg];
  if (!arg || (arg !== '--all' && !COURSES[arg])) {
    console.error('ใช้: node scripts/gen-checklist-lesson-page.js <' + Object.keys(COURSES).join('|') + '|--all>');
    process.exit(1);
  }

  for (const key of keys) {
    const C = COURSES[key];
    const u = urls[key];
    if (!u) throw new Error(`ไม่พบลิงก์ของ ${key} ใน generated/urls.json`);

    const courseSnap = await db.collection('courses').doc(C.id).get();
    const courseTitle = courseSnap.data()?.title || C.short;
    const snap = await db.collection('courses').doc(C.id).collection('lessons').get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const headers = rows.filter((r) => r.type === 'header');
    const clips = rows.filter((r) => r.type === 'video').length;
    const examCount = rows.filter((r) => r.type === 'html' && tryParseQuestions(r.content)).length;

    const html = page({ short: C.short, courseTitle, chapters: headers.length, clips, examCount, pdf: u.pdf, png: u.png });
    const file = path.resolve(__dirname, 'generated', `${key}-checklist-lesson.html`);
    fs.writeFileSync(file, html, 'utf8');
    console.log(`✅ ${key}: ${headers.length} บท / ${clips} คลิป → ${path.relative(process.cwd(), file)}`);
  }
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
