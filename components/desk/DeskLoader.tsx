// หน้าจอกำลังโหลดของหน้าแรก "โต๊ะเรียน 3 มิติ"
// มากับ HTML ตั้งแต่เซิร์ฟเวอร์ → ขึ้นทันทีที่เปิดเว็บ ก่อนสคริปต์ใดๆ ทำงาน
// ภาพเคลื่อนไหวใช้ CSS ล้วน (transform/opacity) จึงยังขยับลื่นแม้เครื่องกำลังสร้างฉาก 3 มิติอยู่
//   • หนังสือเปิดสามมิติ พลิกหน้าไปเรื่อยๆ + สัญลักษณ์คณิตลอยจางๆ + แสงนวลรอบหนังสือ
//   • แถบความคืบหน้าค่อยๆ เดิน แล้วเต็มตอนฉากพร้อม จากนั้นทั้งหน้าจอจางหาย
//   • โหลดนานเกิน 10 วินาที (เน็ตช้า/เครื่องช้า) → มีลิงก์ไปหน้าเวอร์ชันคลาสสิกที่เบากว่า

export type DeskLoadStage = "boot" | "engine" | "build" | "ready";

const MSG: Record<DeskLoadStage, string> = {
  boot: "กำลังเปิดห้องเรียน...",
  engine: "กำลังโหลดภาพสามมิติ...",
  build: "กำลังจัดของบนโต๊ะเรียน...",
  ready: "พร้อมแล้ว!",
};

const SYMBOLS = ["π", "√", "∑", "÷", "×", "∞", "θ", "%"];

export default function DeskLoader({ stage, leaving, classicUrl }: { stage: DeskLoadStage; leaving: boolean; classicUrl: string }) {
  return (
    <div className={`khl${leaving ? " khl-out" : ""}${stage === "ready" ? " khl-done" : ""}`} role="status" aria-live="polite" aria-label={MSG[stage]}>
      <style>{LOADER_CSS}</style>
      <div className="khl-glow" />
      <div className="khl-syms" aria-hidden="true">
        {SYMBOLS.map((s, i) => <span key={i} className={`khl-sym khl-s${i}`}>{s}</span>)}
      </div>
      <div className="khl-center">
        <div className="khl-stage" aria-hidden="true">
          <div className="khl-book">
            <div className="khl-cover khl-cl" />
            <div className="khl-cover khl-cr" />
            <div className="khl-pg khl-pl" />
            <div className="khl-pg khl-pr" />
            <div className="khl-flip khl-f0"><i className="khl-fr" /><i className="khl-bk" /></div>
            <div className="khl-flip khl-f1"><i className="khl-fr" /><i className="khl-bk" /></div>
            <div className="khl-flip khl-f2"><i className="khl-fr" /><i className="khl-bk" /></div>
          </div>
          <div className="khl-shadow" />
        </div>
        <div className="khl-title">โต๊ะเรียน<span>ครูฮีม</span></div>
        <div className="khl-msg">{MSG[stage]}</div>
        <div className="khl-bar"><div className="khl-fill" /><div className="khl-shine" /></div>
        <div className="khl-tip">เคล็ดลับ: แตะของบนโต๊ะเพื่อเข้าแต่ละเมนู</div>
        <a className="khl-slow" href={classicUrl}>เน็ตช้าใช่ไหมครับ? เข้าหน้าเวอร์ชันคลาสสิกแทน →</a>
      </div>
    </div>
  );
}

