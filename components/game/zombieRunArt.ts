// ภาพพิกเซลทั้งหมดของเกม "ครูฮีม หนีซอมบี้" — ตัวอักษร 1 ตัว = 1 พิกเซล ("." = โปร่งใส)
// เส้นขอบเข้มรอบตัวละคร/สิ่งของสร้างให้อัตโนมัติตอนเตรียมภาพ (ไม่ต้องวาดเอง)
// ไม่มีไฟล์รูปภายนอกเลย — ทุกอย่างวาดสดตอนเปิดเกมครั้งแรก

export const OUTLINE = "#1a1024";

type Pal = Record<string, string>;
type Grid = (string | null)[][];
export type Sprite = HTMLCanvasElement;

// ───────────── ครูฮีม (ผมดำ แว่นเหลือง เสื้อเหลือง) ─────────────
const PAL_KRU: Pal = {
  H: "#1d1b2b", h: "#3d3858",
  S: "#e8ad7a", s: "#c98a58",
  G: "#ffd21f", K: "#2a1d1d", W: "#ffffff", R: "#e05252", r: "#e0352f",
  Y: "#ffcf1f", y: "#e3a90b",
  P: "#33427a", p: "#26325f",
  B: "#6b4130",
};
// ครูฮีมตอนโดนงับจนกลายเป็นซอมบี้ (ผิวเขียว)
const PAL_KRU_ZOMBIE: Pal = { ...PAL_KRU, S: "#93d06a", s: "#67a64a", W: "#f4ffe0", Y: "#d9c45a", y: "#b3a043" };

const KRU_HEAD = [
  ".....HHHHHH.....",
  "...HHHHHHHHHH...",
  "..HHHHhhhHHHHH..",
  ".HHHHHHHHHHHHHH.",
  ".HHHHHHHHHHHHHHH",
  ".HHHHSSSSSSSSSS.",
  ".HHHSSKKSSSSKKS.",
  ".HHSGGGGGGGGGGGS",
  ".HHSsSGWKGSGWKGS",
  ".HHSSSGGGGSGGGGS",
  "..HSSSSSSSSSsSS.",
  "...SSSSKWWWWWKS.",
  "....SSSSSKKKSS..",
  ".....SSSSSSSS...",
];
const swapRows = (base: string[], rep: Record<number, string>) => base.map((r, i) => rep[i] ?? r);
const KRU_HEAD_HAPPY = swapRows(KRU_HEAD, { 8: ".HHSsSGKKGSGKKGS" });
const KRU_HEAD_HURT = swapRows(KRU_HEAD, {
  6: ".HHHSSSKKSSKKSS.",
  8: ".HHSsSGWWGSGWWGS",
  11: "...SSSSSSKKKSSS.",
  12: "....SSSSSKRKSS..",
});
const KRU_HEAD_ZOMBIE = swapRows(KRU_HEAD, {
  8: ".HHSsSGWrGSGWrGS",
  11: "...SSSSKWKWKWKS.",
});

