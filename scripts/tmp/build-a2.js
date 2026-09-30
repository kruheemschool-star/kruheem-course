const fs = require('fs');
const path = require('path');
const { wrapP, markPhrase, wrapDark } = require('./transform');

const SRC = path.resolve('scripts/tmp/a2-WhesQXg0zxzaNRiCMGzV.html');
let content = fs.readFileSync(SRC, 'utf8');

const QUOTE_OPEN = '<div class="khb-quote">';
const QUOTE_CLOSE = '</div>';

// --- marks (inline highlights, short phrases only) ---
content = markPhrase(content, 'แต่มันคือ "คณิตศาสตร์" ครับ', '"คณิตศาสตร์"');
content = markPhrase(content, 'นั่นคือ "Game Theory"', '"Game Theory" หรือ "ทฤษฎีเกม"');
content = markPhrase(content, 'โอกาสถูกของหนูจะกระโดดขึ้นเป็น', '33.33%');
content = markPhrase(content, 'และถ้าหนูตัดได้ 2 ข้อ?', '50%');
content = markPhrase(content, 'ข้อ ง. 108 มันคือ', '"แกะดำ"');
content = markPhrase(content, 'ดังนั้น คำตอบที่ถูก มักจะซ่อนอยู่ใน', 'คู่ที่ "คล้ายกันที่สุด"');
content = markPhrase(content, 'เพราะในโลกความเป็นจริง', 'สุดโต่ง 100%');
content = markPhrase(content, 'ดังนั้น ตามสถิติแล้ว', 'ข้อ ข. (B) และ ค. (C)');
content = markPhrase(content, 'ครูฮีมอยากเห็นพวกเราใช้', '"สมอง"');
content = markPhrase(content, 'ครูฮีมอยากเห็นพวกเราใช้', '"ดวง"');

// --- khb-quote (standout one-liners) ---
content = wrapP(content, 'เห็นภาพไหมครับ? มันคือการ "อ่านใจ"', QUOTE_OPEN, QUOTE_CLOSE);
content = wrapP(content, 'เห็นไหมครับ แค่ตัดช้อยส์', QUOTE_OPEN, QUOTE_CLOSE);
content = wrapP(content, 'เจอคำว่า "ต้อง...เท่านั้น"', QUOTE_OPEN, QUOTE_CLOSE);
content = wrapP(content, 'จิตวิทยาคนออกข้อสอบคือ', QUOTE_OPEN, QUOTE_CLOSE);
content = wrapP(content, 'วิธีที่ดีที่สุดตามหลักความน่าจะเป็นคือ', QUOTE_OPEN, QUOTE_CLOSE);

// --- khb-dark (single most important punchline) ---
content = wrapDark(content, 'ไม่มีเทคนิคการเดาไหนในโลก', 'green');

fs.writeFileSync(path.resolve('scripts/tmp/a2-NEW.html'), content, 'utf8');
console.log('a2 build OK, length', content.length);
