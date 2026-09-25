// เสียงเกม "ครูฮีม หนีซอมบี้" — สังเคราะห์สดด้วย Web Audio ทั้งหมด ไม่มีไฟล์เสียง
// เบราว์เซอร์มือถือยอมให้เล่นเสียงหลังผู้ใช้แตะจอเท่านั้น → เรียก unlock() ตอนกดเริ่ม

export type Sfx =
  | "jump" | "djump" | "land" | "slide" | "coin" | "tea" | "hit" | "smash"
  | "chomp" | "groan" | "heart" | "caught" | "poof" | "milestone" | "start";

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

// เพลงวิ่งหนี 8 ห้อง (ตัวเลข = โน้ต MIDI, 0 = เงียบ, -1 = ลากเสียงต่อ)
const MELODY: number[][] = [
  [69, -1, 72, -1, 76, -1, 74, 72],
  [72, -1, 69, -1, 65, -1, 69, 72],
  [71, -1, 74, -1, 79, -1, 77, 74],
  [76, -1, -1, 74, 72, -1, 71, -1],
  [81, -1, 79, 76, 77, -1, 76, 72],
  [74, -1, 72, 69, 72, -1, 77, -1],
  [79, -1, 77, 74, 71, -1, 74, 77],
  [76, -1, 75, 76, 80, -1, 76, -1],
];
const ROOTS = [45, 41, 43, 40];

