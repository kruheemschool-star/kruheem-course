// เครื่องยนต์เกม "ครูฮีม หนีซอมบี้" — วิ่งอัตโนมัติ กระโดด/สไลด์หลบของ ชนแล้วสะดุด ซอมบี้ไล่ใกล้เข้ามา
// วาดทุกอย่างบนผืนพิกเซลเล็ก (สูง 180 จุด กว้างตามจอ) แล้วขยายขึ้นจอแบบคมกริบ
// ตัวหนังสือลอย (+1, งั่ม!) วาดทับทีหลังด้วยความละเอียดจริงของจอ ภาษาไทยจึงไม่แตก

import { seeded, type Art, type Sprite } from "./zombieRunArt";
import type { ZrAudio } from "./zombieRunAudio";

export const VIEW_H = 180;
const GROUND = 150;
const ZOMBIE_X = 2;
const REACH = ZOMBIE_X + 19; // ปลายมือซอมบี้
export const GAP_START = 62;
export const GAP_MAX = 84;
const HIT_COST = 21;
const JUMP_V = 330;
const DJUMP_V = 285;
const G_HOLD = 900;
const G_FALL = 1800;
const HOLD_MAX = 0.28;
const BOOST_T = 2.6;

export type Phase = "title" | "playing" | "paused" | "caught" | "over";
export interface RunResult { meters: number; coins: number; score: number }
export interface HudInfo { meters: number; coins: number; gap: number; boost: number }

type ObKind = "book" | "bin" | "desk" | "globe" | "plane" | "bat";
interface Ob {
  kind: ObKind;
  x: number; y: number; baseY: number; w: number; h: number;
  spr: Sprite;
  hit: [number, number, number, number];
  flying: boolean; t: number; done: boolean; zHop: boolean;
  smashed: boolean; vx: number; vy: number; rot: number; vr: number;
}
interface Coin { x: number; y: number; got: boolean; pull: boolean }
interface Tea { x: number; y: number; t: number; got: boolean }
interface Part { x: number; y: number; vx: number; vy: number; g: number; life: number; max: number; c: string; s: number }
interface FText { x: number; y: number; text: string; t: number; dur: number; c: string; size: number; vy: number }

// ท้องฟ้าวนรอบ: เย็น → ค่ำ → รุ่งสาง → เย็น
const SKY_EVE = ["#2d1b4e", "#8b3a6b", "#ff9a5c"];
const SKY_NIGHT = ["#0b0d26", "#1d1d4d", "#3b2f6b"];
const SKY_DAWN = ["#34407f", "#8a74c4", "#ffb997"];
const SKY_KEYS: [number, string[], number][] = [
  [0, SKY_EVE, 0.15], [0.22, SKY_EVE, 0.15], [0.36, SKY_NIGHT, 1], [0.66, SKY_NIGHT, 1],
  [0.78, SKY_DAWN, 0.35], [0.88, SKY_DAWN, 0.35], [1, SKY_EVE, 0.15],
];
const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lerpHex = (a: string, b: string, t: number) => {
  const A = hexRgb(a), B = hexRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
};

const OUCH = ["โอ๊ย!", "สะดุด!", "อุ๊ย!", "เจ็บนะ!"];
const rnd = Math.random;

export class ZombieRunEngine {
  private art: Art;
  private cv: HTMLCanvasElement;
  private cx: CanvasRenderingContext2D;
  private buf: HTMLCanvasElement;
  private bx: CanvasRenderingContext2D;
  private moon: HTMLCanvasElement;
  private stars: [number, number, number][];
  private audio: ZrAudio;
  private onPhase: (p: Phase, r?: RunResult) => void;
  private onHud: (h: HudInfo) => void;
  private font = "sans-serif";
  private reduced = false;
  private raf = 0;
  private last = 0;
  private alive = true;

  W = 320;
  private k = 1;
  phase: Phase = "title";
  private time = 0;

  // ครูฮีม
  private px = REACH + 6 + GAP_START * 0.8;
  private py = GROUND;
  private pvy = 0;
  private onGround = true;
  private jumps = 0;
  private holding = false;
  private holdT = 0;
  private buffer = 0;
  private sliding = false;
  private slideT = 0;
  private slideMin = 0;
  private slideHeld = false;
  private slideQueued = false;
  private stumbleT = 0;
  private invulnT = 0;
  private boostT = 0;
  private runAnim = 0;
  private dustT = 0;
  private flashT = 0;

  // ซอมบี้
  private zx = ZOMBIE_X;
  private zy = 0;
  private zvy = 0;
  private zAnim = 0;
  private groanT = 3;
  private heartT = 0;

  // รอบการวิ่ง
  private gap = GAP_START;
  private gapShown = GAP_START;
  private sinceHit = 99;
  private speed = 0;
  private vNow = 60;
  private diff = 0;
  private dist = 0;
  private coins = 0;
  private bgX = 0;
  private obs: Ob[] = [];
  private coinList: Coin[] = [];
  private teas: Tea[] = [];
  private parts: Part[] = [];
  private texts: FText[] = [];
  private nextSpawn = 0;
  private nextTea = 0;
  private spawned = 0;
  private lastPat = "";
  private milestone = 1;
  private shakeT = 0;
  private shakeMag = 0;
  private caughtT = 0;
  private chompT = 0;
  private zombified = false;

