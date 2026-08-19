// รันเดี่ยว: บัสต์แคช ISR ของเว็บหลังแก้ข้อมูลด้วยสคริปต์/มือ
//
//   node scripts/bust-caches.js exams
//   node scripts/bust-caches.js exams posts summaries
//
// targets ที่รับ: exams | exam-papers | posts | summaries | settings
// (ต้องมี serviceAccountKey.json ตามที่สคริปต์อื่นในโฟลเดอร์นี้ใช้)

const path = require("path");
const admin = require("firebase-admin");
const { bustCaches } = require("./lib/bust-cache");

const sa = require(path.resolve(__dirname, "seed-gifted-m1/serviceAccountKey.json"));
admin.initializeApp({ credential: admin.credential.cert(sa) });

const targets = process.argv.slice(2);
if (targets.length === 0) {
    console.log("ใช้: node scripts/bust-caches.js <exams|exam-papers|posts|summaries|settings> ...");
    process.exit(1);
}

bustCaches(targets, admin)
    .then(() => process.exit(0))
    .catch((e) => { console.error("[bust-cache] ล้มเหลว:", e.message); process.exit(1); });
