/**
 * render-gifted-checklist-pdf.js — เรนเดอร์ scripts/gifted-checklist-a4.html
 * เป็น PDF A4 หนึ่งหน้า + รูป preview PNG สำหรับหน้าดาวน์โหลด
 *
 *   node scripts/render-gifted-checklist-pdf.js
 *
 * ผลลัพธ์ลง scripts/out/ (ไม่ commit) แล้วค่อยอัปโหลดด้วย upload-gifted-checklist.js
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const SRC = path.resolve(__dirname, 'gifted-checklist-a4.html');
const OUT_DIR = path.resolve(__dirname, 'out');

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  await page.goto('file://' + SRC, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  // กันเนื้อหาล้นหน้าเงียบๆ — วัดความสูงจริงของบล็อกในหน้า
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

  // กันข้อความล้นขอบขวาแบบมองไม่เห็น (เคยเกิดกับแถบพาร์ท ชื่อสุดท้ายโดนตัดหาย)
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

  const pdfPath = path.join(OUT_DIR, 'checklist-40-topics.pdf');
  await page.pdf({
    path: pdfPath,
    width: '794px',
    height: '1123px',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  const pngPath = path.join(OUT_DIR, 'checklist-40-topics-preview.png');
  await page.screenshot({ path: pngPath, clip: { x: 0, y: 0, width: 794, height: 1123 }, scale: 'css' });

  await browser.close();
  console.log('PDF :', pdfPath, (fs.statSync(pdfPath).size / 1024).toFixed(0) + ' KB');
  console.log('PNG :', pngPath, (fs.statSync(pngPath).size / 1024).toFixed(0) + ' KB');
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