const BODY_RUN = [
  [
    "......SSSS......",
    ".....YYYYYYY....",
    "....YYYYYYYYYS..",
    "...SYYYYYYYY.SS.",
    "..SS.YYYYYYY....",
    ".....PPPPPPP....",
    "....PPP...PPP...",
    "...PPP.....PP...",
    "..PP........PP..",
    ".BBB........BBBW",
  ],
  [
    "......SSSS......",
    ".....YYYYYYY....",
    "....YYYYYYYYY...",
    "....SYYYYYYYS...",
    "....SYYYYYYYS...",
    ".....PPPPPPP....",
    ".....PPP.PPP....",
    "....PPP..PP.....",
    "...BB....PP.....",
    ".........BBBW...",
  ],
  [
    "......SSSS......",
    ".....YYYYYYY....",
    "...SYYYYYYYY....",
    "..SS.YYYYYYYY...",
    ".....YYYYYYY.SS.",
    ".....PPPPPPP....",
    "....PPP...PPP...",
    "...PP.....PPP...",
    "..PP.......PP...",
    ".BBB.......BBBW.",
  ],
  [
    "......SSSS......",
    ".....YYYYYYY....",
    "....YYYYYYYYY...",
    "....SYYYYYYYS...",
    "....SYYYYYYYS...",
    ".....PPPPPPP....",
    ".....PPP.PPP....",
    "......PP.PPP....",
    "......PP..BBB...",
    ".....BBBW.......",
  ],
];
const BODY_JUMP = [
  "......SSSS......",
  "..S..YYYYYYY.S..",
  "..SYYYYYYYYYYS..",
  ".....YYYYYYY....",
  ".....YYYYYYY....",
  ".....PPPPPPP....",
  "....PPP..PPPP...",
  "...PP.....PBB...",
  "..BB.......BW...",
  "................",
];
const BODY_HURT = [
  "......SSSS......",
  ".S...YYYYYYY..S.",
  "..SYYYYYYYYYYS..",
  ".....YYYYYYY....",
  ".....YYYYYYY....",
  ".....PPPPPPP....",
  ".....PPP.PPP....",
  ".....PP...PP....",
  ".....PP...PP....",
  "....BBB...BBBW..",
];
const BODY_IDLE = [
  "......SSSS......",
  ".....YYYYYYY....",
  "....YYYYYYYYY...",
  "....SYYYYYYYS...",
  "....SYYYYYYYS...",
  ".....PPPPPPP....",
  ".....PPP.PPP....",
  ".....PP...PP....",
  ".....PP...PP....",
  "....BBB...BBBW..",
];
const BODY_THUMB = [
  "......SSSS...S..",
  ".....YYYYYYYSS..",
  "....YYYYYYYYYS..",
  "....SYYYYYYY....",
  "....SYYYYYYY....",
  ".....PPPPPPP....",
  ".....PPP.PPP....",
  ".....PP...PP....",
  ".....PP...PP....",
  "....BBB...BBBW..",
];
const BODY_ZOMBIE = [
  "......SSSS......",
  ".....YYYYYYYSSS.",
  "....YYYYYYYY....",
  "....yYYYYYYYSSS.",
  ".....YYYYYYY....",
  ".....PPPPPPP....",
  ".....PPP.PPP....",
  ".....PP...PP....",
  ".....PP...PP....",
  "....BBB...BBBW..",
];
// ท่าสไลด์: ตัวต่ำลง ขาพุ่งไปข้างหน้า (กว้าง 22 สูง 15)
const KRU_SLIDE = [
  ".....HHHHHH...........",
  "...HHHHHHHHHH.........",
  "..HHHHhhhHHHHH........",
  ".HHHHHHHHHHHHHH.......",
  ".HHHHHHHHHHHHHHH......",
  ".HHHHSSSSSSSSSS.......",
  ".HHHSSKKSSSSKKS.......",
  ".HHSGGGGGGGGGGGS......",
  ".HHSsSGWKGSGWKGS......",
  ".HHSSSGGGGSGGGGS......",
  "..HSSSSSSSSSsSS.......",
  ".SSSSSSKWWWWWKSYY.....",
  "SS..SSSSSKKKSYYYYPPP..",
  ".....YYYYYYYYYYPPPPPBW",
  "....YYYYYYYYYYPPPPPPBB",
];

