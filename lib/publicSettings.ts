// จุดรวม "การตั้งค่าที่หน้าเว็บฝั่งสาธารณะต้องอ่านได้" — เก็บรวมไว้ใน doc เดียว:
// settings/homepage_promotion
//
// ทำไมต้องเป็น doc นี้: หน้าแรก/หน้าข้อสอบอ่านค่าตั้งฝั่งเซิร์ฟเวอร์ผ่าน Firestore
// REST ด้วย public API key (ไม่มีตัวตนแอดมิน — ดู lib/firestoreRest.ts) จึงต้องผ่าน
// security rules แบบ "อ่านได้โดยไม่ล็อกอิน" ซึ่ง rules ที่ deploy อยู่จริงเปิดไว้เฉพาะ
// settings/homepage_promotion เท่านั้น — settings/* ตัวอื่นเป็น admin-only ทั้งหมด
// (settings/homeCountdown และ settings/examConfig เคยโดน 403 เงียบๆ จนการ์ด
// นับถอยหลังหน้าแรกค้างค่า default และสวิตช์บันทึกผลสอบกลายเป็นปิด)
// การรวมมาที่ doc นี้ทำให้แก้จบในโค้ด ไม่ต้องรอ firebase deploy rules ใหม่
//
// โครง doc:
//   settings/homepage_promotion {
//     enabled, title, imageUrl, ...                          ← แบนเนอร์โปรโมชัน (เดิม)
//     countdown:  { enabled, examName, targetDate, ... }     ← การ์ดนับถอยหลังหน้าแรก
//     examConfig: { showExamDashboard, enableResultTracking }← สวิตช์คลังข้อสอบ
//   }
//
// กติกาสำคัญ:
//   • ทุกฝั่งเขียนต้องใช้ setDoc(..., { merge: true }) เสมอ — กันฟีเจอร์หนึ่งเผลอลบ
//     field ของอีกฟีเจอร์ในระหว่างบันทึก (หน้าแอดมินโปรโมชันก็ merge อยู่แล้ว)
//   • ฝั่งอ่านเซิร์ฟเวอร์ทุกจุดต้องใช้ revalidate ค่าเดียวกัน (ค่าคงที่ข้างล่าง)
//     เพราะ Next แคช fetch ตาม URL — ตั้งไม่ตรงกันแล้วแคชจะตีกันเอง
export const PUBLIC_SETTINGS_DOC = "settings/homepage_promotion";
//   • เดิม 30 วิ = เว็บอ่าน doc นี้ซ้ำสูงสุด ~2,880 ครั้ง/วันทิ้งเปล่า — ยืดเป็น 1 ชม.
//     แล้วให้หน้าแอดมิน (โปรโมชัน/นับถอยหลัง/สวิตช์คลังข้อสอบ) ยิง
//     /api/revalidate-content หลังบันทึก เพื่อ bust แคชทันที = สดเท่าเดิม อ่านน้อยลง ~99%
export const PUBLIC_SETTINGS_REVALIDATE = 3600;
// ทุก fetch ของ doc นี้ต้องติด tag เดียวกัน เพื่อให้ revalidateTag บัสต์ครบทุกจุด
export const PUBLIC_SETTINGS_TAGS = ["public-settings"];
