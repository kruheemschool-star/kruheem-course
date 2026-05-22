# kruheem-course — Field Specification

> Schema ของฟอร์มสร้างคอร์ส + Sales Page ทั้งหมด
> ใช้อ้างอิงเมื่อต้องสร้างข้อมูล, validate, หรือ seed ตัวอย่าง

---

## 1. Course (ฟอร์มสร้างคอร์ส)

DB: Firestore `courses/{id}`

```
title           string    REQUIRED   ชื่อวิชา เช่น "คณิตศาสตร์ ม.1 เทอม 1"
desc            string               คำอธิบายสั้นๆ
category        string               เลือกจาก collection "categories"
price           number    default=0  ราคาขายจริง (บาท)
fullPrice       number    default=0  ราคาเต็มก่อนลด (บาท)
videoId         string               YouTube Video ID เช่น "dQw4w9WgXcQ"
docUrl          string               URL Google Drive รวมเอกสาร
image           string               URL รูปปก (upload -> Firebase Storage, แนะนำ 1280x720)
tags            string[]             สำหรับ Course Finder เช่น ["ระดับ:ม.1", "เป้าหมาย:เพิ่มเกรด"]
keywords        string[]             สำหรับแนะนำคอร์สที่เกี่ยวข้อง เช่น ["จำนวนจริง", "สมการ"]
allowedExamLevel  "primary"|"lower"|"upper"|null   default=null, ใช้เฉพาะคอร์สคลังข้อสอบ
createdAt       Date      auto
updatedAt       Date      auto
```

---

## 2. Sales Page Config

เก็บใน field `salesPage` ของ document คอร์ส (ไม่แยก collection)

```
salesPage.enabled      boolean   REQUIRED   เปิด/ปิด template (ต้องมี sections >= 1)
salesPage.sections     Section[]            array ของ sections (ดูหัวข้อ 3)
salesPage.boosters     object               Sticky CTA / Social Proof / Exit Intent (ดูหัวข้อ 4)
```

ทุก Section มีฟิลด์ร่วม:
```
id        string    auto       สร้างจาก "${type}-${timestamp}"
type      string    REQUIRED   1 ใน 15 ประเภท (ดูด้านล่าง)
order     number    REQUIRED   ลำดับแสดงผล (เริ่ม 1)
enabled   boolean   REQUIRED   เปิด/ปิดรายตัว
data      object    REQUIRED   ข้อมูลเฉพาะประเภท
```

---

## 3. Section Types (15 ประเภท)

### 3.1 hero
```
title              string   REQUIRED
badgeText          string              เช่น "คอร์สยอดนิยม"
subtitle           string
ctaText            string              ข้อความปุ่มหลัก
ctaPriceText       string              ราคาในปุ่ม เช่น "฿1,900"
secondaryCtaText   string              ปุ่มรอง (เว้นว่าง=ซ่อน)
pricePerDayText    string              เช่น "เฉลี่ยวันละ 1.04 บาท"
imageUrl           string              URL รูปปก (เว้นว่าง=ใช้รูปคอร์ส)
videoUrl           string
coverType          "image"|"card"      default "image"
cardMainText       string              เฉพาะ card เช่น "ม.4"
cardSubText        string              เช่น "เทอม 2"
cardBadgeText      string              เช่น "คณิตศาสตร์เพิ่มเติม"
bgColorFrom        hex                 default "#F8F9FD"
bgColorTo          hex                 default "#F8F9FD"
titleColor         hex                 default "#1E293B"
subtitleColor      hex                 default "#475569"
badgeBgColor       hex                 default "#FFFFFF"
badgeTextColor     hex                 default "#475569"
blob1Color         hex                 default "#C7D2FE"
blob2Color         hex                 default "#FECDD3"
cardColorFrom      hex                 default "#FB7185"
cardColorTo        hex                 default "#F97316"
cardTextColor      hex                 default "#FFFFFF"
```

### 3.2 painPoint
```
title              string   REQUIRED
subtitle           string
problemTitle       string              ชื่อกล่องปัญหา
problemIcon        string              อิโมจิ 1 ตัว
problems[]         {icon, text}        icon: อิโมจิ (max 4 char), text: string
solutionTitle      string
solutionIcon       string
solutionDesc       string
solutions[]        {icon, text}        เหมือน problems
```

### 3.3 solution
```
title              string   REQUIRED
subtitle           string
items[]            {icon, title, desc}   icon: อิโมจิ (max 4 char)
```

### 3.4 curriculum
```
title              string   REQUIRED
subtitle           string
chapters[]         object:
  .id              number|string   auto
  .title           string          ชื่อบท
  .desc            string          คำอธิบายบท
  .content         string[]        หัวข้อย่อย (1 string = 1 หัวข้อ)
  .color           hex             สีพื้นหลัง
  .iconColor       hex             สีตัวเลข
```

