// แมวเหมือนจริงบนโต๊ะข้าง (หน้าแรกโต๊ะเรียน) — "ปั้นด้วยเมตาบอล" (Marching Cubes) แล้วอบเป็นเมชนิ่งครั้งเดียว
//
// โครงสร้าง
//  - ลำตัว/สะโพก/ไหล่/อก  = สนามเมตาบอลชุดหนึ่ง → อบด้วย MarchingCubes ความละเอียด 64 แล้ว merge+smooth
//  - หัว (กะโหลก แก้ม ปาก คาง คิ้ว คอ) = สนามเมตาบอลอีกชุด อบแยกต่างหาก เพื่อให้หมุน/ยกหัวได้
//    (เลือกแบบ "หัวแยกเมช" แทน SkinnedMesh: คอของหัวฝังลึกเข้าไปในก้อนไหล่ของลำตัว รอยต่อจึงจมอยู่ใต้ขน
//     และไม่ต้องคำนวณน้ำหนักกระดูกให้ทั้งเมชหลัก+เชลล์ขน ประหยัดทั้งเวลาโหลดและเวลาต่อเฟรม)
//  - อุ้งเท้าหน้า 2 ข้าง (มีนิ้ว) และขากรรไกรล่าง (สำหรับหาว) อบแยกด้วยกริดเล็กความละเอียดสูง
//  - หาง = ท่อเรียวสร้างใหม่ทุกเฟรมจากเส้นโค้ง Catmull-Rom (ไม่จองหน่วยความจำต่อเฟรม)
//  - ตา = ลูกตา (ม่านตาวาดบน canvas) + รูม่านตาแนวตั้งที่ขยาย/หดได้ + กระจกตาใส + เปลือกตาบน/ล่าง + เส้นตาหลับ
//  - หู = กรวยตัดครึ่ง 2 ชั้น (นอกขน/ในชมพู) + ขนในหู
//  - ลายขน = ฟังก์ชัน 3 มิติ (แท็บบี้น้ำตาล-เทา: แถบสันหลัง ลายข้างลำตัวโค้งตาม noise ท้องอ่อน ตัว M บนหน้าผาก
//    ขอบตา แถบแก้ม ปล้องหาง) ประเมินเป็นสีต่อจุด (vertex colours) ทุกเมช รวมเชลล์ขนโปร่ง 2 ชั้น
//
// กรอบพิกัด: +x = ทิศที่แมวหัน (หัวอยู่ปลาย +x), +y = ขึ้น, พื้นโต๊ะ = y 0  (ฉากเป็นคนตั้ง scale/position/rotation ของ g)

import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------- noise 3 มิติแบบ value noise (กำหนดค่าตายตัว ใช้ตอนอบเท่านั้น) ----------
// แฮชจุดตาข่ายจำนวนเต็มด้วย imul/xorshift (ถูกกว่า Math.sin กับตัวเลขใหญ่ ~3 เท่า และให้ค่าเดิมทุกครั้ง)
const _hf = (x, y, z) => {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x9e3779b1);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
};
function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const a = _hf(ix, iy, iz), b = _hf(ix + 1, iy, iz), c = _hf(ix, iy + 1, iz), d = _hf(ix + 1, iy + 1, iz);
  const e = _hf(ix, iy, iz + 1), f = _hf(ix + 1, iy, iz + 1), g = _hf(ix, iy + 1, iz + 1), h = _hf(ix + 1, iy + 1, iz + 1);
  const x1 = a + (b - a) * fx, x2 = c + (d - c) * fx, x3 = e + (f - e) * fx, x4 = g + (h - g) * fx;
  const y1 = x1 + (x2 - x1) * fy, y2 = x3 + (x4 - x3) * fy;
  return y1 + (y2 - y1) * fz;
}
function fbm(x, y, z, oct) {
  let s = 0, w = 0.5, tot = 0;
  for (let i = 0; i < oct; i++) { s += w * vnoise(x, y, z); tot += w; w *= 0.5; x = x * 2.03 + 17.1; y = y * 2.11 + 9.7; z = z * 1.97 + 31.3; }
  return s / tot;
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const mix = (a, b, t) => a + (b - a) * t;

// ---------- สนามเมตาบอล ----------
const SUP = 1.4;                                  // รัศมีอิทธิพล = 1.4 เท่าของรัศมีที่มองเห็น
const ISO = (1 - 1 / (SUP * SUP)) * (1 - 1 / (SUP * SUP)); // ค่าพื้นผิว: ลูกเดี่ยวๆ จะมีผิวพอดีที่รัศมีที่กำหนด
function makeField() {
  const P = [];
  const ball = (cx, cy, cz, rx, ry, rz, w) => P.push({ t: 0, cx, cy, cz, rx, ry, rz, w: w === undefined ? 1 : w, x0: cx - rx * SUP, x1: cx + rx * SUP, y0: cy - ry * SUP, y1: cy + ry * SUP, z0: cz - rz * SUP, z1: cz + rz * SUP });
  const cap = (ax, ay, az, bx, by, bz, ra, rb, sy, sz, w) => {
    sy = sy === undefined ? 1 : sy; sz = sz === undefined ? 1 : sz; const rm = Math.max(ra, rb) * SUP * Math.max(1, sy, sz);
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    P.push({ t: 1, ax, ay, az, dx, dy, dz, l2: dx * dx + dy * dy + dz * dz || 1e-9, ra, rb, sy, sz, w: w === undefined ? 1 : w, x0: Math.min(ax, bx) - rm, x1: Math.max(ax, bx) + rm, y0: Math.min(ay, by) - rm, y1: Math.max(ay, by) + rm, z0: Math.min(az, bz) - rm, z1: Math.max(az, bz) + rm });
  };
  const S2 = SUP * SUP;
  const contrib = (p, x, y, z) => {
    let d2;
    if (p.t === 0) { const u = (x - p.cx) / p.rx, v = (y - p.cy) / p.ry, w = (z - p.cz) / p.rz; d2 = u * u + v * v + w * w; }
    else {
      let t = ((x - p.ax) * p.dx + (y - p.ay) * p.dy + (z - p.az) * p.dz) / p.l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const r = p.ra + (p.rb - p.ra) * t, u = (x - p.ax - p.dx * t) / r, v = (y - p.ay - p.dy * t) / (r * p.sy), w = (z - p.az - p.dz * t) / (r * p.sz); d2 = u * u + v * v + w * w;
    }
    if (d2 < S2) { const k = 1 - d2 / S2; return p.w * k * k; }
    return 0;
  };
  // ประเมินทีละจุด (ใช้ตอนตรวจ/ดีบัก)
  const eval3 = (x, y, z) => {
    let f = 0;
    for (let i = 0; i < P.length; i++) {
      const p = P[i]; if (x < p.x0 || x > p.x1 || y < p.y0 || y > p.y1 || z < p.z0 || z > p.z1) continue;
      f += contrib(p, x, y, z);
    }
    return f;
  };
  // ประเมินทีละแถวของกริด: row(y,z) คัดเฉพาะก้อนที่กล่องครอบ y/z ของแถวนี้ไว้ก่อน แล้ว evalRow เทียบแค่แกน x (ผลเท่า eval ทุกจุด)
  const active = [];
  const row = (y, z) => { active.length = 0; for (let i = 0; i < P.length; i++) { const p = P[i]; if (y >= p.y0 && y <= p.y1 && z >= p.z0 && z <= p.z1) active.push(p); } };
  const evalRow = (x, y, z) => {
    let f = 0;
    for (let i = 0; i < active.length; i++) { const p = active[i]; if (x < p.x0 || x > p.x1) continue; f += contrib(p, x, y, z); }
    return f;
  };
  return { ball, cap, eval: eval3, row, evalRow };
}

// อบสนามให้เป็น BufferGeometry นิ่ง: MarchingCubes → ย้ายพิกัด → เชื่อมจุดซ้ำ → smooth (Taubin) → ขนฟูเล็กๆ → normal
//  opt.row(py, pz)  = เรียกก่อนประเมินแต่ละแถวของกริด (ให้สนามคัดก้อนที่เกี่ยวข้องล่วงหน้า)
//  opt.maxPoly      = จำนวนสามเหลี่ยมสูงสุดของบัฟเฟอร์ชั่วคราว (ค่าเริ่มต้น 8·res² — เผื่อ ≥2 เท่าของที่วัดได้จริง แทนที่จะจอง 6.5MB ทุกครั้ง)
//  opt.low          = ถ้าให้ จะอบสนามเดิมซ้ำที่ความละเอียดครึ่งหนึ่งโดยหยิบค่าจากกริดเดิมทุก 2 ช่อง (ไม่ประเมินสนามซ้ำ) → geo.userData.low
function bakeField(T, res, box, fieldFn, opt) {
  opt = opt || {};
  const half = res / 2, cx = (box[0] + box[1]) / 2, cy = (box[2] + box[3]) / 2, cz = (box[4] + box[5]) / 2, hx = (box[1] - box[0]) / 2, hy = (box[3] - box[2]) / 2, hz = (box[5] - box[4]) / 2;
  const maxPoly = opt.maxPoly || 8 * res * res;
  const dummy = new T.MeshBasicMaterial(), mc = new MarchingCubes(res, dummy, false, false, maxPoly);
  mc.isolation = ISO;
  const F = mc.field, size2 = res * res;
  for (let z = 0; z < res; z++) {
    const pz = cz + hz * ((z - half) / half);
    for (let y = 0; y < res; y++) {
      const py = cy + hy * ((y - half) / half), row = z * size2 + y * res;
      if (opt.row) opt.row(py, pz);
      for (let x = 0; x < res; x++) F[row + x] = fieldFn(cx + hx * ((x - half) / half), py, pz);
    }
  }
  const geo = extractField(T, mc, maxPoly, res, cx, cy, cz, hx, hy, hz, opt);
  if (opt.low) {
    // 56/28 และ 48/24 หารลงตัว: จุดกริดของความละเอียดครึ่งหนึ่งตรงกับจุดกริดเดิมทุก 2 ช่องพอดี จึงคัดลอกค่าได้ตรงๆ
    const r2 = res / 2, lo = opt.low, maxPoly2 = lo.maxPoly || 8 * r2 * r2;
    const mc2 = new MarchingCubes(r2, dummy, false, false, maxPoly2); mc2.isolation = ISO;
    const F2 = mc2.field, s2 = r2 * r2;
    for (let z = 0; z < r2; z++) for (let y = 0; y < r2; y++) { const src = (2 * z) * size2 + (2 * y) * res, dst = z * s2 + y * r2; for (let x = 0; x < r2; x++) F2[dst + x] = F[src + 2 * x]; }
    geo.userData.low = extractField(T, mc2, maxPoly2, r2, cx, cy, cz, hx, hy, hz, lo);
  }
  dummy.dispose();
  return geo;
}
function extractField(T, mc, maxPoly, res, cx, cy, cz, hx, hy, hz, opt) {
  mc.update();
  if (mc.count > maxPoly * 3) console.warn('catB: bake truncated', res, mc.count / 3, '>', maxPoly); // MarchingCubes นับต่อแต่ทิ้งค่าที่เกินบัฟเฟอร์ — ต้องตัดก่อนอ่าน ไม่งั้นได้ NaN
  const n = Math.min(mc.count, maxPoly * 3), src = mc.positionArray, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = cx + hx * src[i * 3]; pos[i * 3 + 1] = cy + hy * src[i * 3 + 1]; pos[i * 3 + 2] = cz + hz * src[i * 3 + 2]; }
  mc.geometry.dispose();
  const geo = weldVertices(T, pos, n);
  taubin(geo, opt.smooth === undefined ? 4 : opt.smooth);
  geo.computeVertexNormals();
  if (opt.fur || opt.floor !== undefined) {
    const p = geo.attributes.position.array, nm = geo.attributes.normal.array, amp = opt.fur || 0, fq = opt.furFreq || 28;
    for (let i = 0; i < p.length; i += 3) {
      if (amp) {
        const d = (fbm(p[i] * fq, p[i + 1] * fq, p[i + 2] * fq, 2) - 0.5) * 2 * amp;
        p[i] += nm[i] * d; p[i + 1] += nm[i + 1] * d; p[i + 2] += nm[i + 2] * d;
      }
      if (opt.floor !== undefined && p[i + 1] < opt.floor) p[i + 1] = opt.floor;
    }
    geo.computeVertexNormals();
  }
  return geo;
}
// เชื่อมจุดซ้ำของ triangle soup ด้วยคีย์ตัวเลข (ปัดพิกัดที่ 1e-4; พิกัดอยู่ใน ±1.5 → แต่ละแกน < 2^15 ช่อง, คีย์รวม < 2^45 ยังแม่นใน double)
function weldVertices(T, pos, n) {
  const map = new Map(), idx = new Uint32Array(n), out = new Float32Array(n * 3); let nv = 0;
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    const key = Math.round((x + 2) * 1e4) + Math.round((y + 2) * 1e4) * 32768 + Math.round((z + 2) * 1e4) * 1073741824;
    let j = map.get(key);
    if (j === undefined) { j = nv++; map.set(key, j); out[j * 3] = x; out[j * 3 + 1] = y; out[j * 3 + 2] = z; }
    idx[i] = j;
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(out.slice(0, nv * 3), 3));
  geo.setIndex(new T.BufferAttribute(nv > 65535 ? idx : new Uint16Array(idx), 1));
  return geo;
}
// Taubin smoothing (λ/μ) กันเมชหดและลบรอยขั้นบันไดของ marching cubes
function taubin(geo, iters) {
  const idx = geo.index.array, pos = geo.attributes.position.array, nv = pos.length / 3;
  const nb = new Array(nv); for (let i = 0; i < nv; i++) nb[i] = [];
  for (let i = 0; i < idx.length; i += 3) { const a = idx[i], b = idx[i + 1], c = idx[i + 2]; nb[a].push(b, c); nb[b].push(a, c); nb[c].push(a, b); }
  const tmp = new Float32Array(pos.length);
  const pass = (lam) => {
    for (let i = 0; i < nv; i++) {
      const L = nb[i]; if (!L.length) { tmp[i * 3] = pos[i * 3]; tmp[i * 3 + 1] = pos[i * 3 + 1]; tmp[i * 3 + 2] = pos[i * 3 + 2]; continue; }
      let sx = 0, sy = 0, sz = 0; for (let k = 0; k < L.length; k++) { const j = L[k] * 3; sx += pos[j]; sy += pos[j + 1]; sz += pos[j + 2]; }
      const inv = 1 / L.length, x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      tmp[i * 3] = x + (sx * inv - x) * lam; tmp[i * 3 + 1] = y + (sy * inv - y) * lam; tmp[i * 3 + 2] = z + (sz * inv - z) * lam;
    }
    pos.set(tmp);
  };
  for (let k = 0; k < iters; k++) { pass(0.5); pass(-0.53); }
}
// ตัดสามเหลี่ยมที่ไม่ต้องการออก (ใช้กับเชลล์ขน: เว้นรอบตา/จมูก)
function filterTriangles(geo, keep) {
  const idx = geo.index.array, pos = geo.attributes.position.array, out = [];
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    if (keep((pos[a] + pos[b] + pos[c]) / 3, (pos[a + 1] + pos[b + 1] + pos[c + 1]) / 3, (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3)) out.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  geo.setIndex(out); return geo;
}

// ---------- จานสี (sRGB → linear ครั้งเดียว) ----------
function palette(T) {
  const L = (hex) => { const c = new T.Color(hex).convertSRGBToLinear(); return [c.r, c.g, c.b]; };
  return {
    ground: L(0x7a6650),   // สีพื้นอะกูติ น้ำตาลเทาอุ่น
    groundL: L(0x94826b),  // พื้นสว่างขึ้นเล็กน้อย (ด่างเบาๆ)
    ground2: L(0x5e4e3c),  // พื้นเข้มลง (ปลายขนดำ ticking)
    stripe: L(0x1f1813),   // ลายดำน้ำตาล
    belly: L(0xd7cab2),    // ท้อง/อก ครีม
    chin: L(0xe9e1d2),     // คาง/ปาก ขาวนวล
    bridge: L(0xa88b70),   // สันจมูก น้ำตาลอ่อนอมชมพู
    earBack: L(0x2e2420),  // หลังหู
    earSpot: L(0xa08c72),  // รอยนิ้วโป้งบนหลังหู
    liner: L(0x1e1712),    // ขอบตา
    glasses: L(0xd2c3aa),  // วงสว่างรอบตา
    tailTip: L(0x241c16),
  };
}

// ---------- ฟังก์ชันลายขน 3 มิติ (พิกัดลำตัว) ----------
// ให้สี [r,g,b] ที่จุด (x,y,z) ในพิกัดลำตัว; feat = ฟีเจอร์เสริม (หัว/อุ้งเท้า) ที่คำนวณไว้แล้ว
function makeCoat(PAL) {
  const tmp = [0, 0, 0];
  const mix3 = (o, a, b, t) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; };
  // dark = ความเข้มลาย 0..1, light = ความอ่อน (ท้อง) 0..1, extra = สีพิเศษ [rgb] กับน้ำหนัก
  return function coat(out, x, y, z, dark, light, extra, ew) {
    const mott = fbm(x * 5 + 3, y * 5, z * 5, 2);                    // ด่างเบาๆ ของสีพื้น
    mix3(tmp, PAL.ground, PAL.groundL, sstep(0.35, 0.75, mott));
    mix3(out, tmp, PAL.belly, light);
    if (extra && ew > 0) mix3(out, out, extra, ew);
    mix3(out, out, PAL.stripe, clamp(dark, 0, 1));
    // ticking: ขนสลับปลายเข้ม-อ่อน ความถี่สูง
    const tk = vnoise(x * 60 + 5, y * 60, z * 60 + 2) - 0.5, tk2 = vnoise(x * 140, y * 140 + 3, z * 140) - 0.5;
    const m = 1 + tk * 0.22 + tk2 * 0.12;
    out[0] *= m; out[1] *= m; out[2] *= m;
  };
}

