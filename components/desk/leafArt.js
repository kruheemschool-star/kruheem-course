// ใบไม้วาดด้วย canvas ให้ดูเหมือนจริง — ใช้ร่วมกันระหว่างใบไม้ 3 มิติที่ปลิวเข้าหน้าต่าง (StudyDeskScene)
// และใบไม้ที่ลอยในวิวพาโนรามา (panorama.js)
// 4 ทรง: 0 ใบรี (ปลายแหลม)  1 ใบเรียวยาว (แบบใบไผ่/หลิว)  2 ใบเมเปิล 5 แฉก  3 ใบกลมรูปหัวใจ
// รายละเอียด: ไล่สีกลางใบสว่าง→ขอบเข้ม เส้นกลางใบ+เส้นแขนงโค้ง จุดด่างเล็กๆ ขอบใบเข้ม ก้านใบ

export const LEAF_PALETTES = [
  ['#7cb342', '#4c7f28', '#a5d46a'], // เขียวสด
  ['#9dbf3a', '#647f1f', '#c6dd6e'], // เขียวเหลือง
  ['#e0a21b', '#9a6408', '#f6cf5a'], // เหลืองทอง
  ['#e8722a', '#9a3c0d', '#f9a25e'], // ส้ม
  ['#c9402f', '#7a1f16', '#e4735f'], // แดงอิฐ
  ['#a8752a', '#66431a', '#d1a45c'], // น้ำตาลทอง (ใบแห้ง)
];

const rnd = (seed) => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

// เส้นรอบใบ (พิกัด: ก้านอยู่ซ้าย ปลายใบชี้ขวา ศูนย์กลางที่ 0,0 · L = ครึ่งความยาว, Wd = ครึ่งความกว้าง)
function outline(x, shape, L, Wd, r) {
  x.beginPath();
  if (shape === 0) { // ใบรี ปลายแหลม
    x.moveTo(-L, 0);
    x.bezierCurveTo(-L * 0.75, -Wd * 1.15, L * 0.15, -Wd * 1.1, L, 0);
    x.bezierCurveTo(L * 0.15, Wd * 1.1, -L * 0.75, Wd * 1.15, -L, 0);
  } else if (shape === 1) { // ใบเรียวยาว
    x.moveTo(-L, 0);
    x.bezierCurveTo(-L * 0.6, -Wd * 1.2, L * 0.45, -Wd * 0.9, L, 0);
    x.bezierCurveTo(L * 0.45, Wd * 0.9, -L * 0.6, Wd * 1.2, -L, 0);
  } else if (shape === 2) { // ใบเมเปิล 5 แฉก (สร้างจากรัศมีเชิงมุม)
    const pts = []; const N = 120;
    for (let i = 0; i <= N; i++) { const a = -Math.PI + i / N * Math.PI * 2; // 0 rad = ปลายกลาง (ขวา)
      const lobe = Math.pow(Math.max(0, Math.cos(a * 2.5)), 0.55); // 5 แฉก
      const base = Math.abs(a) > 2.4 ? 0.35 : 1; // โคนใบเว้า
      const rad = (0.42 + 0.58 * lobe) * base * (0.97 + 0.06 * Math.sin(a * 17 + r * 6));
      pts.push([Math.cos(a) * rad * L, Math.sin(a) * rad * Wd]); }
    x.moveTo(pts[0][0], pts[0][1]); pts.forEach(([px, py]) => x.lineTo(px, py));
  } else { // ใบกลมรูปหัวใจ
    x.moveTo(L, 0);
    x.bezierCurveTo(L * 0.7, -Wd * 1.25, -L * 1.05, -Wd * 1.1, -L * 0.7, -Wd * 0.05);
    x.bezierCurveTo(-L * 1.05, Wd * 1.1, L * 0.7, Wd * 1.25, L, 0);
  }
  x.closePath();
}

