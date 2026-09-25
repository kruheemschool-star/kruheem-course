// บอลลูนลมร้อนและนกแบบสมจริงสำหรับวิวพาโนรามา (components/desk/panorama.js) — วาดสดทุกเฟรมบน canvas 2 มิติ
//
// บอลลูน: ซองทรงหยดน้ำคว่ำตามทรงจริง (โดมยอด → ป่องสุดราว 40% ของความสูง → เรียวลงปาก) มองจากพื้นดินเงยขึ้นเล็กน้อย
//   แผงผ้า (gore) เป็นเส้นแวงโค้งบรรจบกันที่ยอดและปาก หมุนช้าๆ เหมือนบอลลูนจริง · แสงเงาทีละแผง + ผ้าป่องระหว่างตะเข็บ
//   + เงาใต้ซอง + ไฮไลต์ผ้าไนลอน + แสงฟ้าสะท้อนขอบด้านเงา · ตะเข็บแนวตั้ง/แนวนอน รอยย่นเหนือปาก ลายแถบ/ซิกแซก
//   กระโปรงผ้าใต้ปาก (เห็นช่องด้านในจากข้างล่าง) · หัวเผาจุดไฟเป็นระยะ ซองเรืองส้ม (กลางคืนเห็นชัด) · สลิง · ตะกร้าหวาย + ผู้โดยสาร
// นก: นกนางนวล (ตัวใกล้) = ลำตัว หัว จะงอยปาก หาง + ปีกสองท่อน (ต้นปีก/ปลายปีก) งอที่ข้อพับตอนยกปีก ปลายปีกดำ
//   คำนวณเป็นสามมิติ มองจากข้างล่างเฉียงๆ · กระพือเป็นชุดสลับร่อน · ฝูงไกลเป็นเงาเข้มบินรูปตัววี กระพือไม่พร้อมกัน

const TAU = Math.PI * 2, HALF = Math.PI / 2;
const hex = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const cl = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const al = (v) => (v < 0 ? 0 : v > 1 ? 1 : v).toFixed(3);

// ลายบอลลูน 5 แบบ · gores = สีแผงผ้าวนตามลำดับ · bands = แถบรอบตัวจาก v1 ถึง v2 (0 = ยอด, 1 = ปาก) · zig = ขอบซิกแซก
export const BALLOON_DESIGNS = [
  { G: 14, gores: ['#e11d48', '#f97316', '#facc15', '#22c55e', '#0ea5e9', '#6366f1', '#a855f7'], bands: [], skirt: '#7c2d12' },
  { G: 16, gores: ['#f97316', '#fdba74'], bands: [{ v1: 0, v2: 0.17, c: '#facc15' }, { v1: 0.5, v2: 0.6, c: '#7c3aed', zig: 0.045 }, { v1: 0.83, v2: 1, c: '#be123c' }], skirt: '#7f1d1d' },
  { G: 16, gores: ['#0284c7', '#f8fafc'], bands: [{ v1: 0, v2: 0.15, c: '#1e3a8a' }, { v1: 0.46, v2: 0.56, c: '#f59e0b', zig: 0.05 }], skirt: '#1e3a8a' },
  { G: 16, gores: ['#0f766e', '#f8fafc'], bands: [{ v1: 0, v2: 0.16, c: '#fbbf24' }, { v1: 0.43, v2: 0.53, c: '#fbbf24', zig: 0.045 }, { v1: 0.84, v2: 1, c: '#115e59' }], skirt: '#134e4a' },
  { G: 18, gores: ['#dc2626', '#f8fafc', '#2563eb'], bands: [{ v1: 0, v2: 0.13, c: '#f8fafc' }, { v1: 0.86, v2: 1, c: '#1e3a8a' }], skirt: '#1e293b' },
].map((d) => ({ ...d, gores: d.gores.map(hex), bands: d.bands.map((b) => ({ ...b, c: hex(b.c) })), skirt: hex(d.skirt) }));

