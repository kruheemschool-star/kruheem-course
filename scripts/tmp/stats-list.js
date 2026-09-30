const path=require('path'); const admin=require('firebase-admin');
const sa=require(path.resolve(__dirname,'../seed-gifted-m1/serviceAccountKey.json'));
admin.initializeApp({credential:admin.credential.cert(sa)});
(async()=>{const s=await admin.firestore().collection('stats').get();
 const ids=[]; s.forEach(d=>ids.push(d.id)); ids.sort();
 console.log(`   ${ids.length} doc: ${ids.slice(0,12).join(', ')}${ids.length>12?' …':''}`);
 process.exit(0);})();
