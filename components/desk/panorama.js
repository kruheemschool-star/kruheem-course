// วิวพาโนรามานอกหน้าต่าง (โหมดพักสายตา) — canvas 2 มิติเต็มจอ วางทับฉาก 3 มิติ
// ชั้นภาพจากหลังไปหน้า: ท้องฟ้า · พระอาทิตย์/พระจันทร์/ดาว/ทางช้างเผือก · เมฆ · ภูเขาไกล 2 ชั้น + หมอก
// · ทะเลสาบ (สะท้อนภูเขา/แสง) · บอลลูน · เนินกลาง+ป่าสน · นก · เนินใกล้+ป่า · ทุ่งหญ้า+ทางเดิน+ดอกไม้
// · ต้นไม้ใหญ่ · หญ้าพลิ้ว · หิ่งห้อย · ขอบภาพมืดจางๆ
// ทุกชั้นเลื่อนคนละความเร็ว (parallax) กล้องแพนช้าๆ เอง + ขยับตามเมาส์/ลากนิ้ว · กลางวัน→กลางคืนไล่ระดับด้วย n (0..1)

const lerp = (a, b, t) => a + (b - a) * t;
const mixc = (a, b, t) => [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))];
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a === undefined ? 1 : a})`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => t * t * (3 - 2 * t);
const rnd = (seed) => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
import { drawLeaf, LEAF_PALETTES } from './leafArt';

const rr = (x, X, Y, W, H, R) => { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); };

// สันเขา: จุดควบคุมสุ่ม → เส้นเรียบ + รอยหยักเล็กๆ (u 0..1 → 0..1, 1 = ยอดสูงสุด)
function ridge(seed, count, rough) {
  const r = rnd(seed), pts = [];
  for (let i = 0; i <= count + 1; i++) pts.push(0.25 + r() * 0.75);
  return (u) => {
    const f = clamp(u, 0, 1) * count, i = Math.floor(f), t = f - i;
    const y = lerp(pts[i], pts[i + 1], smooth(t));
    return y + (Math.sin(u * 97 + seed) * 0.5 + Math.sin(u * 211 + seed * 2) * 0.3 + Math.sin(u * 431) * 0.2) * rough;
  };
}

// สไปรต์เมฆปุย: หลายก้อนไล่แสง (สว่างบนซ้าย เงาใต้ก้อน) ขอบฟุ้ง
function makeCloud(size, seed, night) {
  const r = rnd(seed), w = Math.ceil(size * 3), h = Math.ceil(size * 1.7), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const puffs = []; const n = 7 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) puffs.push([w * 0.5 + (r() - 0.5) * size * 1.8, h * 0.6 - r() * size * 0.5, size * (0.28 + r() * 0.34)]);
  puffs.push([w * 0.5, h * 0.68, size * 0.62], [w * 0.32, h * 0.7, size * 0.46], [w * 0.68, h * 0.7, size * 0.46]);
  const base = night ? [96, 110, 150] : [255, 255, 255], shade = night ? [44, 56, 92] : [168, 190, 220], hi = night ? [150, 166, 210] : [255, 255, 255];
  puffs.forEach(([px, py, pr]) => { const g = x.createRadialGradient(px, py + pr * 0.3, pr * 0.1, px, py + pr * 0.3, pr * 1.05); g.addColorStop(0, rgba(shade, 0.85)); g.addColorStop(1, rgba(shade, 0)); x.fillStyle = g; x.beginPath(); x.arc(px, py + pr * 0.3, pr * 1.05, 0, 7); x.fill(); });
  puffs.forEach(([px, py, pr]) => { const g = x.createRadialGradient(px - pr * 0.32, py - pr * 0.38, pr * 0.08, px, py, pr); g.addColorStop(0, rgba(hi, 1)); g.addColorStop(0.55, rgba(base, 0.96)); g.addColorStop(1, rgba(base, 0)); x.fillStyle = g; x.beginPath(); x.arc(px, py, pr, 0, 7); x.fill(); });
  return c;
}

// สไปรต์บอลลูน: ซองรูปหยดน้ำ แถบสีโค้งตามทรง แสงเงาทรงกลม เชือก ตะกร้า (กลางคืนหรี่ + ไฟเผา)
function makeBalloon(R, cols, night) {
  const w = Math.ceil(R * 2.8), h = Math.ceil(R * 3.7), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const cx = w / 2, cy = R * 1.15;
  const env = () => { x.beginPath(); x.moveTo(cx, cy - R); x.bezierCurveTo(cx + R * 1.38, cy - R, cx + R * 1.12, cy + R * 0.95, cx + R * 0.2, cy + R * 1.72); x.lineTo(cx - R * 0.2, cy + R * 1.72); x.bezierCurveTo(cx - R * 1.12, cy + R * 0.95, cx - R * 1.38, cy - R, cx, cy - R); x.closePath(); };
  x.save(); env(); x.clip();
  const gores = 10; for (let i = 0; i < gores; i++) { const x0 = cx - R * 1.32 * Math.cos(i / gores * Math.PI), x1 = cx - R * 1.32 * Math.cos((i + 1) / gores * Math.PI); x.fillStyle = cols[i % cols.length]; x.fillRect(Math.min(x0, x1) - 0.5, 0, Math.abs(x1 - x0) + 1, h); }
  const sh = x.createLinearGradient(cx - R * 1.32, 0, cx + R * 1.32, 0); sh.addColorStop(0, 'rgba(0,0,0,.42)'); sh.addColorStop(0.3, 'rgba(255,255,255,.22)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = sh; x.fillRect(0, 0, w, h);
  const vg = x.createLinearGradient(0, cy - R, 0, cy + R * 1.72); vg.addColorStop(0, 'rgba(255,255,255,.14)'); vg.addColorStop(0.65, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.4)'); x.fillStyle = vg; x.fillRect(0, 0, w, h);
  if (night) { x.fillStyle = 'rgba(8,14,40,.6)'; x.fillRect(0, 0, w, h); }
  x.restore();
  x.strokeStyle = night ? '#2f2a20' : '#6b5335'; x.lineWidth = Math.max(1, R * 0.035); [-0.18, -0.06, 0.06, 0.18].forEach(k => { x.beginPath(); x.moveTo(cx + k * R, cy + R * 1.7); x.lineTo(cx + k * R * 1.4, cy + R * 2.25); x.stroke(); });
  const bw = R * 0.52, bh = R * 0.34, by = cy + R * 2.25; const bg = x.createLinearGradient(0, by, 0, by + bh); bg.addColorStop(0, night ? '#4a3a28' : '#b8895a'); bg.addColorStop(1, night ? '#2a2016' : '#6f4e2c'); x.fillStyle = bg; rr(x, cx - bw / 2, by, bw, bh, R * 0.07); x.fill();
  x.strokeStyle = night ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.18)'; x.lineWidth = 1; for (let i = 1; i < 3; i++) { x.beginPath(); x.moveTo(cx - bw / 2, by + bh * i / 3); x.lineTo(cx + bw / 2, by + bh * i / 3); x.stroke(); }
  return c;
}

export class Panorama {
  constructor(canvas) {
    this.cv = canvas; this.x = canvas.getContext('2d'); this.ptr = { x: 0, y: 0 }; this.pan = 0; this.dragX = null; this.W = 0; this.H = 0; this.PW = 0; this.shoot = null; this.pv = 0;
    this._pm = (e) => { if (this.dragX !== null && (e.buttons || e.pointerType === 'touch')) this.pan = clamp(this.panStart + (this.dragX - e.clientX) * 1.1, -this.PW * 0.6, this.PW * 0.6); else this.ptr = { x: e.clientX / this.W * 2 - 1, y: e.clientY / this.H * 2 - 1 }; };
    this._pd = (e) => { this.dragX = e.clientX; this.panStart = this.pan; };
    this._pu = () => { this.dragX = null; };
    canvas.addEventListener('pointermove', this._pm); canvas.addEventListener('pointerdown', this._pd); canvas.addEventListener('pointerup', this._pu); canvas.addEventListener('pointercancel', this._pu); canvas.addEventListener('pointerleave', this._pu);
  }
  dispose() { const c = this.cv; c.removeEventListener('pointermove', this._pm); c.removeEventListener('pointerdown', this._pd); c.removeEventListener('pointerup', this._pu); c.removeEventListener('pointercancel', this._pu); c.removeEventListener('pointerleave', this._pu); }
  clear() { this.x.setTransform(1, 0, 0, 1, 0, 0); this.x.clearRect(0, 0, this.cv.width, this.cv.height); }

  resize(W, H, dpr) {
    this.W = W; this.H = H; this.dpr = dpr; this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr);
    this.PW = W * 1.6; // ความกว้างโลก (แพนซ้ายขวาได้)
    const S = Math.min(H, W * 1.15); this.S = S; this.A = clamp(W / H / 1.5, 0.5, 1); // S = ฐานขนาดของบนฟ้า · A = ตัวคูณความสูงภูเขาบนจอตั้ง
    const r = rnd(2026);
    this.far1 = ridge(11, 9, 0.02); this.far2 = ridge(23, 11, 0.02); this.mid = ridge(37, 8, 0.012); this.near = ridge(53, 7, 0.01); this.meadow = ridge(71, 6, 0.003);
    // ป่าสน: ตำแหน่ง/ขนาดตามสัน (สุ่มครั้งเดียว)
    const forest = (n, seed) => { const q = rnd(seed), a = []; for (let i = 0; i < n; i++) a.push([q(), 0.6 + q() * 0.9, q() < 0.5 ? 0 : 1, q()]); return a; };
    this.midTrees = forest(150, 5); this.nearTrees = forest(110, 9);
    // เมฆ 10 ก้อน 3 ระยะ
    this.clouds = []; for (let i = 0; i < 10; i++) { const d = 0.16 + (i % 3) * 0.13 + r() * 0.06, size = S * (0.055 + r() * 0.075) * (0.6 + d); this.clouds.push({ d, size, day: makeCloud(size, 100 + i, false), night: makeCloud(size, 100 + i, true), x0: r() * (W + (this.PW - W) * d), y: H * (0.05 + r() * 0.36), sp: W * (0.0035 + r() * 0.006) * (0.4 + d), ph: r() * 6 }); }
    // บอลลูน 5 ลูก
    const pal = [['#f43f5e', '#fbbf24', '#f8fafc'], ['#0ea5e9', '#f8fafc', '#fb923c'], ['#a855f7', '#f472b6', '#fde68a'], ['#10b981', '#fef3c7', '#0f766e'], ['#ef4444', '#f8fafc', '#1d4ed8']];
    this.balloons = []; for (let i = 0; i < 5; i++) { const d = 0.32 + i * 0.11 + r() * 0.05, R = S * (0.035 + r() * 0.045) * (0.5 + d); this.balloons.push({ d, R, day: makeBalloon(R, pal[i % pal.length], false), night: makeBalloon(R, pal[i % pal.length], true), x0: r() * (W + (this.PW - W) * d), y: H * (0.12 + r() * 0.3), sp: W * (0.0022 + r() * 0.0035) * (0.4 + d), ph: r() * 6, dir: r() < 0.5 ? -1 : 1 }); }
    // ดาว + ทางช้างเผือก
    this.stars = []; for (let i = 0; i < 190; i++) this.stars.push([r(), r() * 0.62, 0.5 + r() * 1.5, r() * 6.28, 0.5 + r() * 2.5]);
    this.milky = []; for (let i = 0; i < 380; i++) { const u = r(), v = (r() - 0.5) * (0.35 + 0.45 * Math.sin(u * Math.PI)); this.milky.push([u, v, 0.4 + r() * 1.1, r()]); }
    // ดอกไม้ + หญ้า + หิ่งห้อย
    const fc = [[244, 114, 182], [251, 191, 36], [248, 250, 252], [251, 113, 133], [192, 132, 252], [96, 165, 250]];
    this.flowers = []; for (let i = 0; i < 110; i++) this.flowers.push([r(), r(), fc[Math.floor(r() * fc.length)], 2 + r() * 2.6]);
    this.grass = []; for (let i = 0; i < 190; i++) this.grass.push([r(), 8 + r() * 22, r() * 6.28, r() < 0.5 ? 0 : 1]);
    this.flies = []; for (let i = 0; i < 26; i++) this.flies.push([r(), 0.62 + r() * 0.3, r() * 6.28, 0.4 + r() * 0.8]);
    // ต้นไม้ใหญ่ 2 ต้น: ทรงพุ่มจากวงกลมหลายวง
    const canopy = (seed) => { const q = rnd(seed), a = []; for (let i = 0; i < 18; i++) { const an = q() * 6.28, dd = q() * 0.75; a.push([Math.cos(an) * dd, Math.sin(an) * dd * 0.7 - 0.1, 0.3 + q() * 0.3]); } return a; };
    this.trees = [{ u: 0.1, s: S * 0.2, c: canopy(3), ph: 0 }, { u: 0.9, s: S * 0.16, c: canopy(4), ph: 2 }];
    // ใบไม้ปลิวตามลม 12 ใบ (สไปรต์จาก leafArt) คนละระยะ/ขนาด
    this.leafSprites = []; for (let i = 0; i < 6; i++) { const sh = i % 4, sq = sh >= 2, c = document.createElement('canvas'); c.width = sq ? 48 : 64; c.height = sq ? 48 : 40; drawLeaf(c.getContext('2d'), c.width, c.height, sh, LEAF_PALETTES[(i * 5) % LEAF_PALETTES.length], i * 17 + 3); this.leafSprites.push(c); }
    this.leaves = []; for (let i = 0; i < 12; i++) this.leaves.push({ sp: this.leafSprites[i % this.leafSprites.length], d: 0.55 + r() * 0.45, x0: r() * this.PW, y0: H * (0.3 + r() * 0.55), v: 0.02 + r() * 0.035, ph: r() * 6, rot: (r() - 0.5) * 3, flip: 1.5 + r() * 2, sc: 0.28 + r() * 0.4 });
    this.x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // วาดหนึ่งเฟรม: t = เวลาตั้งแต่เข้าโหมด (วิ), n = กลางคืน 0..1, m = เมาส์ {x,y} -1..1, slow = โหมดลดการเคลื่อนไหว
  frame(t, n, m, slow) {
    const x = this.x, W = this.W, H = this.H, PW = this.PW, S = this.S, A = this.A; if (!W || !H) return;
    const dn = 1 - n, sp = slow ? 0.35 : 1, tt = t * sp, wind = 0.5 + 0.5 * Math.sin(tt * 0.37) * Math.sin(tt * 0.11 + 2);
    this.pv += ((m ? m.x : 0) - this.pv) * 0.04; const px = this.pv, py = m ? m.y : 0;
    const auto = (PW - W) / 2 * (1 + 0.9 * Math.sin(tt * 2 * Math.PI / 90)), ox = clamp(auto + this.pan + px * W * 0.05, 0, PW - W);
    const LW = (d) => W + (PW - W) * d, sx = (wx, d) => wx - ox * d; // พิกัดโลกของชั้น d → จอ
    const col = (a, b) => mixc(a, b, n);
    x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // ---------- ท้องฟ้า ----------
    const top = col([52, 132, 210], [3, 8, 26]), mid = col([132, 194, 240], [10, 26, 66]), hor = col([224, 238, 246], [42, 66, 108]), warm = col([252, 236, 208], [64, 78, 118]);
    const g = x.createLinearGradient(0, 0, 0, H * 0.76); g.addColorStop(0, rgba(top)); g.addColorStop(0.5, rgba(mid)); g.addColorStop(0.86, rgba(hor)); g.addColorStop(1, rgba(warm)); x.fillStyle = g; x.fillRect(0, 0, W, H);

    // ทางช้างเผือก + ดาว (กลางคืน)
    if (n > 0.02) {
      x.save(); x.translate(W * 0.5, H * 0.28); x.rotate(-0.42);
      const mg = x.createLinearGradient(0, -H * 0.16, 0, H * 0.16); mg.addColorStop(0, 'rgba(180,190,255,0)'); mg.addColorStop(0.5, `rgba(190,200,255,${(0.09 * n).toFixed(3)})`); mg.addColorStop(1, 'rgba(180,190,255,0)'); x.fillStyle = mg; x.fillRect(-W, -H * 0.16, W * 2, H * 0.32);
      this.milky.forEach(([u, v, s, a]) => { x.fillStyle = `rgba(255,255,255,${(n * (0.25 + 0.45 * a)).toFixed(3)})`; x.fillRect((u - 0.5) * W * 1.6, v * H * 0.32, s, s); });
      x.restore();
      this.stars.forEach(([u, v, s, ph, spd], i) => { const a = n * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(tt * spd + ph))); x.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`; x.beginPath(); x.arc(u * W - ox * 0.03, v * H, s, 0, 7); x.fill(); if (i % 16 === 0) { x.strokeStyle = `rgba(255,255,255,${(a * 0.6).toFixed(3)})`; x.lineWidth = 1; const L = s * 4; x.beginPath(); x.moveTo(u * W - L - ox * 0.03, v * H); x.lineTo(u * W + L - ox * 0.03, v * H); x.moveTo(u * W - ox * 0.03, v * H - L); x.lineTo(u * W - ox * 0.03, v * H + L); x.stroke(); } });
      // ดาวตก
      if (!this.shoot && Math.random() < 0.004) this.shoot = { x: W * (0.2 + Math.random() * 0.6), y: H * (0.05 + Math.random() * 0.25), vx: -W * 0.5, vy: H * 0.22, life: 0 };
      if (this.shoot) { const s = this.shoot; s.life += 1 / 30; s.x += s.vx / 30; s.y += s.vy / 30; const a = n * Math.sin(Math.min(1, s.life / 0.9) * Math.PI); const sg = x.createLinearGradient(s.x, s.y, s.x - s.vx * 0.25, s.y - s.vy * 0.25); sg.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`); sg.addColorStop(1, 'rgba(255,255,255,0)'); x.strokeStyle = sg; x.lineWidth = 2; x.beginPath(); x.moveTo(s.x, s.y); x.lineTo(s.x - s.vx * 0.25, s.y - s.vy * 0.25); x.stroke(); if (s.life > 0.9) this.shoot = null; }
    }
    // พระอาทิตย์ (กลางวัน): แสงฟุ้ง + รัศมีหมุนช้า + ดวง
    const SX = W * 0.64 - ox * 0.05 + px * W * 0.01, SY = H * 0.19, R = S * 0.05;
    if (dn > 0.02) {
      const gl = x.createRadialGradient(SX, SY, R * 0.6, SX, SY, R * 8); gl.addColorStop(0, `rgba(255,240,200,${(0.6 * dn).toFixed(3)})`); gl.addColorStop(0.4, `rgba(255,236,190,${(0.16 * dn).toFixed(3)})`); gl.addColorStop(1, 'rgba(255,236,190,0)'); x.fillStyle = gl; x.fillRect(SX - R * 8, SY - R * 8, R * 16, R * 16);
      x.save(); x.translate(SX, SY); x.rotate(tt * 0.025); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) { x.rotate(Math.PI / 8); const L = R * (i % 2 ? 5.5 : 8); const rg = x.createLinearGradient(0, 0, L, 0); rg.addColorStop(0, `rgba(255,244,210,${(0.14 * dn).toFixed(3)})`); rg.addColorStop(1, 'rgba(255,244,210,0)'); x.fillStyle = rg; x.beginPath(); x.moveTo(0, 0); x.lineTo(L, -R * 0.42); x.lineTo(L, R * 0.42); x.closePath(); x.fill(); }
      x.restore();
      const sg = x.createRadialGradient(SX - R * 0.3, SY - R * 0.3, 0, SX, SY, R); sg.addColorStop(0, `rgba(255,252,240,${dn.toFixed(3)})`); sg.addColorStop(0.7, `rgba(255,232,150,${dn.toFixed(3)})`); sg.addColorStop(1, `rgba(255,214,110,${dn.toFixed(3)})`); x.fillStyle = sg; x.beginPath(); x.arc(SX, SY, R, 0, 7); x.fill();
    }
    // พระจันทร์ (กลางคืน): แสงนวล + ดวงมีหลุม + เสี้ยว
    const MX = W * 0.3 - ox * 0.05 + px * W * 0.01, MY = H * 0.16, MR = S * 0.04;
    if (n > 0.02) {
      const gl = x.createRadialGradient(MX, MY, MR * 0.5, MX, MY, MR * 6); gl.addColorStop(0, `rgba(230,236,255,${(0.4 * n).toFixed(3)})`); gl.addColorStop(1, 'rgba(230,236,255,0)'); x.fillStyle = gl; x.fillRect(MX - MR * 6, MY - MR * 6, MR * 12, MR * 12);
      const mg = x.createRadialGradient(MX - MR * 0.3, MY - MR * 0.3, 0, MX, MY, MR); mg.addColorStop(0, `rgba(252,250,236,${n.toFixed(3)})`); mg.addColorStop(1, `rgba(214,212,190,${n.toFixed(3)})`); x.fillStyle = mg; x.beginPath(); x.arc(MX, MY, MR, 0, 7); x.fill();
      x.fillStyle = `rgba(150,150,130,${(0.35 * n).toFixed(3)})`; [[-0.3, 0.1, 0.22], [0.25, -0.25, 0.16], [0.1, 0.4, 0.12]].forEach(([dx, dy, rr2]) => { x.beginPath(); x.arc(MX + dx * MR, MY + dy * MR, rr2 * MR, 0, 7); x.fill(); });
      x.fillStyle = rgba(top, n * 0.92); x.beginPath(); x.arc(MX + MR * 0.5, MY - MR * 0.15, MR * 0.86, 0, 7); x.fill();
    }

    // ---------- เมฆ (อยู่หลังภูเขา) ----------
    const drawCloud = (c) => { const lw = LW(c.d) + c.size * 3, wx = ((c.x0 + tt * c.sp) % lw + lw) % lw - c.size * 1.5, cx = sx(wx, c.d), cy = c.y + Math.sin(tt * 0.2 + c.ph) * H * 0.006 + py * H * 0.01 * c.d; if (cx > W + c.size * 2 || cx < -c.size * 3) return; x.drawImage(c.day, cx, cy); if (n > 0.01) { x.globalAlpha = n; x.drawImage(c.night, cx, cy); x.globalAlpha = 1; } };
    this.clouds.forEach(drawCloud);

    // ---------- ภูเขาไกล 2 ชั้น + หิมะ + เงาไหล่เขา + หมอกที่ตีน ----------
    const mountain = (fn, d, base, amp, cDay, cNight, snow) => {
      const lw = LW(d), N = 260, X0 = sx(0, d), stepX = lw / N, ys = new Array(N + 1);
      for (let i = 0; i <= N; i++) ys[i] = base - amp * fn(i / N);
      const c = col(cDay, cNight), cl = col([cDay[0] + 34, cDay[1] + 30, cDay[2] + 26], [cNight[0] + 14, cNight[1] + 16, cNight[2] + 24]);
      x.save(); x.beginPath(); x.moveTo(X0, H); for (let i = 0; i <= N; i++) x.lineTo(X0 + i * stepX, ys[i]); x.lineTo(X0 + lw, H); x.closePath();
      const mg = x.createLinearGradient(0, base - amp, 0, base); mg.addColorStop(0, rgba(cl)); mg.addColorStop(1, rgba(c)); x.fillStyle = mg; x.fill(); x.clip();
      // หิมะบนยอด: แผ่นต่อเนื่องตามสัน ขอบล่างคลื่นเบาๆ
      if (snow) { const cap = base - amp * 0.7, sg = x.createLinearGradient(0, base - amp, 0, cap + amp * 0.06); sg.addColorStop(0, rgba(col([255, 255, 255], [172, 188, 220]))); sg.addColorStop(1, rgba(col([206, 222, 240], [110, 126, 164]))); x.fillStyle = sg; x.beginPath(); let run = null;
        for (let i = 0; i <= N; i++) { const above = ys[i] < cap; if (above && run === null) run = i; if (run !== null && (!above || i === N)) { const end = above ? i : i - 1; x.moveTo(X0 + run * stepX, ys[run]); for (let k = run; k <= end; k++) x.lineTo(X0 + k * stepX, ys[k]); for (let k = end; k >= run; k--) x.lineTo(X0 + k * stepX, cap + Math.sin(k * 0.45) * amp * 0.03 + Math.sin(k * 0.11) * amp * 0.05); x.closePath(); run = null; } }
        x.fill(); }
      // แสงเงาตามความชัน (ไหล่เขาที่หันหาพระอาทิตย์ทางขวาสว่าง อีกด้านมืด) เกลี่ยให้เรียบ
      // แสงเงาตามความชันเป็น gradient ต่อเนื่องตามแนวนอน (ไม่มีรอยต่อ) — เกลี่ยความชันกว้างๆ ตัดรอยหยักเล็กออก
      const K = 16; let acc = 0; for (let k = -K; k <= K; k++) acc += ys[clamp(k, 0, N - 1)] - ys[clamp(k, 0, N - 1) + 1];
      const shade = x.createLinearGradient(X0, 0, X0 + lw, 0), light = x.createLinearGradient(X0, 0, X0 + lw, 0);
      for (let i = 0; i < N; i++) { const lit = clamp(0.5 - acc / (2 * K + 1) / stepX * 1.6, 0, 1), u = i / (N - 1); shade.addColorStop(u, `rgba(14,22,48,${((1 - lit) * (0.3 + 0.1 * n)).toFixed(3)})`); light.addColorStop(u, `rgba(255,248,230,${(Math.max(0, lit - 0.5) * 0.2 * dn).toFixed(3)})`); const ao = clamp(i - K, 0, N - 1), ai = clamp(i + K + 1, 0, N - 1); acc += (ys[ai] - ys[ai + 1]) - (ys[ao] - ys[ao + 1]); }
      x.fillStyle = shade; x.fillRect(X0, 0, lw, H); x.fillStyle = light; x.fillRect(X0, 0, lw, H);
      x.restore();
    };
    mountain(this.far1, 0.22, H * 0.64, H * 0.29 * A, [138, 172, 216], [20, 32, 70], true);
    let hz = x.createLinearGradient(0, H * 0.5, 0, H * 0.68); hz.addColorStop(0, rgba(hor, 0)); hz.addColorStop(1, rgba(hor, 0.55 * dn + 0.25 * n)); x.fillStyle = hz; x.fillRect(0, H * 0.5, W, H * 0.18);
    mountain(this.far2, 0.34, H * 0.68, H * 0.2 * A, [104, 148, 190], [16, 28, 60], true);
    hz = x.createLinearGradient(0, H * 0.6, 0, H * 0.72); hz.addColorStop(0, rgba(hor, 0)); hz.addColorStop(1, rgba(hor, 0.4 * dn + 0.2 * n)); x.fillStyle = hz; x.fillRect(0, H * 0.6, W, H * 0.12);

    // ---------- บอลลูน (ระยะไกล) ----------
    const drawBalloon = (b) => { const lw = LW(b.d) + b.R * 4, wx = ((b.x0 + tt * b.sp * b.dir) % lw + lw) % lw - b.R * 2, cx = sx(wx, b.d), cy = b.y + Math.sin(tt * 0.45 + b.ph) * H * 0.012 + py * H * 0.008 * b.d; if (cx > W + b.R * 3 || cx < -b.R * 3) return; x.drawImage(b.day, cx - b.day.width / 2, cy); if (n > 0.01) { x.globalAlpha = n; x.drawImage(b.night, cx - b.day.width / 2, cy); x.globalAlpha = 1; const fl = n * (0.5 + 0.5 * Math.sin(tt * 9 + b.ph)); const gg = x.createRadialGradient(cx, cy + b.R * 1.55, 0, cx, cy + b.R * 1.55, b.R * 0.9); gg.addColorStop(0, `rgba(255,200,90,${(0.55 * fl).toFixed(3)})`); gg.addColorStop(1, 'rgba(255,160,50,0)'); x.fillStyle = gg; x.fillRect(cx - b.R, cy + b.R * 0.6, b.R * 2, b.R * 2); } };
    this.balloons.filter(b => b.d < 0.5).forEach(drawBalloon);

    // ---------- เนินกลาง + ป่าสน ----------
    const hill = (fn, d, base, amp, cTop, cBase, trees, tScale, tDay, tNight) => {
      const lw = LW(d), N = 200, X0 = sx(0, d), stepX = lw / N;
      const hg = x.createLinearGradient(0, base - amp, 0, base + H * 0.1); hg.addColorStop(0, rgba(cTop)); hg.addColorStop(1, rgba(cBase)); x.fillStyle = hg;
      x.beginPath(); x.moveTo(X0, H); for (let i = 0; i <= N; i++) x.lineTo(X0 + i * stepX, base - amp * fn(i / N)); x.lineTo(X0 + lw, H); x.closePath(); x.fill();
      const tc = [col(tDay[0], tNight[0]), col(tDay[1], tNight[1])];
      [0, 1].forEach(tone => { x.fillStyle = rgba(tc[tone]); x.beginPath(); trees.forEach(([u, s, tn, j]) => { if (tn !== tone) return; const X = sx(u * lw, d); if (X < -20 || X > W + 20) return; const th = tScale * s, Y = base - amp * fn(u) + th * 0.12, sway = Math.sin(tt * 1.3 + j * 9) * wind * th * 0.03; for (let k = 0; k < 3; k++) { const yy = Y - th * (0.28 + k * 0.26), hw = th * (0.34 - k * 0.08); x.moveTo(X + sway * (k + 1) * 0.5, yy - th * 0.36); x.lineTo(X - hw, yy); x.lineTo(X + hw, yy); x.closePath(); } x.rect(X - th * 0.05, Y - th * 0.3, th * 0.1, th * 0.32); }); x.fill(); });
    };
    hill(this.mid, 0.5, H * 0.76, H * 0.13 * A, col([104, 168, 122], [20, 48, 56]), col([70, 130, 96], [12, 34, 42]), this.midTrees, S * 0.03, [[36, 96, 72], [52, 122, 84]], [[10, 30, 36], [14, 38, 42]]);

    // ---------- นก (กลางวัน): ฝูงไกลตัว V + นกใกล้ 2 ตัวกระพือปีก ----------
    if (dn > 0.05) {
      x.strokeStyle = `rgba(40,52,70,${dn.toFixed(3)})`; x.lineCap = 'round';
      const flock = (spd, fy, s, off, cnt) => { const span = W + 300, fx = ((tt * spd * W + off * span) % span) - 150 - ox * 0.12; for (let i = 0; i < cnt; i++) { const k = i === 0 ? 0 : (i % 2 ? -1 : 1) * Math.ceil(i / 2), bx = fx + k * 22 * s, by = H * fy + Math.abs(k) * 15 * s + Math.sin(tt * 1.1 + i) * 3, fl = Math.sin(tt * 7.5 + i * 1.1 + off * 4) * 7 * s; x.lineWidth = 1.6 * s; x.beginPath(); x.moveTo(bx - 11 * s, by - fl); x.quadraticCurveTo(bx - 4 * s, by - 2 * s, bx, by); x.quadraticCurveTo(bx + 4 * s, by - 2 * s, bx + 11 * s, by - fl); x.stroke(); } };
      flock(0.024, 0.22, 0.9, 0.1, 7); flock(0.018, 0.3, 0.7, 0.6, 5);
      [[0.05, 0.36, 1.5, 0.2], [0.04, 0.42, 1.2, 0.75]].forEach(([spd, fy, s, off]) => { const span = W + 400, bx = ((tt * spd * W + off * span) % span) - 200 - ox * 0.3, by = H * fy + Math.sin(tt * 0.9 + off * 7) * H * 0.02, fl = Math.sin(tt * 6 + off * 9); x.fillStyle = `rgba(40,52,70,${dn.toFixed(3)})`; x.beginPath(); x.ellipse(bx, by, 7 * s, 3 * s, 0, 0, 7); x.fill(); x.lineWidth = 2.4 * s; x.beginPath(); x.moveTo(bx - 3 * s, by); x.quadraticCurveTo(bx - 12 * s, by - 6 * s - fl * 10 * s, bx - 24 * s, by - 2 * s - fl * 16 * s); x.moveTo(bx + 3 * s, by); x.quadraticCurveTo(bx + 12 * s, by - 6 * s - fl * 10 * s, bx + 24 * s, by - 2 * s - fl * 16 * s); x.stroke(); });
    }
    this.balloons.filter(b => b.d >= 0.5).forEach(drawBalloon);

    // ---------- ทะเลสาบ: สะท้อนฟ้า ภูเขา และแสงพระอาทิตย์/จันทร์ ----------
    { const d = 0.72, lw = LW(d), L0 = H * 0.78, L1 = H * 0.86, xa = sx(lw * 0.27, d), xb = sx(lw * 0.73, d);
      x.save(); x.beginPath(); x.moveTo(xa, L0 + H * 0.012); x.bezierCurveTo(xa + (xb - xa) * 0.2, L0 - H * 0.008, xa + (xb - xa) * 0.6, L0 + H * 0.004, xb, L0 + H * 0.01); x.lineTo(xb, L1 + H * 0.08); x.lineTo(xa, L1 + H * 0.08); x.closePath(); x.clip();
      const lg = x.createLinearGradient(0, L0, 0, L1); lg.addColorStop(0, rgba(col([196, 226, 244], [36, 58, 100]))); lg.addColorStop(1, rgba(col([88, 150, 206], [14, 30, 64]))); x.fillStyle = lg; x.fillRect(0, L0 - H * 0.02, W, H * 0.18);
      // เงาสะท้อนเนินกลางกับป่า (กลับหัว จางลง)
      const c2 = col([60, 116, 84], [10, 30, 38]); x.fillStyle = rgba(c2, 0.42); x.beginPath(); const lw2 = LW(0.5), X0 = sx(0, 0.5); x.moveTo(X0, L0); for (let i = 0; i <= 200; i++) x.lineTo(X0 + i * lw2 / 200, L0 + (L0 - (H * 0.76 - H * 0.13 * A * this.mid(i / 200))) * 0.42 + H * 0.02); x.lineTo(X0 + lw2, L0); x.closePath(); x.fill();
      // ประกายแสงบนผิวน้ำ
      const rx = dn > 0.5 ? SX : MX, rc = dn > 0.5 ? [255, 238, 190] : [220, 228, 255], ra = dn > 0.5 ? dn : n;
      for (let i = 0; i < 16; i++) { const yy = L0 + H * 0.01 + i * H * 0.0048, wob = Math.sin(tt * 2.2 + i * 1.7) * H * 0.012, a = ra * (0.16 + 0.14 * Math.sin(tt * 3 + i)); x.fillStyle = rgba(rc, a); x.fillRect(rx - R * (0.4 + i * 0.12) + wob, yy, R * (0.8 + i * 0.24), 1.6); }
      for (let i = 0; i < 14; i++) { const yy = L0 + H * 0.012 + ((i * 0.37 + tt * 0.02) % 1) * H * 0.07, xx = xa + ((i * 0.61 + tt * 0.01) % 1) * (xb - xa); x.fillStyle = `rgba(255,255,255,${(0.12 + 0.1 * Math.sin(tt * 2 + i)).toFixed(3)})`; x.fillRect(xx, yy, W * 0.02 + Math.sin(i) * W * 0.008, 1); }
      x.restore(); }

    // ---------- เนินใกล้ + ป่า (มีหุบตรงกลางเป็นชายฝั่งทะเลสาบ) ----------
    const valley = (u) => { const q = (u - 0.5) / 0.2; return 1 - 0.92 * Math.exp(-q * q); };
    hill((u) => this.near(u) * valley(u), 0.72, H * 0.85, H * 0.1 * A, col([118, 186, 108], [16, 54, 50]), col([84, 150, 90], [10, 40, 40]), this.nearTrees.map(([u, sc, tn, j]) => [u, sc * (0.35 + 0.65 * valley(u)), tn, j]), S * 0.05, [[42, 112, 78], [62, 138, 88]], [[8, 34, 36], [12, 44, 44]]);

    // ---------- ทุ่งหญ้า + ทางเดิน + ดอกไม้ ----------
    { const d = 1, lw = LW(d), N = 160, X0 = sx(0, d), stepX = lw / N, base = H * 0.905, amp = H * 0.035;
      const mgd = x.createLinearGradient(0, base - amp, 0, H); mgd.addColorStop(0, rgba(col([150, 206, 104], [20, 56, 44]))); mgd.addColorStop(1, rgba(col([96, 168, 82], [10, 36, 30]))); x.fillStyle = mgd;
      x.beginPath(); x.moveTo(X0, H); for (let i = 0; i <= N; i++) x.lineTo(X0 + i * stepX, base - amp * this.meadow(i / N)); x.lineTo(X0 + lw, H); x.closePath(); x.fill();
      // ทางเดินดินโค้ง
      const pxs = sx(lw * 0.55, d); x.strokeStyle = rgba(col([214, 190, 140], [46, 46, 44]), 0.9); x.lineCap = 'round'; x.lineWidth = H * 0.02; x.beginPath(); x.moveTo(pxs + W * 0.02, H * 1.02); x.bezierCurveTo(pxs - W * 0.08, H * 0.98, pxs + W * 0.1, H * 0.93, pxs - W * 0.02, base - amp * 0.5); x.stroke(); x.lineWidth = H * 0.009; x.strokeStyle = rgba(col([232, 214, 170], [60, 58, 54]), 0.7); x.stroke();
      // ดอกไม้เล็กๆ
      this.flowers.forEach(([u, v, c, s]) => { const X = sx(u * lw, d); if (X < -10 || X > W + 10) return; const Y = base - amp * this.meadow(u) + v * (H - base) * 0.9 + 4; const sw = Math.sin(tt * 1.6 + u * 40) * wind * 1.5; x.fillStyle = rgba(col([70, 120, 60], [16, 40, 34])); x.fillRect(X - 0.6, Y - s * 2, 1.2, s * 2.2); x.fillStyle = rgba(col(c, [c[0] * 0.5 | 0, c[1] * 0.5 | 0, c[2] * 0.6 | 0])); for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; x.beginPath(); x.arc(X + sw + Math.cos(a) * s * 0.9, Y - s * 2.2 + Math.sin(a) * s * 0.9, s * 0.62, 0, 7); x.fill(); } x.fillStyle = rgba(col([253, 224, 71], [120, 100, 40])); x.beginPath(); x.arc(X + sw, Y - s * 2.2, s * 0.5, 0, 7); x.fill(); });
      // ต้นไม้ใหญ่
      this.trees.forEach((tr) => { const X = sx(tr.u * lw, d), Y = base - amp * this.meadow(tr.u) + 6, s = tr.s, sway = Math.sin(tt * 0.8 + tr.ph) * wind * s * 0.02; if (X < -s || X > W + s) return;
        const tg = x.createLinearGradient(X - s * 0.08, 0, X + s * 0.08, 0); tg.addColorStop(0, rgba(col([72, 50, 34], [16, 14, 20]))); tg.addColorStop(0.5, rgba(col([120, 86, 56], [30, 26, 30]))); tg.addColorStop(1, rgba(col([60, 42, 28], [12, 10, 16]))); x.fillStyle = tg; x.beginPath(); x.moveTo(X - s * 0.09, Y); x.lineTo(X - s * 0.05, Y - s * 0.55); x.lineTo(X + s * 0.05 + sway, Y - s * 0.55); x.lineTo(X + s * 0.11, Y); x.closePath(); x.fill();
        const cy0 = Y - s * 0.72; [[col([38, 104, 66], [8, 30, 34]), s * 0.06, s * 0.06, 1.05], [col([64, 150, 84], [14, 46, 44]), 0, 0, 1], [col([120, 200, 110], [26, 66, 58]), -s * 0.08, -s * 0.09, 0.62]].forEach(([c, dx, dy, k]) => { x.fillStyle = rgba(c); x.beginPath(); tr.c.forEach(([ox2, oy2, r2]) => { x.moveTo(X + sway + ox2 * s * 0.5 + dx + r2 * s * 0.5 * k, cy0 + oy2 * s * 0.5 + dy); x.arc(X + sway + ox2 * s * 0.5 + dx, cy0 + oy2 * s * 0.5 + dy, r2 * s * 0.5 * k, 0, 7); }); x.fill(); }); });
      // หญ้าพลิ้วหน้าสุด
      const gc = [col([92, 168, 76], [12, 44, 36]), col([132, 200, 96], [18, 58, 46])];
      [0, 1].forEach(tone => { x.strokeStyle = rgba(gc[tone]); x.lineWidth = 1.6 + tone * 0.6; x.lineCap = 'round'; x.beginPath(); this.grass.forEach(([u, hgt, ph, tn]) => { if (tn !== tone) return; const X = sx(u * lw, d); if (X < -20 || X > W + 20) return; const Y = H + 2, sw = (Math.sin(tt * 1.9 + ph) * 0.6 + 0.4) * wind * hgt * 0.5 + px * 3; x.moveTo(X, Y); x.quadraticCurveTo(X + sw * 0.3, Y - hgt * 0.6, X + sw, Y - hgt); }); x.stroke(); });
    }

    // ---------- ใบไม้ปลิวตามลม (ลอยขวาง ส่ายขึ้นลง พลิกไปมา) ----------
    this.leaves.forEach((L) => { const lw = LW(L.d) + 80, wx = ((L.x0 + tt * L.v * W * (0.6 + wind)) % lw + lw) % lw - 40, X = sx(wx, L.d), Y = L.y0 + Math.sin(tt * 1.3 + L.ph) * H * 0.03 + Math.sin(tt * 0.35 + L.ph * 2) * H * 0.06; if (X < -60 || X > W + 60) return;
      const s = L.sc * (0.6 + L.d) * (S / 900) * 1.6, fl = Math.cos(tt * L.flip + L.ph); x.save(); x.translate(X, Y); x.rotate(tt * L.rot + Math.sin(tt * 2 + L.ph) * 0.5); x.scale(s * (0.25 + 0.75 * Math.abs(fl)), s); x.globalAlpha = 1 - 0.55 * n; x.drawImage(L.sp, -L.sp.width / 2, -L.sp.height / 2); x.restore(); });
    x.globalAlpha = 1;
    // ---------- หิ่งห้อย (กลางคืน) ----------
    if (n > 0.25) this.flies.forEach(([u, v, ph, spd]) => { const X = u * W + Math.sin(tt * 0.5 * spd + ph) * W * 0.03 - ox * 0.9, Y = H * v + Math.cos(tt * 0.4 * spd + ph * 2) * H * 0.02, a = n * Math.max(0, Math.sin(tt * 1.6 * spd + ph)) * 0.95; if (a < 0.02) return; const gg = x.createRadialGradient(X, Y, 0, X, Y, 8); gg.addColorStop(0, `rgba(230,255,150,${a.toFixed(3)})`); gg.addColorStop(0.35, `rgba(200,255,120,${(a * 0.5).toFixed(3)})`); gg.addColorStop(1, 'rgba(200,255,120,0)'); x.fillStyle = gg; x.fillRect(X - 8, Y - 8, 16, 16); });

    // ---------- แสงอุ่นจากพระอาทิตย์ + ขอบภาพมืดจางๆ ----------
    if (dn > 0.02) { const wg = x.createRadialGradient(SX, SY, 0, SX, SY, H * 0.9); wg.addColorStop(0, `rgba(255,220,150,${(0.16 * dn).toFixed(3)})`); wg.addColorStop(1, 'rgba(255,220,150,0)'); x.globalCompositeOperation = 'lighter'; x.fillStyle = wg; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over'; }
    const vg = x.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, Math.max(W, H) * 0.78); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${(0.22 + 0.2 * n).toFixed(3)})`); x.fillStyle = vg; x.fillRect(0, 0, W, H);
  }
}