// รัศมีซอง (เท่าของ R) ที่ระดับ v: โดมครึ่งวงกลมถึง v = 0.42 แล้วเรียวลงเหลือ 0.2 ที่ปาก
export function envR(v) {
  if (v < 0.42) { const t = v / 0.42; return Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t))); }
  const t = (v - 0.42) / 0.58; return 1 - 0.8 * Math.pow(t, 1.45);
}
// จุดตัวอย่างตามแนวตั้ง: ช่วงโดมเดินตามมุม (ถี่ใกล้ยอด) ให้โค้งกลมเนียน ไม่เป็นเหลี่ยม
const VS = []; for (let i = 0; i <= 10; i++) VS.push(0.42 * (1 - Math.cos(i / 10 * HALF))); for (let i = 1; i <= 9; i++) VS.push(0.42 + 0.58 * i / 9);
const vRange = (v0, v1) => { const a = [v0]; for (const v of VS) if (v > v0 + 1e-4 && v < v1 - 1e-4) a.push(v); a.push(v1); return a; };

// สถานะบอลลูนหนึ่งลูก (สร้างตอน resize)
export function makeBalloonState(i, rnd) {
  return { design: BALLOON_DESIGNS[i % BALLOON_DESIGNS.length], rot0: rnd() * TAU, rotSp: (0.035 + rnd() * 0.05) * (rnd() < 0.5 ? -1 : 1), sway: rnd() * 6, nextBurn: 0.5 + rnd() * 5, burnStart: -9, burnEnd: -9, lastT: 0, wave: i % 2 === 0 };
}

