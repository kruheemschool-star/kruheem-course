// เมฆสมจริงสำหรับวิวพาโนรามา (components/desk/panorama.js) — คำนวณทีละพิกเซลครั้งเดียวตอนเข้าโหมด แล้วเก็บเป็นภาพ
//
// คิวมูลัส (เมฆก้อน): ก้อนฟูทรงกลมหลายขนาดซ้อนกันแบบกะหล่ำดอก ฐานแบน → ความสูงผิวเมฆ (heightfield)
//   → แสงตามทิศแดด/จันทร์ + ก้อนบนทอดเงาลงก้อนล่าง + ซอกระหว่างก้อนมืด + ฐานเมฆเทาอมฟ้า
//   + ขอบฟุ้งกัดกร่อนด้วย noise ส่วนบางโปร่งแสง + หมอกตามระยะ
//   ได้ 3 ภาพ: กลางวัน (แดดจากขวาบน) · กลางคืน (แสงจันทร์จากซ้ายบน) · ขอบเรือง (ใช้ตอนเมฆลอยเข้าใกล้ดวงอาทิตย์/ดวงจันทร์)
// ซีร์รัส (เมฆขนนก): แผ่นบางบนฟ้าสูง เป็นเส้นใยจาก noise ที่ยืดตามแนวนอนแล้วบิดเป็นคลื่น

const rnd = (seed) => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const c01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
// smoothstep ที่สลับขอบได้ (e0 > e1 = ไล่ลง)
const sst = (e0, e1, v) => { const t = c01((v - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const norm3 = (v) => { const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };

// แผ่น noise แบบ fbm 5 ชั้น ขนาด 128×128 ต่อกันได้ไร้รอยต่อ (สร้างครั้งเดียว)
const NN = 128;
let TILE = null;
function tile() {
  if (TILE) return TILE;
  const out = new Float32Array(NN * NN), r = rnd(9173); let amp = 1;
  for (let o = 0; o < 5; o++) {
    const P = 4 << o, cell = NN / P, lat = new Float32Array(P * P); for (let i = 0; i < P * P; i++) lat[i] = r();
    for (let y = 0; y < NN; y++) {
      const fy = y / cell, iy = Math.floor(fy), ty = fy - iy, sy = ty * ty * (3 - 2 * ty), y0 = (iy % P) * P, y1 = ((iy + 1) % P) * P;
      for (let x = 0; x < NN; x++) {
        const fx = x / cell, ix = Math.floor(fx), tx = fx - ix, sx = tx * tx * (3 - 2 * tx), x0 = ix % P, x1 = (ix + 1) % P;
        const a = lat[y0 + x0], b = lat[y0 + x1], c = lat[y1 + x0], d = lat[y1 + x1];
        out[y * NN + x] += amp * ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy);
      }
    }
    amp *= 0.55;
  }
  let lo = Infinity, hi = -Infinity; for (let i = 0; i < out.length; i++) { if (out[i] < lo) lo = out[i]; if (out[i] > hi) hi = out[i]; }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) / (hi - lo);
  TILE = out; return out;
}
// อ่านค่า noise 0..1 แบบต่อเนื่อง (u, v = จำนวนรอบของแผ่น วนซ้ำได้)
function ns(T, u, v) {
  let X = u * NN, Y = v * NN; X -= Math.floor(X / NN) * NN; Y -= Math.floor(Y / NN) * NN;
  const ix = (X | 0) & (NN - 1), iy = (Y | 0) & (NN - 1), tx = X - Math.floor(X), ty = Y - Math.floor(Y), x1 = (ix + 1) & (NN - 1), r0 = iy * NN, r1 = ((iy + 1) & (NN - 1)) * NN;
  const a = T[r0 + ix], b = T[r0 + x1], c = T[r1 + ix], d = T[r1 + x1];
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}
// เบลอแบบกล่อง (แยกแนวนอน/ตั้ง) สำหรับหาซอกมืดและขอบเมฆ
function blur(src, w, h, R) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), k = 1 / (2 * R + 1);
  for (let y = 0; y < h; y++) { const o = y * w; let s = 0; for (let i = -R; i <= R; i++) s += src[o + Math.min(w - 1, Math.max(0, i))];
    for (let x = 0; x < w; x++) { tmp[o + x] = s * k; s += src[o + Math.min(w - 1, x + R + 1)] - src[o + Math.max(0, x - R)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let i = -R; i <= R; i++) s += tmp[Math.min(h - 1, Math.max(0, i)) * w + x];
    for (let y = 0; y < h; y++) { out[y * w + x] = s * k; s += tmp[Math.min(h - 1, y + R + 1) * w + x] - tmp[Math.max(0, y - R) * w + x]; } }
  return out;
}
const toCanvas = (img) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').putImageData(img, 0, 0); return c; };

