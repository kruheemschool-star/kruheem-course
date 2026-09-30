const fs = require('fs');
const path = require('path');
const { wrapP, markPhrase, wrapDark } = require('./transform');

const SRC = path.resolve('scripts/tmp/a3-782Ay0Fr2SV9ZSSLTF0F.html');
let content = fs.readFileSync(SRC, 'utf8');

const QUOTE_OPEN = '<div class="khb-quote">';
const QUOTE_CLOSE = '</div>';

// --- marks (inline highlights, short phrases only) ---
content = markPhrase(content, 'วันนี้ครูฮีมมีเทคนิคลับ', '"หนึ่งบรรทัด หนึ่งลมหายใจ"');
content = markPhrase(content, 'ครูเข้าใจนะ สังคมเราเดี๋ยวนี้', '"ความเร็วที่ปราศจากความแม่นยำ คือหายนะ"');
content = markPhrase(content, 'คือการบังคับให้เรา', '"แตะเบรก"');
content = markPhrase(content, 'การหยุดแค่ 3 วินาทีนี้', '3 วินาที');

// --- khb-quote (standout one-liners) ---
content = wrapP(content, 'เขียนให้จบ 1 บรรทัด', QUOTE_OPEN, QUOTE_CLOSE);
content = wrapP(content, 'ความสวยงาม = ความเป็นระเบียบ', QUOTE_OPEN, QUOTE_CLOSE);
content = wrapP(content, 'แล้วมันก็ถูกจริงๆ', QUOTE_OPEN, QUOTE_CLOSE);
content = wrapP(content, 'การเขียนวิธีทำช้าๆ ทีละบรรทัด ไม่ใช่เรื่องน่าอาย', QUOTE_OPEN, QUOTE_CLOSE);
content = wrapP(content, 'ความสุขในการเรียนเลข', QUOTE_OPEN, QUOTE_CLOSE);

// --- khb-dark (single most important punchline) ---
content = wrapDark(content, 'ความเร็วไม่ใช่พระเจ้า', 'green');

fs.writeFileSync(path.resolve('scripts/tmp/a3-NEW.html'), content, 'utf8');
console.log('a3 build OK, length', content.length);