  // manual = ไม่เดิน requestAnimationFrame เอง ให้คนเรียก advance(dt) (ใช้เป็นจอเครื่องเกมบนโต๊ะเรียนหน้าแรก)
  constructor(canvas: HTMLCanvasElement, opts: { art: Art; audio: ZrAudio; onPhase: (p: Phase, r?: RunResult) => void; onHud: (h: HudInfo) => void; manual?: boolean }) {
    this.cv = canvas;
    this.cx = canvas.getContext("2d")!;
    this.buf = document.createElement("canvas");
    this.buf.width = this.W;
    this.buf.height = VIEW_H;
    this.bx = this.buf.getContext("2d")!;
    this.audio = opts.audio;
    this.onPhase = opts.onPhase;
    this.onHud = opts.onHud;
    this.art = opts.art;
    this.moon = this.makeMoon();
    const r = seeded(7);
    this.stars = Array.from({ length: 60 }, () => [Math.floor(r() * 420), Math.floor(r() * 96), r() * 6.28]);
    try {
      this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      /* ignore */
    }
    this.last = performance.now();
    if (!opts.manual) this.raf = requestAnimationFrame(this.loop);
  }

  // เดินเกมไปข้างหน้า dt วินาทีแล้ววาด — สำหรับโหมด manual
  advance(dt: number) {
    this.tick(Math.max(0, Math.min(0.1, dt)));
    this.render();
  }

  setFont(f: string) {
    this.font = f;
  }

  resize(W: number, cssW: number, cssH: number, dpr: number) {
    this.W = W;
    this.buf.width = W;
    this.buf.height = VIEW_H;
    this.cv.width = Math.max(1, Math.round(cssW * dpr));
    this.cv.height = Math.max(1, Math.round(cssH * dpr));
    this.k = this.cv.width / W;
    this.render();
  }

  // ───────── ควบคุม ─────────
  start() {
    this.audio.unlock();
    this.phase = "playing";
    this.time = 0;
    this.py = GROUND;
    this.pvy = 0;
    this.onGround = true;
    this.jumps = 0;
    this.holding = false;
    this.buffer = 0;
    this.sliding = false;
    this.slideHeld = false;
    this.slideQueued = false;
    this.stumbleT = 0;
    this.invulnT = 0;
    this.boostT = 0;
    this.flashT = 0;
    this.zx = ZOMBIE_X;
    this.zy = 0;
    this.zvy = 0;
    this.gap = GAP_START;
    this.gapShown = GAP_START;
    this.px = REACH + 6 + GAP_START * 0.8;
    this.sinceHit = 99;
    this.speed = 105;
    this.dist = 0;
    this.bgX = 0; // ทุกรอบเริ่มที่ท้องฟ้ายามเย็น
    this.coins = 0;
    this.obs = [];
    this.coinList = [];
    this.teas = [];
    this.texts = [];
    this.nextSpawn = 30;
    this.nextTea = 2600;
    this.spawned = 0;
    this.lastPat = "";
    this.milestone = 1;
    this.caughtT = 0;
    this.chompT = 0;
    this.zombified = false;
    this.groanT = 4;
    this.audio.setTempo(0);
    this.audio.play("start");
    this.audio.startMusic();
    this.last = performance.now();
    this.onPhase("playing");
  }

  pause() {
    if (this.phase !== "playing") return;
    this.phase = "paused";
    this.holding = false;
    this.slideHeld = false;
    this.audio.stopMusic();
    this.onPhase("paused");
  }

  resume() {
    if (this.phase !== "paused") return;
    this.audio.unlock();
    this.phase = "playing";
    this.last = performance.now();
    this.audio.startMusic();
    this.onPhase("playing");
  }

  jumpDown() {
    if (this.phase !== "playing") return;
    if (this.onGround) this.doJump(1);
    else if (this.jumps < 2) this.doJump(2);
    else this.buffer = 0.14;
  }

  jumpUp() {
    this.holding = false;
  }

  slideDown() {
    if (this.phase !== "playing") return;
    this.slideHeld = true;
    if (this.onGround) this.startSlide(0.35);
    else {
      // กลางอากาศ = ดิ่งลงเร็ว แล้วสไลด์ต่อตอนแตะพื้น
      this.pvy = Math.max(this.pvy, 420);
      this.holding = false;
      this.slideQueued = true;
    }
  }

  slideUp() {
    this.slideHeld = false;
  }