// ───────────── ซอมบี้ (ผิวเขียว ตาแดงข้างใหญ่ข้างเล็ก ยื่นแขนมาข้างหน้า) ─────────────
const PAL_ZOMBIE: Pal = {
  D: "#2e2a3a", Z: "#93d06a", z: "#67a64a",
  E: "#fbffe8", r: "#e0352f", M: "#4a1822", W: "#ffffff",
  T: "#7ab0d4", t: "#5a8db3", N: "#8a6440", n: "#6a4a2e",
};
const Z_HEAD = [
  "....DD.DDD.D........",
  "...DDDDDDDDDDD......",
  "..DDDDDDDDDDDDD.....",
  "..DZDDDZZDDDZZD.....",
  "..DZZZZZZZZZZZZ.....",
  "..ZZZZZEEEZZZEEZ....",
  "..zZZZZErEZZZErZ....",
  "..zZZZZEEEZZZZZZ....",
  "..zZZZZZZZZZzZZZ....",
  "..zZZZZMWMWMWMZZ....",
  "...zZZZMMMMMMZZ.....",
  "....zzZZZZZZZ.......",
];
const Z_HEAD_OPEN = swapRows(Z_HEAD, {
  8: "..zZZZZMWMWMWMZZ....",
  9: "..zZZZZMMMMMMMZZ....",
  10: "...zZZZMWMWMMZZ.....",
});
const Z_ARMS = [
  [
    ".....TTTTTTT........",
    "....TTTTTTTTTTTZZZ..",
    "....tTTTTTTTTTTZZZZ.",
    "....tTTTTTTTT.......",
    "....tTTTTTTTTTZZZ...",
    "....tTTTTTTTTTZZZZ..",
    "....T.TtT.TT.T......",
  ],
  [
    ".....TTTTTTT........",
    "....TTTTTTTTT.......",
    "....tTTTTTTTTTTZZZ..",
    "....tTTTTTTTTTTZZZZ.",
    "....tTTTTTTTTZZZ....",
    "....tTTTTTTTTZZZZ...",
    "....T.TtT.TT.T......",
  ],
];
const Z_LEGS = [
  [
    ".....NNNNNNN........",
    "....NNNnNNNNN.......",
    "...NNN.....NNN......",
    "...NN.......NN......",
    "..NN.........NN.....",
    "..zZ.........zZ.....",
    ".ZZZ.........ZZZZ...",
  ],
  [
    ".....NNNNNNN........",
    ".....NNNNNNN........",
    ".....NNn.NNN........",
    ".....NN...NN........",
    "....NN....NN........",
    "....zZ....zZ........",
    "...ZZZ....ZZZZ......",
  ],
];

// ───────────── ของเก็บ ─────────────
const COIN = [
  "..ccc..",
  ".cCCCc.",
  "cCLCCCc",
  "cCLCCCc",
  "cCCCCCc",
  ".cCCCc.",
  "..ccc..",
];
const PAL_COIN: Pal = { C: "#ffd23f", c: "#d99a1e", L: "#fff6b8" };
// ชาไทยแก้วฝาโดม — เก็บแล้ววิ่งทะลุทุกอย่าง
const TEA = [
  "......RR.",
  ".....R...",
  "..LLLRL..",
  ".LLLLRLL.",
  "LLLLLLLLL",
  ".MMMMMMM.",
  ".OMOMOMO.",
  ".OOOOOOO.",
  ".OOOOOOo.",
  "..OOOOOo.",
  "..OOOOOo.",
  "..oOOOoo.",
  "...oooo..",
];
const PAL_TEA: Pal = { R: "#ff5a7a", L: "#e6f6ff", M: "#fff1d6", O: "#f5901e", o: "#d86a0e" };

// ───────────── ของที่บินมา (ต้องสไลด์ลอด หรือกระโดดข้าม) ─────────────
const PLANE = [
  "..........WW.",
  ".......WWWWW.",
  "....WWWWWWWW.",
  "WWWWWWWWWWWWW",
  "..sssssssssss",
  "......sss....",
];
const PAL_PLANE: Pal = { W: "#ffffff", s: "#c3cce6" };
const BAT = [
  [
    "V...........V",
    "VV...V.V...VV",
    "VVV.VVVVV.VVV",
    ".VVVVEVEVVVV.",
    "..VV.VVV.VV..",
    "......V......",
  ],
  [
    ".....V.V.....",
    "....VVVVV....",
    "..VVVEVEVVV..",
    ".VVVVVVVVVVV.",
    "VVV..VVV..VVV",
    "V.....V.....V",
  ],
];
const PAL_BAT: Pal = { V: "#6a4a8c", E: "#ffe14a" };