### 3.5 reviews
```
title              string
subtitle           string
source             "images"|"live"     default "images"
images[]           string              URL รูป (ใช้เมื่อ source=images)
liveScope          "all"|"course"      default "all" (ใช้เมื่อ source=live)
liveLimit          number              4-100, default 30
liveMinRating      number              1-5, default 4
```

### 3.6 testimonial
```
title              string
subtitle           string
stories[]          object:
  .name            string   REQUIRED
  .role            string              ระดับชั้น/ตำแหน่ง
  .imageUrl        string              URL รูป
  .beforeScore     string              คะแนนก่อน
  .afterScore      string              คะแนนหลัง
  .quote           string   REQUIRED
```

### 3.7 trustBadges
```
title              string
stats[]            object:
  .icon            string   REQUIRED   อิโมจิ (max 4 char)
  .number          string   REQUIRED   เช่น "1,500+"
  .label           string   REQUIRED   เช่น "นักเรียน"
```

### 3.8 statsTable
```
title              string
leftHeader         string   REQUIRED   หัวคอลัมน์ซ้าย
rightHeader        string   REQUIRED   หัวคอลัมน์ขวา
rows[]             {left, right}       left: ตัวเลข, right: ความหมาย
```

### 3.9 priceStack
```
title              string
subtitle           string
items[]            {name: string, value: number}   มูลค่าแต่ละรายการ (บาท)
totalValue         number              คำนวณอัตโนมัติจาก items
regularPrice       number   REQUIRED   ราคาเต็ม
finalPrice         number   REQUIRED   ราคาพิเศษ
discountNote       string              เช่น "ลด 40% เฉพาะวันนี้"
ctaText            string              ข้อความปุ่ม
```

### 3.10 guarantee
```
title              string   REQUIRED
badgeText          string              เช่น "รับประกัน"
desc               string
features           string[]            เงื่อนไข (1 string = 1 ข้อ)
```

### 3.11 comparison
```
title              string
subtitle           string
columns[]          object:
  .title           string   REQUIRED
  .highlight       boolean             เน้นคอลัมน์นี้
  .features[]      {text: string, included: boolean}
```

### 3.12 faq
```
title              string
subtitle           string
faqs[]             {q: string, a: string}   คำถาม-คำตอบ
```

### 3.13 cta (Final CTA)
```
title              string   REQUIRED
subtitle           string
ctaText            string   REQUIRED   ข้อความปุ่ม
urgencyText        string              เช่น "🔥 เวลาจำกัด"
priceText          string              ราคาในปุ่ม
```

### 3.14 countdown
```
title              string
subtitle           string
endDate            string   REQUIRED   ISO datetime เช่น "2026-12-31T23:59:59"
expiredMessage     string              ข้อความเมื่อหมดเวลา
style              "banner"|"inline"   default "inline"
```

### 3.15 videoPreview
```
title              string
subtitle           string
videos[]           object:
  .title           string   REQUIRED
  .youtubeUrl      string   REQUIRED   YouTube URL หรือ Video ID
  .description     string
```

---

## 4. Conversion Boosters

### 4.1 stickyCTA
```
enabled              boolean   REQUIRED
ctaText              string              default "สมัครเรียน"
priceText            string
showAfterScrollPx    number              default 600
```

### 4.2 socialProof
```
enabled              boolean   REQUIRED
messages[]           object:
  .name              string   REQUIRED   เช่น "คุณสมชาย"
  .location          string              เช่น "กรุงเทพฯ"
  .action            string              เช่น "เพิ่งสมัครคอร์ส"
  .timeAgo           string              เช่น "3 นาทีที่แล้ว"
intervalSeconds      number              default 15
displaySeconds       number              default 5
```

### 4.3 exitIntent
```
enabled              boolean   REQUIRED
title                string              เช่น "เดี๋ยวก่อน!"
desc                 string
ctaText              string              เช่น "สนใจเลย!"
discountText         string              เช่น "ลดเพิ่ม 500 บาท"
```

---

## 5. หมายเหตุ

- **Validation:** ไม่ใช้ Zod/Yup — ใช้ TypeScript types + เช็ค `required` ในระดับ UI เท่านั้น
- **Database:** Firebase Firestore — ไม่มี schema enforcement ฝั่ง DB
- **สี:** ฟิลด์ hex ทุกตัวมี default fallback ใน UI ถ้าเว้นว่าง
- **Array fields:** เพิ่ม/ลบ item ได้ไม่จำกัด, ไม่มี min/max
- **Sales Page:** เก็บทั้ง config เป็น nested object ใน course document เดียว
