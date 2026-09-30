const katex=require('katex'),fs=require('fs'),path=require('path'),os=require('os');
const OUT=path.join(os.homedir(),'Documents/kruheem-exams/equation-course-2026-08/output');
let total=0,bad=[],snips=0;
for(const f of fs.readdirSync(OUT).sort()){
  const qs=JSON.parse(fs.readFileSync(path.join(OUT,f),'utf8'));
  for(const q of qs){
    total++;
    const texts=[q.question,q.explanation,...q.options.map(String)];
    for(const t of texts){
      // ดึงทั้ง $$...$$ และ $...$
      const blocks=[...String(t).matchAll(/\$\$([^$]+)\$\$/g)].map(m=>[m[1],true]);
      const stripped=String(t).replace(/\$\$[^$]+\$\$/g,' ');
      const inlines=[...stripped.matchAll(/\$([^$]+)\$/g)].map(m=>[m[1],false]);
      for(const [tex,display] of [...blocks,...inlines]){
        snips++;
        try{ katex.renderToString(tex,{throwOnError:true,displayMode:display}); }
        catch(e){ bad.push({set:f.slice(0,5),id:q.id,tex:tex.slice(0,60),err:e.message.slice(0,80)}); }
      }
    }
  }
}
console.log(`เรนเดอร์ ${snips} สูตร จาก ${total} ข้อ`);
console.log(`สูตรที่เรนเดอร์ไม่ผ่าน: ${bad.length}`);
bad.slice(0,15).forEach(b=>console.log(`   ${b.set} ข้อ ${b.id}: ${b.tex} → ${b.err}`));