// ลายบนลำตัว (พิกัดลำตัว): แถบสันหลัง + ลายข้างโค้ง + ท้อง/อกอ่อน
function bodyPattern(x, y, z) {
  const n1 = fbm(x * 3.2, y * 3.2, z * 3.2 + 7, 3) - 0.5, n2 = fbm(x * 6 + 11, y * 6, z * 6, 2);
  const top = sstep(0.26, 0.44, y), az = Math.abs(z);
  const dorsal = sstep(0.075, 0.03, az + n1 * 0.05) * top;                                   // แถบกลางหลัง
  const phase = x * (2 * Math.PI / 0.165) + n1 * 3.6 + az * 2.2 + Math.sin(az * 9) * 0.35;     // ลายข้างแตกจากสันหลังโค้งลงข้าง
  let flank = sstep(0.25, 0.62, Math.sin(phase)) * sstep(0.08, 0.24, y) * sstep(0.03, 0.10, az);
  const phase2 = x * (2 * Math.PI / 0.165) + Math.PI + n1 * 3.6 + az * 2.2;                   // ลายแทรกเส้นบางระหว่างลายหลัก
  const flank2 = sstep(0.62, 0.85, Math.sin(phase2)) * sstep(0.10, 0.26, y) * sstep(0.12, 0.25, az) * 0.6;
  flank = Math.max(flank, flank2) * (0.5 + 0.5 * sstep(0.28, 0.55, n2));                     // ลายขาดเป็นช่วงแบบธรรมชาติ
  const belly = sstep(0.28, 0.06, y) * sstep(0.45, 0.2, az + 0.2 * (1 - sstep(0.1, 0.25, y))); // ท้อง/ใต้ลำตัว
  const chest = sstep(0.25, 0.55, x) * sstep(0.36, 0.12, y);                                   // อกครีม
  const light = Math.max(belly, chest * 0.9);
  const dark = Math.max(dorsal, flank * 0.95) * (1 - light * 0.9);
  return [dark, light];
}

