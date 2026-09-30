# ทดสอบกติกาฐานข้อมูล (firestore.rules) ก่อน deploy

รันกับตัวจำลองในเครื่องเท่านั้น (โปรเจกต์ demo ไม่แตะฐานข้อมูลจริง) ต้องมี Java 11+

```
cd <โฟลเดอร์โปรเจกต์>
RULES_LABEL=NEW firebase emulators:exec --project demo-rules-test --only firestore "node scripts/rules-test/emu-test.js"
```

ต้องได้ `35/35 ตรงตามที่คาด` ก่อน `firebase deploy --only firestore:rules` ทุกครั้ง
แต่ละข้อจำลองการอ่าน/เขียนแบบเดียวกับโค้ดหน้าเว็บจริง (AuthContext, VisitorTracker, หน้าแจ้งโอน, หน้าเรียน, หลังบ้าน, ตัวนับสถิติ)
เพิ่มกติกาใหม่เมื่อไหร่ ให้เพิ่มกรณีทดสอบที่นี่ด้วย
