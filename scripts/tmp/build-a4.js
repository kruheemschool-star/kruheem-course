const fs = require('fs');
const path = require('path');
const { wrapP, markPhrase, wrapDark } = require('./transform');

const SRC = path.resolve('scripts/tmp/a4-arwbgG8yI9lS3pccW0nz.html');
let content = fs.readFileSync(SRC, 'utf8');

const QUOTE_OPEN = '<div class="khb-quote">';
const QUOTE_CLOSE = '</div>';

// --- marks (inline highlights, short phrases only) ---
content = markPhrase(content, 'ปัญหาจริงๆ ไม่ได้อยู่ที่สมองของหนู', '"เป้าหมาย"');
content = markPhrase(content, 'พวกเราถูกปลูกฝังมาตลอดชีวิตการเรียน', '"คำตอบที่ถูกคือพระเจ้า"');
content = markPhrase(content, 'ระบบแบบนี้มันโหดร้าย', '"นักล่าคำตอบ"');
content = markPhrase(content, 'ระบบแบบนี้มันโหดร้าย', '"นักแก้ปัญหา"');
content = markPhrase(content, 'วันนี้ครูฮีมขอเสนอทาง', '"ช่างหัวคำตอบมันบ้าง"');
content = markPhrase(content, 'การปล่อยวางผลลัพธ์', 'เราให้ค่ากับกระบวนการคิด มากกว่าตัวเลขสุดท้าย');
content = markPhrase(content, 'วันที่หนูเลิกกังวล', '"แกะปม"');

// --- khb-quote (standout one-liners) ---
content = wrapP(content, 'คำตอบ" ที่หนูเคยได้มาง่ายๆ', QUOTE_OPEN, QUOTE_CLOSE);
content = wrapP(content, '"วิธีทำ" คือสูตรอาหารและทักษะการปรุง', QUOTE_OPEN, QUOTE_CLOSE);
content = wrapP(content, 'ถ้าหนูอธิบายได้ทุกจุดอย่างลื่นไหล', QUOTE_OPEN, QUOTE_CLOSE);
content = wrapP(content, 'คำตอบที่ถูกต้อง... มันมักจะตามมาเองแบบอัตโนมัติ', QUOTE_OPEN, QUOTE_CLOSE);
content = wrapP(content, 'เพราะ "รอยแก้" บนกระดาษ', QUOTE_OPEN, QUOTE_CLOSE);

// --- khb-dark (single most important punchline) ---
content = wrapDark(content, 'แต่ความเข้าใจในวิธีการ', 'green');

fs.writeFileSync(path.resolve('scripts/tmp/a4-NEW.html'), content, 'utf8');
console.log('a4 build OK, length', content.length);
