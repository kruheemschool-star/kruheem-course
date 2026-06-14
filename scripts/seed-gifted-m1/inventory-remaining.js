const admin = require('firebase-admin'); const path = require('path');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname,'serviceAccountKey.json'))) });
const db = admin.firestore();
const T = [
  ['o2z4BD1jAHXa3DjKfqhY','ม.2 เทอม 2'],['z8cVWAg2WuDnVBoKtaHA','ม.3 เทอม 2'],
  ['gwSe3icqcO4C39NpNsCZ','ม.6 เทอม 1'],['vlzhF40vB6A4YN0dHCQi','ม.6 เทอม 2'],
  ['ZhpY3GMWh3SOua5yAVnu','ม.4 เทอม 2 (เพิ่มเติม)'],
];
(async()=>{
  for (const [id,label] of T){
    const ref=db.collection('courses').doc(id); const c=(await ref.get()).data(); const sp=c.salesPage;
    const ls=await ref.collection('lessons').get();
    const heads=ls.docs.map(d=>d.data()).filter(L=>L.type==='header').map(L=>L.title);
    const vids=ls.docs.filter(d=>d.data().type==='video').length;
    console.log(`\n=== ${label} | ${id} ===`);
    console.log(`price:${c.price} full:${c.fullPrice??'-'} lessons:${ls.size} (videos:${vids}) salesPage:${sp?(sp.enabled?'ENABLED':'off')+' '+(sp.sections?.length??0)+'s':'none'}`);
    if (heads.length) console.log('  chapters:', heads.join(' | '));
    if (sp?.sections){
      const cur=sp.sections.find(s=>s.type==='curriculum'); const faq=sp.sections.find(s=>s.type==='faq');
      console.log(`  salesPage curriculum ch1: "${cur?.data?.chapters?.[0]?.title||''}" · faq:${faq?.data?.faqs?.length||0} ข้อ · sectionTypes: ${sp.sections.map(s=>s.type).join(',')}`);
    }
  }
  process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
