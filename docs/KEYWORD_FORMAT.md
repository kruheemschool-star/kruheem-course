# Keyword JSON Format Specification

รูปแบบมาตรฐานของไฟล์ `keywords.json` สำหรับระบบตรวจจับ tags ข้อสอบอัตโนมัติ และใช้ร่วมกับเว็บแอป AI Prompt Generator

## ตำแหน่งไฟล์

```
kruheem-course/data/keywords.json
```

## โครงสร้าง JSON

```json
{
  "version": "1.0",
  "lastUpdated": "2026-03-19",
  "categories": [ ... ],
  "globalKeywords": [ ... ]
}
```

### Root Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | เวอร์ชันของ format |
| `lastUpdated` | string | วันที่อัปเดตล่าสุด (YYYY-MM-DD) |
| `categories` | Category[] | หมวดหมู่หลัก (แบ่งตามสาขาวิชา) |
| `globalKeywords` | Keyword[] | Keywords ที่ใช้ได้กับทุกหมวด |

### Category Object

```json
{
  "id": "algebra",
  "name": "พีชคณิต",
  "level": ["ม.1", "ม.2", "ม.3"],
  "keywords": [ ... ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (ใช้ใน code) |
| `name` | string | ชื่อหมวดหมู่ภาษาไทย (แสดงใน UI) |
| `level` | string[] | ระดับชั้นที่เกี่ยวข้อง |
| `keywords` | Keyword[] | รายการคำสำคัญในหมวดนี้ |

### Keyword Object

```json
{
  "term": "สมการ",
  "aliases": ["สมการเชิงเส้น", "สมการกำลังสอง", "แก้สมการ"],
  "weight": 1.0,
  "promptTemplate": "สร้างข้อสอบเกี่ยวกับ {term} ระดับ {level}"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `term` | string | ✅ | คำหลักที่ใช้ตรวจจับ |
| `aliases` | string[] | ❌ | คำที่มีความหมายใกล้เคียง |
| `weight` | number | ✅ | น้ำหนักความสำคัญ 0.0-1.0 |
| `promptTemplate` | string | ❌ | Template สำหรับ AI prompt generator |

## Template Variables

ตัวแปรที่ใช้ได้ใน `promptTemplate`:

| Variable | Description | Example |
|----------|-------------|---------|
| `{term}` | คำสำคัญหลัก | สมการ |
| `{level}` | ระดับชั้น | ม.1 |
| `{category}` | ชื่อหมวดหมู่ | พีชคณิต |

## การใช้งานใน AI Prompt Generator

### 1. โหลดไฟล์

```javascript
// Option A: Import โดยตรง
import keywords from './keywords.json';

// Option B: Fetch จาก URL
const keywords = await fetch('/path/to/keywords.json').then(r => r.json());
```

### 2. แสดง UI สำหรับเลือก keywords

```javascript
keywords.categories.forEach(category => {
  console.log(`${category.name} (${category.level.join(', ')})`);
  category.keywords.forEach(kw => {
    console.log(`  - ${kw.term}`);
  });
});
```

### 3. สร้าง AI Prompt จาก template

```javascript
function generatePrompt(categoryId, keywordTerm, level) {
  const category = keywords.categories.find(c => c.id === categoryId);
  const keyword = category.keywords.find(k => k.term === keywordTerm);

  const template = keyword.promptTemplate
    || 'สร้างข้อสอบเกี่ยวกับ {term} ระดับ {level}';

  return template
    .replace('{term}', keyword.term)
    .replace('{level}', level)
    .replace('{category}', category.name);
}

// ตัวอย่าง
generatePrompt('algebra', 'สมการ', 'ม.1');
// => "สร้างข้อสอบเกี่ยวกับสมการระดับ ม.1"
```

### 4. ฝัง tags ใน output ของ AI

เมื่อ generate ข้อสอบด้วย AI ให้เพิ่ม `tags` field ในผลลัพธ์:

```json
[
  {
    "question": "จงหาค่าของ x จากสมการ 3x - 7 = 14",
    "options": ["x = 5", "x = 7", "x = 21", "x = -7"],
    "correctIndex": 1,
    "explanation": "ย้ายข้างสมการ: 3x = 21, x = 7",
    "tags": ["สมการ", "สมการเชิงเส้น"]
  }
]
```

ระบบ kruheem-course จะ:
1. ใช้ `tags` ที่ฝังมาโดยตรง (ถ้ามี)
2. ตรวจจับ tags เพิ่มเติมจากเนื้อหาโจทย์/เฉลยอัตโนมัติ
3. แสดง suggested tags ให้ admin ยืนยัน/แก้ไข

## การเพิ่ม Keywords ใหม่

1. เปิดไฟล์ `data/keywords.json`
2. เพิ่ม keyword object ในหมวดหมู่ที่เหมาะสม
3. ตั้งค่า `weight` ตามความสำคัญ:
   - `1.0` = คำสำคัญหลักของหัวข้อ
   - `0.8-0.9` = คำที่เกี่ยวข้องมาก
   - `0.5-0.7` = คำทั่วไป
4. เพิ่ม `aliases` สำหรับคำที่มีหลายรูปแบบ

## หมวดหมู่ที่มีอยู่

| ID | Name | Levels |
|----|------|--------|
| `number-system` | จำนวนและการดำเนินการ | ป.1 - ม.2 |
| `algebra` | พีชคณิต | ม.1 - ม.6 |
| `geometry` | เรขาคณิต | ป.1 - ม.3 |
| `measurement` | การวัด | ป.1 - ม.2 |
| `statistics` | สถิติ | ม.1 - ม.6 |
| `probability` | ความน่าจะเป็น | ม.3 - ม.6 |
| `trigonometry` | ตรีโกณมิติ | ม.4 - ม.5 |
| `calculus` | แคลคูลัส | ม.6 |
| `analytic-geometry` | เรขาคณิตวิเคราะห์ | ม.4 - ม.5 |
| `logic-set` | ตรรกศาสตร์และเซต | ม.4 |
| `word-problem` | โจทย์ปัญหา | ป.1 - ม.3 |
