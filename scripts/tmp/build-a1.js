const fs = require('fs');
const path = require('path');
const { wrapP, markPhrase, wrapDark } = require('./transform');

const SRC = path.resolve('scripts/tmp/a1-EWTj70wjWNzpplXtvYE0.html');
let content = fs.readFileSync(SRC, 'utf8');

const QUOTE_OPEN = '<div class="khb-quote">';
const QUOTE_CLOSE = '</div>';

// --- marks (inline highlights, short phrases only — never whole sentences) ---
content = markPhrase(content, 'ตั้งชื่อให้มันว่า', 'กฎของความเฉื่อย" (Inertia)');
content = markPhrase(content, 'ไม่ใช่เพราะหนูขี้เกียจ แต่เพราะ', '"แรงเฉื่อย" (Inertia)');
content = markPhrase(content, 'ในทางฟิสิกส์ เรามีคำคำหนึ่งเรียกว่า', '"แรงเสียดทาน" (Friction)');
content = markPhrase(content, 'ตอนรถจอดนิ่งๆ มันจะมีแรงเสียดทานชนิดหนึ่ง', '"แรงเสียดทานสถิต" (Static Friction)');
content = markPhrase(content, 'แต่พอรถขยับแล้ว แรงเสียดทานจะเปลี่ยนเป็น', '"แรงเสียดทานจลน์" (Kinetic Friction)');
content = markPhrase(content, 'วิธีนี้เรียกว่า', 'หลอกสมองให้ขยับ');
content = markPhrase(content, 'ให้หนูบอกตัวเองว่า "ครูขอแค่ 2 นาที"', '2 นาที');
content = markPhrase(content, 'ตามกฎของนิวตันข้อเดิมเลยครับ', '"โมเมนตัม" (Momentum)');

// --- khb-quote (standout one-liners) ---
content = wrapP(content, 'อยากอ่านหนังสือนะ แต่ร่างกายมันไม่ขยับ', QUOTE_OPEN, QUOTE_CLOSE);
content = wrapP(content, 'กฎนี้บอกว่า', QUOTE_OPEN, QUOTE_CLOSE);
content = wrapP(content, 'ความยากอยู่ที่การ "ทลายกำแพง"', QUOTE_OPEN, QUOTE_CLOSE);
content = wrapP(content, 'หนูได้ชนะแรงเฉื่อยไปเรียบร้อยแล้ว', QUOTE_OPEN, QUOTE_CLOSE);
content = wrapP(content, 'การกระทำเล็กๆ น้อยๆ แค่นี้แหละ', QUOTE_OPEN, QUOTE_CLOSE);

// --- khb-dark (single most important punchline) ---
content = wrapDark(content, 'แต่อยู่ที่ความสามารถในการ', 'green');

fs.writeFileSync(path.resolve('scripts/tmp/a1-NEW.html'), content, 'utf8');
console.log('a1 build OK, length', content.length);