// ───────────── เครื่องมือเตรียมภาพ ─────────────
function gridToCanvas(grid: Grid, outline: string | null = OUTLINE): Sprite {
  const h = grid.length;
  const w = grid.reduce((m, r) => Math.max(m, r.length), 0);
  const pad = outline ? 1 : 0;
  const c = document.createElement("canvas");
  c.width = w + pad * 2;
  c.height = h + pad * 2;
  const x = c.getContext("2d")!;
  const filled = (cx: number, cy: number) => cy >= 0 && cy < h && cx >= 0 && cx < w && !!grid[cy][cx];
  if (outline) {
    x.fillStyle = outline;
    for (let cy = -1; cy <= h; cy++)
      for (let cx = -1; cx <= w; cx++)
        if (!filled(cx, cy) && (filled(cx - 1, cy) || filled(cx + 1, cy) || filled(cx, cy - 1) || filled(cx, cy + 1)))
          x.fillRect(cx + pad, cy + pad, 1, 1);
  }
  for (let cy = 0; cy < h; cy++)
    for (let cx = 0; cx < w; cx++) {
      const col = grid[cy][cx];
      if (col) {
        x.fillStyle = col;
        x.fillRect(cx + pad, cy + pad, 1, 1);
      }
    }
  return c;
}

function rowsToGrid(rows: string[], pal: Pal): Grid {
  return rows.map((r) => [...r].map((ch) => (ch === "." || ch === " " ? null : pal[ch] ?? "#ff00ff")));
}

function sprite(rows: string[], pal: Pal, outline: string | null = OUTLINE): Sprite {
  return gridToCanvas(rowsToGrid(rows, pal), outline);
}

// เงาเรืองแสงสีเดียว (ใช้ตอนกินชาไทย) — ขนาดเท่าภาพจริงรวมขอบ
function glow(rows: string[], color: string): Sprite {
  const pal: Pal = new Proxy({}, { get: () => color });
  return sprite(rows, pal, color);
}

type Painter = (px: (x: number, y: number, c: string) => void, rect: (x: number, y: number, w: number, h: number, c: string) => void) => void;
function paint(w: number, h: number, fn: Painter, outline: string | null = OUTLINE): Sprite {
  const grid: Grid = Array.from({ length: h }, () => Array<string | null>(w).fill(null));
  const px = (x: number, y: number, c: string) => {
    if (x >= 0 && x < w && y >= 0 && y < h) grid[y][x] = c;
  };
  const rect = (x: number, y: number, ww: number, hh: number, c: string) => {
    for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + ww; xx++) px(xx, yy, c);
  };
  fn(px, rect);
  return gridToCanvas(grid, outline);
}

// สุ่มแบบกำหนดเมล็ด — ฉากหลังหน้าตาเหมือนเดิมทุกครั้งที่เปิด
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BOOK_COLORS: [string, string, string][] = [
  ["#e2474b", "#b3303a", "#ff8a8e"],
  ["#3d7bd9", "#2a5aa8", "#8fb8ff"],
  ["#3fae5a", "#2c8043", "#8fe0a0"],
  ["#8a5cd6", "#6a3fb0", "#c3a5ff"],
  ["#f08a24", "#c0661a", "#ffc07a"],
];