const LOADER_CSS = `
.khl{position:fixed;inset:0;z-index:9990;display:flex;align-items:center;justify-content:center;overflow:hidden;
  background:radial-gradient(120% 90% at 50% 38%,#27655e 0%,#1d4f4a 45%,#123833 100%);
  font-family:var(--font-mitr),Mitr,var(--font-ibm-loop),system-ui,sans-serif;color:#fff;
  transition:opacity .7s ease,visibility 0s linear .7s}
.khl-out{opacity:0;visibility:hidden;pointer-events:none}
.khl-glow{position:absolute;left:50%;top:42%;width:min(560px,120vw);height:min(560px,120vw);transform:translate(-50%,-50%);
  background:radial-gradient(circle,rgba(253,230,138,.22) 0%,rgba(253,230,138,.07) 38%,rgba(253,230,138,0) 68%);
  animation:khl-breathe 3.2s ease-in-out infinite}
@keyframes khl-breathe{0%,100%{opacity:.7;transform:translate(-50%,-50%) scale(.94)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.04)}}
.khl-center{position:relative;display:flex;flex-direction:column;align-items:center;padding:0 16px;text-align:center}

/* ---- หนังสือสามมิติ ---- */
.khl-stage{position:relative;width:190px;height:150px;perspective:900px;margin-bottom:4px}
.khl-book{position:absolute;left:50%;top:50%;width:176px;height:118px;margin:-66px 0 0 -88px;transform-style:preserve-3d;
  transform:rotateX(52deg) rotateZ(-10deg);animation:khl-bob 3.2s ease-in-out infinite}
@keyframes khl-bob{0%,100%{transform:rotateX(52deg) rotateZ(-10deg) translateZ(0)}50%{transform:rotateX(52deg) rotateZ(-10deg) translateZ(9px)}}
.khl-cover{position:absolute;top:-6px;width:92px;height:130px;background:linear-gradient(135deg,#0f766e,#115e59);border-radius:6px;
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.08)}
.khl-cl{left:-4px;border-radius:8px 3px 3px 8px}
.khl-cr{right:-4px;border-radius:3px 8px 8px 3px}
.khl-pg,.khl-flip i{position:absolute;top:0;width:88px;height:118px;
  background:#fffaf0 repeating-linear-gradient(180deg,transparent 0 13px,rgba(14,116,144,.16) 13px 14px);background-position:0 16px}
.khl-pl{left:0;border-radius:4px 0 0 4px;box-shadow:inset -10px 0 14px -8px rgba(0,0,0,.25)}
.khl-pr{right:0;border-radius:0 4px 4px 0;box-shadow:inset 10px 0 14px -8px rgba(0,0,0,.2)}
.khl-pl::after,.khl-pr::after{content:"";position:absolute;left:12px;top:10px;width:30px;height:4px;border-radius:2px;background:rgba(245,158,11,.55)}
.khl-flip{position:absolute;left:88px;top:0;width:88px;height:118px;transform-origin:0 50%;transform-style:preserve-3d;opacity:0;
  animation:khl-turn 2.7s cubic-bezier(.45,.05,.35,1) infinite}
.khl-flip i{left:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:0 4px 4px 0}
.khl-flip .khl-bk{transform:rotateY(180deg);border-radius:4px 0 0 4px;background-color:#f6eedc}
.khl-f1{animation-delay:.9s}.khl-f2{animation-delay:1.8s}
@keyframes khl-turn{
  0%{transform:rotateY(0deg) translateZ(1px);opacity:0}
  6%{opacity:1}
  48%{transform:rotateY(-180deg) translateZ(1px);opacity:1}
  56%,100%{transform:rotateY(-180deg) translateZ(1px);opacity:0}}
.khl-shadow{position:absolute;left:50%;bottom:6px;width:170px;height:26px;margin-left:-85px;border-radius:50%;
  background:radial-gradient(closest-side,rgba(0,0,0,.34),rgba(0,0,0,0));animation:khl-shade 3.2s ease-in-out infinite}
@keyframes khl-shade{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(.88);opacity:.6}}

/* ---- สัญลักษณ์คณิตลอย ---- */
.khl-syms{position:absolute;inset:0;pointer-events:none}
.khl-sym{position:absolute;font-size:26px;font-weight:500;color:#fde68a;opacity:0;animation:khl-float 7s ease-in-out infinite}
@keyframes khl-float{0%{opacity:0;transform:translateY(24px) rotate(-8deg)}25%{opacity:.32}75%{opacity:.22}100%{opacity:0;transform:translateY(-60px) rotate(10deg)}}
.khl-s0{left:9%;top:24%;animation-delay:0s}.khl-s1{left:86%;top:20%;animation-delay:1.1s;font-size:30px}
.khl-s2{left:6%;top:70%;animation-delay:2.3s}.khl-s3{left:89%;top:66%;animation-delay:3.2s;font-size:22px}
.khl-s4{left:4%;top:46%;animation-delay:4.4s;font-size:20px}.khl-s5{left:92%;top:43%;animation-delay:5.2s}
.khl-s6{left:30%;top:9%;animation-delay:2.8s;font-size:20px}.khl-s7{left:66%;top:88%;animation-delay:5.9s;font-size:20px}

/* ---- ข้อความ + แถบความคืบหน้า ---- */
.khl-title{font-size:22px;font-weight:600;letter-spacing:.2px;line-height:1.3}
.khl-title span{margin-left:8px;color:#fcd34d}
.khl-msg{margin-top:6px;font-size:14px;color:rgba(255,255,255,.72);min-height:20px}
.khl-bar{position:relative;margin-top:16px;width:210px;max-width:70vw;height:5px;border-radius:99px;background:rgba(255,255,255,.14);overflow:hidden}
.khl-fill{position:absolute;inset:0;border-radius:99px;background:linear-gradient(90deg,#f59e0b,#fcd34d);transform-origin:0 50%;
  transform:scaleX(.04);animation:khl-creep 9s cubic-bezier(.12,.75,.3,1) forwards}
@keyframes khl-creep{to{transform:scaleX(.9)}}
.khl-done .khl-fill{animation:none;transform:scaleX(1);transition:transform .35s ease-out}
.khl-shine{position:absolute;top:0;bottom:0;width:60px;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.55),rgba(255,255,255,0));
  animation:khl-shine 1.6s linear infinite}
@keyframes khl-shine{from{transform:translateX(-70px)}to{transform:translateX(230px)}}
.khl-tip{margin-top:18px;font-size:12.5px;color:rgba(255,255,255,.5)}
.khl-slow{margin-top:14px;font-size:13px;color:#fde68a;text-decoration:underline;text-underline-offset:3px;opacity:0;pointer-events:none;
  animation:khl-show .6s ease 10s forwards}
@keyframes khl-show{to{opacity:.9;pointer-events:auto}}

@media (max-width:480px){.khl-stage{transform:scale(.86)}.khl-title{font-size:20px}}
@media (prefers-reduced-motion:reduce){
  .khl-glow,.khl-book,.khl-shadow,.khl-sym,.khl-shine{animation:none}
  .khl-flip{animation:none;opacity:0}
  .khl-fill{animation-duration:4s}}
`;