export class ZrAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private nextT = 0;
  private step = 0;
  private eighth = 0.2;
  sfxOn = true;
  musicOn = true;
  // disabled = ไม่สร้าง AudioContext เลย (จอเครื่องเกมบนโต๊ะเรียนหน้าแรกใช้เอนจินเดียวกันแต่ต้องเงียบ)
  disabled = false;

  unlock() {
    if (this.disabled) return;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        const ctx = new AC();
        this.ctx = ctx;
        this.master = ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(ctx.destination);
        this.sfxBus = ctx.createGain();
        this.sfxBus.gain.value = this.sfxOn ? 1 : 0;
        this.sfxBus.connect(this.master);
        this.musicBus = ctx.createGain();
        this.musicBus.gain.value = this.musicOn ? 1 : 0;
        this.musicBus.connect(this.master);
        const n = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = n.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        this.noiseBuf = n;
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      /* เครื่องที่ไม่มีเสียงก็เล่นได้ปกติ */
    }
  }

  setSfx(on: boolean) {
    this.sfxOn = on;
    if (this.sfxBus && this.ctx) this.sfxBus.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.02);
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    if (this.musicBus && this.ctx) this.musicBus.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05);
  }

  // ยิ่งวิ่งเร็ว เพลงยิ่งเร่ง (0..1)
  setTempo(diff: number) {
    this.eighth = 0.2 / (1 + Math.max(0, Math.min(1, diff)) * 0.3);
  }

  private tone(f0: number, f1: number, dur: number, vol: number, type: OscillatorType = "square", at = 0, bus?: GainNode | null, absolute = false) {
    const c = this.ctx;
    const out = bus ?? this.sfxBus;
    if (!c || !out) return;
    const t = absolute ? at : c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  private noise(dur: number, vol: number, freq: number, type: BiquadFilterType = "bandpass", at = 0, q = 1, bus?: GainNode | null, absolute = false) {
    const c = this.ctx;
    const out = bus ?? this.sfxBus;
    if (!c || !out || !this.noiseBuf) return;
    const t = absolute ? at : c.currentTime + at;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  play(name: Sfx) {
    if (!this.ctx || !this.sfxOn) return;
    try {
      switch (name) {
        case "jump": this.tone(330, 700, 0.14, 0.07); break;
        case "djump": this.tone(520, 1100, 0.14, 0.06); this.tone(780, 1560, 0.1, 0.03, "triangle", 0.03); break;
        case "land": this.noise(0.06, 0.08, 500, "lowpass"); break;
        case "slide": this.noise(0.28, 0.12, 1400, "bandpass", 0, 0.7); break;
        case "coin": this.tone(988, 988, 0.06, 0.05); this.tone(1319, 1319, 0.14, 0.05, "square", 0.06); break;
        case "tea": [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, f, 0.12, 0.06, "triangle", i * 0.06)); break;
        case "hit": this.noise(0.18, 0.3, 900, "bandpass", 0, 0.8); this.tone(220, 70, 0.22, 0.12, "square"); break;
        case "smash": this.noise(0.22, 0.35, 700, "lowpass"); this.tone(160, 50, 0.18, 0.14, "sine"); break;
        case "chomp": this.tone(140, 60, 0.12, 0.16, "square"); this.noise(0.08, 0.2, 1800, "bandpass", 0.02, 2); break;
        case "groan": {
          const c = this.ctx;
          const t = c.currentTime;
          const o = c.createOscillator();
          const lfo = c.createOscillator();
          const lg = c.createGain();
          const f = c.createBiquadFilter();
          const g = c.createGain();
          o.type = "sawtooth";
          o.frequency.setValueAtTime(110, t);
          o.frequency.exponentialRampToValueAtTime(72, t + 0.8);
          lfo.frequency.value = 7;
          lg.gain.value = 6;
          lfo.connect(lg);
          lg.connect(o.frequency);
          f.type = "lowpass";
          f.frequency.value = 520;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.1, t + 0.12);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
          o.connect(f);
          f.connect(g);
          g.connect(this.sfxBus!);
          o.start(t);
          lfo.start(t);
          o.stop(t + 0.9);
          lfo.stop(t + 0.9);
          break;
        }
        case "heart": this.tone(70, 50, 0.1, 0.18, "sine"); this.tone(70, 50, 0.1, 0.12, "sine", 0.14); break;
        case "caught": [392, 330, 262, 196].forEach((f, i) => this.tone(f, f * 0.97, 0.2, 0.07, "square", i * 0.16)); break;
        case "poof": this.noise(0.4, 0.2, 2400, "bandpass", 0, 0.6); this.tone(600, 200, 0.35, 0.05, "triangle"); break;
        case "milestone": this.tone(784, 784, 0.08, 0.05); this.tone(1175, 1175, 0.18, 0.05, "square", 0.08); break;
        case "start": [523, 784, 1047].forEach((f, i) => this.tone(f, f, 0.1, 0.05, "square", i * 0.08)); break;
      }
    } catch {
      /* ignore */
    }
  }

  startMusic() {
    if (!this.ctx || this.musicTimer !== null) return;
    this.step = 0;
    this.nextT = this.ctx.currentTime + 0.06;
    this.musicTimer = window.setInterval(() => this.schedule(), 30);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private schedule() {
    const c = this.ctx;
    if (!c) return;
    // แท็บถูกพักนานจนตามไม่ทัน → เริ่มนับใหม่ ไม่เล่นโน้ตรัวทีเดียว
    if (this.nextT < c.currentTime - 0.25) this.nextT = c.currentTime + 0.05;
    while (this.nextT < c.currentTime + 0.15) {
      this.playStep(this.step, this.nextT);
      this.nextT += this.eighth;
      this.step = (this.step + 1) % 64;
    }
  }

  private playStep(i: number, t: number) {
    const bar = Math.floor(i / 8) % 8;
    const s = i % 8;
    const e = this.eighth;
    const bus = this.musicBus;
    const m = MELODY[bar][s];
    if (m > 0) {
      let len = 1;
      while (s + len < 8 && MELODY[bar][s + len] === -1) len++;
      this.tone(mtof(m), mtof(m), len * e * 0.92, 0.035, "square", t, bus, true);
    }
    const root = ROOTS[bar % 4];
    this.tone(mtof(root + (s % 2 ? 12 : 0)), mtof(root + (s % 2 ? 12 : 0)), e * 0.8, 0.1, "triangle", t, bus, true);
    if (s % 4 === 0) this.tone(150, 45, 0.12, 0.14, "sine", t, bus, true);
    if (s % 2 === 1) this.noise(0.03, 0.03, 7000, "highpass", t, 1, bus, true);
  }

  destroy() {
    this.stopMusic();
    try {
      void this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
  }
}