function bookStack(n: number, rnd: () => number): Sprite {
  const books = Array.from({ length: n }, () => ({
    t: 5 + Math.floor(rnd() * 2),
    len: 13 + Math.floor(rnd() * 4),
    off: Math.floor(rnd() * 3) - 1,
    col: BOOK_COLORS[Math.floor(rnd() * BOOK_COLORS.length)],
    pages: rnd() < 0.4,
  }));
  const h = books.reduce((a, b) => a + b.t, 0);
  return paint(18, h, (px, rect) => {
    let y = h;
    for (const b of books) {
      y -= b.t;
      const x0 = 1 + b.off + Math.floor((16 - b.len) / 2);
      const [c, dk, lt] = b.col;
      rect(x0, y, b.len, b.t, c);
      if (b.pages) {
        // เห็นด้านสันหน้ากระดาษ
        rect(x0, y + 1, b.len - 1, b.t - 2, "#fff4dc");
        for (let yy = y + 2; yy < y + b.t - 1; yy += 2) rect(x0 + 1, yy, b.len - 3, 1, "#e6d3ae");
      } else {
        // เห็นด้านสันปก มีแถบชื่อหนังสือ
        rect(x0, y + b.t - 1, b.len, 1, dk);
        rect(x0 + 2, y, 1, b.t - 1, lt);
        rect(x0 + b.len - 3, y, 1, b.t - 1, lt);
        if (b.t >= 6) rect(x0 + 5, y + 2, b.len - 10, 1, "#fff4dc");
        px(x0 + 1, y, lt);
      }
    }
  });
}

function trashBin(): Sprite {
  return paint(12, 17, (px, rect) => {
    rect(4, 0, 4, 1, "#6cc3ae");
    rect(4, 1, 1, 1, "#6cc3ae");
    rect(7, 1, 1, 1, "#6cc3ae");
    rect(0, 2, 12, 2, "#6cc3ae");
    rect(0, 2, 12, 1, "#8fdcc8");
    rect(1, 4, 10, 13, "#4f9a8a");
    rect(1, 4, 10, 1, "#3d7d70");
    for (const x of [3, 6, 9]) rect(x, 6, 1, 9, "#3d7d70");
    rect(2, 5, 1, 11, "#66b3a2");
    rect(1, 16, 10, 1, "#3d7d70");
  });
}

function schoolDesk(): Sprite {
  return paint(24, 15, (px, rect) => {
    rect(0, 0, 24, 3, "#d08a4c");
    rect(1, 0, 22, 1, "#e6a86a");
    rect(0, 2, 24, 1, "#a4652f");
    rect(2, 3, 2, 12, "#8a93a3");
    rect(20, 3, 2, 12, "#8a93a3");
    rect(3, 3, 1, 12, "#646c7c");
    rect(21, 3, 1, 12, "#646c7c");
    rect(4, 4, 16, 4, "#b9773d");
    rect(4, 7, 16, 1, "#8d5a2b");
    rect(10, 5, 4, 1, "#e6a86a");
    rect(4, 11, 16, 1, "#8a93a3");
  });
}

function globe(): Sprite {
  return paint(13, 19, (px, rect) => {
    const cx = 6.5, cy = 5.5;
    for (let y = 0; y < 11; y++)
      for (let x = 1; x < 12; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d <= 5.2) px(x, y, "#3d8bd9");
      }
    // ทวีป
    const land = [[4, 2], [5, 2], [4, 3], [5, 3], [6, 3], [5, 4], [8, 5], [9, 5], [8, 6], [9, 6], [9, 7], [4, 7], [5, 7], [5, 8], [3, 5]];
    for (const [x, y] of land) px(x, y, "#4fbf6a");
    px(3, 2, "#9fd0ff");
    px(3, 3, "#9fd0ff");
    // แกนตั้ง
    rect(0, 5, 1, 4, "#c9a13a");
    px(1, 9, "#c9a13a");
    px(2, 10, "#c9a13a");
    rect(3, 11, 7, 1, "#c9a13a");
    rect(6, 11, 1, 5, "#9c7a3a");
    rect(2, 16, 9, 3, "#8d6e4a");
    rect(2, 16, 9, 1, "#b08a5e");
  });
}

