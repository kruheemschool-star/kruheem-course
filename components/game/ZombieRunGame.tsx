"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { ArrowLeft, Music, Pause, Volume2, VolumeX } from "lucide-react";
import { buildArt } from "./zombieRunArt";
import { ZombieRunEngine, VIEW_H, type HudInfo, type Phase, type RunResult } from "./zombieRunEngine";
import { ZrAudio } from "./zombieRunAudio";
import { ZR_CSS } from "./zombieRunCss";

// หน้าเกม "ครูฮีม หนีซอมบี้" — เกมพักสมองแบบวิ่งไม่รู้จบ (พิกเซลอาร์ต)
// ส่วนนี้ดูแลหน้าจอรอบๆ: ขนาดจอเกม ปุ่มกด หน้าเริ่ม/พัก/จบ สถิติสูงสุด (เก็บในเครื่อง)
// ตัวเกมจริงอยู่ใน zombieRunEngine.ts

type Mode = "desk" | "tp" | "tl"; // คอม · มือถือแนวตั้ง · มือถือแนวนอน
interface Layout { mode: Mode; W: number; cssW: number; cssH: number }

const LS_BEST = "kh_zr_best";
const LS_SFX = "kh_zr_sfx";
const LS_MUSIC = "kh_zr_music";
const lsGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const lsSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* โหมดส่วนตัว/ปิดที่เก็บข้อมูล — เล่นได้ปกติ แค่ไม่จำสถิติ */
  }
};
const fmt = (n: number) => n.toLocaleString("th-TH");

function computeLayout(w: number, h: number, touch: boolean): Layout {
  let mode: Mode;
  let aw = w;
  let ah = h;
  if (touch && h > w) {
    mode = "tp"; // ปุ่มใหญ่อยู่ใต้จอเกม
    aw = w - 16;
    ah = h - 170;
  } else if (touch) {
    mode = "tl"; // ปุ่มอยู่สองข้างจอเกม
    aw = w - 200;
    ah = h - 12;
  } else {
    mode = "desk";
    aw = w - 32;
    ah = h - 60;
  }
  aw = Math.max(160, aw);
  ah = Math.max(120, ah);
  // จอเกมสูง 180 จุดเสมอ ความกว้างยืดตามสัดส่วนจอ (256–400) → จอแคบยังเห็นทางข้างหน้าพอกระโดดทัน
  const W = Math.max(256, Math.min(400, Math.round((aw / ah) * VIEW_H)));
  const s = Math.min(aw / W, ah / VIEW_H, 5);
  return { mode, W, cssW: Math.floor(W * s), cssH: Math.floor(VIEW_H * s) };
}

function overLine(r: RunResult, isNew: boolean) {
  if (isNew) return "ทำลายสถิติตัวเองได้แล้ว เก่งมาก!";
  if (r.meters < 100) return "เพิ่งออกตัวเอง ลองอีกรอบ รอบนี้ต้องไกลกว่าเดิม!";
  if (r.meters < 400) return "ครูฮีมกลายเป็นซอมบี้ไปแล้ว ช่วยครูวิ่งอีกรอบนะ!";
  return "วิ่งไกลมาก! อีกนิดเดียวก็หนีพ้นแล้ว";
}