// สีเมฆ: ฐาน (เงาใต้เมฆ) → ด้านข้างที่รับแสงฟ้า → ส่วนโดนแดด/จันทร์ตรงๆ
const DAY = { lit: [255, 252, 244], sky: [184, 198, 226], base: [128, 142, 172], thin: [246, 249, 255] };
const NIGHT = { lit: [138, 150, 186], sky: [32, 40, 66], base: [13, 17, 32], thin: [52, 62, 96] };

// คิวมูลัส · o = { w, h: ขนาดบนจอ (px), seed, flat: 0..1 (1 = แบนยาว), hz: หมอก 0..1, hazeDay/hazeNight: สีหมอก [r,g,b], res: ความละเอียดงาน }
// คืน { day, night, rim } เป็น canvas (ฐานเมฆอยู่ที่ 80% ของความสูงภาพ)
export function makeCumulus(o) {
  const T = tile(), r = rnd(o.seed), gw = Math.max(16, Math.round(o.w * o.res)), gh = Math.max(10, Math.round(o.h * o.res)), N = gw * gh;
  const flat = o.flat || 0, hz = o.hz || 0, baseY = gh * 0.8, left = gw * 0.08, cw = gw * 0.84;
  const bodyH = Math.min(gh * 0.74, cw * (0.46 - 0.28 * flat));
  // ทรงรวม: ลำตัวต่ำกว้าง + โดม 2–4 ยอด (ยอดหนึ่งสูงสุด)
  const domes = [], nd = 2 + Math.floor(r() * 2) + (flat > 0.5 ? 1 : 0);
  for (let i = 0; i < nd; i++) domes.push([0.2 + r() * 0.6, 0.09 + r() * 0.15, 0.45 + r() * 0.5]);
  domes[0][2] = 1;
  const prof = (u) => { let v = 0.34 * Math.min(1, u / 0.16, (1 - u) / 0.16); for (const [c, s, a] of domes) { const q = (u - c) / s; v = Math.max(v, a * Math.exp(-q * q)); } return Math.max(0, v * Math.min(1, u / 0.05, (1 - u) / 0.05)); };
  // ก้อนฟูแบบกะหล่ำดอก [x, y, รัศมี, ความลึกศูนย์กลาง]: ก้อนใหญ่เป็นลำตัว (ซ้อนเป็นเสาตรงยอดโดม)
  // → ก้อนกลางงอกบนผิวด้านบน/ด้านหน้า → ก้อนเล็กงอกต่ออีกชั้น
  const P = [], n0 = Math.max(4, Math.round(cw / (bodyH * 0.36)));
  for (let i = 0; i < n0; i++) {
    const u = (i + 0.5 + (r() - 0.5) * 0.5) / n0, p = prof(u), ht = bodyH * Math.max(0.3, p), r0 = bodyH * (0.24 + 0.16 * p) * (0.85 + r() * 0.3);
    let yy = baseY - r0 * 0.45; do { P.push([left + u * cw + (r() - 0.5) * r0 * 0.25, yy, r0 * (0.9 + r() * 0.2), (r() - 0.5) * r0 * 0.3]); yy -= r0 * 0.72; } while (yy - r0 > baseY - ht - r0 * 0.15);
  }
  const grow = (parents, kMin, kMax, cMin, cMax) => { const out = [];
    for (const [px, py, pr, pz] of parents) { const m = cMin + Math.floor(r() * (cMax - cMin + 1));
      for (let j = 0; j < m; j++) { const a = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.15, f = Math.min(0.95, r() * r() * 1.2), sf = Math.sqrt(1 - f * f), rc = pr * (kMin + r() * (kMax - kMin)), dist = pr * (0.76 + r() * 0.14), cy = py + Math.sin(a) * sf * dist;
        if (cy > baseY - rc * 0.15) continue; out.push([px + Math.cos(a) * sf * dist, cy, rc, pz + f * dist]); } }
    return out; };
  const L1 = grow(P, 0.38, 0.56, 3, 5), L2 = grow(L1, 0.36, 0.52, 2, 4); P.push(...L1, ...L2);

  // ---- ความสูงผิวเมฆ (smooth union ของทรงกลม) + พื้นที่ครอบคลุมแบบขอบนุ่ม ----
  const Hf = new Float32Array(N).fill(-1e4), cov = new Float32Array(N), Cr = new Float32Array(N);
  for (const [px, py, pr, pz] of P) {
    const RR = pr * 1.15, x0 = Math.max(0, Math.floor(px - RR)), x1 = Math.min(gw - 1, Math.ceil(px + RR)), y0 = Math.max(0, Math.floor(py - RR)), y1 = Math.min(gh - 1, Math.ceil(py + RR)), k = pr * 0.5, r2 = pr * pr, RR2 = RR * RR;
    for (let y = y0; y <= y1; y++) { const dy = y - py;
      for (let x = x0; x <= x1; x++) { const dx = x - px, dd = dx * dx + dy * dy; if (dd > RR2) continue;
        const d = Math.sqrt(dd), i = y * gw + x, h = pz + (dd < r2 ? Math.sqrt(r2 - dd) : 0) - (d > pr ? (d - pr) * 1.5 : 0), a = Hf[i];
        if (a < -1e3) Hf[i] = h; else { const m = a > h ? a : h, t = Math.max(k - Math.abs(a - h), 0) / k; Hf[i] = m + t * t * k * 0.25; if (dd < r2 && t > Cr[i]) Cr[i] = t; }
        const c = (1.12 - d / pr) / 0.3; if (c > cov[i]) cov[i] = c > 1 ? 1 : c; } }
  }
  // ---- ขอบเมฆกัดกร่อนด้วย noise + ฐานแบน + ผิวขรุขระเล็กน้อย ----
  const F = bodyH * 1.25, o1x = r() * 9, o1y = r() * 9, o2x = r() * 9, o2y = r() * 9, o3x = r() * 9, o3y = r() * 9, floor = -bodyH * 0.3;
  const A = new Float32Array(N), Hn = new Float32Array(N);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const i = y * gw + x, c = cov[i], n1 = ns(T, x / F + o1x, y / F + o1y), n2 = ns(T, x / (F * 0.45) + o2x, y / (F * 0.45) + o2y);
    if (c > 0) { const nn = n1 * 0.55 + n2 * 0.45; A[i] = sst(0.34, 0.66, c + (nn - 0.5) * 0.8 * (1 - 0.5 * c)) * sst(baseY + gh * 0.03, baseY - gh * 0.01, y + (n2 - 0.5) * gh * 0.03); }
    const b = ns(T, x / (F * 0.3) + o3x, y / (F * 0.3) + o3y);
    Hn[i] = Hf[i] < -1e3 ? floor : Math.max(floor, Hf[i] + (b - 0.5) * bodyH * 0.012 + (n1 - 0.5) * bodyH * 0.06);
  }
  const Hs = blur(Hn, gw, gh, Math.max(1, Math.round(bodyH * 0.022))), Cb = blur(Cr, gw, gh, Math.max(1, Math.round(bodyH * 0.03))), Ab = blur(A, gw, gh, Math.max(1, Math.round(bodyH * 0.08)));

  // ---- แสง: กลางวันแดดจากขวาบน · กลางคืนจันทร์จากซ้ายบน (ทั้งคู่เฉียงเข้าหาเรา) ----
  const Ld = norm3([0.55, -0.7, 0.45]), Ln = norm3([-0.55, -0.62, 0.5]);
  const march = (L) => { const l = Math.hypot(L[0], L[1]); return [L[0] / l, L[1] / l, L[2] / l, Math.max(1, bodyH * 0.06)]; };
  const Md = march(Ld), Mn = march(Ln);
  // ก้อนที่นูนกว่าในทิศแสงบังแสง → เงาทอด (ไล่ดู 8 ก้าว)
  const occl = (M, x, y, h0) => { let occ = 0; for (let s = 1; s <= 8; s++) { const dd = s * M[3], qx = x + M[0] * dd, qy = y + M[1] * dd; if (qx < 0 || qy < 0 || qx > gw - 2 || qy > gh - 2) break; const ix = qx | 0, iy = qy | 0, tx = qx - ix, ty = qy - iy, j = iy * gw + ix, hq = (Hs[j] * (1 - tx) + Hs[j + 1] * tx) * (1 - ty) + (Hs[j + gw] * (1 - tx) + Hs[j + gw + 1] * tx) * ty, e = hq - (h0 + M[2] * dd); if (e > occ) occ = e; } return occ; };
  const hzD = o.hazeDay || [214, 232, 244], hzN = o.hazeNight || [36, 58, 98];
  const day = new ImageData(gw, gh), night = new ImageData(gw, gh), rim = new ImageData(gw, gh), dd = day.data, nd2 = night.data, rd = rim.data;
  const shade = (S, L, M, out, p, x, y, i, nx, ny, nz, vert, ao, a, aMul, hzC) => {
    const dif = c01((nx * L[0] + ny * L[1] + nz * L[2] + 0.3) / 1.3), sh = 1 - 0.72 * sst(0, bodyH * 0.08, occl(M, x, y, Hs[i])), dir = dif * sh * (0.35 + 0.65 * vert), k = 0.8 + 0.2 * ao, th = (1 - a) * 0.35;
    for (let ch = 0; ch < 3; ch++) { let v = S.base[ch] + (S.sky[ch] - S.base[ch]) * vert; v += (S.lit[ch] - v) * dir; v *= k; v += (S.thin[ch] - v) * th; v += (hzC[ch] - v) * hz; out[p + ch] = v; }
    out[p + 3] = a * aMul * 255;
  };
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const i = y * gw + x, a = A[i]; if (a < 0.004) continue;
    const p = i * 4, hl = Hs[x > 0 ? i - 1 : i], hr = Hs[x < gw - 1 ? i + 1 : i], hu = Hs[y > 0 ? i - gw : i], hd = Hs[y < gh - 1 ? i + gw : i];
    let nx = -(hr - hl) * 0.5, ny = -(hd - hu) * 0.5, nz = 1; const nl = Math.sqrt(nx * nx + ny * ny + 1); nx /= nl; ny /= nl; nz /= nl;
    const vert = sst(0, 0.7, c01((baseY - y) / bodyH)), ao = 1 - Cb[i] * 0.4;
    shade(DAY, Ld, Md, dd, p, x, y, i, nx, ny, nz, vert, ao, a, 1 - hz * 0.2, hzD);
    shade(NIGHT, Ln, Mn, nd2, p, x, y, i, nx, ny, nz, vert, ao, a, 0.9 - hz * 0.2, hzN);
    // ขอบเรือง: แถบด้านในขอบเมฆ + ส่วนบางๆ
    const e = c01(a * (1 - Ab[i]) * 1.8 + (1 - a) * a * 0.6);
    rd[p] = 255; rd[p + 1] = 250; rd[p + 2] = 240; rd[p + 3] = e * 255 * (1 - hz * 0.5);
  }
  return { day: toCanvas(day), night: toCanvas(night), rim: toCanvas(rim) };
}

