// ตัวช่วยแปลง inline style แบบ CSS string ของต้นแบบ (KruHeem Study Desk.dc.html)
// เป็น style object ของ React — เก็บ template ให้ใกล้ต้นฉบับที่สุด แก้ทีละบรรทัดเทียบกันได้
// แคชไว้ตาม string เพื่อให้ React เห็น object เดิม (ค่าไม่เปลี่ยน = ไม่เขียน DOM ซ้ำ
// ซึ่งสำคัญ เพราะโค้ดฉากเขียน transform/opacity/CSS variable ลง DOM เองในบางกล่อง)

const cache = new Map();

const camel = (prop) => {
  if (prop.startsWith('--')) return prop;
  const p = prop.startsWith('-webkit-') ? 'Webkit-' + prop.slice(8) : prop;
  return p.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
};

export function css(str) {
  let o = cache.get(str);
  if (o) return o;
  o = {};
  for (const decl of str.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const k = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (k) o[camel(k)] = val;
  }
  cache.set(str, o);
  return o;
}

// ต้นแบบรันบนค่าเริ่มต้นของเบราว์เซอร์ ส่วนเว็บนี้มี Tailwind preflight + globals.css
// (h1-h6 line-height:1.5 !important, box-sizing:border-box, img display:block, โหมดมืด) ทับอยู่
// → คืนค่าให้เหมือนต้นแบบเฉพาะในกล่อง .khd-root · หัวข้อใช้ --khd-lh แทน line-height ในสไตล์ inline
// CSS ระดับหน้า: keyframes (ตั้งชื่อ khd-* กันชนกับ kh-pulse/kh-fade ใน globals.css)
// + สไตล์ hover ที่ต้นแบบเขียนเป็น style-hover (inline แทน :hover ไม่ได้ จึงเป็นคลาส + !important)
export const DESK_PAGE_CSS = `
html,body{margin:0;height:100%;overflow:hidden;overscroll-behavior:none;-webkit-tap-highlight-color:transparent;background:#F3EEE3}
.khd-root{font-family:'IBM Plex Sans Thai Looped',sans-serif;-webkit-font-smoothing:antialiased;line-height:normal;color:#0f172a;color-scheme:light}
.khd-root *,.khd-root *::before,.khd-root *::after{box-sizing:content-box}
.khd-root button{box-sizing:border-box}
.khd-root h1,.khd-root h2,.khd-root h3{line-height:var(--khd-lh,normal)!important}
.khd-root img,.khd-root svg{display:inline;vertical-align:baseline;max-width:none}
.khd-root a{color:#0d9488;text-decoration:none}.khd-root a:hover{color:#b45309}
.khd-root ::selection{background:#99f6e4;color:#134e4a}
@keyframes khd-in{from{opacity:0;transform:perspective(900px) translateX(60px) rotateY(-14deg)}to{opacity:1;transform:none}}
@keyframes khd-up{from{opacity:0;transform:translateY(60%)}to{opacity:1;transform:none}}
@keyframes khd-write{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes khd-fade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes khd-eq{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
@keyframes khd-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.6)}}
.khd-dock::-webkit-scrollbar{display:none}
@keyframes khd-bell{0%,100%{transform:rotate(0)}8%{transform:rotate(-18deg)}16%{transform:rotate(15deg)}24%{transform:rotate(-11deg)}32%{transform:rotate(7deg)}40%{transform:rotate(0)}}
@keyframes khd-ping{0%{transform:scale(1);opacity:.75}100%{transform:scale(2.6);opacity:0}}
.khd-bell{transform-origin:50% 12%;animation:khd-bell 3s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.khd-bell{animation:none}}
`;
