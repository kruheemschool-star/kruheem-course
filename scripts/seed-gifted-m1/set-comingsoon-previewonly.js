/** set-comingsoon-previewonly.js — WRITE. "ปิดการขายชั่วคราว": mark the 4 not-yet-
 *  released courses as previewOnly (shows curriculum, blocks checkout). */
const admin = require('firebase-admin'); const path = require('path');
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname,'serviceAccountKey.json'))) });
const db = admin.firestore();
const IDS = {
  o2z4BD1jAHXa3DjKfqhY: 'ม.2 เทอม 2', z8cVWAg2WuDnVBoKtaHA: 'ม.3 เทอม 2',
  gwSe3icqcO4C39NpNsCZ: 'ม.6 เทอม 1', vlzhF40vB6A4YN0dHCQi: 'ม.6 เทอม 2',
};
(async()=>{
  for (const [id,label] of Object.entries(IDS)){
    await db.collection('courses').doc(id).update({ 'salesPage.previewOnly': true });
    console.log(`✅ ${label} · previewOnly=true (ปิดการขายชั่วคราว)`);
  }
  process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