// วาดบอลลูน: (cx, top) = ยอดซอง · R = รัศมีตรงที่ป่องสุด (สูงรวมตะกร้าราว 3.1R)
// env = { n: กลางคืน 0..1, haze: สีหมอก [r,g,b], hz: ความจางตามระยะ 0..1, lightAz: ทิศแสง (+ = มาจากขวา) }
export function drawBalloon(x, st, cx, top, R, t, env) {
  const D = st.design, Hb = R * 2.25, E = -0.13, G = D.G, step = TAU / G, n = env.n, hz = env.hz, haze = env.haze, a1 = 1 - hz, lightAz = env.lightAz, ls = Math.sin(lightAz);
  const phi0 = st.rot0 + t * st.rotSp;
  // ไฟหัวเผา: จุดเป็นช่วงๆ (0.7–1.9 วิ) ทุก 3–10 วิ (กลางคืนถี่ขึ้นเท่าตัว ซองเรืองสวย) · เวลาเริ่มนับใหม่ก็ตั้งรอบใหม่
  if (t < st.lastT) { st.nextBurn = t + 0.5 + Math.random() * 4; st.burnStart = st.burnEnd = -9; } st.lastT = t;
  if (t > st.nextBurn) { st.burnStart = t; st.burnEnd = t + 0.7 + Math.random() * 1.2; st.nextBurn = st.burnEnd + (3 + Math.random() * 7) * (1 - 0.5 * n); }
  let burn = 0; if (t > st.burnStart && t < st.burnEnd) { const k = Math.min(1, (t - st.burnStart) / 0.15, (st.burnEnd - t) / 0.3); burn = k * (0.82 + 0.18 * Math.sin(t * 47) * Math.sin(t * 31)); }
  // สี: คูณแสง k → กลางคืนมืดอมน้ำเงิน → หมอกตามระยะ
  const tone = (c, k, a) => {
    let r = c[0] * k, g = c[1] * k, b = c[2] * k;
    if (n > 0) { const m = 0.4 * n, dk = 1 - 0.62 * n; r = (r * (1 - m) + 22 * m) * dk; g = (g * (1 - m) + 30 * m) * dk; b = (b * (1 - m) + 70 * m) * dk; }
    if (hz > 0) { r += (haze[0] - r) * hz; g += (haze[1] - g) * hz; b += (haze[2] - b) * hz; }
    return `rgba(${cl(r)},${cl(g)},${cl(b)},${a === undefined ? 1 : a})`;
  };
  // จุดบนผิวซอง (v, มุม ph) → จอ · E < 0 = มองจากข้างล่าง ด้านที่หันเข้าหาเราจึงดูสูงขึ้นเล็กน้อย
  const P = (v, ph) => { const r = envR(v) * R; return [cx + r * Math.sin(ph), top + v * Hb + E * r * Math.cos(ph)]; };
  const lam = (ph) => 0.5 + 0.62 * (0.5 + 0.5 * Math.cos(ph - lightAz));
  const sway = 0.012 * Math.sin(t * 0.5 + st.sway);
  x.save(); x.translate(cx, top + Hb * 0.5); x.rotate(sway); x.translate(-cx, -(top + Hb * 0.5));

  // แผงผ้าที่หันเข้าหาเรา (ครึ่งหลังไม่ต้องวาด)
  const vis = [];
  for (let k = 0; k < G; k++) { const a = ((phi0 + k * step + Math.PI) % TAU + TAU) % TAU - Math.PI, b = a + step; if (a >= HALF || b <= -HALF) continue; vis.push({ k, a: Math.max(a, -HALF), b: Math.min(b, HALF), ra: a }); }
  const line = (p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]));
  // ผืนผ้าระหว่างมุม A..B และระดับ vt(มุม)..vb(มุม)
  const patch = (A, B, vt, vb) => {
    const M = 6; x.beginPath();
    for (let i = 0; i <= M; i++) { const ph = A + (B - A) * i / M; line(P(vt(ph), ph), i); }
    let vs = vRange(vt(B), vb(B)); for (let i = 1; i < vs.length; i++) line(P(vs[i], B), 1);
    for (let i = M - 1; i >= 0; i--) { const ph = A + (B - A) * i / M; line(P(vb(ph), ph), 1); }
    vs = vRange(vt(A), vb(A)); for (let i = vs.length - 2; i >= 1; i--) line(P(vs[i], A), 1);
    x.closePath();
  };
  const silhouette = () => { x.beginPath(); VS.forEach((v, i) => line(P(v, HALF), i)); for (let i = 1; i < 12; i++) line(P(1, HALF - i / 12 * Math.PI), 1); for (let i = VS.length - 1; i >= 0; i--) line(P(VS[i], -HALF), 1); x.closePath(); };
  const meridian = (ph, v0, v1) => { x.beginPath(); vRange(v0, v1).forEach((v, i) => line(P(v, ph), i)); };

  // ---- กระโปรงผ้าใต้ปาก (ผ้าบานออกเล็กน้อย มีรอยพับ) + ช่องมองเข้าไปในซอง ----
  const yM = top + Hb, rm = 0.19 * R, rs = 0.22 * R, yS = yM + 0.2 * R, eO = 0.3;
  let g = x.createLinearGradient(cx - rs, 0, cx + rs, 0); g.addColorStop(0, tone(D.skirt, 0.7 - 0.3 * ls)); g.addColorStop(0.5, tone(D.skirt, 1)); g.addColorStop(1, tone(D.skirt, 0.7 + 0.3 * ls));
  x.fillStyle = g; x.beginPath(); x.moveTo(cx - rm, yM - 0.06 * R); x.lineTo(cx - rs, yS); x.ellipse(cx, yS, rs, rs * eO, 0, Math.PI, 0, true); x.lineTo(cx + rm, yM - 0.06 * R); x.closePath(); x.fill();
  if (R > 20) { x.strokeStyle = `rgba(0,0,0,${al(0.2 * a1)})`; x.lineWidth = Math.max(0.6, R * 0.008); x.beginPath(); for (const k of [-0.72, -0.4, -0.1, 0.22, 0.52, 0.8]) { x.moveTo(cx + rm * k, yM); x.lineTo(cx + rs * k, yS - rs * eO * Math.sqrt(1 - k * k)); } x.stroke(); }
  const inC = D.gores[0]; g = x.createRadialGradient(cx, yS - rs * eO * 0.3, 0, cx, yS, rs);
  g.addColorStop(0, `rgba(${cl(inC[0] * 0.22 * a1 + 60 + 190 * burn)},${cl(inC[1] * 0.18 * a1 + 36 + 120 * burn)},${cl(inC[2] * 0.18 * a1 + 26 + 30 * burn)},1)`); g.addColorStop(1, `rgba(${cl(14 + 40 * burn)},${cl(10 + 20 * burn)},8,1)`);
  x.fillStyle = g; x.beginPath(); x.ellipse(cx, yS, rs * 0.95, rs * eO * 0.9, 0, 0, TAU); x.fill();
  x.strokeStyle = tone(D.skirt, 1.25); x.lineWidth = Math.max(0.6, R * 0.01); x.beginPath(); x.ellipse(cx, yS, rs * 0.97, rs * eO * 0.93, 0, Math.PI, TAU); x.stroke();

  // ---- ซองบอลลูน: รองพื้น (กันรอยแตกระหว่างแผง) → แผงผ้า → แถบลาย ----
  x.fillStyle = tone(D.gores[0], 0.6); silhouette(); x.fill();
  for (const s of vis) { x.fillStyle = tone(D.gores[s.k % D.gores.length], lam((s.a + s.b) / 2)); patch(s.a, s.b, () => 0, () => 1); x.fill(); }
  for (const bd of D.bands) for (const s of vis) {
    const z = bd.zig || 0, tri = (ph) => 1 - Math.abs(2 * (ph - s.ra) / step - 1);
    const vt = bd.v1 <= 0 ? () => 0 : (ph) => bd.v1 + z * tri(ph), vb = bd.v2 >= 1 ? () => 1 : (ph) => bd.v2 + z * tri(ph);
    x.fillStyle = tone(bd.c, lam((s.a + s.b) / 2)); patch(s.a, s.b, vt, vb); x.fill();
  }

  // ---- แสงเงา ตะเข็บ รอยย่น (ตัดตามขอบซอง) ----
  x.save(); silhouette(); x.clip();
  const X0 = cx - R * 1.3, WW = R * 2.6;
  // เงาทรงกลม: สว่างฝั่งแสง มืดลงรอบขอบ
  const lx = cx + R * 0.55 * ls;
  g = x.createRadialGradient(lx, top + Hb * 0.28, R * 0.06, cx, top + Hb * 0.44, R * 1.75);
  g.addColorStop(0, `rgba(255,255,255,${al(0.26 * a1 * (1 - 0.7 * n))})`); g.addColorStop(0.42, 'rgba(255,255,255,0)'); g.addColorStop(0.78, `rgba(0,0,0,${al(0.12 * a1)})`); g.addColorStop(1, `rgba(0,0,0,${al(0.42 * a1)})`);
  x.fillStyle = g; x.fillRect(X0, top - 2, WW, Hb + 4);
  // ใต้ซองมืดลง (ผ้าหันลงดิน รับแสงน้อย)
  g = x.createLinearGradient(0, top + Hb * 0.42, 0, yM); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${al(0.42 * a1)})`); x.fillStyle = g; x.fillRect(X0, top + Hb * 0.42, WW, Hb * 0.6);
  // ประกายวาวตามแผงผ้า: ผ้าแต่ละแผงป่องออกจึงสะท้อนแสงเป็นแนวตั้งกลางแผง (แผงที่หันหาแสงวาวสุด)
  if (n < 0.9) {
    g = x.createLinearGradient(0, top + Hb * 0.04, 0, top + Hb * 0.8); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.3, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g;
    for (const s of vis) { const m = (s.a + s.b) / 2, sp = Math.pow(Math.max(0, Math.cos(m - lightAz * 0.5)), 5) * a1 * (1 - n); if (sp < 0.04 || s.b - s.a < step * 0.6) continue;
      x.globalAlpha = sp * 0.16; patch(Math.max(-HALF, m - step * 0.3), Math.min(HALF, m + step * 0.3), () => 0.05, () => 0.8); x.fill();
      x.globalAlpha = sp * 0.24; patch(Math.max(-HALF, m - step * 0.1), Math.min(HALF, m + step * 0.1), () => 0.08, () => 0.7); x.fill(); }
    x.globalAlpha = 1;
  }
  // แสงฟ้าสะท้อนขอบด้านเงา
  const sd = ls >= 0 ? -1 : 1; g = x.createLinearGradient(cx + sd * R * 1.02, 0, cx + sd * R * 0.62, 0); g.addColorStop(0, `rgba(190,220,255,${al(0.26 * a1 * (1 - n))})`); g.addColorStop(1, 'rgba(190,220,255,0)'); x.fillStyle = g; x.fillRect(X0, top, WW, Hb);
  // ไฮไลต์วาวของผ้าไนลอน
  if (n < 0.9) { const hx = cx + R * 0.42 * ls, hy = top + Hb * 0.2; g = x.createRadialGradient(hx, hy, 0, hx, hy, R * 0.36); g.addColorStop(0, `rgba(255,255,255,${al(0.4 * a1 * (1 - n))})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(hx, hy, R * 0.26, R * 0.36, -0.35 * ls, 0, TAU); x.fill(); }
  // ไฟหัวเผาส่องผ้าจากข้างใน (กลางคืนเรืองทั้งลูก)
  if (burn > 0) { x.globalCompositeOperation = 'lighter'; g = x.createRadialGradient(cx, yM, 0, cx, top + Hb * 0.62, Hb * 0.85); g.addColorStop(0, `rgba(255,170,70,${al(burn * (0.2 + 0.5 * n))})`); g.addColorStop(1, 'rgba(255,140,50,0)'); x.fillStyle = g; x.fillRect(X0, top, WW, Hb + 2); x.globalCompositeOperation = 'source-over'; }
  // ตะเข็บแนวตั้ง (load tape): เงานุ่มกว้างให้ผ้าดูป่องระหว่างตะเข็บ + เส้นตะเข็บคม
  const seams = vis.filter((s) => s.ra > -HALF);
  x.strokeStyle = `rgba(20,12,6,${al(0.07 * a1)})`; x.lineWidth = Math.max(1.5, R * 0.07); for (const s of seams) { meridian(s.ra, 0, 1); x.stroke(); }
  x.strokeStyle = `rgba(35,22,12,${al(0.24 * a1)})`; x.lineWidth = Math.max(0.6, R * 0.011); for (const s of seams) { meridian(s.ra, 0, 1); x.stroke(); }
  // ตะเข็บแนวนอน
  x.strokeStyle = `rgba(35,22,12,${al(0.1 * a1)})`; for (const v of [0.05, 0.22, 0.42, 0.62, 0.8, 0.93]) { x.beginPath(); for (let i = 0; i <= 18; i++) line(P(v, -HALF + i / 18 * Math.PI), i); x.stroke(); }
  // รอยย่นผ้าเหนือปาก
  if (R > 18) { x.strokeStyle = `rgba(0,0,0,${al(0.13 * a1)})`; x.beginPath(); for (const s of vis) { const m = (s.a + s.b) / 2, p1 = P(0.86, m), p2 = P(0.985, m + 0.05); x.moveTo(p1[0], p1[1]); x.lineTo(p2[0], p2[1]); } x.stroke(); }
  x.restore();

  // ---- สลิง หัวเผา เปลวไฟ ผู้โดยสาร ตะกร้า ----
  const yBur = yS + 0.3 * R, bw = 0.3 * R, bh = 0.19 * R, yB = yBur + 0.06 * R;
  x.strokeStyle = tone([52, 40, 32], 1, 0.85); x.lineWidth = Math.max(0.6, R * 0.009); x.beginPath();
  [[-rs, yS, -bw * 0.5], [rs, yS, bw * 0.5], [-rs * 0.5, yS - rs * eO * 0.85, -bw * 0.18], [rs * 0.5, yS - rs * eO * 0.85, bw * 0.18]].forEach(([x1, y1, x2]) => { x.moveTo(cx + x1, y1); x.lineTo(cx + x2, yB); }); x.stroke();
  x.fillStyle = tone([51, 65, 85], 1); x.fillRect(cx - 0.08 * R, yBur, 0.16 * R, 0.03 * R); // โครงหัวเผา
  x.fillStyle = tone([148, 163, 184], 1 + 0.5 * burn); x.fillRect(cx - 0.035 * R, yBur - 0.05 * R, 0.07 * R, 0.05 * R); // ขดท่อหัวเผา
  if (burn > 0.02) { // เปลวไฟพุ่งขึ้นเข้าปากซอง: โคนฟ้า แกนขาวเหลือง ปลายส้ม
    const fb = yBur - 0.05 * R, fh = Math.min((0.26 + 0.1 * Math.sin(t * 29)) * R * burn, fb - (yS - 0.05 * R)), fw = 0.055 * R;
    if (fh > 1) {
      const fg = x.createLinearGradient(0, fb - fh, 0, fb); fg.addColorStop(0, 'rgba(255,120,30,0)'); fg.addColorStop(0.35, 'rgba(255,170,40,.92)'); fg.addColorStop(0.75, 'rgba(255,246,205,1)'); fg.addColorStop(1, 'rgba(120,180,255,.95)');
      x.fillStyle = fg; x.beginPath(); x.moveTo(cx, fb - fh); x.bezierCurveTo(cx + fw * 1.1, fb - fh * 0.5, cx + fw, fb - fh * 0.05, cx, fb); x.bezierCurveTo(cx - fw, fb - fh * 0.05, cx - fw * 1.1, fb - fh * 0.5, cx, fb - fh); x.fill();
    }
    x.globalCompositeOperation = 'lighter'; const gy = fb - Math.max(fh, 0) * 0.4, gg = x.createRadialGradient(cx, gy, 0, cx, gy, R * 0.5); gg.addColorStop(0, `rgba(255,190,90,${al(0.55 * burn)})`); gg.addColorStop(1, 'rgba(255,150,60,0)'); x.fillStyle = gg; x.fillRect(cx - R * 0.5, gy - R * 0.5, R, R); x.globalCompositeOperation = 'source-over';
  }
  // ผู้โดยสาร 2 คน (ตะกร้าวาดทับครึ่งตัวล่าง) · บางลูกมีคนโบกมือ
  if (R > 30) {
    const hr = 0.028 * R, hy = yB - hr * 1.05;
    [[-0.075, [241, 194, 125], [48, 32, 22], null], [0.07, [198, 134, 66], [24, 16, 12], [15, 118, 110]]].forEach(([dx, skin, hair, cap], i) => {
      const hx = cx + dx * R;
      x.fillStyle = tone(i ? [234, 88, 12] : [30, 64, 175], 0.95); x.beginPath(); x.ellipse(hx, hy + hr * 1.55, hr * 1.35, hr * 0.95, 0, Math.PI, 0); x.fill(); // ไหล่/เสื้อ
      x.fillStyle = tone(skin, 1); x.beginPath(); x.arc(hx, hy, hr, 0, TAU); x.fill();
      x.fillStyle = tone(cap || hair, 1); x.beginPath(); x.arc(hx, hy - hr * 0.12, hr * 1.04, Math.PI * 1.02, Math.PI * 1.98); x.fill();
      if (st.wave && i === 1) { const wa = -1.15 + 0.45 * Math.sin(t * 5.5); x.strokeStyle = tone(skin, 0.95); x.lineWidth = Math.max(1, hr * 0.55); x.lineCap = 'round'; x.beginPath(); x.moveTo(hx + hr * 1.05, hy + hr * 1.2); x.lineTo(hx + hr * 1.05 + Math.cos(wa) * hr * 2.3, hy + hr * 1.2 + Math.sin(wa) * hr * 2.3); x.stroke(); }
    });
  }
  // ตะกร้าหวาย: ไล่แสงตามทิศ + ลายสาน + ขอบหนังด้านบน
  g = x.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0); g.addColorStop(0, tone([160, 106, 52], 0.8 - 0.2 * ls)); g.addColorStop(0.5, tone([184, 128, 70], 1)); g.addColorStop(1, tone([160, 106, 52], 0.8 + 0.2 * ls));
  const br = 0.035 * R, bb = yB + bh; x.fillStyle = g; x.beginPath(); x.moveTo(cx - bw / 2, yB); x.lineTo(cx + bw / 2, yB); x.lineTo(cx + bw / 2 - br * 0.4, bb - br); x.quadraticCurveTo(cx + bw / 2 - br * 0.4, bb, cx + bw / 2 - br * 1.4, bb); x.lineTo(cx - bw / 2 + br * 1.4, bb); x.quadraticCurveTo(cx - bw / 2 + br * 0.4, bb, cx - bw / 2 + br * 0.4, bb - br); x.closePath(); x.fill();
  if (bw > 14) { x.save(); x.clip(); const rows = 4, cols = 7, cw = bw / cols, rh = bh / rows; for (let r = 0; r < rows; r++) for (let c2 = 0; c2 <= cols; c2++) { x.fillStyle = (r + c2) % 2 ? `rgba(60,34,12,${al(0.24 * a1)})` : `rgba(255,232,185,${al(0.14 * a1 * (1 - n))})`; x.beginPath(); x.ellipse(cx - bw / 2 + c2 * cw - (r % 2) * cw * 0.5, yB + rh * (r + 0.55), cw * 0.42, rh * 0.36, 0, 0, TAU); x.fill(); } g = x.createLinearGradient(0, yB, 0, bb); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${al(0.25 * a1)})`); x.fillStyle = g; x.fillRect(cx - bw / 2, yB, bw, bh); x.restore(); }
  x.fillStyle = tone([72, 42, 20], 1); x.fillRect(cx - bw / 2 - 0.008 * R, yB - 0.01 * R, bw + 0.016 * R, 0.04 * R);
  x.fillStyle = `rgba(255,222,172,${al(0.3 * a1 * (1 - n))})`; x.fillRect(cx - bw / 2, yB - 0.01 * R, bw, Math.max(0.6, 0.012 * R));
  x.restore();
}

// ---------------- นก ----------------
// ปีก: จุด (s, c) · s = ตามแนวปีก 0 โคน → 1 ปลาย · c = ตามแนวลำตัว (+ = ไปทางหัว) · ขอบหลังหยักเป็นขนปลายปีก
const WING_LE = [[0, 0.1], [0.18, 0.15], [0.42, 0.17], [0.62, 0.1], [0.82, 0.02], [1, -0.07]];
const WING_TE = [[1, -0.07], [0.95, -0.15], [0.9, -0.12], [0.85, -0.2], [0.8, -0.17], [0.74, -0.25], [0.68, -0.22], [0.6, -0.3], [0.45, -0.36], [0.25, -0.38], [0, -0.34]];
const WING = WING_LE.concat(WING_TE.slice(1));
const TIP = WING_LE.filter(([s]) => s >= 0.78).concat(WING_TE.filter(([s]) => s >= 0.78).slice(1));
// ลำตัวด้านข้าง (หัวไปทาง +) รวมหางพัด · หน่วย = ความยาวลำตัว
const BODY = [[0.74, 0.0], [0.68, 0.045], [0.58, 0.09], [0.46, 0.1], [0.28, 0.1], [0.05, 0.09], [-0.3, 0.06], [-0.55, 0.035], [-0.8, 0.055], [-0.83, -0.02], [-0.57, -0.035], [-0.3, -0.07], [0.05, -0.1], [0.3, -0.09], [0.5, -0.06], [0.62, -0.03]];
// ท้อง/หลังเมื่อมองจากข้างล่าง (px, pz) — ให้ลำตัวมีความหนา ไม่แบนเป็นกระดาษ
const BELLY = [[0.7, 0], [0.55, 0.05], [0.35, 0.095], [0.1, 0.11], [-0.2, 0.09], [-0.5, 0.05], [-0.7, 0.07], [-0.82, 0.1], [-0.84, 0], [-0.82, -0.1], [-0.7, -0.07], [-0.5, -0.05], [-0.2, -0.09], [0.1, -0.11], [0.35, -0.095], [0.55, -0.05]];

// yaw = มุมหันตัว (0 = บินขวางจอพอดี, บวก = เฉียงเข้าหาเรา) ช่วยให้เห็นปีกกางเต็ม
// elev = มุมเงยที่เรามองนก (เรเดียน) ยิ่งมากยิ่งเห็นใต้ปีกเต็ม
export function makeBird(style, rnd, yaw, elev) {
  const gull = style === 'gull';
  return { style, yaw: yaw === undefined ? 0.8 : yaw, elev: elev === undefined ? 0.6 : elev, freq: gull ? 2.3 + rnd() * 0.8 : 3.4 + rnd() * 1.4, flapDur: gull ? 1.2 + rnd() * 1.2 : 2 + rnd() * 2, glideDur: gull ? 1.8 + rnd() * 2.4 : 0.4 + rnd() * 0.8, off: rnd() * 10, span: gull ? 1.35 : 1.2, chord: gull ? 0.6 : 0.7 };
}

// ท่าปีก ณ เวลา t: ร่อน = ปีกทรงตัว M (ข้อพับยก ปลายปีกลู่ลง) · กระพือ = ยกปีกแล้วงอข้อพับตอนยกขึ้น เหยียดสุดตอนตีลง
export function birdPose(b, t) {
  const cyc = b.flapDur + b.glideDur, ft = ((t + b.off) % cyc + cyc) % cyc, gs = Math.sin(t * 1.3 + b.off);
  let a = 0.2 + 0.04 * gs, bend = -0.34 - 0.04 * gs, bob = 0;
  if (ft < b.flapDur) { const w = TAU * b.freq * ft, f = Math.min(1, ft / 0.3, (b.flapDur - ft) / 0.3); a += (0.1 + 0.72 * Math.sin(w) - a) * f; bend += (-(0.6 * (0.5 + 0.5 * Math.cos(w)) + 0.04) - bend) * f; bob = 0.05 * Math.sin(w) * f; }
  return { a, bend, bob };
}

// ตำแหน่งในฝูงบนจอ (หน่วย = ความยาวลำตัว): fwd = ไปข้างหน้า, side = ไปทางปีกฝั่งใกล้เรา
export function flockOffset(yaw, elev, dir, fwd, side) { const c = Math.cos(yaw), s = Math.sin(yaw); return [dir * (fwd * c - side * s), -(fwd * s + side * c) * Math.sin(elev)]; }

// วาดนก: (X, Y) = ลำตัว · s = ความยาวลำตัว (พิกเซล) · dir = +1 บินไปขวา / -1 ไปซ้าย · tilt = เชิดหัว (เรเดียน)
export function drawBird(x, b, X, Y, s, dir, pose, alpha, tilt) {
  const gull = b.style === 'gull', L = b.span, CH = b.chord, SW = 0.42, cY = Math.cos(b.yaw), sY = Math.sin(b.yaw), cE = Math.cos(b.elev), sE = Math.sin(b.elev), ct = Math.cos(tilt || 0), st = Math.sin(tilt || 0);
  const a2 = pose.a + pose.bend, sa = Math.sin(pose.a), ca = Math.cos(pose.a), sa2 = Math.sin(a2), ca2 = Math.cos(a2), y0 = Y + pose.bob * s;
  // จุดสามมิติของนก (px ไปทางหัว, py ขึ้น, pz ไปทางปีกฝั่งใกล้) → จอ: เชิดหัว → หันตัว → มองจากข้างล่าง
  const P3 = (px, py, pz) => { const qx = px * ct - py * st, qy = px * st + py * ct, wx = qx * cY - pz * sY, wz = qx * sY + pz * cY; return [X + dir * wx * s, y0 - (qy * cE + wz * sE) * s]; };
  const wingPt = (side, sp, c) => { const s1 = Math.min(sp, SW), s2 = Math.max(0, sp - SW); return P3(0.08 + c * CH + (0.02 * s1 - 0.2 * s2) * L, 0.04 + (sa * s1 + sa2 * s2) * L, side * (ca * s1 + ca2 * s2) * L); };
  const path = (pts) => { x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.closePath(); };
  const wing = (side, shape) => path(shape.map(([sp, c]) => wingPt(side, sp, c)));
  const body = () => { path(BELLY.map(([px, pz]) => P3(px, -0.02, pz))); x.fill(); path(BODY.map(([px, py]) => P3(px, py, 0))); x.fill(); };
  x.globalAlpha = alpha;
  if (!gull) { x.fillStyle = '#2b3444'; wing(-1, WING); x.fill(); body(); wing(1, WING); x.fill(); x.globalAlpha = 1; return; }
  // ปีกฝั่งไกล (อยู่ในเงา)
  x.fillStyle = '#b4bfcc'; wing(-1, WING); x.fill(); x.fillStyle = '#1f2937'; wing(-1, TIP); x.fill();
  // ลำตัว: ขาวด้านบน เทาอ่อนใต้ท้อง
  const tp = P3(0.1, 0.1, 0), bt = P3(0.1, -0.1, 0); let g = x.createLinearGradient(tp[0], tp[1], bt[0], bt[1]); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c6d0dc');
  x.fillStyle = g; body();
  // จะงอยปากเหลืองส้ม + ตา
  x.fillStyle = '#f59e0b'; path([P3(0.66, 0.028, 0), P3(0.87, -0.004, 0), P3(0.66, -0.022, 0)]); x.fill();
  const e = P3(0.58, 0.045, 0.03); x.fillStyle = '#111827'; x.beginPath(); x.arc(e[0], e[1], Math.max(0.7, s * 0.018), 0, TAU); x.fill();
  // ปีกฝั่งใกล้: ใต้ปีกขาว ไล่เทาไปขอบหลัง + ปลายปีกดำ + เส้นขอบบางๆ
  const le = wingPt(1, 0.4, 0.16), te = wingPt(1, 0.4, -0.36); g = x.createLinearGradient(le[0], le[1], te[0], te[1]); g.addColorStop(0, '#fbfdff'); g.addColorStop(1, '#c3cdd9');
  x.fillStyle = g; wing(1, WING); x.fill(); x.fillStyle = '#1f2937'; wing(1, TIP); x.fill();
  x.strokeStyle = 'rgba(71,85,105,.35)'; x.lineWidth = Math.max(0.5, s * 0.012); wing(1, WING); x.stroke();
  x.globalAlpha = 1;
}