export function drawLeaf(x, w, h, shape, pal, seed) {
  const r = rnd(seed || 1), cx = w / 2, cy = h / 2, L = w * 0.44, Wd = shape >= 2 ? h * 0.42 : h * 0.4;
  x.clearRect(0, 0, w, h); x.save(); x.translate(cx, cy);
  const [base, dark, light] = pal;
  // ตัวใบ: ไล่สีจากกลางใบสว่างไปขอบเข้ม
  outline(x, shape, L, Wd, r);
  const g = x.createRadialGradient(-L * 0.15, -Wd * 0.2, Wd * 0.2, 0, 0, L * 1.05); g.addColorStop(0, light); g.addColorStop(0.45, base); g.addColorStop(1, dark);
  x.fillStyle = g; x.fill();
  // จุดด่าง/รอยแห้ง เล็กๆ
  x.save(); outline(x, shape, L, Wd, r); x.clip();
  for (let i = 0; i < 4; i++) { const px = (r() - 0.5) * L * 1.5, py = (r() - 0.5) * Wd * 1.6, rr = Wd * (0.12 + r() * 0.2); const sg = x.createRadialGradient(px, py, 0, px, py, rr); sg.addColorStop(0, `rgba(80,50,20,${(0.12 + r() * 0.14).toFixed(2)})`); sg.addColorStop(1, 'rgba(80,50,20,0)'); x.fillStyle = sg; x.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
  // แสงสะท้อนบางๆ ด้านบน
  const hl = x.createLinearGradient(0, -Wd, 0, Wd * 0.3); hl.addColorStop(0, 'rgba(255,255,255,.22)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = hl; x.fillRect(-L, -Wd, L * 2, Wd * 1.3);
  // เส้นใบ: เส้นกลาง + แขนงโค้งเฉียงไปทางปลาย (เมเปิลเป็นเส้นรัศมีไปแต่ละแฉก)
  x.strokeStyle = 'rgba(60,40,15,.42)'; x.lineCap = 'round';
  if (shape === 2) {
    x.lineWidth = Math.max(1, w * 0.014);
    for (let k = -2; k <= 2; k++) { const a = k * (Math.PI * 2 / 5) * 0.5; x.beginPath(); x.moveTo(-L * 0.3, 0); x.quadraticCurveTo(L * 0.15 * Math.cos(a), Wd * 0.25 * Math.sin(a), L * 0.92 * Math.cos(a), Wd * 0.92 * Math.sin(a)); x.stroke();
      x.lineWidth = Math.max(0.6, w * 0.007); for (let j = 1; j <= 3; j++) { const t = j / 4, bx = L * 0.92 * Math.cos(a) * t, by = Wd * 0.92 * Math.sin(a) * t; [-1, 1].forEach(s => { x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + L * 0.16 * Math.cos(a + s * 0.9), by + Wd * 0.16 * Math.sin(a + s * 0.9)); x.stroke(); }); } x.lineWidth = Math.max(1, w * 0.014); }
  } else {
    x.lineWidth = Math.max(1, w * 0.016); x.beginPath(); x.moveTo(-L * 0.98, 0); x.quadraticCurveTo(0, Wd * 0.04, L * 0.96, 0); x.stroke();
    x.lineWidth = Math.max(0.6, w * 0.008); const nV = shape === 1 ? 9 : 6;
    for (let i = 1; i <= nV; i++) { const t = i / (nV + 1), bx = -L * 0.9 + t * L * 1.7, len = (shape === 3 ? 1 : 0.9) * Wd * (1 - Math.abs(t - 0.4) * 1.2); [-1, 1].forEach(s => { x.beginPath(); x.moveTo(bx, 0); x.quadraticCurveTo(bx + L * 0.18, s * len * 0.45, bx + L * 0.32, s * len); x.stroke(); }); }
  }
  x.restore();
  // ขอบใบเข้ม + ก้านใบ
  outline(x, shape, L, Wd, r); x.strokeStyle = 'rgba(40,25,10,.4)'; x.lineWidth = Math.max(1, w * 0.012); x.stroke();
  x.strokeStyle = 'rgba(70,45,15,.85)'; x.lineWidth = Math.max(1.2, w * 0.02); x.lineCap = 'round'; x.beginPath(); x.moveTo(-L * 0.96, 0); x.lineTo(-L * 1.1, Wd * 0.05); x.stroke();
  x.restore();
}

// กระดาษโน้ตปลิว: กระดาษมีเส้นบรรทัดฟ้า ขอบแดง เขียนลายมือจางๆ
export function drawPaper(x, w, h) {
  x.clearRect(0, 0, w, h); x.fillStyle = '#fffdf7'; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(56,189,248,.35)'; x.lineWidth = 1; for (let y = h * 0.18; y < h; y += h * 0.11) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
  x.strokeStyle = 'rgba(244,63,94,.45)'; x.beginPath(); x.moveTo(w * 0.14, 0); x.lineTo(w * 0.14, h); x.stroke();
  x.strokeStyle = 'rgba(30,58,138,.35)'; x.lineWidth = 1.2; for (let i = 0; i < 4; i++) { const y = h * (0.24 + i * 0.11); x.beginPath(); x.moveTo(w * 0.2, y); for (let px = w * 0.2; px < w * (0.5 + i * 0.1); px += 6) x.lineTo(px, y - 3 + Math.sin(px * 0.6 + i) * 3); x.stroke(); }
  const sh = x.createLinearGradient(0, 0, w, h); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.12)'); x.fillStyle = sh; x.fillRect(0, 0, w, h);
}
