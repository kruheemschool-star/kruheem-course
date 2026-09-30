const fs=require('fs');
const katex=require('katex');
const files=process.argv.slice(2);
const RE=/(\\\[[\s\S]*?\\\])|(\$\$[\s\S]*?\$\$)|(\\\([\s\S]*?\\\))|(\$[^$\n]+\$)/g;
let bad=0, checked=0;
for(const f of files){
  const d=JSON.parse(fs.readFileSync(f,'utf8'));
  const qs=d.questions;
  console.log('=====',d.title,qs.length,'ข้อ');
  qs.forEach((q,i)=>{
    const fields=[['question',q.question],['explanation',q.explanation],...q.options.map((o,j)=>['opt'+j,o])];
    fields.forEach(([name,v])=>{
      if(typeof v!=='string')return;
      // ตรวจ $ ที่ไม่ปิด
      const dollars=(v.match(/\$/g)||[]).length;
      if(dollars%2!==0) { console.log(`  ⚠️ ข้อ ${i+1} ${name}: จำนวน $ เป็นเลขคี่`); bad++; }
      const parts=v.match(RE)||[];
      parts.forEach(p=>{
        let tex=p;
        if(tex.startsWith('$$')) tex=tex.slice(2,-2);
        else if(tex.startsWith('$')) tex=tex.slice(1,-1);
        else tex=tex.slice(2,-2);
        checked++;
        try{ katex.renderToString(tex,{throwOnError:true,displayMode:false}); }
        catch(e){ console.log(`  ❌ ข้อ ${i+1} ${name}: ${e.message.split('\n')[0]}  << ${tex.slice(0,70)}`); bad++; }
      });
    });
  });
}
console.log(`\nตรวจสมการ ${checked} ก้อน · พัง ${bad} จุด`);
