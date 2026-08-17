/**
 * render-checklist-pdf.js — เรนเดอร์ไฟล์เช็คลิสต์ A4 (HTML) เป็น PDF + รูป preview
 *
 *   node scripts/render-checklist-pdf.js gifted   # → gifted-checklist-a4.html
 *   node scripts/render-checklist-pdf.js p6       # → p6-checklist-a4.html
 *
 * มีด่านกัน 2 ชั้นก่อนออกไฟล์: เนื้อหาล้นหน้า A4 และข้อความล้นขอบ/ถูกตัดในกล่อง
 * ผลลัพธ์ลง scripts/out/<key>/ (gitignored) แล้วอัปด้วย upload-checklist.js
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const TARGETS = {
  gifted: { src: 'gifted-checklist-a4.html', name: 'checklist-40-topics' },
  p6: { src: 'p6-checklist-a4.html', name: 'p6-checklist-16-chapters' },
};

const key = process.argv[2];
if (!TARGETS[key]) {
  console.error('ใช้: node scripts/render-checklist-pdf.js <' + Object.keys(TARGETS).join('|') + '>');
  process.exit(1);
}
const T = TARGETS[key];
const SRC = path.resolve(__dirname, T.src);
const OUT_DIR = path.resolve(__dirname, 'out', key);

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  await page.goto('file://' + SRC, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const metrics = await page.evaluate(() => {
    const el = document.querySelector('.page');
    const last = document.querySelector('.foot');
    return {
      pageHeight: el.getBoundingClientRect().height,
      contentBottom: last.getBoundingClientRect().bottom,
      scrollHeight: el.scrollHeight,
    };
  });
  console.log('ความสูงหน้า:', metrics.pageHeight, 'px | เนื้อหาจบที่:', Math.round(metrics.contentBottom), 'px | scrollHeight:', metrics.scrollHeight);
  if (metrics.scrollHeight > metrics.pageHeight + 1) {
    throw new Error(`เนื้อหาล้นหน้า A4 (${metrics.scrollHeight} > ${metrics.pageHeight}) — ปรับ layout ก่อน`);
  }

  // กันข้อความล้นขอบขวาแบบมองไม่เห็น (เคยเกิดกับแถบหมวด ชื่อสุดท้ายโดนตัดหาย)
  const clipped = await page.evaluate(() => {
    const pageRight = document.querySelector('.page').getBoundingClientRect().right;
    const bad = [];
    document.querySelectorAll('.page *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > pageRight + 0.5) {
        bad.push((el.className || el.tagName) + ' → เกินขอบ ' + Math.round(r.right - pageRight) + 'px');
      }
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') {
        bad.push((el.className || el.tagName) + ' → เนื้อหาถูกตัดในกล่อง');
      }
    });
    return bad;
  });
  if (clipped.length) {
    throw new Error('มีข้อความล้น/ถูกตัด:\n  - ' + clipped.join('\n  - '));
  }

  const pdfPath = path.join(OUT_DIR, T.name + '.pdf');
  await page.pdf({
    path: pdfPath,
    width: '794px',
    height: '1123px',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  const pngPath = path.join(OUT_DIR, T.name + '-preview.png');
  await page.screenshot({ path: pngPath, clip: { x: 0, y: 0, width: 794, height: 1123 }, scale: 'css' });

  await browser.close();
  console.log('PDF :', pdfPath, (fs.statSync(pdfPath).size / 1024).toFixed(0) + ' KB');
  console.log('PNG :', pngPath, (fs.statSync(pngPath).size / 1024).toFixed(0) + ' KB');
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
