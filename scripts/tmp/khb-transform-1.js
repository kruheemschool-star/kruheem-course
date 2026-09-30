const fs = require('fs');
const path = require('path');

const ID = 'Yu1MnLwmUMU6QNBggrsE';
const srcPath = path.join(__dirname, `khb-src-${ID}.html`);
let s = fs.readFileSync(srcPath, 'utf8');

function safeReplace(str, oldSub, newSub, label) {
  const firstIdx = str.indexOf(oldSub);
  if (firstIdx === -1) {
    throw new Error(`NOT FOUND [${label}]: ${oldSub.slice(0, 80)}...`);
  }
  const lastIdx = str.lastIndexOf(oldSub);
  if (firstIdx !== lastIdx) {
    throw new Error(`MULTIPLE MATCHES [${label}]: ${oldSub.slice(0, 80)}...`);
  }
  return str.slice(0, firstIdx) + newSub + str.slice(firstIdx + oldSub.length);
}

const reps = [
  // Q1
  [
    `<p>วินาทีนี้นี่แหละ คือวินาทีวัดใจ ระหว่าง "ผู้รอดชีวิต" กับ "ผู้เสียน้ำตา"</p>`,
    `<div class="khb-quote"><p>วินาทีนี้นี่แหละ คือวินาทีวัดใจ ระหว่าง "ผู้รอดชีวิต" กับ "ผู้เสียน้ำตา"</p></div>`,
    'Q1',
  ],
  // M2 (mark in "ครูเห็นมาเยอะ" paragraph)
  [
    `เหมือนนักวิ่งที่วิ่งนำมาตลอดทาง แต่มาสะดุดขาตัวเองล้มหน้าเส้นชัย เพราะความ "ลนลาน"`,
    `เหมือนนักวิ่งที่วิ่งนำมาตลอดทาง แต่มา<mark class="khb-mark">สะดุดขาตัวเองล้มหน้าเส้นชัย</mark> เพราะความ "ลนลาน"`,
    'M2',
  ],
  // M1 (mark in opening paragraph)
  [
    `แต่ครูมาเพื่อ "ช่วยชีวิต" พวกเราจากวินาทีมรณะ`,
    `แต่ครูมาเพื่อ <mark class="khb-mark">"ช่วยชีวิต" พวกเราจากวินาทีมรณะ</mark>`,
    'M1',
  ],
  // Q2
  [
    `<p>เจ็บไหมลูก? เจ็บสิครับ เจ็บกว่าทำไม่ได้คือ "ทำถูกแล้วแต่ดันไปแก้ให้ผิด" มันเหมือนเราทิ้งทองคำในมือลงถังขยะด้วยมือเราเอง</p>`,
    `<div class="khb-quote"><p>เจ็บไหมลูก? เจ็บสิครับ เจ็บกว่าทำไม่ได้คือ "ทำถูกแล้วแต่ดันไปแก้ให้ผิด" มันเหมือนเราทิ้งทองคำในมือลงถังขยะด้วยมือเราเอง</p></div>`,
    'Q2',
  ],
  // M3 (mark in "ครูเข้าใจหนูนะ" paragraph)
  [
    `แต่ครูจะบอกว่า ความพยายามใน 3 นาทีสุดท้าย ถ้าใช้ผิดวิธี มันคือการฆ่าตัวตายชัดๆ ครับลูก`,
    `แต่ครูจะบอกว่า <mark class="khb-mark">ความพยายามใน 3 นาทีสุดท้าย ถ้าใช้ผิดวิธี มันคือการฆ่าตัวตายชัดๆ</mark> ครับลูก`,
    'M3',
  ],
  // M5 (mark "ชนะใจตัวเอง" paragraph)
  [
    `<p>และที่สำคัญที่สุด... หนูจะเดินออกจากห้องสอบด้วยความรู้สึก "ชนะใจตัวเอง"</p>`,
    `<p>และที่สำคัญที่สุด... หนูจะเดินออกจากห้องสอบด้วยความรู้สึก <mark class="khb-mark">"ชนะใจตัวเอง"</mark></p>`,
    'M5',
  ],
  // Q4
  [
    `<p>ไม่ได้ชนะที่ทำได้ทุกข้อ แต่ชนะที่ "คุมสติ" ได้จนวินาทีสุดท้าย</p>`,
    `<div class="khb-quote"><p>ไม่ได้ชนะที่ทำได้ทุกข้อ แต่ชนะที่ "คุมสติ" ได้จนวินาทีสุดท้าย</p></div>`,
    'Q4',
  ],
  // Dark box (2 sibling p's, both lead)
  [
    `<p>"ความเก่ง" ทำให้เราทำข้อสอบได้</p><p>แต่ "ความนิ่ง" จะทำให้เราได้คะแนน</p>`,
    `<div class="khb-dark khb-dark-green"><p class="khb-lead">"ความเก่ง" ทำให้เราทำข้อสอบได้</p><p class="khb-lead">แต่ "ความนิ่ง" จะทำให้เราได้คะแนน</p></div>`,
    'DARK',
  ],
  // Q3 (closer near end)
  [
    `<p>แค่นั้นแหละ คือชัยชนะของหนูแล้ว</p>`,
    `<div class="khb-quote"><p>แค่นั้นแหละ คือชัยชนะของหนูแล้ว</p></div>`,
    'Q3',
  ],
];

for (const [oldSub, newSub, label] of reps) {
  s = safeReplace(s, oldSub, newSub, label);
}

fs.writeFileSync(path.join(__dirname, `khb-new-${ID}.html`), s);
console.log('OK wrote khb-new-' + ID + '.html, length=' + s.length);