// ซีร์รัส (เมฆขนนกบางๆ) · o = { w, h, seed, res } · คืน { day, night }
export function makeCirrus(o) {
  const T = tile(), r = rnd(o.seed), gw = Math.max(16, Math.round(o.w * o.res)), gh = Math.max(8, Math.round(o.h * o.res));
  const ox = r() * 9, oy = r() * 9, wx = r() * 9, wy = r() * 9, bend = (r() - 0.5) * 0.5, tilt = (r() - 0.5) * 0.25, fy = 3.2 + r() * 1.6;
  const day = new ImageData(gw, gh), night = new ImageData(gw, gh), dd = day.data, nd2 = night.data;
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const u = x / gw, v = y / gh, cu = u - 0.5, vv = v - 0.5 - bend * (cu * cu * 4 - 0.33) - tilt * cu;
    const e = (cu / 0.5) * (cu / 0.5) + (vv / 0.3) * (vv / 0.3); if (e >= 1) continue;
    const mask = Math.pow(1 - e, 1.4), w1 = ns(T, u * 1.6 + wx, v * 1.2 + wy);
    // ลายเส้นใย: noise ยืดตามแนวนอน + บิดเป็นคลื่นด้วย noise อีกชั้น
    const s = ns(T, u * 1.1 + w1 * 0.35 + ox, v * fy + (w1 - 0.5) * 1.2 + oy) * 0.7 + ns(T, u * 2.4 + ox * 0.5, v * fy * 2.2 + (w1 - 0.5) * 2 + oy * 0.5) * 0.3;
    const d = sst(0.5, 0.78, s) * mask; if (d < 0.004) continue;
    const p = (y * gw + x) * 4, k = 0.86 + 0.14 * d;
    dd[p] = 236 * k + 19 * d; dd[p + 1] = 242 * k + 13 * d; dd[p + 2] = 252; dd[p + 3] = d * 0.62 * 255;
    nd2[p] = 128 * k; nd2[p + 1] = 140 * k; nd2[p + 2] = 178 * k; nd2[p + 3] = d * 0.42 * 255;
  }
  return { day: toCanvas(day), night: toCanvas(night) };
}
