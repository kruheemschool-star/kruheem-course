/**
 * ขั้นที่ 3 — หาข้อที่มีตัวเลือก "ค่าเท่ากับคีย์" (เช่น 2/5 กับ 18/45) เด็กตอบค่าถูกแต่โดนตัดว่าผิด
 * ผลต้องคัดเอง: ข้อที่โจทย์สั่ง "อย่างต่ำ / จำนวนคละ / แยกตัวประกอบ / สมบัติ / มิติเมทริกซ์" ตั้งใจให้ค่าเท่ากันได้
 * รัน: node equiv.js <path/all.json>
 */
// หาข้อที่มีตัวเลือก "ค่าเท่ากัน" (เช่น 2/5 กับ 18/45, 0.5 กับ 1/2) — เด็กตอบถูกแต่โดนตัดผิด
const all=require(require('path').resolve(process.argv[2]));const ak=require('./appkey.js');
const val=(o)=>{let s=String(o).replace(/\$/g,'').replace(/\\[dt]?frac\{([^{}]+)\}\{([^{}]+)\}/g,'($1)/($2)').replace(/\\left|\\right|\\,|\{,\}/g,'').replace(/\\text\{[^{}]*\}/g,'').replace(/\\times/g,'*').replace(/\\div/g,'/').replace(/\\cdot/g,'*').replace(/−/g,'-').replace(/(\d),(\d{3})/g,'$1$2').trim();
  s=s.replace(/\s*(บาท|คน|หน่วย|ตารางหน่วย|ลูกบาศก์หน่วย|เมตร|ซม\.|กิโลกรัม|วัน|ชั่วโมง|นาที|องศา|%|ตร\.ซม\.|ลิตร|ชิ้น|เท่า|กล่อง|วิธี|ปี)\s*$/,'');
  // mixed number "2\frac{1}{3}" -> 2+(1)/(3)
  s=s.replace(/^(-?\d+)\s*\((\d+)\)\/\((\d+)\)$/,'($1+$2/$3)');
  if(!/^[-+*/().\d\s]+$/.test(s)||!/\d/.test(s))return null;
  try{const v=Function('return ('+s+')')();return Number.isFinite(v)?v:null}catch{return null}};
const out=[];
for(const set of all)set.qs.forEach((q,i)=>{if(!Array.isArray(q.options))return;const v=q.options.map(val);
  for(let a=0;a<v.length;a++)for(let b=a+1;b<v.length;b++)if(v[a]!==null&&v[b]!==null&&Math.abs(v[a]-v[b])<1e-9&&String(q.options[a]).replace(/\s/g,'')!==String(q.options[b]).replace(/\s/g,'')){const K=ak(q);if(a===K||b===K)out.push({ref:set.id+'#'+(i+1),title:set.title.replace(/\n/g,' ').slice(0,40),K:K+1,pair:[a+1,b+1],opts:[q.options[a],q.options[b]]})}});
console.log(out.length);out.forEach(o=>console.log(o.ref,o.title,'key',o.K,'equal',o.pair.join('='),JSON.stringify(o.opts)));
