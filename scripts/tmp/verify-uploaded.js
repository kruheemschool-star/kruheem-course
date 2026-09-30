const path=require('path'); const admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
(async()=>{
  const s=await admin.firestore().collection('exams').doc('cb3F76XHdUxb5bT1ICEh').get();
  const x=s.data(); const qs=x.questions||[];
  console.log(`"${x.title}" · ${x.category} · ${x.level} · order ${x.order} · ${qs.length} ข้อ · questionCount ${x.questionCount}`);
  const ci=[0,0,0,0]; qs.forEach(q=>ci[q.correctIndex]++);
  console.log('การกระจายคำตอบ:', ci.join(' / '));
  console.log('รูป SVG:', qs.filter(q=>q.svg).length, '· มี distractorErrors:', qs.filter(q=>q.distractorErrors).length);
  const bad=qs.filter(q=>!q.explanation.startsWith(`**คำตอบ: ข้อ ${q.correctIndex+1}.**`));
  console.log('เฉลยหัวไม่ตรง:', bad.length);
  console.log('\nตัวอย่างข้อสุดท้าย:'); const q=qs[99];
  console.log('  ', q.question.slice(0,110));
  console.log('   ▶', q.options[q.correctIndex], '| เฉลย', q.explanation.length, 'ตัวอักษร');
  process.exit(0);
})();