// ───────────── ฉากหลัง ─────────────
function skyline(rnd: () => number): { base: Sprite; lit: Sprite; w: number; h: number } {
  const w = 480, h = 70;
  const base = document.createElement("canvas");
  base.width = w;
  base.height = h;
  const lit = document.createElement("canvas");
  lit.width = w;
  lit.height = h;
  const bx = base.getContext("2d")!;
  const lx = lit.getContext("2d")!;
  let x = 0;
  while (x < w) {
    const bw = Math.min(w - x, 16 + Math.floor(rnd() * 26));
    const bh = 18 + Math.floor(rnd() * 46);
    const top = h - bh;
    bx.fillStyle = rnd() < 0.5 ? "#2a2148" : "#30264f";
    bx.fillRect(x, top, bw, bh);
    if (rnd() < 0.35 && bw > 10) {
      bx.fillRect(x + Math.floor(bw / 2), top - 6, 1, 6); // เสาอากาศ
      bx.fillRect(x + 3, top - 2, bw - 6, 2);
    }
    for (let wy = top + 4; wy < h - 4; wy += 5)
      for (let wx = x + 3; wx < x + bw - 3; wx += 4) {
        const r = rnd();
        if (r < 0.32) {
          lx.fillStyle = r < 0.05 ? "#9fe7ff" : "#ffd66b";
          lx.fillRect(wx, wy, 2, 2);
        } else if (r < 0.7) {
          bx.fillStyle = "#3b3160";
          bx.fillRect(wx, wy, 2, 2);
        }
      }
    x += bw + (rnd() < 0.3 ? 2 + Math.floor(rnd() * 6) : 0);
  }
  return { base, lit, w, h };
}

function midLayer(rnd: () => number): { img: Sprite; w: number; h: number } {
  const w = 360, h = 64;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;
  // ต้นไม้
  let tx = 10;
  while (tx < w - 20) {
    const th = 20 + Math.floor(rnd() * 16);
    const r = 8 + Math.floor(rnd() * 6);
    const top = h - th - r;
    x.fillStyle = "#2b2233";
    x.fillRect(tx - 1, h - th, 3, th);
    for (let yy = -r; yy <= r; yy++)
      for (let xx = -r - 2; xx <= r + 2; xx++) {
        const d = Math.hypot(xx / 1.15, yy);
        if (d <= r + (rnd() < 0.2 ? 0.8 : 0)) {
          x.fillStyle = yy < -r / 3 && xx < 0 ? "#2c5a47" : "#1f4538";
          x.fillRect(tx + xx, top + r + yy, 1, 1);
        }
      }
    tx += 36 + Math.floor(rnd() * 50);
  }
  // เสาไฟ
  for (const lx of [70, 250]) {
    x.fillStyle = "#2c2940";
    x.fillRect(lx, h - 44, 2, 44);
    x.fillRect(lx - 4, h - 44, 8, 2);
    x.fillStyle = "#ffe9a0";
    x.fillRect(lx - 4, h - 42, 3, 2);
    x.fillRect(lx + 2, h - 42, 3, 2);
  }
  // รั้วโรงเรียน
  x.fillStyle = "#3a3354";
  x.fillRect(0, h - 16, w, 2);
  x.fillRect(0, h - 6, w, 2);
  for (let fx = 0; fx < w; fx += 6) x.fillRect(fx, h - 18, 2, 18);
  x.fillStyle = "#4a4270";
  for (let fx = 0; fx < w; fx += 6) x.fillRect(fx, h - 18, 2, 1);
  return { img: c, w, h };
}

function groundTile(): Sprite {
  const w = 32, h = 30;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;
  x.fillStyle = "#57b84a";
  x.fillRect(0, 0, w, 3);
  x.fillStyle = "#8ee06a";
  for (const gx of [1, 2, 7, 12, 13, 19, 24, 25, 29]) x.fillRect(gx, 0, 1, 1);
  x.fillStyle = "#3d8a3a";
  x.fillRect(0, 3, w, 1);
  x.fillStyle = "#c49a6c";
  x.fillRect(0, 4, w, h - 4);
  // อิฐทางเดิน วางสลับแถว
  for (let row = 0; row < 4; row++) {
    const y = 4 + row * 7;
    x.fillStyle = "#a67c52";
    x.fillRect(0, y + 6, w, 1);
    const off = row % 2 === 0 ? 0 : 8;
    for (let bx = off; bx < w + 16; bx += 16) x.fillRect(bx % w, y, 1, 6);
    x.fillStyle = "#d8b084";
    for (let bx = off; bx < w + 16; bx += 16) x.fillRect((bx + 1) % w, y, 14, 1);
  }
  x.fillStyle = "rgba(60,30,20,0.22)";
  x.fillRect(0, 22, w, 8);
  return c;
}