export function buildCat(T, ctx) {
  const PAL = palette(T), coat = makeCoat(PAL);
  const geos = [], mats = [], texs = [];
  const G = (g) => { geos.push(g); return g; }, Mt = (m) => { mats.push(m); return m; };
  const g = new T.Group(); g.name = 'catB';
  const hit = [];

  // ---------- วัสดุ ----------
  // ลดจำนวนเชเดอร์ที่ต้องคอมไพล์เฟรมแรก: ขนใช้ DoubleSide ตั้งแต่ต้น (ใบหูด้านนอกจะได้ไม่ต้อง clone เป็นอีกโปรแกรม)
  // จมูก/กระจกตาใช้ MeshStandard (ไฮไลต์เปียกมาจาก env map อยู่แล้ว) เพื่อใช้โปรแกรมร่วมกับของอื่นในฉาก
  const fur = Mt(new T.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, sheen: 0.85, sheenColor: new T.Color(0xc9b79a).convertSRGBToLinear(), sheenRoughness: 0.62, envMapIntensity: 0.35, side: T.DoubleSide }));
  const skinPink = Mt(new T.MeshStandardMaterial({ color: new T.Color(0xd9a29a).convertSRGBToLinear(), roughness: 0.85, envMapIntensity: 0.25, side: T.BackSide })); // ใช้กับด้านในหูอย่างเดียว
  const noseMat = Mt(new T.MeshStandardMaterial({ color: new T.Color(0x9a5f58).convertSRGBToLinear(), roughness: 0.35, envMapIntensity: 0.6 }));
  const darkMat = Mt(new T.MeshStandardMaterial({ color: new T.Color(0x24191a).convertSRGBToLinear(), roughness: 0.7, envMapIntensity: 0.2 }));
  const mouthMat = Mt(new T.MeshBasicMaterial({ color: new T.Color(0x2a0c10).convertSRGBToLinear() })); // โพรงปาก: ไม่รับแสง ให้ดูเป็นช่องมืด
  const whiskerMat = Mt(new T.MeshStandardMaterial({ color: new T.Color(0xf0e9dc).convertSRGBToLinear(), roughness: 0.5, transparent: true, opacity: 0.85, envMapIntensity: 0.3 }));
  const tuftMat = Mt(new T.MeshStandardMaterial({ color: new T.Color(0xe9dfd0).convertSRGBToLinear(), roughness: 0.9, transparent: true, opacity: 0.8 }));
  const pupilMat = Mt(new T.MeshStandardMaterial({ color: 0x000000, roughness: 0.35, envMapIntensity: 0 }));
  const corneaMat = Mt(new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, roughness: 0.04, metalness: 0, envMapIntensity: 0.9, depthWrite: false }));
  const glintMat = Mt(new T.MeshBasicMaterial({ color: 0xffffff }));

  // ---------- 1) ลำตัว ----------
  const HP = { x: 0.52, y: 0.33, z: 0 };            // จุดหมุนหัว = โคนคอ (พิกัดลำตัว)
  const bodyF = makeField();
  bodyF.ball(-0.52, 0.27, 0, 0.33, 0.27, 0.35);                    // สะโพก/ก้น
  bodyF.ball(-0.42, 0.20, 0.28, 0.30, 0.20, 0.21, 0.9);            // ต้นขาหลังพับ (ขวา +z)
  bodyF.ball(-0.42, 0.20, -0.28, 0.30, 0.20, 0.21, 0.9);           // ต้นขาหลังพับ (ซ้าย)
  bodyF.ball(-0.30, 0.10, 0.36, 0.18, 0.10, 0.13, 0.55);           // ขาหลังท่อนล่างแนบพื้น
  bodyF.ball(-0.30, 0.10, -0.36, 0.18, 0.10, 0.13, 0.55);
  bodyF.cap(-0.45, 0.30, 0, 0.30, 0.31, 0, 0.30, 0.29, 0.95, 1.05); // ลำตัว/กระดูกสันหลัง
  bodyF.ball(0.28, 0.30, 0.13, 0.20, 0.25, 0.20, 0.6);             // สะบัก
  bodyF.ball(0.28, 0.30, -0.13, 0.20, 0.25, 0.20, 0.6);
  bodyF.ball(0.15, 0.36, 0, 0.25, 0.22, 0.26, 0.5);                // หลังส่วนบน
  bodyF.ball(0.42, 0.24, 0, 0.22, 0.24, 0.27);                     // อก
  bodyF.ball(0.45, 0.10, 0, 0.22, 0.10, 0.25, 0.6);                // อกส่วนล่างแนบพื้น
  bodyF.ball(HP.x, HP.y + 0.01, 0, 0.15, 0.15, 0.16, 0.7);         // โคนคอ (ให้กลืนกับคอของหัว)
  const bodyField = (x, y, z) => { let f = bodyF.evalRow(x, y, z); if (y < 0.02) f -= (0.02 - y) * 150; return f; };
  const bodyGeo = G(bakeField(T, 56, [-1.02, 0.88, -0.5, 1.4, -0.95, 0.95], bodyField, { row: bodyF.row, fur: 0.0035, furFreq: 26, floor: 0.004, low: { smooth: 3, floor: 0.006 } }));
  const bodyLow = G(bodyGeo.userData.low); delete bodyGeo.userData.low;
  paintBody(bodyGeo); bodyGeo.computeBoundingBox();
  const bodyG = new T.Group(); g.add(bodyG);
  const bodyMesh = ctx.mesh(bodyGeo, fur); bodyG.add(bodyMesh);
  // ตัวรับการแตะ = เมชความละเอียดต่ำที่ซ่อนไว้ (Raycaster ไม่สน visible) — ยิงรังสีถูกกว่าเมชเต็ม ~4 เท่า รูปทรงเดียวกัน
  const bodyHit = new T.Mesh(bodyLow, fur); bodyHit.visible = false; bodyLow.computeBoundingBox(); bodyG.add(bodyHit); hit.push(bodyHit);

  function paintBody(geo) {
    const p = geo.attributes.position.array, n = p.length / 3, col = new Float32Array(n * 3), o = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2], dl = bodyPattern(x, y, z);
      coat(o, x, y, z, dl[0], dl[1], null, 0); col[i * 3] = o[0]; col[i * 3 + 1] = o[1]; col[i * 3 + 2] = o[2];
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
  }

  // ---------- 2) อุ้งเท้าหน้า (มีนิ้ว) ----------
  const pawF = makeField();
  [1, -1].forEach(s => {
    const zc = s * 0.135;
    pawF.cap(0.40, 0.075, zc, 0.70, 0.072, zc + s * 0.005, 0.072, 0.074, 0.85, 1.0);
    for (let k = 0; k < 4; k++) { const zz = zc + (k - 1.5) * 0.036; pawF.ball(0.755 - Math.abs(k - 1.5) * 0.012, 0.058, zz, 0.032, 0.03, 0.021, 0.85); }
  });
  const pawField = (x, y, z) => { let f = pawF.evalRow(x, y, z); if (y < 0.02) f -= (0.02 - y) * 150; return f; };
  const pawGeo = G(bakeField(T, 32, [0.30, 0.92, -0.20, 0.42, -0.31, 0.31], pawField, { row: pawF.row, fur: 0.002, furFreq: 40, floor: 0.004, smooth: 2 }));
  {
    const p = pawGeo.attributes.position.array, n = p.length / 3, col = new Float32Array(n * 3), o = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
      const bracelet = sstep(0.62, 0.50, x) * sstep(0.09, 0.125, y) * (0.6 + 0.4 * Math.sin(x * 60)); // ลายกำไลบนหลังขา
      coat(o, x, y, z, bracelet * 0.7, 0.8 + 0.2 * sstep(0.55, 0.75, x), null, 0); col[i * 3] = o[0]; col[i * 3 + 1] = o[1]; col[i * 3 + 2] = o[2];
    }
    pawGeo.setAttribute('color', new T.BufferAttribute(col, 3));
  }
  pawGeo.computeBoundingBox();
  const pawsG = new T.Group(); pawsG.position.set(0.45, 0, 0); bodyG.add(pawsG);
  const pawsMesh = ctx.mesh(pawGeo, fur); pawsMesh.position.set(-0.45, 0, 0); pawsG.add(pawsMesh); hit.push(pawsMesh);

  // ---------- 3) หัว (พิกัดหัว: จุดกำเนิด = โคนคอ, +x ไปข้างหน้า) ----------
  const EYE = { x: 0.322, y: 0.113, z: 0.086 }, EYE_R = 0.058;   // ตาโต วางต่ำลง (ผู้ดูตัดสินว่าหน้าอ่านเป็นแมวจริงทันที)
  const ER = EYE_R / 0.044;                                          // อัตราส่วนเทียบขนาดตาเดิม — ทุกอย่างที่ผูกกับตาเลื่อนตามนี้
  const headF = makeField();
  headF.cap(-0.22, -0.09, 0, 0.06, 0.06, 0, 0.14, 0.15);            // คอ (ฝังในไหล่)
  headF.ball(0.20, 0.135, 0, 0.185, 0.16, 0.175);                    // กะโหลก
  headF.ball(0.11, 0.12, 0, 0.16, 0.15, 0.16, 0.6);                  // ท้ายทอยกลม
  headF.ball(0.30, 0.20, 0, 0.12, 0.07, 0.13, 0.65);                 // หน้าผาก
  headF.ball(0.28, 0.04, 0.125, 0.11, 0.085, 0.085, 0.9);            // แก้ม
  headF.ball(0.28, 0.04, -0.125, 0.11, 0.085, 0.085, 0.9);
  headF.ball(0.385, 0.065, 0, 0.085, 0.062, 0.088);                  // ปาก/จมูกยื่น
  headF.ball(0.42, 0.06, 0.04, 0.05, 0.04, 0.045, 0.8);              // แผ่นหนวด
  headF.ball(0.42, 0.06, -0.04, 0.05, 0.04, 0.045, 0.8);
  headF.cap(0.30, 0.15, 0, 0.43, 0.10, 0, 0.05, 0.04, 1, 1, 0.6);    // สันจมูก
  headF.ball(0.30, -0.02, 0, 0.13, 0.06, 0.11, 0.7);                 // กราม (บน)
  headF.ball(0.33, 0.185, 0.085, 0.06, 0.035, 0.05, 0.5);            // สันคิ้ว
  headF.ball(0.33, 0.185, -0.085, 0.06, 0.035, 0.05, 0.5);
  headF.ball(0.16, 0.26, 0.115, 0.06, 0.05, 0.06, 0.6);              // โคนหู
  headF.ball(0.16, 0.26, -0.115, 0.06, 0.05, 0.06, 0.6);
  headF.ball(EYE.x + 0.026, EYE.y + 0.002, EYE.z + 0.014, 0.062, 0.080, 0.070, -0.46);   // เบ้าตา (ลบ) ตื้นๆ ให้ลูกตาโตโผล่พอดี (ปรับด้วยตาราง F-ISO บนผิวลูกตา)
  headF.ball(EYE.x + 0.026, EYE.y + 0.002, -EYE.z - 0.014, 0.062, 0.080, 0.070, -0.46);
  headF.ball(0.30, -0.13, 0, 0.16, 0.07, 0.14, -0.5);                // ใต้คาง/ลำคอ (ลบ)
  const headGeo = G(bakeField(T, 48, [-0.30, 0.56, -0.35, 0.51, -0.43, 0.43], headF.evalRow, { row: headF.row, fur: 0.0025, furFreq: 34, low: { smooth: 3 } }));
  const headLow = G(headGeo.userData.low); delete headGeo.userData.low;

  // ลายบนหัว (พิกัดหัว) → คืน [dark, light, extra, ew]
  const headPattern = (hx, hy, hz) => {
    const az = Math.abs(hz), bx = HP.x + hx, by = HP.y + hy, bz = hz;
    const base = bodyPattern(bx, by, bz);
    let dark = base[0] * sstep(0.10, -0.05, hx) * 0.8, light = 0, extra = null, ew = 0;
    const nz = fbm(hx * 9, hy * 9, hz * 9 + 5, 2) - 0.5;
    // ปาก/แผ่นหนวด/คาง สีขาวนวล
    const muz = sstep(0.31, 0.39, hx + nz * 0.03) * sstep(0.135, 0.075, hy) + sstep(0.30, 0.37, hx) * sstep(0.02, -0.03, hy) * 0.8;
    light = clamp(muz, 0, 1); if (light > 0.3) { extra = PAL.chin; ew = light * 0.8; }
    // สันจมูกน้ำตาลอ่อน
    const bridge = sstep(0.05, 0.02, az) * sstep(0.29, 0.38, hx) * sstep(0.17, 0.10, hy) * sstep(0.05, 0.09, hy);
    if (bridge > 0.05) { extra = PAL.bridge; ew = Math.max(ew, bridge * 0.85); }
    // ตัว M บนหน้าผาก — เส้นบาง สีน้ำตาลกลาง (ไม่ดำ) และเริ่มสูงกว่าตาพอสมควร ไม่ให้ดูขมวดคิ้ว
    if (hx > 0.18 && hy > 0.18) {
      const d = polyDist(hz, hy + nz * 0.015, M_PTS);
      dark = Math.max(dark, sstep(0.013, 0.005, d) * sstep(0.19, 0.23, hy) * 0.5);
    }
    // ลายเส้นบนกะโหลกไปถึงท้ายทอย (ต่อจาก M)
    if (hx < 0.24) {
      const sk = sstep(0.18, 0.23, hy) * sstep(0.26, 0.16, hx);
      const s1 = sstep(0.018, 0.006, Math.abs(az - 0.045 + nz * 0.02)), s2 = sstep(0.018, 0.006, Math.abs(az - 0.105 + nz * 0.02)), s0 = sstep(0.02, 0.006, az + nz * 0.02);
      dark = Math.max(dark, Math.max(s0, s1, s2) * sk * 0.75);
    }
    // แถบแก้ม 2 เส้นวิ่งจากใต้หางตาไปหลัง (อยู่ต่ำกว่าระดับตา และจางลงเมื่อเข้าใกล้ขอบตา)
    if (az > 0.10 && hx > 0.08 && hx < 0.32) {
      const c1 = 0.082 + 0.35 * (hx - 0.30) + nz * 0.02, c2 = 0.025 + 0.25 * (hx - 0.30) + nz * 0.02;
      const dEye = Math.sqrt((hx - EYE.x) * (hx - EYE.x) + (hy - EYE.y) * (hy - EYE.y) * 1.3 + (az - EYE.z) * (az - EYE.z));
      const s = Math.max(sstep(0.014, 0.005, Math.abs(hy - c1)), sstep(0.014, 0.005, Math.abs(hy - c2))) * sstep(0.32, 0.26, hx) * sstep(0.08, 0.13, hx) * sstep(EYE_R * 1.1, EYE_R * 1.5, dEye);
      dark = Math.max(dark, s * 0.7);
    }
    // ขอบตา (เส้นบาง เข้มเฉพาะด้านนอก หัวตาอ่อน) + วงครีมรอบตา (เด่นที่หัวตาและใต้ตา) + เส้นมาสคาร่ากวาดขึ้นไปทางหู
    // ทุกระยะผูกกับ EYE_R เพื่อให้เลื่อนตามขนาดตา
    for (let s = -1; s <= 1; s += 2) {
      const dx = hx - EYE.x, dy = hy - EYE.y, dz = hz - s * EYE.z, d = Math.sqrt(dx * dx + dy * dy * 1.3 + dz * dz);
      const outward = az - EYE.z;                                                           // + = ไปทางหางตา, − = ไปทางหัวตา
      const liner = sstep(EYE_R * 1.32, EYE_R * 1.18, d) * sstep(EYE_R * 0.95, EYE_R * 1.06, d) * mix(0.28, 0.85, sstep(-0.02, 0.025, outward));
      const mu = clamp(((hx - MASC[0]) * MASC[4] + (hy - MASC[1]) * MASC[5]) / MASC[6], 0, 1);  // ตำแหน่งตามเส้นมาสคาร่า 0..1
      const mdx = hx - MASC[0] - MASC[4] * mu, mdy = hy - MASC[1] - MASC[5] * mu;
      const mascara = sstep(0.0085, 0.003, Math.sqrt(mdx * mdx + mdy * mdy)) * sstep(EYE.z + EYE_R * 0.75, EYE.z + EYE_R * 1.0, az) * (1 - mu * 0.55);
      if (liner > 0.01 || mascara > 0.01) { extra = PAL.liner; ew = Math.max(ew, Math.max(liner, mascara * 0.8)); }
      const ring = sstep(EYE_R * 1.22, EYE_R * 1.32, d) * sstep(EYE_R * 1.72, EYE_R * 1.5, d) * Math.max(sstep(EYE.y + 0.03, EYE.y - 0.01, hy), sstep(0.015, -0.025, outward) * 0.9, 0.35);
      if (ring > 0.05 && ew < 0.3) { extra = PAL.glasses; ew = Math.max(ew, ring * 0.8); }
    }
    // หน้าผากระหว่างหู เข้มขึ้นเล็กน้อย / หูโคน
    dark = Math.max(dark, sstep(0.24, 0.30, hy) * sstep(0.08, 0.13, az) * 0.5);
    return [dark, light, extra, ew];
  };
  const M_PTS = [[-0.12, 0.31], [-0.06, 0.215], [0, 0.275], [0.06, 0.215], [0.12, 0.31]];
  // เส้นมาสคาร่า (พิกัดหัว x,y บนแก้มด้านข้าง): จากหางตาเฉียงขึ้นไปทางโคนหู [x0, y0, x1, y1, dx, dy, len²]
  const MASC = (() => { const x0 = EYE.x - 0.004, y0 = EYE.y + 0.006, x1 = 0.205, y1 = 0.215; return [x0, y0, x1, y1, x1 - x0, y1 - y0, (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)]; })();
  function polyDist(px, py, pts) {
    let best = 1e9;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0], by = pts[i + 1][1], dx = bx - ax, dy = by - ay;
      let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy); t = clamp(t, 0, 1);
      const ex = px - ax - dx * t, ey = py - ay - dy * t, d = Math.sqrt(ex * ex + ey * ey); if (d < best) best = d;
    }
    return best;
  }
  const coatHead = (out, hx, hy, hz) => { const f = headPattern(hx, hy, hz); coat(out, HP.x + hx, HP.y + hy, hz, f[0], f[1], f[2], f[3]); };
  function paintHead(geo) {
    const p = geo.attributes.position.array, n = p.length / 3, col = new Float32Array(n * 3), o = [0, 0, 0];
    for (let i = 0; i < n; i++) { coatHead(o, p[i * 3], p[i * 3 + 1], p[i * 3 + 2]); col[i * 3] = o[0]; col[i * 3 + 1] = o[1]; col[i * 3 + 2] = o[2]; }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
  }
  paintHead(headGeo); headGeo.computeBoundingBox();
  const headPivot = new T.Group(); headPivot.position.set(HP.x, HP.y, HP.z); bodyG.add(headPivot);
  const headG = new T.Group(); headPivot.add(headG);
  const headMesh = ctx.mesh(headGeo, fur); headG.add(headMesh);
  const headHit = new T.Mesh(headLow, fur); headHit.visible = false; headLow.computeBoundingBox(); headG.add(headHit); hit.push(headHit); // ตัวรับการแตะซ่อนไว้ (ดูหมายเหตุที่ลำตัว)

  // ---------- 4) ขากรรไกรล่าง (หาว) ----------
  const JAW = { x: 0.26, y: 0.0, z: 0 };
  const jawF = makeField();
  jawF.cap(0.24, -0.025, 0, 0.395, -0.012, 0, 0.085, 0.045, 0.55, 1.0);
  jawF.ball(0.405, -0.012, 0, 0.046, 0.034, 0.046, 0.9);              // คาง
  const jawGeo = G(bakeField(T, 24, [0.16, 0.50, -0.17, 0.17, -0.17, 0.17], jawF.evalRow, { row: jawF.row, fur: 0.0018, furFreq: 40, smooth: 2 }));
  paintHead(jawGeo); jawGeo.translate(-JAW.x, -JAW.y, -JAW.z); jawGeo.computeBoundingBox();
  const jawG = new T.Group(); jawG.position.set(JAW.x, JAW.y, JAW.z); headG.add(jawG);
  const jawMesh = ctx.mesh(jawGeo, fur); jawG.add(jawMesh); hit.push(jawMesh);
  const mouthIn = ctx.mesh(G(new T.SphereGeometry(1, 14, 10)), mouthMat, true); mouthIn.scale.set(0.018, 0.038, 0.038); mouthIn.position.set(0.41 - JAW.x, 0.018, 0); jawG.add(mouthIn); // โพรงปาก ติดกับขากรรไกร แบนๆ อยู่หลังริมฝีปากล่าง (ซ่อนในปากตอนหุบ)
  // ชิ้นเล็กนิ่งที่ใช้วัสดุเดียวกันใต้พ่อแม่เดียวกัน รวมเป็นเมชเดียว (ลด draw call) — ใส่ตำแหน่ง/การหมุนลงในเรขาคณิตก่อนรวม
  const _tmpO = new T.Object3D();
  const placed = (geo, px, py, pz, rx, ry, rz) => { _tmpO.position.set(px, py, pz); _tmpO.rotation.set(rx || 0, ry || 0, rz || 0); _tmpO.updateMatrix(); geo.applyMatrix4(_tmpO.matrix); return geo; };
  const mergeInto = (list) => { const m = mergeBufferGeometries(list, false); list.forEach(x => x.dispose()); return G(m); };
  // ปากปิด: ร่องกลาง + ริมฝีปากโค้ง 2 ข้าง + รูจมูก 2 ข้าง → เมชเดียว (darkMat)
  {
    const parts = [placed(new T.CylinderGeometry(0.0022, 0.0022, 0.022, 5), 0.468, 0.06, 0, 0, 0, -0.12)];
    [1, -1].forEach(s => {
      const cv = new T.CatmullRomCurve3([new T.Vector3(0.468, 0.048, 0), new T.Vector3(0.463, 0.040, s * 0.012), new T.Vector3(0.453, 0.043, s * 0.026), new T.Vector3(0.440, 0.052, s * 0.038)]);
      parts.push(new T.TubeGeometry(cv, 8, 0.0018, 4, false));
      parts.push(placed(new T.SphereGeometry(0.0045, 6, 5), 0.473, 0.081, s * 0.0095));
    });
    headG.add(ctx.mesh(mergeInto(parts), darkMat, true));
  }
  // จมูก
  const nose = ctx.mesh(G(new T.SphereGeometry(1, 16, 12)), noseMat, true); nose.scale.set(0.014, 0.015, 0.024); nose.position.set(0.462, 0.086, 0); headG.add(nose);

  // ---------- 5) ตา ----------
  const irisTex = ctx.texture(ctx.cv(256, 128, (x, w, h) => {
    x.fillStyle = '#3a2d22'; x.fillRect(0, 0, w, h);
    const cx = w * 0.25, cy = h * 0.5, r = 50;                       // รัศมี 50px ≈ กรวย 70° รอบแกนมอง → ม่านตาเต็มช่องตาเมื่อลืม
    const gr = x.createRadialGradient(cx, cy, 2, cx, cy, r);
    gr.addColorStop(0, '#d8a83c'); gr.addColorStop(0.45, '#b99a3e'); gr.addColorStop(0.8, '#6f8b38'); gr.addColorStop(0.95, '#3a4520'); gr.addColorStop(1, '#231d14');
    x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 140; i++) { // เส้นใยม่านตา
      const a = rnd() * Math.PI * 2, r0 = r * (0.12 + rnd() * 0.2), r1 = r * (0.7 + rnd() * 0.28), br = rnd();
      x.strokeStyle = br > 0.5 ? `rgba(255,225,140,${(0.08 + rnd() * 0.22).toFixed(2)})` : `rgba(40,30,10,${(0.1 + rnd() * 0.25).toFixed(2)})`;
      x.lineWidth = 0.6 + rnd() * 1.2; x.beginPath(); x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); x.lineTo(cx + Math.cos(a + (rnd() - 0.5) * 0.15) * r1, cy + Math.sin(a + (rnd() - 0.5) * 0.15) * r1); x.stroke();
    }
    const gl = x.createRadialGradient(cx, cy, r * 0.05, cx, cy, r * 0.5); gl.addColorStop(0, 'rgba(255,200,90,0.35)'); gl.addColorStop(1, 'rgba(255,200,90,0)'); x.fillStyle = gl; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  }));
  texs.push(irisTex);
  const irisMat = Mt(new T.MeshStandardMaterial({ map: irisTex, roughness: 0.55, envMapIntensity: 0.3 }));
  const eyeballGeo = G(new T.SphereGeometry(EYE_R, 26, 18));
  // ลำดับชั้นของตา (รัศมีจากกึ่งกลางลูกตา) เว้นห่างกันชั้นละ ≥0.002 ให้พ้นความละเอียดของ depth buffer ที่ระยะกล้องจริง (18–32 หน่วย)
  // ลูกตา EYE_R · รูม่านตา +0.0015 · กระจกตา +0.0035 · เปลือกตาล่าง +0.0055 · เปลือกตาบน +0.0065 · เส้นตาหลับ +0.0085
  // กระจกตาอยู่ "ใต้" เปลือกตา จึงถูกเปลือกตาทึบบังตอนหลับ (ไม่เป็นฟิล์มเงาวาวบนเปลือกตา และไม่ z-fight)
  const corneaGeo = G(new T.SphereGeometry(EYE_R + 0.0035, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62));
  corneaGeo.rotateX(Math.PI / 2); // ขั้วโดมชี้ +z (แกนมอง)
  // เส้นโค้งของรอยตาหลับบนผิวทรงกลม (ปลายสองข้างยกขึ้นเล็กน้อย)
  class LidLine extends T.Curve {
    constructor(R) { super(); this.R = R; }
    getPoint(t, target) {
      const a = (2 * t - 1) * 0.95, e = -0.15 + 0.13 * (2 * t - 1) * (2 * t - 1), ce = Math.cos(e), R = this.R;
      target = target || new T.Vector3(); return target.set(R * ce * Math.sin(a), R * Math.sin(e), R * ce * Math.cos(a));
    }
  }
  const lidGeoU = G(lidGeometry(T, EYE_R + 0.0065, true)), lidGeoD = G(lidGeometry(T, EYE_R + 0.0055, false));
  const eyes = [];
  const _v = new T.Vector3();
  [1, -1].forEach(s => {
    const base = new T.Group(); base.position.set(EYE.x, EYE.y, s * EYE.z);
    // lookAt ใช้พิกัดโลก — ตอนนี้ base ยังไม่ถูกใส่ใต้ headG จึงต้องให้เป้าหมายเป็นพิกัดหัว (ไม่บวก HP) ทิศแกนมอง = (1, 0.12, ±0.42)
    _v.set(EYE.x + 1.0, EYE.y + 0.12, s * (EYE.z + 0.42)); base.lookAt(_v);
    base.rotateZ(-s * 0.16); // เอียงหางตาขึ้น (หมุนรอบแกนมอง)
    headG.add(base);
    const eg = new T.Group(); base.add(eg);
    const ball = ctx.mesh(eyeballGeo, irisMat, true); eg.add(ball); hit.push(ball);
    const pupil = makePupil(T, EYE_R + 0.0015, EYE_R * 0.78); G(pupil.geo); const pm = new T.Mesh(pupil.geo, pupilMat); eg.add(pm);
    const cornea = new T.Mesh(corneaGeo, corneaMat); cornea.renderOrder = 3; eg.add(cornea);
    const glint = new T.Mesh(G(new T.SphereGeometry(0.002, 8, 6)), glintMat); glint.position.set(s * 0.012 * ER, 0.018 * ER, EYE_R + 0.003); eg.add(glint); // ผิวนอกสุด +0.005 < เปลือกตาล่าง จึงถูกเปลือกตาบังตามปกติ
    // เปลือกตา (สีตามลายขน + ขอบตาดำ) — ระบายสีตามตำแหน่งจริงบนหัว
    const lidU = new T.Mesh(lidGeoU.clone(), fur), lidD = new T.Mesh(lidGeoD.clone(), fur); G(lidU.geometry); G(lidD.geometry);
    lidU.castShadow = lidD.castShadow = true; base.add(lidU); base.add(lidD);
    base.updateMatrixWorld(true); headG.updateMatrixWorld(true);
    paintLid(lidU, base); paintLid(lidD, base);
    // เส้นตาหลับ (ท่อโค้งบางๆ บนผิวเปลือกตา)
    const line = new T.Mesh(G(new T.TubeGeometry(new LidLine(EYE_R + 0.0085), 12, 0.0026 * ER, 4, false)), Mt(new T.MeshStandardMaterial({ color: new T.Color(0x17110d).convertSRGBToLinear(), roughness: 0.8, transparent: true, opacity: 1 })));
    base.add(line);
    eyes.push({ s, base, eg, pupil, lidU, lidD, line, glint, open: 0, w: 0 });
  });
  function paintLid(m, base) {
    const p = m.geometry.attributes.position.array, n = p.length / 3, col = new Float32Array(n * 3), o = [0, 0, 0], edge = m.geometry.userData.edge, c = base.position;
    for (let i = 0; i < n; i++) {
      _v.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]).applyMatrix4(base.matrix); // → พิกัดหัว (base อยู่ใต้ headG โดยตรง)
      // เปลือกตาอยู่ในแถบอายไลเนอร์พอดี ถ้าเก็บสีตรงนั้นตาหลับจะเป็นวงดำเหมือนใส่แว่นกันแดด
      // → เก็บสีขนจากนอกวงตา (ห่างศูนย์กลางตา 1.6 เท่า) ให้เปลือกตาเป็นสีขนจริง เหลือเส้นดำแค่ที่ขอบเปลือกตา
      _v.sub(c).multiplyScalar(1.6).add(c);
      coatHead(o, _v.x, _v.y, _v.z);
      const k = sstep(0.30, 0.10, edge[i]); o[0] = mix(o[0], PAL.liner[0], k); o[1] = mix(o[1], PAL.liner[1], k); o[2] = mix(o[2], PAL.liner[2], k);
      col[i * 3] = o[0]; col[i * 3 + 1] = o[1]; col[i * 3 + 2] = o[2];
    }
    m.geometry.setAttribute('color', new T.BufferAttribute(col, 3));
  }

  // ---------- 6) หู ----------
  const ears = [];
  [1, -1].forEach(s => {
    const eg = new T.Group(); eg.position.set(0.14, 0.255, s * 0.105); headG.add(eg);
    const th0 = Math.PI / 2 + Math.PI * 0.45, thL = Math.PI * 2 - Math.PI * 0.9;
    const outer = G(new T.ConeGeometry(0.076, 0.19, 14, 3, true, th0, thL)); outer.translate(0, 0.095, 0);
    paintEar(outer);
    const om = ctx.mesh(outer, fur); eg.add(om); hit.push(om); // fur เป็น DoubleSide อยู่แล้ว ไม่ต้อง clone
    const inner = G(new T.ConeGeometry(0.062, 0.168, 12, 1, true, th0 + 0.18, thL - 0.36)); inner.translate(0.006, 0.084, 0);
    const im = new T.Mesh(inner, skinPink); im.receiveShadow = true; eg.add(im);
    { // ขนในหู 4 เส้น → เมชเดียวต่อหู
      const parts = [];
      for (let k = 0; k < 4; k++) parts.push(placed(new T.CylinderGeometry(0.0015, 0.0004, 0.05, 4), 0.014 + k * 0.005, 0.03 + k * 0.01, s * (-0.026 + k * 0.013), s * (0.35 - k * 0.2), 0, 0.55 - k * 0.08));
      eg.add(new T.Mesh(mergeInto(parts), tuftMat));
    }
    ears.push({ s, g: eg, tw: 0, twT: -1, next: 1 + Math.random() * 3 });
  });
  function paintEar(geo) {
    const p = geo.attributes.position.array, n = p.length / 3, col = new Float32Array(n * 3), o = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2], v = y / 0.19, th = Math.atan2(x, z);
      const backness = sstep(-0.2, 0.8, -Math.sin(th));                    // ด้านหลังหู (x<0) เข้ม
      const spot = sstep(0.5, 0.92, -Math.sin(th)) * sstep(0.28, 0.42, v) * sstep(0.74, 0.6, v); // รอยนิ้วโป้งสีอ่อน
      o[0] = mix(PAL.earBack[0], PAL.ground[0], (1 - backness) * 0.5); o[1] = mix(PAL.earBack[1], PAL.ground[1], (1 - backness) * 0.5); o[2] = mix(PAL.earBack[2], PAL.ground[2], (1 - backness) * 0.5);
      o[0] = mix(o[0], PAL.earSpot[0], spot); o[1] = mix(o[1], PAL.earSpot[1], spot); o[2] = mix(o[2], PAL.earSpot[2], spot);
      const rim = sstep(0.8, 1.0, v); o[0] = mix(o[0], PAL.groundL[0], rim * 0.4); o[1] = mix(o[1], PAL.groundL[1], rim * 0.4); o[2] = mix(o[2], PAL.groundL[2], rim * 0.4);
      const tk = 1 + (vnoise(x * 90, y * 90, z * 90) - 0.5) * 0.25; col[i * 3] = o[0] * tk; col[i * 3 + 1] = o[1] * tk; col[i * 3 + 2] = o[2] * tk;
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
  }

  // ---------- 7) หนวด ----------
  const whiskG = new T.Group(); headG.add(whiskG);
  { // หนวด 14 เส้น → เมชเดียว (ทุกเส้นนิ่งเทียบกับ whiskG)
    const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), d = new T.Vector3(), parts = [];
    [1, -1].forEach(s => {
      for (let k = 0; k < 5; k++) {
        a.set(0.442, 0.032 + k * 0.011, s * (0.048 + k * 0.004));
        d.set(0.30 - k * 0.10, -0.30 + k * 0.16, s * 1).normalize();
        const len = 0.30 - Math.abs(k - 2) * 0.035;
        c.copy(a).addScaledVector(d, len); b.copy(a).addScaledVector(d, len * 0.5); b.y += 0.028; c.y -= 0.01;
        parts.push(new T.TubeGeometry(new T.QuadraticBezierCurve3(a.clone(), b.clone(), c.clone()), 7, 0.0022, 3, false));
      }
      for (let k = 0; k < 2; k++) { // หนวดคิ้ว
        a.set(0.31 + k * 0.02, 0.19, s * (0.07 + k * 0.02)); d.set(0.35, 0.75, s * 0.6).normalize();
        c.copy(a).addScaledVector(d, 0.14); b.copy(a).addScaledVector(d, 0.07); b.y += 0.01;
        parts.push(new T.TubeGeometry(new T.QuadraticBezierCurve3(a.clone(), b.clone(), c.clone()), 5, 0.0018, 3, false));
      }
    });
    whiskG.add(new T.Mesh(mergeInto(parts), whiskerMat));
  }

  // ---------- 8) เชลล์ขนโปร่ง (2 ชั้น ความละเอียดต่ำ) ----------
  const furAlpha = new T.CanvasTexture(ctx.cv(256, 256, (x, w, h) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h); let sd = 5; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 4200; i++) { const px = rnd() * w, py = rnd() * h, an = rnd() * Math.PI * 2, l = 2 + rnd() * 5, v = 120 + rnd() * 135; x.strokeStyle = `rgb(${v},${v},${v})`; x.lineWidth = 0.7 + rnd() * 0.9; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(an) * l, py + Math.sin(an) * l); x.stroke(); }
  }));
  furAlpha.wrapS = furAlpha.wrapT = T.RepeatWrapping; texs.push(furAlpha);
  const shellMat = (op) => Mt(new T.MeshPhysicalMaterial({ vertexColors: true, alphaMap: furAlpha, transparent: true, opacity: op, depthWrite: false, alphaTest: 0.06, roughness: 0.9, sheen: 0.6, sheenColor: new T.Color(0xd8c8ac).convertSRGBToLinear(), sheenRoughness: 0.7, envMapIntensity: 0.25 }));
  const shellMats = [shellMat(0.58), shellMat(0.24)];
  function addShells(parent, geoLow, paint, keep, offs) {
    for (let k = 0; k < offs.length; k++) {
      const sg = G(geoLow.clone()); const p = sg.attributes.position.array, nm = sg.attributes.normal.array, uv = new Float32Array((p.length / 3) * 2);
      for (let i = 0, j = 0; i < p.length; i += 3, j += 2) { p[i] += nm[i] * offs[k]; p[i + 1] += nm[i + 1] * offs[k]; p[i + 2] += nm[i + 2] * offs[k]; uv[j] = p[i] * 9 + p[i + 1] * 3; uv[j + 1] = p[i + 2] * 9 + p[i + 1] * 4; }
      sg.setAttribute('uv', new T.BufferAttribute(uv, 2)); paint(sg); if (keep) filterTriangles(sg, keep);
      { const c = sg.attributes.color.array, f = 0.82 - k * 0.1; for (let i = 0; i < c.length; i++) c[i] *= f; } // ปลายขนชั้นนอกเข้มกว่าโคน
      const m = new T.Mesh(sg, shellMats[k]); m.renderOrder = 1 + k; m.castShadow = false; m.receiveShadow = true; parent.add(m);
    }
  }
  // bodyLow/headLow (res 28/24) ได้มาจากการอบสนามเดิมตอนอบเมชหลัก (ดู bakeField opt.low) — ใช้ทั้งเป็นต้นแบบเชลล์และตัวรับการแตะ
  addShells(bodyMesh, bodyLow, paintBody, (x, y) => y > 0.05, [0.008, 0.016]);
  addShells(headMesh, headLow, paintHead, (x, y, z) => {
    for (let s = -1; s <= 1; s += 2) { const dx = x - EYE.x, dy = y - EYE.y, dz = z - s * EYE.z; if (dx * dx + dy * dy + dz * dz < EYE_R * 1.7 * EYE_R * 1.7) return false; }
    if (x > 0.40 && y < 0.11 && y > 0.02 && Math.abs(z) < 0.06) return false; // จมูก/ปาก
    return true;
  }, [0.007, 0.014]);

  // ---------- 9) หาง (ท่อสร้างใหม่ทุกเฟรม) ----------
  const TN = 30, TR = 8, tailPos = new Float32Array((TN + 1) * TR * 3), tailNrm = new Float32Array((TN + 1) * TR * 3), tailCol = new Float32Array((TN + 1) * TR * 3);
  const tailIdx = [];
  for (let i = 0; i < TN; i++) for (let j = 0; j < TR; j++) { const a = i * TR + j, b = i * TR + (j + 1) % TR, c = a + TR, d = b + TR; tailIdx.push(a, b, c, b, d, c); }
  {
    const o = [0, 0, 0];
    for (let i = 0; i <= TN; i++) {
      const s = i / TN, ring = Math.max(0, Math.sin(s * Math.PI * 2 * 3.3 + 1.2)), rings = sstep(0.55, 0.9, ring) * sstep(0.08, 0.2, s), tip = sstep(0.88, 0.97, s);
      for (let j = 0; j < TR; j++) {
        const ang = (j / TR) * Math.PI * 2, up = Math.cos(ang);          // ang 0 = ด้านบน
        coat(o, -0.6 + s * 1.5, 0.1, 0.5 + s * 0.3, Math.max(rings * (0.5 + 0.5 * up), tip) , sstep(0.2, -0.8, up) * 0.55, null, 0);
        const k = (i * TR + j) * 3; tailCol[k] = o[0]; tailCol[k + 1] = o[1]; tailCol[k + 2] = o[2];
      }
    }
  }
  const tailGeo = G(new T.BufferGeometry());
  tailGeo.setAttribute('position', new T.BufferAttribute(tailPos, 3)); tailGeo.setAttribute('normal', new T.BufferAttribute(tailNrm, 3)); tailGeo.setAttribute('color', new T.BufferAttribute(tailCol, 3)); tailGeo.setIndex(tailIdx);
  tailGeo.attributes.position.setUsage(T.DynamicDrawUsage); tailGeo.attributes.normal.setUsage(T.DynamicDrawUsage);
  tailGeo.boundingSphere = new T.Sphere(new T.Vector3(-0.3, 0.25, 0.3), 1.4);
  const tailMesh = ctx.mesh(tailGeo, fur); tailMesh.frustumCulled = false; g.add(tailMesh);
  // จุดควบคุมหาง: หลับ (พันรอบตัวบนโต๊ะ) กับ ตื่น (ยกขึ้น)
  const TS = [-0.70, 0.14, 0.05, -0.85, 0.10, 0.30, -0.56, 0.065, 0.53, -0.15, 0.06, 0.55, 0.25, 0.055, 0.48, 0.55, 0.05, 0.32];
  const TA = [-0.70, 0.16, 0.05, -0.88, 0.24, 0.20, -0.86, 0.44, 0.38, -0.64, 0.58, 0.50, -0.32, 0.58, 0.55, 0.0, 0.50, 0.52];
  const CP = new Float32Array(18);

  // ---------- 10) ตัว z ตอนหลับ ----------
  const zs = [0, 1, 2].map(() => {
    const cv = ctx.cv(64, 64, (x) => { x.clearRect(0, 0, 64, 64); x.fillStyle = '#fff'; x.font = "700 48px 'Mitr', sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('z', 32, 34); });
    const tx = new T.CanvasTexture(cv); texs.push(tx);
    const sp = new T.Sprite(Mt(new T.SpriteMaterial({ map: tx, transparent: true, depthWrite: false }))); sp.scale.setScalar(0.22); g.add(sp); return sp;
  });

  // ---------- สถานะการเคลื่อนไหว ----------
  const st = {
    awakeLeft: 0, alert: 0, lift: 0, drowsy: 0, eye: 0, eyeTarget: 0, pupil: 0.45, pupilT: 0.45,
    yawT: 0, pitchT: 0, yaw: 0, pitch: 0, roll: 0, eyeYaw: 0, eyePitch: 0,
    blinkIn: 2 + Math.random() * 3, blink: -1, blinkDur: 0.28, blinkAgain: false,
    breathPh: 0, breathRate: 0.42, settle: 0,
    tailUp: 0, flick: 0, flickIn: 2 + Math.random() * 4, flickPh: 0,
    pawTw: 0, pawIn: 5 + Math.random() * 8, whiskTw: 0, whiskIn: 4 + Math.random() * 6,
    yawnAt: -1, yawn: 0, yawnT: -1, shake: 0, wakeT: -1, lastT: 0,
  };
  const pose = { sleep: { x: -0.10, y: -0.04, z: 0, pitch: -0.25, yaw: -0.22, roll: 0.12 }, awake: { x: 0.0, y: 0.005, z: 0, pitch: 0.06, yaw: 0, roll: 0 } };
  const dflt = new T.Vector3(0.9, 0.9, 1.6); // ทิศมองเริ่มต้นเมื่อไม่มีจุดให้มอง (ไปทางกล้อง)
  const _d = new T.Vector3();
  const damp = (cur, tgt, k, dt) => cur + (tgt - cur) * (1 - Math.exp(-k * dt));
  const impulse = (ph) => ph < 0 ? 0 : ph < 0.3 ? Math.sin(ph / 0.3 * Math.PI / 2) : ph < 1 ? Math.cos((ph - 0.3) / 0.7 * Math.PI / 2) : 0;

  // awake() คือเกณฑ์เดียวกับที่ฉากใช้ตัดสินว่า "หลับอยู่ → ร้องเหมียว"; tap() ต้องแตกกิ่งด้วยเกณฑ์เดียวกันนี้ ไม่งั้นช่วงกำลังเคลิ้ม (ตายังไม่ปิดสนิท) จะโดนปลุกเต็มรูปแบบโดยไม่มีเสียง
  function awake() { return st.awakeLeft > 0 || st.lift > 0.02 || st.eye > 0.03; }
  function tap() {
    if (!awake()) {
      st.awakeLeft = 6.5 + Math.random() * 2; st.wakeT = st.lastT; st.pupilT = 0.92; st.pupil = 0.9;
      st.yawnAt = Math.random() < 0.55 ? st.lastT + 0.9 + Math.random() * 0.8 : -1;
      st.blink = -1; st.blinkIn = 1.2 + Math.random();
    } else {
      st.awakeLeft = Math.max(st.awakeLeft, 4.5); st.shake = 1;
      ears.forEach(e => { e.twT = 0; e.tw = 0.9; }); st.blinkIn = Math.min(st.blinkIn, 0.4);
    }
  }

  function updateTail(t, up, reduced) {
    // ผสมจุดควบคุม + คลื่นวิ่งไปทางปลาย + สะบัดปลาย
    const wave = reduced ? 0 : up * 0.9, fl = reduced ? 0 : st.flick * impulse(st.flickPh);
    for (let i = 0; i < 6; i++) {
      const k = i * 3, s = i / 5;
      CP[k] = mix(TS[k], TA[k], up); CP[k + 1] = mix(TS[k + 1], TA[k + 1], up); CP[k + 2] = mix(TS[k + 2], TA[k + 2], up);
      const w = Math.sin(t * 3.1 - s * 3.4) * 0.07 * s * s * wave + Math.sin(t * 1.7 - s * 2.2 + 1) * 0.04 * s * wave;
      CP[k + 1] += w * 0.6 + fl * s * s * 0.08; CP[k + 2] += w + fl * s * s * 0.05 * (up > 0.5 ? 1 : -1);
      if (up < 1 && !reduced) { // ตอนหลับ: ปลายหางกระดิกเบาๆ แบบไม่เป็นจังหวะ (ปิดในโหมดลดการเคลื่อนไหว)
        CP[k + 1] += (1 - up) * s * s * (Math.sin(t * 0.9 + 1.3) * 0.006 + Math.sin(t * 2.3) * 0.003);
        CP[k + 2] += (1 - up) * s * s * s * (Math.sin(t * 0.7) * 0.012 + fl * 0.06);
      }
      if (CP[k + 1] < 0.05 + s * 0.0) CP[k + 1] = 0.05;
    }
    for (let i = 0; i <= TN; i++) {
      const s = i / TN;
      cr(CP, s); const px = _c[0], py = _c[1], pz = _c[2];
      cr(CP, Math.min(1, s + 0.012)); const ax = _c[0], ay = _c[1], az = _c[2];
      cr(CP, Math.max(0, s - 0.012));
      let tx = ax - _c[0], ty = ay - _c[1], tz = az - _c[2]; let l = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1; tx /= l; ty /= l; tz /= l;
      let n1x = -tx * ty, n1y = 1 - ty * ty, n1z = -tz * ty; l = Math.sqrt(n1x * n1x + n1y * n1y + n1z * n1z);
      if (l < 1e-4) { n1x = 0; n1y = 0; n1z = 1; l = 1; } n1x /= l; n1y /= l; n1z /= l;
      const n2x = ty * n1z - tz * n1y, n2y = tz * n1x - tx * n1z, n2z = tx * n1y - ty * n1x;
      let r = 0.028 + 0.036 * Math.pow(1 - s, 0.8); if (s > 0.9) { const u = (s - 0.9) / 0.1; r *= Math.sqrt(Math.max(0, 1 - u * u)) + 0.02; }
      if (i === TN) r = 0.004;
      for (let j = 0; j < TR; j++) {
        const ang = (j / TR) * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang), k = (i * TR + j) * 3;
        const nx = n1x * ca + n2x * sa, ny = n1y * ca + n2y * sa, nz = n1z * ca + n2z * sa;
        tailPos[k] = px + nx * r; tailPos[k + 1] = py + ny * r; tailPos[k + 2] = pz + nz * r;
        tailNrm[k] = nx; tailNrm[k + 1] = ny; tailNrm[k + 2] = nz;
      }
    }
    tailGeo.attributes.position.needsUpdate = true; tailGeo.attributes.normal.needsUpdate = true;
  }
  const _c = [0, 0, 0];
  function cr(P, s) { // Catmull-Rom บน 6 จุด (5 ช่วง) → _c
    const u = s * 5, seg = Math.min(4, Math.floor(u)), tt = u - seg;
    const i0 = Math.max(0, seg - 1) * 3, i1 = seg * 3, i2 = (seg + 1) * 3, i3 = Math.min(5, seg + 2) * 3, t2 = tt * tt, t3 = t2 * tt;
    for (let a = 0; a < 3; a++) {
      const p0 = P[i0 + a], p1 = P[i1 + a], p2 = P[i2 + a], p3 = P[i3 + a];
      _c[a] = 0.5 * ((2 * p1) + (-p0 + p2) * tt + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
    }
  }

  function step(dt, t, o) {
    dt = Math.min(dt || 0.016, 0.1); st.lastT = t;
    const reduced = !!(o && o.reduced), night = o && o.night ? o.night : 0, look = o ? o.look : null;
    if (st.awakeLeft > 0) st.awakeLeft -= dt;
    const on = st.awakeLeft > 0;
    const alertT = reduced ? 0 : on ? (st.awakeLeft > 2.6 ? 1 : 0.35) : 0;    // 1 ตื่นเต็ม · 0.35 ง่วง · 0 หลับ
    st.alert = damp(st.alert, alertT, alertT > st.alert ? 2.2 : 0.9, dt);
    st.lift = damp(st.lift, reduced ? 0 : (on ? (st.awakeLeft > 1.6 ? 1 : 0.15) : 0), st.lift < (on ? 1 : 0) ? 2.6 : 1.1, dt);
    st.drowsy = damp(st.drowsy, on && st.awakeLeft <= 2.6 ? 1 : 0, 1.5, dt);
    const sleeping = !on && st.lift < 0.03;

    // ---- หายใจ: ช้า-ไม่สม่ำเสมอ หายใจเข้าเร็วกว่าออก ----
    const rate = (on ? 0.62 : 0.40) * (1 + 0.12 * Math.sin(t * 0.13) + 0.05 * Math.sin(t * 0.37 + 1));
    st.breathPh += dt * rate * Math.PI * 2;
    const ph = st.breathPh % (Math.PI * 2), br = ph < 2.2 ? Math.sin(ph / 2.2 * Math.PI / 2) : Math.cos((ph - 2.2) / (Math.PI * 2 - 2.2) * Math.PI / 2);
    const amp = on ? 0.5 : 1;
    st.settle = damp(st.settle, sleeping ? 1 : 0, 0.35, dt);
    bodyG.scale.set(1 + br * 0.004 * amp, 1 + br * 0.013 * amp - st.settle * 0.012, 1 + br * 0.02 * amp + st.settle * 0.008);
    bodyG.position.y = 0;

    // ---- หัว: ยก/ก้ม + มองตาม ----
    if (look) _d.copy(look); else _d.copy(dflt);
    _d.x -= HP.x; _d.y -= HP.y; _d.z -= HP.z;
    const hyp = Math.sqrt(_d.x * _d.x + _d.z * _d.z) || 1e-6;
    // แมวหันหัวข้ามไหล่ได้ ~70° — ในฉากจริงกล้องอยู่ทางขวาของแมว 64–92° ถ้าล็อกแค่ 40° หัวจะค้างที่ขอบและไม่ตามเมาส์
    st.yawT = clamp(Math.atan2(-_d.z, _d.x), -1.25, 1.25); st.pitchT = clamp(Math.atan2(_d.y, hyp), -0.3, 0.5);
    const kLook = 3.2;
    st.yaw = damp(st.yaw, st.yawT, kLook, dt); st.pitch = damp(st.pitch, st.pitchT, kLook, dt);
    st.roll = damp(st.roll, -st.yaw * 0.18, 2.5, dt);
    const L = st.lift, idle = reduced ? 0 : on ? (Math.sin(t * 1.3) * 0.025 + Math.sin(t * 2.9 + 1) * 0.012) : (Math.sin(t * 0.5) * 0.008);
    st.shake = Math.max(0, st.shake - dt * 2.2); const sh = Math.sin(st.shake * 18) * st.shake * 0.12;
    st.yawn = 0;
    if (st.yawnAt > 0 && t >= st.yawnAt && !reduced) { st.yawnT = 0; st.yawnAt = -1; }
    if (st.yawnT >= 0) { st.yawnT += dt; const u = st.yawnT / 1.9; st.yawn = u >= 1 ? 0 : (u < 0.3 ? sstep(0, 1, u / 0.3) : u < 0.62 ? 1 : sstep(1, 0, (u - 0.62) / 0.38)); if (u >= 1) st.yawnT = -1; }
    const hp = pose.sleep, ha = pose.awake;
    headPivot.position.set(HP.x + mix(hp.x, ha.x, L), HP.y + mix(hp.y, ha.y, L) + br * 0.006 * (1 - L) + st.yawn * 0.01, HP.z);
    headG.rotation.set(mix(hp.roll, ha.roll + st.roll, L) + sh * 0.5, mix(hp.yaw, ha.yaw + st.yaw + sh, L) + idle * 0.6, mix(hp.pitch, ha.pitch + st.pitch, L) + idle + st.yawn * 0.16);

    // ---- ตา: เปิด/หลับ/กะพริบ/ง่วง/รูม่านตา ----
    st.eyeTarget = reduced ? (on ? 1 : 0) : on ? (st.awakeLeft > 2.6 ? 1 : 0.42) : 0;
    st.eye = damp(st.eye, st.eyeTarget, st.eyeTarget > st.eye ? 5 : 1.6, dt);
    st.blinkIn -= dt;
    if (st.blink < 0 && st.blinkIn <= 0 && st.eye > 0.25) { st.blink = 0; st.blinkDur = st.drowsy > 0.5 ? 0.7 + Math.random() * 0.3 : 0.22 + Math.random() * 0.1; st.blinkAgain = Math.random() < 0.22; }
    let bl = 0;
    if (st.blink >= 0) {
      st.blink += dt / st.blinkDur; const u = st.blink;
      bl = u < 0.38 ? sstep(0, 1, u / 0.38) : u < 1 ? sstep(1, 0, (u - 0.38) / 0.62) : 0;
      if (u >= 1) { st.blink = -1; st.blinkIn = st.blinkAgain ? 0.15 : (st.drowsy > 0.5 ? 1.2 + Math.random() * 1.5 : 2.5 + Math.random() * 4.5); st.blinkAgain = false; }
    }
    const pupilTarget = on ? (st.wakeT >= 0 && t - st.wakeT < 1.1 ? 0.92 : 0.22 + 0.5 * night + st.drowsy * 0.15) : 0.45; // กลางวัน = ช่องแคบ ~25% ของม่านตา · กลางคืน/เพิ่งตื่น = กลมโต
    st.pupil = damp(st.pupil, pupilTarget, 2.4, dt);
    st.eyeYaw = damp(st.eyeYaw, clamp((st.yawT - st.yaw) * 0.9, -0.35, 0.35) * L, 8, dt);
    st.eyePitch = damp(st.eyePitch, clamp((st.pitchT - st.pitch) * 0.9, -0.3, 0.3) * L, 8, dt);
    for (let i = 0; i < 2; i++) {
      const e = eyes[i], lag = i === 1 ? 0.05 : 0;
      let open = st.eye * (1 - clamp(bl - lag, 0, 1)) * (1 - st.yawn * 0.85);
      open = clamp(open, 0, 1);
      const eu = mix(-0.14, 0.76, open), ed = mix(-0.14, -0.60, open); // มุมยกขอบเปลือกตาบน/ล่าง (เรเดียน) — ผิวหัวตัดลูกตาที่ ~50° จึงเปิดได้ถึง ~44°/34°
      e.lidU.rotation.x = -eu; e.lidD.rotation.x = -ed;
      e.line.material.opacity = sstep(0.28, 0.06, open); e.line.visible = e.line.material.opacity > 0.02;
      e.glint.visible = open > 0.7; e.eg.rotation.set(-st.eyePitch, st.eyeYaw, 0); // ขอบเปลือกตาบนพ้นแนวประกายตาเมื่อเปิด ≥0.7
      const w = e.pupil.wMin + (e.pupil.wMax - e.pupil.wMin) * st.pupil;
      if (Math.abs(w - e.w) > 0.0002) { e.pupil.set(w); e.w = w; }
    }

    // ---- หู: ตั้งขึ้น/พับ + กระตุก ----
    for (let i = 0; i < 2; i++) {
      const e = ears[i], s = e.s;
      e.next -= dt;
      if (e.next <= 0 && !reduced) { e.twT = 0; e.tw = on ? 0.6 + Math.random() * 0.5 : 0.35 + Math.random() * 0.4; e.next = on ? 1.5 + Math.random() * 3 : 3 + Math.random() * 7; }
      let tw = 0; if (e.twT >= 0) { e.twT += dt * 4.5; tw = impulse(e.twT) * e.tw; if (e.twT >= 1) e.twT = -1; }
      const toward = clamp(st.yaw * s, -0.15, 0.25) * L;
      e.g.rotation.set(s * (mix(0.62, 0.42, st.alert) + tw * 0.5), -s * (0.42 - toward), mix(0.28, -0.06, st.alert) + tw * 0.25 + st.yawn * 0.35);
    }
    if (ears[0].twT < 0 && ears[1].twT < 0 && st.shake > 0.8) { ears[0].twT = 0; ears[1].twT = 0.05; }

    // ---- หาว (ขากรรไกร) ----
    jawG.rotation.z = -st.yawn * 0.3; mouthIn.visible = st.yawn > 0.05;

    // ---- หาง ----
    st.tailUp = damp(st.tailUp, reduced ? 0 : st.lift * (0.4 + 0.6 * st.alert), 1.6, dt);
    st.flickIn -= dt;
    if (st.flickIn <= 0 && st.flickPh === 0 && !reduced) { st.flickPh = 0.0001; st.flick = 0.6 + Math.random() * 0.7; st.flickIn = on ? 1 + Math.random() * 2 : 3 + Math.random() * 7; }
    if (st.flickPh > 0) { st.flickPh += dt * 2.8; if (st.flickPh >= 1) { st.flickPh = 0; st.flick = 0; } }
    updateTail(t, st.tailUp, reduced);

    // ---- กระตุกอุ้งเท้า / หนวด (ฝัน) ----
    st.pawIn -= dt; if (st.pawIn <= 0 && !reduced) { st.pawTw = 0.0001; st.pawIn = sleeping ? 6 + Math.random() * 10 : 3 + Math.random() * 5; }
    if (st.pawTw > 0) { st.pawTw += dt * 3; if (st.pawTw >= 1) st.pawTw = 0; }
    const pw = impulse(st.pawTw); pawsG.rotation.z = pw * 0.05; pawsG.rotation.y = pw * 0.03; pawsG.position.y = pw * 0.006;
    st.whiskIn -= dt; if (st.whiskIn <= 0 && !reduced) { st.whiskTw = 0.0001; st.whiskIn = 2.5 + Math.random() * 6; }
    if (st.whiskTw > 0) { st.whiskTw += dt * 5; if (st.whiskTw >= 1) st.whiskTw = 0; }
    whiskG.rotation.y = impulse(st.whiskTw) * 0.05; whiskG.rotation.x = Math.sin(t * 5.1) * 0.01 * (on && !reduced ? 1 : 0) + st.yawn * 0.15;

    // ---- ตัว z (โหมดลดการเคลื่อนไหว: แช่นิ่งที่ตำแหน่งคงที่ ไม่ลอย) ----
    const zOn = sleeping && st.eye < 0.1;
    for (let i = 0; i < 3; i++) { const z = zs[i], f = reduced ? 0.2 + i * 0.3 : (t * 0.35 + i / 3) % 1; z.visible = zOn; if (zOn) { z.position.set(0.72 + f * 0.3, 0.6 + f * 0.7, 0.12 + Math.sin(f * 6 + i) * 0.05); z.material.opacity = Math.sin(Math.PI * f) * 0.9 * (1 - st.lift * 8); z.scale.setScalar(0.14 + f * 0.14); } }
  }

  function dispose() {
    geos.forEach(x => x.dispose()); mats.forEach(x => x.dispose()); texs.forEach(x => x.dispose());
    geos.length = mats.length = texs.length = 0;
  }
  step(0.016, 0, { reduced: false, look: null, night: 0 });
  return { g, hit, tap, awake, step, dispose };
}

// ---------- เปลือกตา: แผ่นทรงกลมมีขอบโค้ง (บน: ขอบโค้งลงที่หางตา, ล่าง: ขอบยกขึ้นเล็กน้อยที่มุม) ----------
function lidGeometry(T, R, upper) {
  const NA = 20, NE = 6, A = 1.25, EL = 1.5, arch = upper ? 0.32 : 0.14;   // EL 1.5 rad: เปลือกตายาวพอคลุมเบ้าตาที่กว้างขึ้นตอนหลับ (ส่วนเกินจมในหัว)
  const pos = [], nrm = [], idx = [], edge = [];
  for (let i = 0; i <= NA; i++) {
    const a = -A + (2 * A * i) / NA, q = (a / A) * (a / A), e0 = upper ? -arch * q : arch * q;
    for (let j = 0; j <= NE; j++) {
      const f = j / NE, e = upper ? e0 + (EL - e0) * f : -EL + (e0 + EL) * f;
      const ce = Math.cos(e), x = R * ce * Math.sin(a), y = R * Math.sin(e), z = R * ce * Math.cos(a);
      pos.push(x, y, z); nrm.push(x / R, y / R, z / R); edge.push(Math.abs(e - e0));
    }
  }
  for (let i = 0; i < NA; i++) for (let j = 0; j < NE; j++) { const a = i * (NE + 1) + j, b = a + NE + 1; if (upper) idx.push(a, b, a + 1, a + 1, b, b + 1); else idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3)); geo.setIndex(idx);
  geo.userData.edge = edge; fixWinding(geo); return geo;
}
// พลิกลำดับดัชนีถ้าหน้าสามเหลี่ยมหันเข้าด้านใน (เทียบกับ normal เฉลี่ย)
function fixWinding(geo) {
  const p = geo.attributes.position.array, nm = geo.attributes.normal.array, ix = geo.index.array; let acc = 0;
  for (let i = 0; i < ix.length; i += 3) {
    const a = ix[i] * 3, b = ix[i + 1] * 3, c = ix[i + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    acc += (uy * vz - uz * vy) * nm[a] + (uz * vx - ux * vz) * nm[a + 1] + (ux * vy - uy * vx) * nm[a + 2];
  }
  if (acc < 0) for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
}
// รูม่านตาแนวตั้ง: แผ่นเลนส์บนผิวทรงกลม อัปเดตความกว้างได้ (เมชเล็ก)
function makePupil(T, R, h) {
  const NY = 10, NX = 6, n = (NY + 1) * (NX + 1), pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), idx = [];
  for (let i = 0; i < NY; i++) for (let j = 0; j < NX; j++) { const a = i * (NX + 1) + j, b = a + NX + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nrm, 3)); geo.setIndex(idx);
  geo.attributes.position.setUsage(T.DynamicDrawUsage); geo.boundingSphere = new T.Sphere(new T.Vector3(0, 0, R), R);
  const wMin = R * 0.10, wMax = R * 0.80;                          // ครึ่งความกว้าง: ช่องแคบกลางวัน .. เกือบกลมตอนกลางคืน
  const set = (w) => {
    const pw = 0.5 + 0.4 * (1 - clamp((w - wMin) / (wMax - wMin), 0, 1)); // แคบ = ปลายแหลม, กว้าง = วงรี
    for (let i = 0; i <= NY; i++) {
      const y = h * (2 * i / NY - 1), hw = w * Math.pow(Math.max(0, 1 - (y / h) * (y / h)), pw);
      for (let j = 0; j <= NX; j++) {
        const x = hw * (2 * j / NX - 1), z = Math.sqrt(Math.max(0, R * R - x * x - y * y)), k = (i * (NX + 1) + j) * 3;
        pos[k] = x; pos[k + 1] = y; pos[k + 2] = z; nrm[k] = x / R; nrm[k + 1] = y / R; nrm[k + 2] = z / R;
      }
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true;
  };
  set(R * 0.2); fixWinding(geo);
  return { geo, set, wMin, wMax };
}
