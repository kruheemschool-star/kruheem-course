# คู่มือใช้งาน — Seed คอร์ส Gifted ม.1 เข้า Firestore

อ่านจบใน 3 นาที ทำได้ใน 10 นาที

---

## 📦 ไฟล์ที่ได้

| ไฟล์ | ทำอะไร |
|------|--------|
| `course-gifted-m1.json` | ข้อมูลคอร์สทั้งหมดในรูปแบบ JSON ตาม schema |
| `seed-course.js` | สคริปต์ยิงข้อมูลเข้า Firestore |
| `README.md` | ไฟล์นี้ |

---

## 🚀 ขั้นตอน (ครั้งแรก — ใช้เวลา ~10 นาที)

### 1. เอา 3 ไฟล์ไปไว้ในโฟลเดอร์โปรเจกต์ครู

แนะนำสร้างโฟลเดอร์ใหม่ในโปรเจกต์ เช่น `scripts/seed-courses/` แล้วเอาไฟล์ทั้งหมดวางในนั้น

### 2. ดาวน์โหลด Firebase Service Account Key

1. เปิด [Firebase Console](https://console.firebase.google.com/) → เลือกโปรเจกต์ครู
2. คลิก ⚙️ ข้างซ้ายบน → **Project settings**
3. แท็บ **Service accounts** → กด **Generate new private key**
4. โหลดไฟล์ `.json` มา → **เปลี่ยนชื่อเป็น `serviceAccountKey.json`**
5. วางไฟล์ในโฟลเดอร์เดียวกับ `seed-course.js`

> ⚠️ **สำคัญ:** ใส่ `serviceAccountKey.json` ใน `.gitignore` ของโปรเจกต์ทันที — ไฟล์นี้คือกุญแจเข้า Firebase ของครู ห้ามขึ้น git เด็ดขาด

### 3. ติดตั้ง dependency

เปิด terminal ในโฟลเดอร์ที่วางไฟล์ แล้วรัน:

```bash
npm install firebase-admin
```

### 4. ทดลองยิงแบบ DRY RUN ก่อน (ปลอดภัย ไม่แตะ DB)

เปิด `seed-course.js` แล้วแก้บรรทัด:

```js
const DRY_RUN = true;
```

แล้วรัน:

```bash
node seed-course.js
```

ถ้าเห็นข้อความ `✅ JSON valid พร้อมยิงเมื่อปรับ DRY_RUN = false` แปลว่าทุกอย่างพร้อม

### 5. ยิงจริง

แก้กลับ:

```js
const DRY_RUN = false;
```

รัน:

```bash
node seed-course.js
```

เสร็จแล้วจะเห็น `✅ Seed สำเร็จ!`

### 6. เข้าหลังบ้านตรวจ

- เปิดหลังบ้านเว็บครู → ดูคอร์ส `gifted-m1`
- เห็นข้อมูลครบทุกช่อง พร้อม sales page 11 sections
- **`salesPage.enabled` ตั้งไว้ `false`** = ยังไม่แสดงในหน้าเว็บ ลูกค้ามองไม่เห็น
- ครูตรวจ แก้ ปรับให้พอใจ → กด enable ในหลังบ้านเปิดขาย

---

## 🔄 ใช้ครั้งต่อไป (คอร์สใหม่)

1. copy `course-gifted-m1.json` เป็น `course-XXX.json`
2. แก้เนื้อหาในไฟล์ใหม่
3. ใน `seed-course.js` แก้ 2 ตัวแปร:
   ```js
   const JSON_FILE = './course-XXX.json';
   const DOC_ID = 'XXX';
   ```
4. รัน `node seed-course.js`

---

## 💡 Tips

- **อยากให้ผม (Claude) ช่วยร่าง JSON คอร์สใหม่:** ส่งชื่อคอร์ส + เนื้อหามาในแชทใหม่ พร้อมพูดว่า "ใช้ schema เดิมและ tone เดิม" ผมจะร่างให้
- **แก้ JSON แล้วยิงทับได้เลย** — script จะถามยืนยัน 5 วินาทีก่อนเขียนทับ (กด Ctrl+C ทันถ้าผิด)
- **ไม่อยากเขียนทับ field บางตัวที่แก้ในหลังบ้านไปแล้ว:** ใน script เปลี่ยน `{ merge: false }` → `{ merge: true }` ที่บรรทัด `docRef.set(...)`

---

## ⚠️ เช็คก่อนเปิดขาย (สำคัญ)

ก่อนกด `salesPage.enabled = true`:

1. **ตัวเลข trustBadges** (10+ ปี, 1,500+ คน, 4.9/5) → แก้ให้ตรงจริง
2. **priceStack มูลค่ารายชิ้น** → ปรับตามที่ครูประเมินจริง
3. **videoId / image** → ใส่ YouTube ID ตัวอย่างการสอน + รูปปก 1280×720
4. **socialProof messages** → ตั้งเป็นรูปแบบที่ไม่ผิด PDPA (ใช้ "คุณแม่น้องXXX" เฉพาะชื่อเล่น ไม่มีนามสกุล/เบอร์)

---

ติดตรงไหนถามผมในแชทได้เลยครับ