// ───────────── รวมทุกอย่าง ─────────────
export interface Art {
  kru: { run: Sprite[]; jump: Sprite; hurt: Sprite; slide: Sprite; idle: Sprite; thumb: Sprite };
  kruGlow: { run: Sprite[]; jump: Sprite; slide: Sprite; hurt: Sprite };
  kruZombie: Sprite;
  zombie: { walk: Sprite[]; open: Sprite[] };
  coin: Sprite;
  tea: Sprite;
  plane: Sprite;
  bat: Sprite[];
  books: Sprite[][];
  bin: Sprite;
  desk: Sprite;
  globe: Sprite;
  skyline: { base: Sprite; lit: Sprite; w: number; h: number };
  mid: { img: Sprite; w: number; h: number };
  ground: Sprite;
  icons: { kru: string; zombie: string; tea: string };
}

function crop(src: Sprite, h: number): string {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = h;
  c.getContext("2d")!.drawImage(src, 0, 0);
  return c.toDataURL();
}

export function buildArt(): Art {
  const rnd = seeded(20260925);
  const head = (h: string[], b: string[]) => [...h, ...b];
  const runRows = BODY_RUN.map((b) => head(KRU_HEAD, b));
  const jumpRows = head(KRU_HEAD, BODY_JUMP);
  const hurtRows = head(KRU_HEAD_HURT, BODY_HURT);
  const GLOW = "#ffb938";
  const zRows = (hd: string[], i: number) => [...hd, ...Z_ARMS[i], ...Z_LEGS[i]];
  const idle = sprite(head(KRU_HEAD, BODY_IDLE), PAL_KRU);
  const thumb = sprite(head(KRU_HEAD_HAPPY, BODY_THUMB), PAL_KRU);
  const zombieWalk = [0, 1].map((i) => sprite(zRows(Z_HEAD, i), PAL_ZOMBIE));
  const tea = sprite(TEA, PAL_TEA);
  return {
    kru: {
      run: runRows.map((r) => sprite(r, PAL_KRU)),
      jump: sprite(jumpRows, PAL_KRU),
      hurt: sprite(hurtRows, PAL_KRU),
      slide: sprite(KRU_SLIDE, PAL_KRU),
      idle,
      thumb,
    },
    kruGlow: {
      run: runRows.map((r) => glow(r, GLOW)),
      jump: glow(jumpRows, GLOW),
      slide: glow(KRU_SLIDE, GLOW),
      hurt: glow(hurtRows, GLOW),
    },
    kruZombie: sprite(head(KRU_HEAD_ZOMBIE, BODY_ZOMBIE), PAL_KRU_ZOMBIE),
    zombie: { walk: zombieWalk, open: [0, 1].map((i) => sprite(zRows(Z_HEAD_OPEN, i), PAL_ZOMBIE)) },
    coin: sprite(COIN, PAL_COIN),
    tea,
    plane: sprite(PLANE, PAL_PLANE),
    bat: BAT.map((b) => sprite(b, PAL_BAT)),
    books: [1, 2, 3].map((n) => Array.from({ length: 5 }, () => bookStack(n, rnd))),
    bin: trashBin(),
    desk: schoolDesk(),
    globe: globe(),
    skyline: skyline(rnd),
    mid: midLayer(rnd),
    ground: groundTile(),
    icons: { kru: crop(thumb, 16), zombie: crop(zombieWalk[0], 14), tea: tea.toDataURL() },
  };
}