  // ปัดลงบนจอ (ไม่มีการกดค้าง) → สไลด์ช่วงสั้นๆ
  slideTap() {
    this.slideDown();
    this.slideHeld = false;
    if (this.sliding) this.slideMin = 0.7;
  }

  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.audio.stopMusic();
  }

  // ใช้ตอนทดสอบในเครื่องนักพัฒนา (Browser pane หยุด requestAnimationFrame เมื่อซ่อนอยู่)
  debugStep(seconds: number) {
    const n = Math.round(seconds * 60);
    for (let i = 0; i < n; i++) this.tick(1 / 60);
    this.render();
  }

  debugState() {
    return {
      phase: this.phase, dist: Math.round(this.dist), speed: Math.round(this.speed), gap: +this.gap.toFixed(1),
      coins: this.coins, obs: this.obs.length, py: +this.py.toFixed(1), sliding: this.sliding, boost: +this.boostT.toFixed(2),
    };
  }

  // ───────── วงรอบหลัก ─────────
  private loop = (now: number) => {
    if (!this.alive) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.tick(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private tick(dt: number) {
    if (this.phase === "paused") return;
    this.time += dt;
    if (this.phase === "title") this.updateTitle(dt);
    else if (this.phase === "playing") this.updatePlaying(dt);
    else if (this.phase === "caught") this.updateCaught(dt);
    else this.updateOver(dt);
    this.updateParts(dt);
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    if (this.phase === "playing") {
      this.onHud({ meters: Math.floor(this.dist / 10), coins: this.coins, gap: this.gapShown / GAP_MAX, boost: this.boostT / BOOST_T });
    }
  }

  private updateTitle(dt: number) {
    const v = 60;
    this.vNow = v;
    this.bgX += v * dt;
    this.px = REACH + 6 + GAP_START * 0.8;
    this.runAnim += dt * (v / 9);
    this.zAnim += dt * (2 + v / 45);
    this.runDust(dt);
  }

  private updatePlaying(dt: number) {
    this.speed = 105 + 150 * (1 - Math.exp(-this.dist / 16000));
    this.diff = Math.min(1, (this.speed - 105) / 150);
    const v = this.speed * (this.stumbleT > 0 ? 0.72 : 1) * (this.boostT > 0 ? 1.3 : 1);
    this.vNow = v;
    this.dist += v * dt;
    this.bgX += v * dt;
    this.audio.setTempo(this.diff);

    this.updatePlayer(dt);

    this.sinceHit += dt;
    if (this.sinceHit > 2.5) this.gap = Math.min(GAP_MAX, this.gap + 2.2 * dt);
    this.gapShown += (this.gap - this.gapShown) * Math.min(1, dt * 5);
    this.px = REACH + 6 + this.gapShown * 0.8;

    this.moveWorld(v, dt);
    this.nextSpawn -= v * dt;
    if (this.nextSpawn <= 0) this.spawn();
    this.nextTea -= v * dt * (this.gap < 36 ? 2 : 1);
    this.collide();
    this.updateZombie(dt, v);

    const m = Math.floor(this.dist / 10);
    if (m >= this.milestone * 100) {
      const big = this.milestone % 5 === 0;
      this.text(this.px + 8, this.py - 34, big ? `สุดยอด! ${m} เมตร` : `${m} เมตร!`, "#ffd21f", big ? 12 : 10, 1.4);
      this.audio.play("milestone");
      this.milestone++;
    }
  }

  private updatePlayer(dt: number) {
    this.stumbleT = Math.max(0, this.stumbleT - dt);
    this.invulnT = Math.max(0, this.invulnT - dt);
    if (this.boostT > 0) {
      this.boostT = Math.max(0, this.boostT - dt);
      if (this.boostT === 0) this.invulnT = Math.max(this.invulnT, 0.7); // หมดพลังแล้วยังได้เวลาหายใจนิดหนึ่ง
    }
    this.buffer = Math.max(0, this.buffer - dt);
    if (!this.onGround) {
      if (this.holding) {
        this.holdT += dt;
        if (this.holdT > HOLD_MAX) this.holding = false;
      }
      const g = this.holding && this.pvy < 0 ? G_HOLD : G_FALL;
      this.pvy = Math.min(620, this.pvy + g * dt);
      this.py += this.pvy * dt;
      if (this.py >= GROUND) this.land();
    } else if (this.sliding) {
      this.slideT += dt;
      if (!this.slideHeld && this.slideT >= this.slideMin) this.sliding = false;
    }
    this.runAnim += dt * (this.vNow / 9);
    this.runDust(dt);
    if (this.boostT > 0 && rnd() < dt * 30) {
      this.parts.push({ x: this.px + rnd() * 6, y: this.py - 4 - rnd() * 18, vx: -60 - rnd() * 40, vy: -10 + rnd() * 20, g: 0, life: 0.35, max: 0.35, c: rnd() < 0.5 ? "#ffd21f" : "#ff9a3c", s: 1 });
    }
  }

  private runDust(dt: number) {
    if (!this.onGround) return;
    this.dustT -= dt;
    if (this.dustT <= 0) {
      this.dustT = this.sliding ? 0.04 : 0.14;
      this.dust(this.px + 2, GROUND - 1, this.sliding ? 2 : 1);
    }
  }

  private land() {
    this.py = GROUND;
    this.pvy = 0;
    this.onGround = true;
    this.jumps = 0;
    this.holding = false;
    this.dust(this.px + 8, GROUND - 1, 4);
    this.audio.play("land");
    if (this.buffer > 0) {
      this.buffer = 0;
      this.doJump(1);
    } else if (this.slideQueued || this.slideHeld) {
      this.slideQueued = false;
      this.startSlide(this.slideHeld ? 0.3 : 0.6);
    }
  }

  private doJump(n: 1 | 2) {
    this.pvy = n === 1 ? -JUMP_V : -DJUMP_V;
    this.onGround = false;
    this.jumps = n;
    this.holding = true;
    this.holdT = 0;
    this.sliding = false;
    this.slideQueued = false;
    this.audio.play(n === 1 ? "jump" : "djump");
    if (n === 2) this.burst(this.px + 8, this.py, 6, ["#ffffff", "#d8d2f0"], 50);
  }

  private startSlide(min: number) {
    if (!this.sliding) this.audio.play("slide");
    this.sliding = true;
    this.slideT = 0;
    this.slideMin = min;
  }

  private updateZombie(dt: number, v: number) {
    this.zAnim += dt * (2 + v / 45);
    const lean = Math.max(0, 30 - this.gapShown) * 0.2;
    this.zx += (ZOMBIE_X + lean - this.zx) * Math.min(1, dt * 6);
    if (this.zy <= 0) {
      for (const o of this.obs) {
        if (o.flying || o.smashed || o.zHop) continue;
        if (o.x < REACH + 4 + v * 0.1 && o.x + o.w > ZOMBIE_X) {
          o.zHop = true;
          this.zvy = 300;
          this.zy = 0.01;
          break;
        }
      }
    }
    this.zombieGravity(dt);
    this.groanT -= dt;
    if (this.groanT <= 0) {
      if (this.gapShown < 45) this.audio.play("groan");
      this.groanT = 2.2 + rnd() * 2.5;
    }
    if (this.gapShown < 26) {
      this.heartT -= dt;
      if (this.heartT <= 0) {
        this.audio.play("heart");
        this.heartT = 0.8;
      }
    } else this.heartT = 0;
  }

  private zombieGravity(dt: number) {
    if (this.zy > 0) {
      this.zvy -= 1500 * dt;
      this.zy += this.zvy * dt;
      if (this.zy <= 0) {
        this.zy = 0;
        this.zvy = 0;
      }
    }
  }

  private updateCaught(dt: number) {
    const t = (this.caughtT += dt);
    this.speed *= Math.max(0, 1 - dt * 3.2);
    const v = this.speed;
    this.vNow = v;
    this.bgX += v * dt;
    this.moveWorld(v, dt);
    if (!this.onGround) {
      this.pvy = Math.min(620, this.pvy + G_FALL * dt);
      this.py += this.pvy * dt;
      if (this.py >= GROUND) {
        this.py = GROUND;
        this.onGround = true;
        this.pvy = 0;
      }
    }
    this.sliding = false;
    this.zAnim += dt * 4;
    this.zombieGravity(dt);
    if (!this.zombified) {
      this.zx += (this.px - 9 - this.zx) * Math.min(1, dt * 9);
      if (t > 0.3) {
        this.chompT -= dt;
        if (this.chompT <= 0) {
          this.chompT = 0.26;
          this.audio.play("chomp");
          this.shake(0.1, 2);
          this.text(this.px + 4 + rnd() * 12, this.py - 30 - rnd() * 8, "งั่ม!", "#ffffff", 9, 0.7);
          this.burst(this.px + 6, this.py - 14, 3, ["#ffd21f", "#ffffff"], 60);
        }
      }
      if (t >= 1.55) {
        this.zombified = true;
        this.audio.play("poof");
        this.burst(this.px + 8, this.py - 12, 26, ["#d8d2f0", "#ffffff", "#9fd08a"], 70);
        this.text(this.px + 10, this.py - 36, "ครูฮีมกลายเป็นซอมบี้!", "#b6f08a", 10, 1.6);
        for (const o of this.obs) {
          if (o.smashed || o.x > this.px + 60) continue;
          o.smashed = true;
          o.vx = 90 + rnd() * 60;
          o.vy = -140 - rnd() * 60;
          o.vr = (rnd() < 0.5 ? -1 : 1) * 6;
        }
      }
    } else {
      this.px += (REACH + 30 - this.px) * Math.min(1, dt * 4);
      this.zx += (ZOMBIE_X - this.zx) * Math.min(1, dt * 4);
    }
    if (t >= 2.5) {
      this.phase = "over";
      this.onPhase("over", this.result());
    }
  }

  private updateOver(dt: number) {
    this.vNow = 0;
    this.zAnim += dt * 3;
    this.runAnim += dt * 3;
  }

  private result(): RunResult {
    const meters = Math.floor(this.dist / 10);
    return { meters, coins: this.coins, score: meters + this.coins * 5 };
  }

  private startCaught() {
    this.phase = "caught";
    this.caughtT = 0;
    this.chompT = 0.3;
    this.holding = false;
    this.sliding = false;
    this.boostT = 0;
    this.audio.stopMusic();
    this.audio.play("caught");
    this.onPhase("caught");
  }

  // ───────── โลก ─────────
  private moveWorld(v: number, dt: number) {
    for (const o of this.obs) {
      if (o.smashed) {
        o.x += o.vx * dt;
        o.vy += 900 * dt;
        o.y += o.vy * dt;
        o.rot += o.vr * dt;
        continue;
      }
      o.x -= v * dt;
      o.t += dt;
      if (o.kind === "plane") o.y = o.baseY + Math.round(Math.sin(o.t * 5));
      else if (o.kind === "bat") o.y = o.baseY + Math.round(Math.sin(o.t * 4) * 3);
    }
    this.obs = this.obs.filter((o) => o.x + o.w > -40 && o.y < VIEW_H + 40 && o.x < this.W + 400);
    for (const c of this.coinList) {
      if (c.pull) {
        const tx = this.px + 4, ty = this.py - 14;
        c.x += (tx - c.x) * Math.min(1, dt * 14);
        c.y += (ty - c.y) * Math.min(1, dt * 14);
      } else c.x -= v * dt;
    }
    this.coinList = this.coinList.filter((c) => !c.got && c.x > -12);
    for (const t of this.teas) {
      t.x -= v * dt;
      t.t += dt;
    }
    this.teas = this.teas.filter((t) => !t.got && t.x > -14);
  }

  private addGround(kind: ObKind, spr: Sprite, x: number): Ob {
    const w = spr.width, h = spr.height;
    const y = GROUND - h + 1;
    const o: Ob = { kind, x, y, baseY: y, w, h, spr, hit: [2, 2, w - 4, h - 3], flying: false, t: 0, done: false, zHop: false, smashed: false, vx: 0, vy: 0, rot: 0, vr: 0 };
    this.obs.push(o);
    return o;
  }

  private addFlying(kind: "plane" | "bat", x: number): Ob {
    const spr = kind === "plane" ? this.art.plane : this.art.bat[0];
    const w = spr.width, h = spr.height;
    const y = kind === "plane" ? GROUND - 24 : GROUND - 25;
    const hit: [number, number, number, number] = kind === "plane" ? [2, 2, w - 4, h - 4] : [2, 1, w - 4, h - 3];
    const o: Ob = { kind, x, y, baseY: y, w, h, spr, hit, flying: true, t: rnd() * 3, done: false, zHop: true, smashed: false, vx: 0, vy: 0, rot: 0, vr: 0 };
    this.obs.push(o);
    return o;
  }

  private book(level: number) {
    const set = this.art.books[level];
    return set[Math.floor(rnd() * set.length)];
  }

  private spawn() {
    const d = this.diff;
    const x0 = this.W + 12;
    const pats: [string, number, number][] = [
      ["book1", 0, 3], ["book2", 0, 3], ["book3", 0.06, 2], ["bin", 0.03, 2], ["globe", 0.1, 1.5],
      ["desk", 0.18, 1.6], ["plane", 0.08, 2.2], ["bat", 0.3, 1.6], ["pair", 0.3, 1.4], ["combo", 0.5, 1.2],
    ];
    let pool = pats.filter((p) => p[1] <= d && p[0] !== this.lastPat);
    if (this.spawned < 3) pool = pats.filter((p) => p[0] === "book1" || p[0] === "book2");
    let r = rnd() * pool.reduce((a, p) => a + p[2], 0);
    let id = pool[0][0];
    for (const p of pool) {
      r -= p[2];
      if (r <= 0) {
        id = p[0];
        break;
      }
    }
    this.lastPat = id;
    let end = x0;
    let arcOver: Ob | null = null;
    const put = (o: Ob) => {
      end = o.x + o.w;
      if (!o.flying) arcOver = o;
      return o;
    };
    switch (id) {
      case "book1": put(this.addGround("book", this.book(0), x0)); break;
      case "book2": put(this.addGround("book", this.book(1), x0)); break;
      case "book3": put(this.addGround("book", this.book(2), x0)); break;
      case "bin": put(this.addGround("bin", this.art.bin, x0)); break;
      case "globe": put(this.addGround("globe", this.art.globe, x0)); break;
      case "desk": put(this.addGround("desk", this.art.desk, x0)); break;
      case "plane": put(this.addFlying("plane", x0)); break;
      case "bat": put(this.addFlying("bat", x0)); break;
      case "pair": {
        const a = this.addGround("book", this.book(rnd() < 0.5 ? 0 : 1), x0);
        // ช่องว่างยืดตามความเร็ว → กระโดดทีละเล่มทันเสมอ (หรือโดดสองชั้นข้ามทีเดียว)
        put(this.addGround("book", this.book(0), a.x + a.w + 30 + this.speed * 0.36 + rnd() * 14));
        arcOver = null;
        break;
      }
      case "combo": {
        const a = this.addGround("book", this.book(Math.floor(rnd() * 2)), x0);
        put(this.addFlying(rnd() < 0.5 ? "plane" : "bat", a.x + a.w + this.speed * 0.75 + 30));
        arcOver = null;
        break;
      }
    }
    const minGap = this.speed * 0.78 + 70;
    const after = minGap + rnd() * this.speed * 0.85 * (1 - 0.45 * d);
    this.placeCoins(end, after, arcOver);
    if (this.nextTea <= 0) {
      const air = rnd() < 0.45;
      this.teas.push({ x: end + after * 0.5, y: air ? GROUND - 46 : GROUND - 18, t: rnd() * 3, got: false });
      this.nextTea = 3200 + rnd() * 2800;
    }
    this.nextSpawn = end - x0 + after;
    this.spawned++;
  }

  private placeCoins(start: number, space: number, arcOver: Ob | null) {
    const r = rnd();
    if (arcOver && r < 0.4) {
      const cx = arcOver.x + arcOver.w / 2 - 4;
      const n = 5, span = 56;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        this.coinList.push({ x: cx - span / 2 + t * span, y: GROUND - 13 - Math.sin(t * Math.PI) * (arcOver.h + 10), got: false, pull: false });
      }
    } else if (r < 0.8 && space > 100) {
      const n = 3 + Math.floor(rnd() * 3);
      const x0 = start + 28 + rnd() * Math.max(0, space - 60 - n * 12);
      const y = rnd() < 0.55 ? GROUND - 13 : GROUND - 40;
      for (let i = 0; i < n; i++) this.coinList.push({ x: x0 + i * 12, y, got: false, pull: false });
    }
  }

  private playerBox(): [number, number, number, number] {
    if (this.sliding) return [this.px + 3, this.py - 13, 16, 13];
    return [this.px + 4, this.py - 21, 8, 21];
  }

  private collide() {
    const [bx, by, bw, bh] = this.playerBox();
    const hitsBox = (x: number, y: number, w: number, h: number) => bx < x + w && bx + bw > x && by < y + h && by + bh > y;
    for (const o of this.obs) {
      if (o.done || o.smashed) continue;
      if (!hitsBox(o.x + o.hit[0], o.y + o.hit[1], o.hit[2], o.hit[3])) continue;
      if (this.boostT > 0) this.smash(o);
      else if (this.invulnT <= 0) {
        o.done = true;
        this.hurt();
        if (this.phase !== "playing") return;
      }
    }
    for (const c of this.coinList) {
      if (c.got) continue;
      if (this.boostT > 0 && !c.pull && Math.abs(c.x - this.px) < 56 && Math.abs(c.y - (this.py - 12)) < 50) c.pull = true;
      if (hitsBox(c.x - 1, c.y - 1, 11, 11)) {
        c.got = true;
        this.coins++;
        this.audio.play("coin");
        this.burst(c.x + 4, c.y + 4, 4, ["#ffd23f", "#fff6b8"], 40);
      }
    }
    for (const t of this.teas) {
      if (t.got) continue;
      if (hitsBox(t.x, t.y, 11, 15)) {
        t.got = true;
        this.boostT = BOOST_T;
        this.gap = Math.min(GAP_MAX, this.gap + 22);
        this.sinceHit = 99;
        this.audio.play("tea");
        this.burst(t.x + 5, t.y + 6, 14, ["#f5901e", "#fff1d6", "#ffd21f"], 80);
        this.text(this.px + 10, this.py - 34, "ชาไทยมา พลังมา!", "#ffb938", 10, 1.3);
      }
    }
  }

  private hurt() {
    this.gap -= HIT_COST;
    this.sinceHit = 0;
    this.stumbleT = 0.45;
    this.invulnT = 1.3;
    this.flashT = 0.12;
    this.shake(0.25, 3);
    this.audio.play("hit");
    this.burst(this.px + 8, this.py - 22, 6, ["#ffd21f", "#ffffff"], 70);
    if (this.gap <= 0) {
      this.gap = 0;
      this.startCaught();
      return;
    }
    this.text(this.px + 8, this.py - 32, OUCH[Math.floor(rnd() * OUCH.length)], "#ffffff", 9, 0.8);
    if (this.gap < 24) this.text(this.W / 2, 34, "ระวัง! ซอมบี้ใกล้แล้ว", "#ff6b6b", 10, 1.4);
  }

  private smash(o: Ob) {
    o.smashed = true;
    o.vx = 140 + rnd() * 80;
    o.vy = -170 - rnd() * 80;
    o.vr = (rnd() < 0.5 ? -1 : 1) * (6 + rnd() * 6);
    this.audio.play("smash");
    this.shake(0.12, 2);
    this.burst(o.x + o.w / 2, o.y + o.h / 2, 8, ["#ffffff", "#ffd21f", "#ff9a3c"], 90);
    this.text(o.x + o.w / 2, o.y - 6, "ตูม!", "#ffd21f", 10, 0.7);
  }

  // ───────── เอฟเฟกต์ ─────────
  private shake(t: number, mag: number) {
    this.shakeT = Math.max(this.shakeT, t);
    this.shakeMag = mag;
  }

  private dust(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const life = 0.3 + rnd() * 0.2;
      this.parts.push({ x: x + rnd() * 3, y: y - rnd() * 2, vx: -25 - rnd() * 30, vy: -8 - rnd() * 18, g: 30, life, max: life, c: rnd() < 0.5 ? "#e6d4b3" : "#bfa47f", s: 1 });
    }
  }

  private burst(x: number, y: number, n: number, colors: string[], sp: number) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const s = sp * (0.4 + rnd() * 0.6);
      const life = 0.35 + rnd() * 0.35;
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, g: 160, life, max: life, c: colors[Math.floor(rnd() * colors.length)], s: rnd() < 0.3 ? 2 : 1 });
    }
  }

  private updateParts(dt: number) {
    for (const p of this.parts) {
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.t += dt;
      t.y += t.vy * dt;
      t.vy *= Math.max(0, 1 - dt * 2.5);
    }
    this.texts = this.texts.filter((t) => t.t < t.dur);
  }

  private text(x: number, y: number, text: string, c: string, size = 9, dur = 0.9) {
    this.texts.push({ x, y, text, t: 0, dur, c, size, vy: -18 });
  }

  private makeMoon() {
    const r = 11;
    const c = document.createElement("canvas");
    c.width = c.height = r * 2 + 2;
    const x = c.getContext("2d")!;
    for (let yy = 0; yy < r * 2 + 2; yy++)
      for (let xx = 0; xx < r * 2 + 2; xx++) {
        const d = Math.hypot(xx + 0.5 - r - 1, yy + 0.5 - r - 1);
        if (d <= r) {
          x.fillStyle = d > r - 1.2 ? "#f3e3a6" : "#fff4c9";
          x.fillRect(xx, yy, 1, 1);
        }
      }
    x.fillStyle = "#eadb9f";
    for (const [cx, cy, w] of [[7, 8, 3], [14, 12, 2], [9, 15, 2], [15, 6, 1]] as const) x.fillRect(cx, cy, w, w);
    return c;
  }

  // ───────── วาด ─────────
  private sky(): { cols: string[]; night: number } {
    const t = (this.bgX / 16000) % 1;
    let i = 0;
    while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1][0] <= t) i++;
    const [t0, a, n0] = SKY_KEYS[i];
    const [t1, b, n1] = SKY_KEYS[i + 1];
    const f = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
    return { cols: a.map((c, j) => lerpHex(c, b[j], f)), night: n0 + (n1 - n0) * f };
  }

  private tile(img: CanvasImageSource, tw: number, par: number, y: number) {
    const off = -Math.floor((this.bgX * par) % tw);
    for (let x = off; x < this.W; x += tw) this.bx.drawImage(img, x, y);
  }

  private render() {
    const b = this.bx;
    const W = this.W;
    const a = this.art;
    b.imageSmoothingEnabled = false;
    const { cols, night } = this.sky();
    const g = b.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, cols[0]);
    g.addColorStop(0.55, cols[1]);
    g.addColorStop(1, cols[2]);
    b.fillStyle = g;
    b.fillRect(0, 0, W, GROUND);

    if (night > 0.2) {
      for (const [sx, sy, ph] of this.stars) {
        if (sx >= W) continue;
        const al = (night - 0.2) * (0.55 + 0.45 * Math.sin(this.time * 2 + ph));
        if (al <= 0) continue;
        b.globalAlpha = Math.min(1, al);
        b.fillStyle = "#ffffff";
        b.fillRect(sx, sy, 1, 1);
      }
      b.globalAlpha = 1;
    }
    const mx = Math.round(W * 0.8 - ((this.bgX * 0.004) % 40));
    b.globalAlpha = 0.18;
    b.fillStyle = "#fff4c9";
    b.beginPath();
    b.arc(mx + 12, 36, 18, 0, Math.PI * 2);
    b.fill();
    b.globalAlpha = 1;
    b.drawImage(this.moon, mx, 24);

    const sk = a.skyline;
    const skyY = GROUND - 8 - sk.h;
    this.tile(sk.base, sk.w, 0.12, skyY);
    b.globalAlpha = 0.25 + 0.75 * night;
    this.tile(sk.lit, sk.w, 0.12, skyY);
    b.globalAlpha = 0.3;
    b.fillStyle = cols[2];
    b.fillRect(0, skyY, W, sk.h + 8);
    b.globalAlpha = 1;
    this.tile(a.mid.img, a.mid.w, 0.45, GROUND - a.mid.h);
    this.tile(a.ground, 32, 1, GROUND);

    for (const t of this.teas) {
      const bob = Math.round(Math.sin(t.t * 4) * 2);
      const tx = Math.round(t.x), ty = Math.round(t.y) + bob;
      b.globalAlpha = 0.35 + 0.2 * Math.sin(t.t * 8);
      b.fillStyle = "#ffe08a";
      b.fillRect(tx - 2, ty + 2, 15, 13);
      b.globalAlpha = 1;
      b.drawImage(a.tea, tx, ty);
      if (Math.floor(t.t * 5) % 3 === 0) {
        b.fillStyle = "#ffffff";
        b.fillRect(tx + 11, ty + 1, 1, 1);
        b.fillRect(tx - 2, ty + 9, 1, 1);
      }
    }
    for (const c of this.coinList) {
      const ww = Math.max(1, Math.round(9 * Math.abs(Math.cos(this.time * 5 + c.x * 0.05))));
      b.drawImage(a.coin, 0, 0, 9, 9, Math.round(c.x) + Math.floor((9 - ww) / 2), Math.round(c.y), ww, 9);
    }
    for (const o of this.obs) {
      const spr = o.kind === "bat" ? a.bat[Math.floor(o.t * 8) % 2] : o.spr;
      if (o.smashed) {
        b.save();
        b.translate(Math.round(o.x + o.w / 2), Math.round(o.y + o.h / 2));
        b.rotate(o.rot);
        b.drawImage(spr, -Math.floor(o.w / 2), -Math.floor(o.h / 2));
        b.restore();
      } else b.drawImage(spr, Math.round(o.x), Math.round(o.y));
    }

    if (this.phase === "caught" && !this.zombified) {
      this.drawPlayer();
      this.drawZombie();
    } else {
      this.drawZombie();
      this.drawPlayer();
    }

    for (const p of this.parts) {
      b.globalAlpha = Math.min(1, (p.life / p.max) * 1.5);
      b.fillStyle = p.c;
      b.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
    b.globalAlpha = 1;

    if (this.boostT > 0) {
      b.fillStyle = "rgba(255,255,255,0.55)";
      for (let i = 0; i < 5; i++) {
        const ly = 20 + ((i * 37 + Math.floor(this.time * 40) * 13) % (GROUND - 30));
        const lx = (W - ((this.time * 900 + i * 97) % (W + 60)));
        b.fillRect(Math.round(lx), ly, 14 + (i % 3) * 6, 1);
      }
    }

    // ── ขยายขึ้นจอ + ชั้นความละเอียดสูง ──
    const c = this.cx;
    const k = this.k;
    const cw = this.cv.width, ch = this.cv.height;
    let sx = 0, sy = 0;
    if (this.shakeT > 0 && !this.reduced) {
      sx = Math.round((rnd() * 2 - 1) * this.shakeMag);
      sy = Math.round((rnd() * 2 - 1) * this.shakeMag);
    }
    c.imageSmoothingEnabled = false;
    c.fillStyle = "#120d22";
    c.fillRect(0, 0, cw, ch);
    c.drawImage(this.buf, 0, 0, W, VIEW_H, sx * k, sy * k, W * k, VIEW_H * k);

    const danger = this.phase === "playing" ? Math.max(0, Math.min(1, (28 - this.gapShown) / 22)) : 0;
    if (danger > 0) {
      const rg = c.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.max(cw, ch) * 0.72);
      rg.addColorStop(0, "rgba(220,30,50,0)");
      rg.addColorStop(1, `rgba(220,30,50,${(danger * 0.55 * (0.7 + 0.3 * Math.sin(this.time * 9))).toFixed(3)})`);
      c.fillStyle = rg;
      c.fillRect(0, 0, cw, ch);
    }
    if (this.flashT > 0) {
      c.fillStyle = `rgba(255,60,60,${(this.flashT / 0.12) * 0.25})`;
      c.fillRect(0, 0, cw, ch);
    }

    c.textAlign = "center";
    c.textBaseline = "middle";
    c.lineJoin = "round";
    for (const t of this.texts) {
      const p = t.t / t.dur;
      c.globalAlpha = p > 0.7 ? Math.max(0, 1 - (p - 0.7) / 0.3) : 1;
      const pop = t.t < 0.12 ? 0.6 + (t.t / 0.12) * 0.4 : 1;
      const fs = Math.max(12, Math.round(t.size * k * pop));
      c.font = `700 ${fs}px ${this.font}`;
      const half = c.measureText(t.text).width / 2 + 6;
      const x = Math.min(cw - half, Math.max(half, (t.x + sx) * k));
      const y = (t.y + sy) * k;
      c.lineWidth = Math.max(3, fs * 0.22);
      c.strokeStyle = "#1a1024";
      c.strokeText(t.text, x, y);
      c.fillStyle = t.c;
      c.fillText(t.text, x, y);
    }
    c.globalAlpha = 1;
  }

  private drawPlayer() {
    const b = this.bx;
    const a = this.art;
    let spr: Sprite;
    let glow: Sprite | null = null;
    let bob = 0;
    let jx = 0;
    if (this.phase === "over" || (this.phase === "caught" && this.zombified)) {
      spr = a.kruZombie;
      bob = Math.floor(this.time * 3) % 2 ? -1 : 0;
    } else if (this.phase === "caught") {
      spr = a.kru.hurt;
      jx = Math.floor(this.time * 30) % 2 ? 1 : 0;
    } else if (this.stumbleT > 0) {
      spr = a.kru.hurt;
      glow = a.kruGlow.hurt;
    } else if (this.sliding) {
      spr = a.kru.slide;
      glow = a.kruGlow.slide;
    } else if (!this.onGround) {
      spr = a.kru.jump;
      glow = a.kruGlow.jump;
    } else {
      const f = Math.floor(this.runAnim) % 4;
      spr = a.kru.run[f];
      glow = a.kruGlow.run[f];
      bob = f % 2 === 1 ? -1 : 0;
    }
    if (this.phase === "playing" && this.invulnT > 0 && this.boostT <= 0 && Math.floor(this.time * 14) % 2 === 0) return;
    const dx = Math.round(this.px) - 1 + jx;
    const dy = Math.round(this.py) - spr.height + 1 + bob;
    if (this.boostT > 0 && glow) {
      b.globalAlpha = 0.9;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.drawImage(glow, dx + ox, dy + oy);
      b.globalAlpha = 1;
    }
    b.drawImage(spr, dx, dy);
  }

  private drawZombie() {
    const b = this.bx;
    const a = this.art;
    const f = Math.floor(this.zAnim) % 2;
    let spr = a.zombie.walk[f];
    if (this.phase === "caught" && !this.zombified) spr = Math.floor(this.caughtT * 8) % 2 ? a.zombie.open[f] : a.zombie.walk[f];
    else if (this.phase === "over") spr = Math.floor(this.time * 2.5) % 2 ? a.zombie.open[f] : a.zombie.walk[f];
    else if (this.gapShown < 20 && this.phase === "playing" && Math.floor(this.time * 6) % 2) spr = a.zombie.open[f];
    const bob = f === 1 ? -1 : 0;
    b.drawImage(spr, Math.round(this.zx) - 1, GROUND - spr.height + 1 - Math.round(this.zy) + bob);
  }
}