export default function ZombieRunGame() {
  const mainRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ZombieRunEngine | null>(null);
  const metersRef = useRef<HTMLSpanElement>(null);
  const coinsRef = useRef<HTMLSpanElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const lastHud = useRef({ m: -1, c: -1, g: -1, b: -1 });
  // โหลดฝั่งเครื่องผู้ใช้อย่างเดียว (ZombieRunLoader ssr:false) → อ่านค่าที่จำไว้ได้ตั้งแต่ต้น
  const [art] = useState(() => buildArt());
  const [audio] = useState(() => {
    const a = new ZrAudio();
    a.sfxOn = lsGet(LS_SFX) !== "0";
    a.musicOn = lsGet(LS_MUSIC) !== "0";
    return a;
  });
  const [best, setBest] = useState(() => Number(lsGet(LS_BEST) || 0) || 0);
  const bestRef = useRef(best);
  const overAt = useRef(0);
  const swipe = useRef<{ id: number; x: number; y: number; done: boolean } | null>(null);

  const [phase, setPhase] = useState<Phase>("title");
  const [result, setResult] = useState<RunResult | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [line, setLine] = useState("");
  const [sfxOn, setSfxOn] = useState(audio.sfxOn);
  const [musicOn, setMusicOn] = useState(audio.musicOn);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [pressed, setPressed] = useState({ jump: false, slide: false });

  const onHud = useCallback((h: HudInfo) => {
    const L = lastHud.current;
    if (h.meters !== L.m && metersRef.current) {
      L.m = h.meters;
      metersRef.current.textContent = fmt(h.meters);
    }
    if (h.coins !== L.c && coinsRef.current) {
      L.c = h.coins;
      coinsRef.current.textContent = fmt(h.coins);
    }
    const g = Math.round(Math.max(0, Math.min(1, h.gap)) * 100);
    const bb = h.boost > 0 ? 1 : 0;
    if ((g !== L.g || bb !== L.b) && fillRef.current && meterRef.current) {
      L.g = g;
      L.b = bb;
      fillRef.current.style.width = `${Math.max(3, g)}%`;
      meterRef.current.dataset.level = g < 30 ? "red" : g < 55 ? "yellow" : "green";
      meterRef.current.dataset.boost = String(bb);
    }
  }, []);

  // สร้างเกมครั้งเดียว
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const eng = new ZombieRunEngine(cv, {
      art,
      audio,
      onHud,
      onPhase: (p, r) => {
        setPhase(p);
        if (p === "over" && r) {
          const isNew = r.score > bestRef.current;
          if (isNew) {
            bestRef.current = r.score;
            lsSet(LS_BEST, String(r.score));
          }
          overAt.current = performance.now();
          setBest(bestRef.current);
          setNewBest(isNew);
          setLine(overLine(r, isNew));
          setResult(r);
        }
      },
    });
    engineRef.current = eng;
    // canvas ต้องใช้ชื่อฟอนต์จริงที่ next/font ตั้งให้ (ไม่ใช่ "Mitr")
    const fam = mainRef.current ? getComputedStyle(mainRef.current).fontFamily : "sans-serif";
    eng.setFont(fam || "sans-serif");
    if (process.env.NODE_ENV !== "production") (window as unknown as { __zr?: ZombieRunEngine }).__zr = eng;
    return () => {
      eng.destroy();
      audio.destroy();
      engineRef.current = null;
    };
  }, [art, audio, onHud]);

  // วัดพื้นที่จอ → ขนาดจอเกม
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const coarse = window.matchMedia("(pointer: coarse)");
    const update = () => {
      const r = el.getBoundingClientRect();
      setLayout(computeLayout(r.width, r.height, coarse.matches));
    };
    // ResizeObserver เรียก update รอบแรกให้เองทันทีที่เริ่มสังเกต
    const ro = new ResizeObserver(update);
    ro.observe(el);
    coarse.addEventListener?.("change", update);
    return () => {
      ro.disconnect();
      coarse.removeEventListener?.("change", update);
    };
  }, []);

  useEffect(() => {
    if (!layout || !engineRef.current) return;
    engineRef.current.resize(layout.W, layout.cssW, layout.cssH, Math.min(3, window.devicePixelRatio || 1));
  }, [layout]);

  const startGame = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    // กดรัวตอนโดนงับ อย่าให้ข้ามหน้าสรุปคะแนนไปเอง
    if (eng.phase === "over" && performance.now() - overAt.current < 700) return;
    lastHud.current = { m: -1, c: -1, g: -1, b: -1 };
    setResult(null);
    setNewBest(false);
    eng.start();
  }, []);

  // คีย์บอร์ด
  useEffect(() => {
    const isJump = (c: string) => c === "Space" || c === "ArrowUp" || c === "KeyW";
    const isSlide = (c: string) => c === "ArrowDown" || c === "KeyS";
    const down = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (!eng || e.metaKey || e.ctrlKey || e.altKey) return;
      const c = e.code;
      if (isJump(c) || isSlide(c) || c === "Enter") e.preventDefault();
      if (e.repeat) return;
      const ph = eng.phase;
      if (ph === "title" || ph === "over") {
        if (isJump(c) || c === "Enter") startGame();
      } else if (ph === "paused") {
        if (isJump(c) || c === "Enter" || c === "KeyP" || c === "Escape") eng.resume();
      } else if (ph === "playing") {
        if (isJump(c)) eng.jumpDown();
        else if (isSlide(c)) eng.slideDown();
        else if (c === "KeyP" || c === "Escape") eng.pause();
      }
    };
    const up = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (!eng) return;
      if (isJump(e.code)) eng.jumpUp();
      else if (isSlide(e.code)) eng.slideUp();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [startGame]);

  // สลับแอป/สลับแท็บ → พักเกมให้อัตโนมัติ
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) engineRef.current?.pause();
    };
    const onBlur = () => engineRef.current?.pause();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // แตะจอเกม = กระโดด · ปัดลง = สไลด์
  const stageDown = (e: RPointerEvent<HTMLDivElement>) => {
    const eng = engineRef.current;
    if (!eng || eng.phase !== "playing") return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY, done: false };
    eng.jumpDown();
  };
  const stageMove = (e: RPointerEvent<HTMLDivElement>) => {
    const s = swipe.current;
    const eng = engineRef.current;
    if (!s || !eng || s.id !== e.pointerId || s.done) return;
    const dy = e.clientY - s.y;
    if (dy > 26 && dy > Math.abs(e.clientX - s.x)) {
      s.done = true;
      eng.jumpUp();
      eng.slideTap();
    }
  };
  const stageUp = (e: RPointerEvent<HTMLDivElement>) => {
    if (swipe.current?.id === e.pointerId) {
      swipe.current = null;
      engineRef.current?.jumpUp();
    }
  };

  const padDown = (which: "jump" | "slide") => (e: RPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const eng = engineRef.current;
    if (!eng) return;
    audio.unlock();
    if (eng.phase === "title" || eng.phase === "over") {
      if (which === "jump") startGame();
      return;
    }
    if (eng.phase === "paused") {
      eng.resume();
      return;
    }
    setPressed((p) => ({ ...p, [which]: true }));
    if (which === "jump") eng.jumpDown();
    else eng.slideDown();
  };
  const padUp = (which: "jump" | "slide") => (e: RPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setPressed((p) => (p[which] ? { ...p, [which]: false } : p));
    const eng = engineRef.current;
    if (!eng) return;
    if (which === "jump") eng.jumpUp();
    else eng.slideUp();
  };
  const padProps = (which: "jump" | "slide") => ({
    className: `zr-pbtn ${which}${pressed[which] ? " on" : ""}`,
    onPointerDown: padDown(which),
    onPointerUp: padUp(which),
    onPointerCancel: padUp(which),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    "aria-label": which === "jump" ? "กระโดด" : "สไลด์",
  });

  const toggleSfx = () => {
    const on = !sfxOn;
    setSfxOn(on);
    audio.setSfx(on);
    lsSet(LS_SFX, on ? "1" : "0");
  };
  const toggleMusic = () => {
    const on = !musicOn;
    setMusicOn(on);
    audio.setMusic(on);
    lsSet(LS_MUSIC, on ? "1" : "0");
  };

  const mode = layout?.mode ?? "desk";
  const touch = mode !== "desk";
  const showHud = phase === "playing" || phase === "paused" || phase === "caught";
  const u = (layout?.cssH ?? 180) / VIEW_H;
  const icons = art.icons;
  const stageStyle = {
    width: layout?.cssW ?? 320,
    height: layout?.cssH ?? 180,
    visibility: layout ? "visible" : "hidden",
    "--u": `${u}px`,
  } as React.CSSProperties;

  const stage = (
    <div
      className={`zr-stage${(layout?.cssH ?? 0) < 330 ? " zr-small" : ""}`}
      style={stageStyle}
      onPointerDown={stageDown}
      onPointerMove={stageMove}
      onPointerUp={stageUp}
      onPointerCancel={stageUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} aria-label="เกมครูฮีมหนีซอมบี้" />

      {showHud && (
        <div className="zr-hud">
          <div className="zr-hud-l">
            <span className="zr-chip">
              <span ref={metersRef}>0</span>ม.
            </span>
            <span className="zr-chip">
              <i className="zr-coin" />
              <span ref={coinsRef}>0</span>
            </span>
          </div>
          <div className="zr-meter" ref={meterRef} data-level="green" title="ระยะห่างจากซอมบี้">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={icons.zombie} alt="" />
            <div className="zr-bar">
              <div className="zr-fill" ref={fillRef} />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={icons.kru} alt="" />
          </div>
        </div>
      )}

      {phase === "title" && (
        <div className="zr-ov">
          <div className="zr-card">
            <div className="zr-kicker">เกมพักสมอง</div>
            <div className="zr-title">
              ครูฮีม <b>หนีซอมบี้!</b>
            </div>
            <ul className="zr-howto">
              <li>
                <span className="zr-key">{touch ? "แตะจอ" : "สเปซบาร์"}</span>
                กระโดด (กดซ้ำกลางอากาศ = โดดสองชั้น)
              </li>
              <li>
                <span className="zr-key">{touch ? "ปัดลง" : "ลูกศรลง"}</span>
                สไลด์ลอดของที่บินมา
              </li>
              <li>
                <span className="zr-key">ชนของ</span>
                สะดุด ซอมบี้จะไล่ใกล้เข้ามา
              </li>
              <li>
                <span className="zr-key tea">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={icons.tea} alt="ชาไทย" />
                </span>
                เก็บชาไทย วิ่งทะลุทุกอย่าง!
              </li>
            </ul>
            <button className="zr-btn" onClick={startGame}>
              เริ่มวิ่ง!
            </button>
            {best > 0 && <div className="zr-best">สถิติสูงสุด {fmt(best)} คะแนน</div>}
          </div>
        </div>
      )}

      {phase === "paused" && (
        <div className="zr-ov">
          <div className="zr-card">
            <div className="zr-title">พักก่อน</div>
            <div className="zr-sub">พร้อมเมื่อไหร่ก็วิ่งต่อได้เลย</div>
            <button className="zr-btn" onClick={() => engineRef.current?.resume()}>
              วิ่งต่อ
            </button>
          </div>
        </div>
      )}

      {phase === "over" && result && (
        <div className="zr-ov">
          <div className="zr-card">
            <div className="zr-title">
              โดน<b>ซอมบี้</b>งับ!
            </div>
            <div className="zr-sub">{line}</div>
            <div className="zr-stats">
              <div>
                <span>ระยะทาง</span>
                <strong>{fmt(result.meters)} ม.</strong>
              </div>
              <div>
                <span>เหรียญ</span>
                <strong>{fmt(result.coins)}</strong>
              </div>
              <div className="hi">
                <span>คะแนน</span>
                <strong>{fmt(result.score)}</strong>
              </div>
            </div>
            {newBest ? <div className="zr-badge">สถิติใหม่!</div> : null}
            <div>
              <button className="zr-btn" onClick={startGame}>
                วิ่งอีกรอบ
              </button>
            </div>
            {!newBest && best > 0 && <div className="zr-best">สถิติสูงสุด {fmt(best)} คะแนน</div>}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="zr-page">
      <style>{ZR_CSS}</style>
      <header className="zr-top">
        <Link href="/" className="zr-back">
          <ArrowLeft size={16} />
          หน้าแรก
        </Link>
        <div className="zr-name">ครูฮีม หนีซอมบี้!</div>
        <div className="zr-tools">
          {phase === "playing" && (
            <button className="zr-ibtn" onClick={(e) => { e.currentTarget.blur(); engineRef.current?.pause(); }} aria-label="พักเกม">
              <Pause size={18} />
            </button>
          )}
          <button className={`zr-ibtn${musicOn ? "" : " off"}`} onClick={(e) => { e.currentTarget.blur(); toggleMusic(); }} aria-label={musicOn ? "ปิดเพลง" : "เปิดเพลง"}>
            <Music size={18} />
          </button>
          <button className={`zr-ibtn${sfxOn ? "" : " off"}`} onClick={(e) => { e.currentTarget.blur(); toggleSfx(); }} aria-label={sfxOn ? "ปิดเสียง" : "เปิดเสียง"}>
            {sfxOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </header>

      <div className="zr-main" ref={mainRef}>
        {/* โครงต้องคงที่ทุกโหมด — ถ้าจอเกมย้ายที่ React จะสร้าง canvas ใหม่ แล้วเกมวาดลง canvas เก่าที่หลุดไปแล้ว (หมุนจอแล้วจอดำ) */}
        <div className="zr-row">
          {mode === "tl" && (
            <div className="zr-side">
              <button {...padProps("slide")}>
                <span className="zr-arrow">▼</span>สไลด์
              </button>
            </div>
          )}
          {stage}
          {mode === "tl" && (
            <div className="zr-side">
              <button {...padProps("jump")}>
                <span className="zr-arrow">▲</span>กระโดด
              </button>
            </div>
          )}
        </div>

        {mode === "tp" && (
          <>
            <div className="zr-pad">
              <button {...padProps("slide")}>
                <span className="zr-arrow">▼</span>สไลด์
              </button>
              <button {...padProps("jump")}>
                <span className="zr-arrow">▲</span>กระโดด
              </button>
            </div>
            <div className="zr-hint">หมุนมือถือเป็นแนวนอน จะเห็นทางข้างหน้าไกลขึ้น</div>
          </>
        )}

        {mode === "desk" && (
          <div className="zr-keys">
            <kbd>สเปซบาร์</kbd> หรือ <kbd>↑</kbd> กระโดด (กดค้าง = โดดสูง · กดซ้ำ = โดดสองชั้น) · <kbd>↓</kbd> สไลด์ · <kbd>P</kbd> พักเกม
          </div>
        )}
      </div>
    </div>
  );
}
