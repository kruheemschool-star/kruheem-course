// สไตล์หน้าเกม "ครูฮีม หนีซอมบี้" — คลาสขึ้นต้น zr- ทั้งหมด ไม่ชนของเดิมในเว็บ
// ขนาดตัวหนังสือบนจอเกมอิง --u (= ความสูงจอเกม / 180) จอเล็กจอใหญ่สัดส่วนเท่ากัน
export const ZR_CSS = `
.noise-overlay{display:none!important}
.zr-page{position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;
  background:radial-gradient(120% 80% at 50% 0%,#2a1d4a 0%,#140f24 60%,#0e0a1a 100%);
  color:#fff;font-family:var(--font-mitr),var(--font-kanit),sans-serif;overflow:hidden;
  user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;
  padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  overscroll-behavior:none}
.zr-top{flex:none;height:46px;display:flex;align-items:center;gap:8px;padding:0 10px}
.zr-back{display:inline-flex;align-items:center;gap:4px;color:#ffe7a3;text-decoration:none;font-size:14px;
  padding:6px 12px 6px 8px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);white-space:nowrap}
.zr-back:hover{background:rgba(255,255,255,.14)}
.zr-name{flex:1;min-width:0;text-align:center;font-weight:600;font-size:16px;color:#ffd21f;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;text-shadow:0 2px 0 #1a1024}
.zr-tools{display:flex;gap:6px}
.zr-ibtn{width:36px;height:36px;display:grid;place-items:center;border-radius:50%;background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.14);color:#fff;cursor:pointer;padding:0}
.zr-ibtn:hover{background:rgba(255,255,255,.16)}
.zr-ibtn.off{color:rgba(255,255,255,.38)}
.zr-main{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding-bottom:6px}
.zr-row{display:flex;align-items:center;justify-content:center;gap:10px;width:100%}
.zr-stage{position:relative;flex:none;touch-action:none;border-radius:10px;overflow:hidden;
  box-shadow:0 0 0 3px #2d2250,0 16px 40px rgba(0,0,0,.5);background:#1d1537;cursor:pointer}
.zr-stage canvas{display:block;width:100%;height:100%;image-rendering:pixelated}

.zr-hud{position:absolute;left:0;right:0;top:0;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;
  padding:calc(var(--u)*4) calc(var(--u)*5);pointer-events:none;font-size:clamp(12px,calc(var(--u)*7.5),22px);line-height:1.25}
.zr-hud-l{display:flex;gap:6px}
.zr-chip{display:inline-flex;align-items:center;gap:.35em;background:rgba(14,10,28,.62);border:2px solid rgba(255,255,255,.16);
  border-radius:999px;padding:.12em .65em;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
.zr-coin{display:inline-block;width:.85em;height:.85em;border-radius:50%;
  background:radial-gradient(circle at 35% 35%,#fff6b8 0 22%,#ffd23f 24% 62%,#d99a1e 64%);box-shadow:0 0 0 2px #1a1024}
.zr-meter{display:flex;align-items:center;gap:.3em;background:rgba(14,10,28,.62);border:2px solid rgba(255,255,255,.16);
  border-radius:999px;padding:.12em .45em}
.zr-meter img{width:1.35em;height:auto;image-rendering:pixelated;display:block}
.zr-bar{width:clamp(52px,calc(var(--u)*46),150px);height:.55em;border-radius:99px;background:rgba(255,255,255,.14);overflow:hidden}
.zr-fill{height:100%;width:74%;border-radius:99px;background:#5fd068;transition:width .15s linear,background-color .2s}
.zr-meter[data-level=yellow] .zr-fill{background:#ffc93c}
.zr-meter[data-level=red] .zr-fill{background:#ff4d5e}
.zr-meter[data-level=red]{animation:zr-pulse .5s ease-in-out infinite alternate}
.zr-meter[data-boost="1"] .zr-fill{background:linear-gradient(90deg,#ffb938,#fff1a8,#ffb938)}
@keyframes zr-pulse{to{border-color:#ff4d5e;box-shadow:0 0 0 3px rgba(255,77,94,.35)}}

.zr-ov{position:absolute;inset:0;z-index:2;display:flex;align-items:center;justify-content:center;
  padding:calc(var(--u)*6);background:rgba(10,6,22,.42)}
.zr-card{background:#fff8e1;color:#2a1a3a;border:3px solid #1a1024;box-shadow:0 6px 0 #1a1024,0 18px 40px rgba(0,0,0,.35);
  border-radius:16px;padding:clamp(10px,calc(var(--u)*9),28px) clamp(14px,calc(var(--u)*12),36px);text-align:center;
  max-width:100%;max-height:100%;overflow:auto;font-size:clamp(12px,calc(var(--u)*6.4),18px);line-height:1.45;cursor:default}
.zr-kicker{display:inline-block;font-size:.8em;font-weight:600;color:#5a3a00;background:#ffd21f;border:2px solid #1a1024;
  border-radius:999px;padding:0 .8em;margin-bottom:.35em}
.zr-title{font-weight:700;font-size:clamp(22px,calc(var(--u)*15),52px);line-height:1.2;color:#1a1024}
.zr-title b{color:#3fae3a;font-weight:700}
.zr-howto{list-style:none;padding:0;margin:.55em auto .8em;display:grid;gap:.3em;text-align:left;width:max-content;max-width:100%}
.zr-howto li{display:flex;align-items:center;gap:.55em}
.zr-key{flex:none;min-width:4.8em;text-align:center;font-weight:600;font-size:.85em;background:#1a1024;color:#ffd21f;border-radius:6px;padding:.05em .5em}
.zr-key.tea{background:none;padding:0}
.zr-key img{height:1.6em;width:auto;image-rendering:pixelated;vertical-align:middle}
.zr-btn{font-family:inherit;font-weight:700;font-size:clamp(17px,calc(var(--u)*9),28px);background:#ffd21f;color:#1a1024;
  border:3px solid #1a1024;box-shadow:0 5px 0 #1a1024;border-radius:12px;padding:.2em 1.4em;cursor:pointer;line-height:1.35}
.zr-btn:hover{background:#ffe066}
.zr-btn:active{transform:translateY(4px);box-shadow:0 1px 0 #1a1024}
.zr-best{margin-top:.55em;font-size:.85em;color:#6b5a7a}
.zr-sub{margin:.25em 0 .7em;color:#4a3a5a}
.zr-stats{display:flex;justify-content:center;gap:.5em;margin-bottom:.7em}
.zr-stats>div{background:#fff;border:2px solid #1a1024;border-radius:10px;padding:.2em .7em;min-width:4.6em}
.zr-stats span{display:block;font-size:.75em;color:#6b5a7a}
.zr-stats strong{display:block;font-size:1.35em;line-height:1.15;color:#1a1024;font-variant-numeric:tabular-nums}
.zr-stats .hi{background:#ffd21f}
.zr-badge{display:inline-block;margin-bottom:.7em;font-weight:700;color:#fff;background:#e0352f;border:2px solid #1a1024;
  border-radius:999px;padding:.05em .9em;animation:zr-bounce .6s ease-in-out infinite alternate}
@keyframes zr-bounce{to{transform:translateY(-3px) scale(1.04)}}
.zr-small .zr-kicker{display:none}
.zr-small .zr-howto{gap:.1em;margin:.35em auto .55em}
.zr-small .zr-sub{margin:.15em 0 .5em}

.zr-pad{display:flex;gap:12px;width:100%;max-width:560px;padding:0 8px}
.zr-pbtn{flex:1;height:104px;border-radius:20px;border:3px solid #1a1024;box-shadow:0 6px 0 #1a1024;font-family:inherit;font-weight:700;
  font-size:19px;color:#1a1024;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:none;
  cursor:pointer;user-select:none;-webkit-user-select:none;padding:0}
.zr-pbtn.jump{flex:1.35;background:#ffd21f}
.zr-pbtn.slide{background:#8cc4ea}
.zr-pbtn.on{transform:translateY(4px);box-shadow:0 2px 0 #1a1024;filter:brightness(.94)}
.zr-arrow{font-size:24px;line-height:1.1}
.zr-side{flex:none;width:88px;align-self:stretch;display:flex;align-items:flex-end;justify-content:center;padding-bottom:12px}
.zr-side .zr-pbtn{flex:none;width:80px;height:80px;border-radius:50%;font-size:14px}
.zr-side .zr-arrow{font-size:20px}
.zr-hint{font-size:12px;color:rgba(255,255,255,.55);text-align:center;padding:0 16px;line-height:1.4}
.zr-keys{font-size:13px;color:rgba(255,255,255,.72);text-align:center;padding:0 16px;line-height:1.6}
.zr-keys kbd{font-family:inherit;display:inline-block;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);
  border-bottom-width:3px;border-radius:6px;padding:0 .45em;margin:0 .1em;color:#fff;line-height:1.4}
`;
