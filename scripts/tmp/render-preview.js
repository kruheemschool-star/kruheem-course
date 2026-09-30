const katex=require('katex'),fs=require('fs'),path=require('path'),os=require('os');
const OUT=path.join(os.homedir(),'Documents/kruheem-exams/equation-course-2026-08/output');
const css=fs.readFileSync(path.join(process.cwd(),'node_modules/katex/dist/katex.min.css'),'utf8');
const pick=[['lev01',null,/ก |ข |\\square|\\triangle/],['lev09',null,null],['lev12',null,null],['lev16',null,null],['lev17',null,null],['lev19',null,null]];
function md(t){ // แปลง $..$ เป็น html
  return String(t).replace(/\$\$([^$]+)\$\$/g,(m,x)=>katex.renderToString(x,{displayMode:true,throwOnError:false}))
                  .replace(/\$([^$]+)\$/g,(m,x)=>katex.renderToString(x,{throwOnError:false}))
                  .replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
}
let html=`<style>${css}
body{font-family:-apple-system,'Sarabun',sans-serif;max-width:820px;margin:24px auto;padding:0 16px;line-height:1.85;color:#1f2937}
.q{border:1px solid #e5e7eb;border-radius:14px;padding:18px 20px;margin:22px 0;background:#fff}
.t{font-size:12px;color:#0f766e;background:#ccfbf1;display:inline-block;padding:3px 10px;border-radius:99px;margin-bottom:10px}
.o{margin:4px 0 4px 14px}.ex{background:#f8fafc;border-left:4px solid #0d9488;padding:12px 16px;margin-top:14px;border-radius:0 10px 10px 0;font-size:15px}
h1{font-size:20px}</style><h1>ตัวอย่างข้อสอบคอร์สเก่งสมการ — ตรวจการเรนเดอร์สูตร</h1>`;
for(const [set] of pick){
  const qs=JSON.parse(fs.readFileSync(path.join(OUT,`${set}-100q.json`),'utf8'));
  // เลือกข้อที่มีสัญลักษณ์พิเศษถ้ามี ไม่งั้นเอาข้อยากมาก
  const q=qs.find(x=>/[฀-๿]\s*[+\-]|\\square|\\triangle|\\bigcirc/.test(x.question))
        || qs.find(x=>x.tags.includes('ยากมาก')) || qs[0];
  html+=`<div class="q"><div class="t">${set.toUpperCase()} · ข้อ ${q.id} · ${q.tags.filter(t=>['กลาง','ยาก','ยากมาก'].includes(t))[0]}</div>
  <div>${md(q.question)}</div>
  ${q.options.map((o,i)=>`<div class="o">${i+1}) ${md(o)}${i===q.correctIndex?' ✅':''}</div>`).join('')}
  <div class="ex">${md(q.explanation)}</div></div>`;
}
fs.writeFileSync('/tmp/claude-501/-Users-kruheem-Documents-webapp-kruheem-course/6e170058-2c8b-4983-ac27-fc08d2ac40fc/scratchpad/preview.html',html);
console.log('เขียนหน้าตัวอย่างแล้ว');
